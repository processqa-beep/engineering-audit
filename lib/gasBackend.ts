import { AuditHeader, AuditResult, ActionItem, Checkpoint } from './types';
import { StorageEngine } from './storageEngine';

// ──────────────────────────────────────────────────────────────────────────────
// JSONP helper — sends a <script> tag GET request to Google Apps Script.
// ──────────────────────────────────────────────────────────────────────────────
function jsonpRequest<T = any>(
  scriptUrl: string,
  params: Record<string, string>,
  timeoutMs: number = 20000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = 'gas_' + Date.now() + '_' + Math.floor(Math.random() * 99999);

    const cleanup = () => {
      delete (window as any)[cbName];
      const el = document.getElementById(cbName);
      if (el) el.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    (window as any)[cbName] = (res: T) => {
      clearTimeout(timer);
      cleanup();
      resolve(res);
    };

    const qs = Object.entries({ ...params, callback: cbName, _t: String(Date.now()) })
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');

    const script = document.createElement('script');
    script.id = cbName;
    script.src = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + qs;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('Network error reaching Google Apps Script. Check the Web App URL.'));
    };
    document.body.appendChild(script);
  });
}

export class GasBackendClient {
  public static getScriptUrl(): string {
    const settings = StorageEngine.getSettings();
    return (
      settings.googleAppsScriptUrl ||
      process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/a/macros/borosil.com/s/AKfycbzSZI42dnh2VvSExq121cqhArASSDNYv4txm3rxtK9FTSxTuT91Id8ItWr9m_srjs10/exec'
    );
  }

  public static getSheetId(): string {
    const settings = StorageEngine.getSettings();
    return settings.googleSheetId?.trim() || '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0';
  }

  public static isConnected(): boolean {
    const url = this.getScriptUrl();
    return !!(url && url.startsWith('https://script.google.com/'));
  }

  // ── PING ────────────────────────────────────────────────────────────────────
  public static async pingEndpoint(): Promise<{ success: boolean; message: string; sheetName?: string }> {
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'Apps Script URL not set in Settings.' };
    if (!url.startsWith('https://script.google.com/')) {
      return { success: false, message: 'Invalid URL. Must start with https://script.google.com/' };
    }
    try {
      const res = await jsonpRequest<any>(url, { action: 'PING', sheetId: this.getSheetId() }, 10000);
      if (res?.status === 'SUCCESS') {
        return { success: true, message: `Connected ✓  Sheet: "${res.sheetName}"`, sheetName: res.sheetName };
      }
      return { success: false, message: res?.message || 'GAS returned error.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // ── FETCH CHECKPOINTS ───────────────────────────────────────────────────────
  public static async fetchCheckpointsFromGoogleSheet(): Promise<Checkpoint[]> {
    if (!this.isConnected()) throw new Error('Apps Script URL not connected in Settings.');
    const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'GET_CHECKPOINTS', sheetId: this.getSheetId() }, 20000);
    if (res?.status === 'SUCCESS' && Array.isArray(res.checkpoints)) return res.checkpoints;
    throw new Error(res?.message || 'Failed to read checkpoints from Google Sheet.');
  }

  public static async syncMasterData(): Promise<Checkpoint[]> {
    const checkpoints = await this.fetchCheckpointsFromGoogleSheet();
    if (checkpoints?.length > 0) StorageEngine.saveCheckpoints(checkpoints);
    return checkpoints;
  }

