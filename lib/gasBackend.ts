import { AuditHeader, AuditResult, ActionItem, Checkpoint } from './types';
import { StorageEngine } from './storageEngine';

// ──────────────────────────────────────────────────────────────────────────────
// JSONP helper — sends a <script> tag GET request to Google Apps Script.
// This is the ONLY reliable way to call GAS from a browser cross-origin.
// fetch() / XMLHttpRequest with JSON body are blocked by CORS on GAS Web Apps.
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

    // Build query string — each value is individually encoded
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
      const res = await jsonpRequest<any>(url, { action: 'PING' }, 10000);
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
    const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'GET_CHECKPOINTS' }, 20000);
    if (res?.status === 'SUCCESS' && Array.isArray(res.checkpoints)) return res.checkpoints;
    throw new Error(res?.message || 'Failed to read checkpoints from Google Sheet.');
  }

  public static async syncMasterData(): Promise<Checkpoint[]> {
    const checkpoints = await this.fetchCheckpointsFromGoogleSheet();
    if (checkpoints?.length > 0) StorageEngine.saveCheckpoints(checkpoints);
    return checkpoints;
  }

  // ── SUBMIT AUDIT ────────────────────────────────────────────────────────────
  /**
   * Submits an audit to Google Sheets + Drive in 3 separate small requests:
   *   1. AUDIT_HEADER  — summary row in Audit_Master sheet
   *   2. AUDIT_RESULTS — checkpoint results in batches of 10 rows
   *   3. AUDIT_ACTIONS — NG action items in Action_Tracker sheet
   *
   * WHY CHUNKS?
   * One giant JSONP GET URL with 100+ checkpoints serialised = 50,000+ chars.
   * Google Apps Script silently drops requests over ~8,000 chars.
   * Batching keeps every URL under 3,000 chars — always within GAS limits.
   */
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

      // ── Step 2: Submit results in batches of 10 ────────────────────────────
      const BATCH = 10;
      for (let i = 0; i < results.length; i += BATCH) {
        const batch = results.slice(i, i + BATCH).map((r) => ({
          auditId: r.auditId,
          srNo: r.srNo,
          sectionName: r.sectionName,
          subSectionName: r.subSectionName,
          lineName: r.lineName,
          equipmentName: r.equipmentName,
          componentName: r.componentName,
          checkpointText: r.checkpointText,
          standardParameter: r.standardParameter,
          actualValue: r.actualValue,
          status: r.status,
          observationNotes: r.observationNotes,
          recommendedAction: r.recommendedAction,
          photoUrl: r.photoUrl || '',
          isCritical: r.isCritical,
          auditor: r.auditor,
          timestamp: r.timestamp,
        }));

        try {
          await jsonpRequest<any>(
            url,
            {
              action: 'AUDIT_RESULTS',
              payload: JSON.stringify({ auditId: header.auditId, results: batch }),
            },
            20000
          );
        } catch (batchErr: any) {
          errors.push(`Results batch ${i / BATCH + 1}: ${batchErr.message}`);
        }
      }

      // ── Step 3: Submit action items ────────────────────────────────────────
      if (actions && actions.length > 0) {
        const slimActions = actions.map((a) => ({
          actionId: a.actionId,
          auditId: a.auditId,
          sectionName: a.sectionName,
          subSectionName: a.subSectionName,
          lineName: a.lineName,
          equipmentName: a.equipmentName,
          componentName: a.componentName,
          checkpointText: a.checkpointText,
          observation: a.observation,
          recommendedAction: a.recommendedAction,
          priority: a.priority,
          status: a.status,
          targetDate: a.targetDate,
        }));

        try {
          await jsonpRequest<any>(
            url,
            {
              action: 'AUDIT_ACTIONS',
              payload: JSON.stringify({ auditId: header.auditId, actions: slimActions }),
            },
            20000
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
        { action: 'UPDATE_ACTION', payload: JSON.stringify({ actionId, status, closureRemark, closurePhotoUrl }) },
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
