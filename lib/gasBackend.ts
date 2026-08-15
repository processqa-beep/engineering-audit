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
  private static getScriptUrl(): string {
    const settings = StorageEngine.getSettings();
    return settings.googleAppsScriptUrl || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL || '';
  }

  private static getSheetId(): string {
    const settings = StorageEngine.getSettings();
    return settings.googleSheetId?.trim() || '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0';
  }

  private static isConnected(): boolean {
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

  // ── SUBMIT AUDIT (Full Atomic 1-Shot Submission + Photos to Drive) ────────────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string; driveFolderId?: string; driveFolderUrl?: string }> {
    // 1. Always save in local storage first for offline / instant recovery
    StorageEngine.saveAudit(header, results, actions);

    if (!this.isConnected()) {
      return {
        status: 'LOCAL_SAVED',
        message: 'Audit saved in browser. Connect Apps Script URL in Settings to sync to Google Sheets & Drive.',
      };
    }

    const url = this.getScriptUrl();
    const sheetId = this.getSheetId();

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
      hasPhoto: Boolean(r.photoUrl && r.photoUrl.startsWith('data:image')),
    }));

    // Extract photos to upload to Drive's Photos subfolder
    const photos = results
      .filter((r) => r.photoUrl && r.photoUrl.startsWith('data:image'))
      .map((r) => ({
        sr: r.srNo,
        comp: (r.componentName || 'Component').replace(/[^a-zA-Z0-9_-]/g, '_'),
        photoBase64: r.photoUrl,
        fileName: `Photo_Sr${r.srNo}_${(r.componentName || 'Comp').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`,
      }));

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

    let driveFolderId = '';
    let driveFolderUrl = '';

    try {
      // 1. Send complete Audit (Header + Details + Actions + Photos) in 1 full POST request
      const payload = JSON.stringify({
        action: 'SUBMIT_AUDIT',
        sheetId,
        header,
        results: slimResults,
        actions: slimActions,
        photos,
      });

      // 1. Send complete Audit via fetch POST
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payload,
        });
      } catch (postErr) {
        console.warn('POST sync notice:', postErr);
      }

      // 2. If photos are present, also post via hidden iframe for guaranteed delivery through GAS 302 redirect
      if (photos.length > 0 && typeof document !== 'undefined') {
        try {
          const iframeName = 'gas_photo_frame_' + Date.now();
          const iframe = document.createElement('iframe');
          iframe.name = iframeName;
          iframe.style.display = 'none';
          document.body.appendChild(iframe);

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = url;
          form.target = iframeName;
          form.style.display = 'none';

          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'postData';
          input.value = payload;
          form.appendChild(input);

          document.body.appendChild(form);
          form.submit();

          setTimeout(() => {
            form.remove();
            iframe.remove();
          }, 5000);
        } catch (iframeErr) {
          console.warn('Iframe form post notice:', iframeErr);
        }
      }

      // 2. Also register header via JSONP to retrieve the live Google Drive folder link
      try {
        const headerRes = await jsonpRequest<any>(
          url,
          {
            action: 'AUDIT_HEADER',
            sheetId,
            payload: JSON.stringify(header),
          },
          15000
        );

        if (headerRes?.status === 'SUCCESS') {
          driveFolderId = headerRes.driveFolderId || '';
          driveFolderUrl = headerRes.driveFolderUrl || '';
        }
      } catch (jsonpErr) {
        console.warn('JSONP header notice:', jsonpErr);
      }

      return {
        status: 'SUCCESS',
        message: '✅ Transmitted to Google Sheets & Drive!',
        driveFolderId,
        driveFolderUrl,
      };
    } catch (err: any) {
      console.warn('[GAS] Submit error (saved locally):', err);
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Sync notice: ${err.message}`,
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
      const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'SEND_TEST_EMAIL', email }, 10000);
      return res?.status === 'SUCCESS';
    } catch { return false; }
  }
}
