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

  // ── AUTO-DUMP CHECKPOINTS TO GOOGLE SHEETS (Checkpoint_Master) ─────────────
  public static async saveCheckpointsToGoogleSheet(
    checkpoints: Checkpoint[],
    onProgress?: (current: number, total: number) => void
  ): Promise<boolean> {
    const url = this.getScriptUrl();
    const sheetId = this.getSheetId();
    if (!url || !checkpoints || checkpoints.length === 0) return false;

    const slim = checkpoints.map((c, i) => ({
      srNo: c.srNo || i + 1,
      sectionName: c.sectionName || c.sectionId || '',
      subSectionName: c.subSectionName || c.subSectionId || '',
      lineName: c.lineName || c.lineId || 'ALL',
      applicableLines: c.applicableLines || ['ALL'],
      componentName: (c.componentName || '').slice(0, 80),
      checkpointText: (c.checkpointText || '').slice(0, 150),
      standardParameter: (c.standardParameter || '').slice(0, 80),
      minimum: c.minimum,
      maximum: c.maximum,
      unit: (c.unit || '').slice(0, 20),
      criticality: c.criticality || (c.isCritical ? 'Critical' : 'Medium'),
      active: c.active !== false,
    }));

    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(slim.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const batch = slim.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const res = await jsonpRequest<any>(
        url,
        {
          action: 'SAVE_CHECKPOINTS_BATCH',
          sheetId,
          batchIndex: String(b),
          totalBatches: String(totalBatches),
          payload: JSON.stringify(batch),
        },
        20000
      );

      if (res && res.status === 'ERROR') {
        throw new Error(res.message || `Apps Script rejected batch ${b + 1}/${totalBatches}`);
      }

      if (onProgress) {
        onProgress(Math.min((b + 1) * BATCH_SIZE, slim.length), slim.length);
      }
      await new Promise((r) => setTimeout(r, 60));
    }

    return true;
  }

  // ── SUBMIT AUDIT (Full JSONP Pipeline with Photo Chunking & Auto Email) ──────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string; driveFolderId?: string; driveFolderUrl?: string }> {
    // 1. Always save in local storage first for offline / instant recovery
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

    // 2. Slim actions
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
      // ── Step 1: Register Audit Header (Creates Audit_Master row + Drive Folder Hierarchy) ──
      const headerRes = await jsonpRequest<any>(
        scriptUrl,
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

      // ── Step 2: Submit Evaluated Audit Results to Audit_Details ────────────
      if (slimResults.length > 0) {
        await jsonpRequest<any>(
          scriptUrl,
          {
            action: 'AUDIT_RESULTS',
            sheetId,
            payload: JSON.stringify({ auditId: header.auditId, results: slimResults }),
          },
          15000
        );
      }

      // ── Step 3: Ultra-Fast Parallel Photo Chunk Upload ───────────────────
      const photos = results.filter((r) => r.photoUrl && r.photoUrl.startsWith('data:image'));
      for (const photo of photos) {
        const photoBase64 = photo.photoUrl || '';
        const CHUNK_SIZE = 1500;
        const totalChunks = Math.ceil(photoBase64.length / CHUNK_SIZE);
        const photoId = `${header.auditId.replace(/[^a-zA-Z0-9]/g, '')}_sr${photo.srNo}`;
        const fileName = `Photo_Sr${photo.srNo}_${(photo.componentName || 'Comp').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;

        // Send intermediate chunks 0 .. totalChunks-2 concurrently
        if (totalChunks > 1) {
          const intermediatePromises = [];
          for (let c = 0; c < totalChunks - 1; c++) {
            const chunkData = photoBase64.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
            intermediatePromises.push(
              jsonpRequest<any>(
                scriptUrl,
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
                12000
              ).catch((e) => console.warn(`Chunk ${c} notice:`, e))
            );
          }
          await Promise.all(intermediatePromises);
        }

        // Send final chunk to trigger image assembly in Drive
        const lastIdx = totalChunks - 1;
        const lastChunkData = photoBase64.slice(lastIdx * CHUNK_SIZE, (lastIdx + 1) * CHUNK_SIZE);
        try {
          await jsonpRequest<any>(
            scriptUrl,
            {
              action: 'SAVE_PHOTO_CHUNK',
              sheetId,
              auditId: header.auditId,
              folderId: driveFolderId,
              photoId,
              chunkIndex: String(lastIdx),
              totalChunks: String(totalChunks),
              chunkData: lastChunkData,
              fileName,
              srNo: String(photo.srNo),
            },
            15000
          );
        } catch (finalChunkErr) {
          console.warn('Final photo chunk notice:', finalChunkErr);
        }
      }

      // ── Step 4: Submit Action Items (Saves to Action_Tracker & Automatically Dispatches Email) ──
      if (slimActions.length > 0) {
        await jsonpRequest<any>(
          scriptUrl,
          {
            action: 'AUDIT_ACTIONS',
            sheetId,
            payload: JSON.stringify({ auditId: header.auditId, actions: slimActions }),
          },
          15000
        );
      }

      return {
        status: 'SUCCESS',
        message: '✅ Transmitted to Google Sheets, Drive & Email Dispatched!',
        driveFolderId,
        driveFolderUrl,
      };
    } catch (err: any) {
      console.warn('[GAS] Submit notice (saved locally):', err);
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
      const res = await jsonpRequest<any>(this.getScriptUrl(), { action: 'SEND_TEST_EMAIL', email }, 15000);
      return res?.status === 'SUCCESS';
    } catch { return false; }
  }
}