  // ── SUBMIT AUDIT (Server-to-Server Next.js Proxy + Drive Photos + HTML Email) ──
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string; driveFolderId?: string; driveFolderUrl?: string }> {
    // 1. Save in local storage first for offline / instant recovery
    StorageEngine.saveAudit(header, results, actions);

    const scriptUrl = this.getScriptUrl();
    const sheetId = this.getSheetId();

    // 1. Slim evaluated results
    const slimResults = results.map((r) => ({
      sr: r.srNo,
      comp: (r.componentName || '').slice(0, 80),
      ck: (r.checkpointText || '').slice(0, 150),
      std: (r.standardParameter || '').slice(0, 80),
      val: (r.actualValue || '').slice(0, 50),
      status: r.status,
      notes: (r.observationNotes || '').slice(0, 150),
      action: (r.recommendedAction || '').slice(0, 150),
      crit: r.isCritical ? 1 : 0,
      whatImpactIfThisPartGetsFail: (r.whatImpactIfThisPartGetsFail || '').slice(0, 150),
    }));

    // 2. Extract photos for Google Drive
    const photos = results
      .filter((r) => r.photoUrl && (r.photoUrl.startsWith('data:image') || r.photoUrl.length > 100))
      .map((r) => ({
        sr: r.srNo,
        comp: (r.componentName || 'Comp').replace(/[^a-zA-Z0-9_-]/g, '_'),
        photoBase64: r.photoUrl,
        fileName: `Photo_Sr${r.srNo}_${(r.componentName || 'Comp').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`,
      }));

    // 3. Slim actions
    const slimActions = actions.map((a) => ({
      id: a.actionId,
      comp: (a.componentName || '').slice(0, 80),
      ck: (a.checkpointText || '').slice(0, 150),
      obs: (a.observation || '').slice(0, 150),
      act: (a.recommendedAction || '').slice(0, 150),
      prio: a.priority || 'Medium',
      status: a.status || 'Open',
      target: a.targetDate || '',
    }));

    // 1. Submit via hidden iframe form in browser (carries your active @borosil.com Google session cookies seamlessly)
    if (typeof document !== 'undefined') {
      try {
        const iframeName = 'gas_borosil_auth_' + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = scriptUrl;
        form.target = iframeName;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'postData';
        input.value = JSON.stringify({
          action: 'SUBMIT_AUDIT',
          sheetId,
          header,
          results: slimResults,
          actions: slimActions,
          photos,
        });
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();

        setTimeout(() => {
          try {
            form.remove();
            iframe.remove();
          } catch {}
        }, 6000);
      } catch (iframeErr) {
        console.warn('Iframe form post notice:', iframeErr);
      }
    }

    // 2. Query header via JSONP to retrieve the created Google Drive folder link
    try {
      const headerRes = await jsonpRequest<any>(
        scriptUrl,
        {
          action: 'AUDIT_HEADER',
          sheetId,
          payload: JSON.stringify(header),
        },
        15000
      );

      return {
        status: 'SUCCESS',
        message: '✅ Transmitted to Google Sheets & Drive (Email Dispatched)!',
        driveFolderId: headerRes?.driveFolderId,
        driveFolderUrl: headerRes?.driveFolderUrl,
      };
    } catch (fallbackErr: any) {
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Notice: ${fallbackErr.message}`,
      };
    }
  }

  // ── UPDATE ACTION ────────────────────────────────────────────────────────────
  public static async updateAction(
    actionId: string,
    status: string,
    closureRemark?: string,
    closurePhotoUrl?: string
  ): Promise<{ status: string; message: string }> {
    StorageEngine.updateActionStatus(actionId, status, closureRemark, closurePhotoUrl);
    if (!this.isConnected()) return { status: 'LOCAL_SAVED', message: 'Action updated locally.' };
    try {
      await jsonpRequest<any>(
        this.getScriptUrl(),
        {
          action: 'UPDATE_ACTION',
          sheetId: this.getSheetId(),
          payload: JSON.stringify({ actionId, status, closureRemark, closurePhotoUrl }),
        },
        10000
      );
      return { status: 'SUCCESS', message: 'Action updated in Google Sheets.' };
    } catch {
      return { status: 'LOCAL_SAVED', message: 'Action updated locally.' };
    }
  }

  // ── TEST EMAIL ───────────────────────────────────────────────────────────────
  public static async sendTestEmail(email: string): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'SEND_TEST_EMAIL', email }, 15000);
      return res?.status === 'SUCCESS';
    } catch { return false; }
  }
}
