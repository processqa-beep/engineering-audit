import { google } from 'googleapis';
import { Readable } from 'stream';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export class GoogleServiceAccountEngine {
  private static defaultSpreadsheetId = '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0';

  public static getCredentials(customCreds?: ServiceAccountCredentials): ServiceAccountCredentials | null {
    if (customCreds && customCreds.client_email && customCreds.private_key) {
      return customCreds;
    }

    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      return {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      };
    }

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          project_id: parsed.project_id,
        };
      } catch (err) {
        console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', err);
      }
    }

    return null;
  }

  public static getAuth(customCreds?: ServiceAccountCredentials) {
    const creds = this.getCredentials(customCreds);
    if (!creds) {
      throw new Error(
        'Google Service Account credentials not found. Please provide GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.'
      );
    }

    return new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  }

  // ── 1. FOLDER HIERARCHY IN GOOGLE DRIVE ──────────────────────────────────────
  public static async getOrCreateFolder(
    drive: any,
    folderName: string,
    parentId?: string
  ): Promise<string> {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    });

    return folder.data.id!;
  }

  public static async createAuditFolderHierarchy(
    auth: any,
    auditId: string,
    dateStr?: string
  ): Promise<{ folderId: string; folderUrl: string; photosFolderId: string }> {
    const drive = google.drive({ version: 'v3', auth });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const year = dateStr ? dateStr.substring(0, 4) : String(new Date().getFullYear());
    const mIdx = dateStr ? Number(dateStr.substring(5, 7)) - 1 : new Date().getMonth();
    const month = monthNames[mIdx] || 'Unknown';

    // Root -> Audit Records -> Year -> Month -> Audit ID -> Photos
    const rootId = await this.getOrCreateFolder(drive, 'Engineering Audit System');
    const recordsId = await this.getOrCreateFolder(drive, 'Audit Records', rootId);
    const yearId = await this.getOrCreateFolder(drive, year, recordsId);
    const monthId = await this.getOrCreateFolder(drive, month, yearId);
    const auditFolderId = await this.getOrCreateFolder(drive, auditId, monthId);
    const photosFolderId = await this.getOrCreateFolder(drive, 'Photos', auditFolderId);

    const folderInfo = await drive.files.get({
      fileId: auditFolderId,
      fields: 'id, webViewLink',
    });

    return {
      folderId: auditFolderId,
      folderUrl: folderInfo.data.webViewLink || `https://drive.google.com/drive/folders/${auditFolderId}`,
      photosFolderId,
    };
  }

  // ── 2. UPLOAD PHOTO TO GOOGLE DRIVE PHOTOS FOLDER ────────────────────────────
  public static async uploadPhotoToDrive(
    auth: any,
    photosFolderId: string,
    fileName: string,
    photoBase64: string
  ): Promise<string> {
    const drive = google.drive({ version: 'v3', auth });

    let rawBase64 = photoBase64;
    if (rawBase64.includes('base64,')) {
      rawBase64 = rawBase64.split('base64,')[1];
    }
    rawBase64 = rawBase64.replace(/\s/g, '+');

    const buffer = Buffer.from(rawBase64, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [photosFolderId],
        mimeType: 'image/jpeg',
      },
      media: {
        mimeType: 'image/jpeg',
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = res.data.id;
    if (fileId) {
      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch {}
    }

    return res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  }

  // ── 3. WRITE TO GOOGLE SHEETS ───────────────────────────────────────────────
  public static async appendAuditHeader(
    auth: any,
    sheetId: string,
    header: any,
    folderInfo: { folderId: string; folderUrl: string }
  ) {
    const sheets = google.sheets({ version: 'v4', auth });
    const targetSpreadsheetId = sheetId || this.defaultSpreadsheetId;

    const row = [
      header.auditId,
      header.date,
      header.time,
      header.sectionName || header.sectionId,
      header.subSectionName || header.subSectionId,
      header.lineName || header.lineId,
      header.equipmentName || header.equipmentId,
      header.auditorName,
      header.totalCheckpoints,
      header.okCount,
      header.ngCount,
      header.obsCount,
      header.naCount,
      header.compliancePercent,
      header.overallStatus,
      folderInfo.folderId,
      folderInfo.folderUrl,
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: targetSpreadsheetId,
      range: 'Audit_Master!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  }

  public static async appendAuditResults(
    auth: any,
    sheetId: string,
    auditId: string,
    results: any[]
  ) {
    if (!results || results.length === 0) return;
    const sheets = google.sheets({ version: 'v4', auth });
    const targetSpreadsheetId = sheetId || this.defaultSpreadsheetId;
    const nowStr = new Date().toISOString();

    const rows = results.map((r, i) => [
      auditId,
      r.sr || r.srNo || i + 1,
      r.comp || r.componentName || '',
      r.ck || r.checkpointText || '',
      r.std || r.standardParameter || '',
      r.val || r.actualValue || '',
      r.status || '',
      r.notes || r.observationNotes || '',
      r.action || r.recommendedAction || '',
      r.photoUrl || '',
      r.crit === 1 || r.isCritical === true || r.isCritical === 'Yes' ? 'Yes' : 'No',
      nowStr,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: targetSpreadsheetId,
      range: 'Audit_Details!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  }

  public static async appendAuditActions(
    auth: any,
    sheetId: string,
    auditId: string,
    actions: any[]
  ) {
    if (!actions || actions.length === 0) return;
    const sheets = google.sheets({ version: 'v4', auth });
    const targetSpreadsheetId = sheetId || this.defaultSpreadsheetId;
    const nowStr = new Date().toISOString();

    const rows = actions.map((a, i) => [
      a.id || a.actionId || `ACT-${Date.now()}-${i}`,
      auditId,
      a.comp || a.componentName || '',
      a.ck || a.checkpointText || '',
      a.obs || a.observation || '',
      a.act || a.recommendedAction || '',
      a.prio || a.priority || 'Medium',
      a.status || 'Open',
      a.target || a.targetDate || '',
      '',
      '',
      nowStr,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: targetSpreadsheetId,
      range: 'Action_Tracker!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  }

  public static async testConnection(customCreds?: ServiceAccountCredentials, sheetId?: string) {
    const auth = this.getAuth(customCreds);
    const sheets = google.sheets({ version: 'v4', auth });
    const targetSpreadsheetId = sheetId || this.defaultSpreadsheetId;

    const res = await sheets.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId,
    });

    return {
      success: true,
      title: res.data.properties?.title,
      sheetId: targetSpreadsheetId,
    };
  }
}
