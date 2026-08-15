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
    return settings.googleSheetId?.trim() || '';
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

  // ── SUBMIT AUDIT ────────────────────────────────────────────────────────────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string; driveFolderId?: string; driveFolderUrl?: string }> {
    // Always save locally first — data is never lost even if network fails
    StorageEngine.saveAudit(header, results, actions);

    if (!this.isConnected()) {
      return {
        status: 'LOCAL_SAVED',
        message: 'Audit saved in browser. Connect Apps Script URL in Settings to sync to Google Sheets & Drive.',
      };
    }

    const url = this.getScriptUrl();
    const errors: string[] = [];
    let driveFolderId = '';
    let driveFolderUrl = '';

    try {
      // ── Step 1: Submit header (creates Audit_Master row + Drive folder) ────
      const headerRes = await jsonpRequest<any>(
        url,
        {
          action: 'AUDIT_HEADER',
          sheetId: this.getSheetId(),
          payload: JSON.stringify(header),
        },
        20000
      );

      if (headerRes?.status === 'SUCCESS') {
        driveFolderId = headerRes.driveFolderId || '';
        driveFolderUrl = headerRes.driveFolderUrl || '';
      } else {
        errors.push('Header: ' + (headerRes?.message || 'Failed'));
      }

      // ── Step 2: Submit results in ultra-light batches of 5 (avoids URL overflow) ──
      const BATCH = 5;
      for (let i = 0; i < results.length; i += BATCH) {
        const batch = results.slice(i, i + BATCH).map((r) => ({
          sr: r.srNo,
          comp: (r.componentName || '').slice(0, 80),
          ck: (r.checkpointText || '').slice(0, 150),
          std: (r.standardParameter || '').slice(0, 80),
          val: (r.actualValue || '').slice(0, 50),
          status: r.status,
          notes: (r.observationNotes || '').slice(0, 150),
          action: (r.recommendedAction || '').slice(0, 150),
          crit: r.isCritical ? 1 : 0,
        }));

        try {
          await jsonpRequest<any>(
            url,
            {
              action: 'AUDIT_RESULTS',
              sheetId: this.getSheetId(),
              auditId: header.auditId,
              payload: JSON.stringify(batch),
            },
            15000
          );
        } catch (batchErr: any) {
          console.warn(`Batch error:`, batchErr);
          errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${batchErr.message}`);
        }
      }

      // ── Step 3: Submit action items ────────────────────────────────────────
      if (actions && actions.length > 0) {
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

        try {
          await jsonpRequest<any>(
            url,
            {
              action: 'AUDIT_ACTIONS',
              sheetId: this.getSheetId(),
              auditId: header.auditId,
              payload: JSON.stringify(slimActions),
            },
            15000
          );
        } catch (actErr: any) {
          errors.push('Actions: ' + actErr.message);
        }
      }

      if (errors.length === 0) {
        return {
          status: 'SUCCESS',
          message: '✅ Audit saved to Google Sheets & Drive!',
          driveFolderId,
          driveFolderUrl,
        };
      } else {
        return {
          status: 'PARTIAL',
          message: `Audit partially synced. Issues: ${errors.join('; ')}`,
          driveFolderId,
          driveFolderUrl,
        };
      }
    } catch (err: any) {
      console.warn('[GAS] Submit error (audit saved locally):', err);
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Sync error: ${err.message}`,
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
