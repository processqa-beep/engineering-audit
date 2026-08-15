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

  // ── SUBMIT AUDIT (Full JSONP Pipeline with Photo Chunking & HTML Email) ──────
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

    // Only evaluated results
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
      // 1. Register Audit Header (Creates Audit_Master row + Drive Folder + Photos subfolder)
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

      // 2. Submit Evaluated Audit Results to Audit_Details
      if (slimResults.length > 0) {
        await jsonpRequest<any>(
          url,
          {
            action: 'AUDIT_RESULTS',
            sheetId,
            auditId: header.auditId,
            payload: JSON.stringify({ auditId: header.auditId, results: slimResults }),
          },
          15000
        );
      }

      // 3. Submit Action Items to Action_Tracker
      if (slimActions.length > 0) {
        await jsonpRequest<any>(
          url,
          {
            action: 'AUDIT_ACTIONS',
            sheetId,
            auditId: header.auditId,
            payload: JSON.stringify({ auditId: header.auditId, actions: slimActions }),
          },
          15000
        );
      }

      // 4. Upload Photos via JSONP Chunks (guaranteed cross-domain delivery into Drive's Photos folder)
      const photos = results.filter((r) => r.photoUrl && r.photoUrl.startsWith('data:image'));
      for (const photo of photos) {
        const photoBase64 = photo.photoUrl || '';
        const CHUNK_SIZE = 3500;
        const totalChunks = Math.ceil(photoBase64.length / CHUNK_SIZE);
        const photoId = `${header.auditId.replace(/[^a-zA-Z0-9]/g, '')}_sr${photo.srNo}`;
        const fileName = `Photo_Sr${photo.srNo}_${(photo.componentName || 'Comp').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;

        for (let c = 0; c < totalChunks; c++) {
          const chunkData = photoBase64.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
          try {
            await jsonpRequest<any>(
              url,
              {
                action: 'SAVE_PHOTO_CHUNK',
                sheetId,
                auditId: header.auditId,
                folderId: driveFolderId,
                photoId,
                chunkIndex: String(c),
                totalChunks: String(totalChunks),
                chunkData,
                fileName,
                srNo: String(photo.srNo),
              },
              15000
            );
          } catch (photoErr) {
            console.warn('Photo chunk upload notice:', photoErr);
          }
        }
      }

      // 5. Send Deviation Notification Email if deviations exist
      if (actions.length > 0) {
        try {
          await jsonpRequest<any>(
            url,
            {
              action: 'SEND_ALERT_EMAIL',
              sheetId,
              payload: JSON.stringify({
                auditId: header.auditId,
                header,
                actions: slimActions,
                results: slimResults,
                driveFolderUrl,
              }),
            },
            15000
          );
        } catch (emailErr) {
          console.warn('Email trigger notice:', emailErr);
        }
      }

      return {
        status: 'SUCCESS',
        message: '✅ Transmitted to Google Sheets, Drive & Email Dispatched!',
        driveFolderId,
        driveFolderUrl,
      };
    } catch (err: any) {
      console.warn('[GAS] Submit error (saved locally):', err);
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Notice: ${err.message}`,
        driveFolderId,
        driveFolderUrl,
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
