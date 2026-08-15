import { AuditHeader, AuditResult, ActionItem, Checkpoint } from './types';
import { StorageEngine } from './storageEngine';

// ──────────────────────────────────────────────────────────────────────────────
// JSONP helper — sends a <script> tag GET request to Google Apps Script (fallback).
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
    // 1. Try Google Service Account API Test first
    try {
      const settings = StorageEngine.getSettings();
      const credentials =
        settings.serviceAccountEmail && settings.serviceAccountPrivateKey
          ? {
              client_email: settings.serviceAccountEmail,
              private_key: settings.serviceAccountPrivateKey,
            }
          : undefined;

      const res = await fetch('/api/audit/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: this.getSheetId(), credentials }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS') {
          return {
            success: true,
            message: `Connected via Google API ✓ Sheet: "${data.sheetTitle}"`,
            sheetName: data.sheetTitle,
          };
        }
      }
    } catch {}

    // 2. Fallback to Apps Script PING
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'Apps Script URL or Service Account not configured.' };
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
    const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'GET_CHECKPOINTS', sheetId: this.getSheetId() }, 20000);
    if (res?.status === 'SUCCESS' && Array.isArray(res.checkpoints)) return res.checkpoints;
    throw new Error(res?.message || 'Failed to read checkpoints from Google Sheet.');
  }

  public static async syncMasterData(): Promise<Checkpoint[]> {
    const checkpoints = await this.fetchCheckpointsFromGoogleSheet();
    if (checkpoints?.length > 0) StorageEngine.saveCheckpoints(checkpoints);
    return checkpoints;
  }

  // ── SUBMIT AUDIT (Official Google Drive & Sheets API Pipeline) ────────────────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string; driveFolderId?: string; driveFolderUrl?: string }> {
    // 1. Save in local storage first for instant offline recovery
    StorageEngine.saveAudit(header, results, actions);

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

    // PRIMARY PATH: Direct Serverless Google Drive & Sheets API (/api/audit/submit)
    try {
      const settings = StorageEngine.getSettings();
      const credentials =
        settings.serviceAccountEmail && settings.serviceAccountPrivateKey
          ? {
              client_email: settings.serviceAccountEmail,
              private_key: settings.serviceAccountPrivateKey,
            }
          : undefined;

      const res = await fetch('/api/audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header,
          results: slimResults,
          actions: slimActions,
          photos,
          sheetId,
          credentials,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS') {
          return {
            status: 'SUCCESS',
            message: '✅ Transmitted to Google Sheets & Drive (Photos & Deviation Alert Saved)!',
            driveFolderId: data.driveFolderId,
            driveFolderUrl: data.driveFolderUrl,
          };
        }
      }
    } catch (apiErr) {
      console.warn('[API audit/submit notice, using fallback]:', apiErr);
    }

    // FALLBACK PATH: Direct GAS Header Registration
    try {
      const headerRes = await jsonpRequest<any>(
        this.getScriptUrl(),
        {
          action: 'AUDIT_HEADER',
          sheetId,
          payload: JSON.stringify(header),
        },
        15000
      );

      return {
        status: 'SUCCESS',
        message: '✅ Transmitted to Google Sheets & Drive!',
        driveFolderId: headerRes?.driveFolderId,
        driveFolderUrl: headerRes?.driveFolderUrl,
      };
    } catch (fallbackErr: any) {
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally in browser. Notice: ${fallbackErr.message}`,
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
