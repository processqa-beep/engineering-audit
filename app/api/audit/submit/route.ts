import { NextRequest, NextResponse } from 'next/server';
import { GoogleServiceAccountEngine } from '@/lib/googleServiceAccount';
import { EmailService } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { header, results, actions, photos, sheetId, credentials } = body;

    if (!header || !header.auditId) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Missing audit header data.' },
        { status: 400 }
      );
    }

    const auth = GoogleServiceAccountEngine.getAuth(credentials);
    const targetSheetId = sheetId || '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0';

    // 1. Create Google Drive folder hierarchy (Audit Records / Year / Month / AuditId / Photos)
    const folderInfo = await GoogleServiceAccountEngine.createAuditFolderHierarchy(
      auth,
      header.auditId,
      header.date
    );

    // 2. Upload photos directly to the Photos subfolder in Google Drive
    const photoMap: Record<number, string> = {};
    if (photos && Array.isArray(photos)) {
      for (const p of photos) {
        if (p.photoBase64) {
          const driveUrl = await GoogleServiceAccountEngine.uploadPhotoToDrive(
            auth,
            folderInfo.photosFolderId,
            p.fileName || `Photo_Sr${p.sr}.jpg`,
            p.photoBase64
          );
          photoMap[p.sr] = driveUrl;
        }
      }
    }

    // 3. Attach Google Drive photo links to results
    const resultsWithDriveUrls = (results || []).map((r: any) => {
      if (photoMap[r.sr]) {
        r.photoUrl = photoMap[r.sr];
      }
      return r;
    });

    // 4. Save Audit Header to Audit_Master in Google Sheets
    await GoogleServiceAccountEngine.appendAuditHeader(
      auth,
      targetSheetId,
      header,
      folderInfo
    );

    // 5. Save Evaluated Checkpoints to Audit_Details in Google Sheets
    await GoogleServiceAccountEngine.appendAuditResults(
      auth,
      targetSheetId,
      header.auditId,
      resultsWithDriveUrls
    );

    // 6. Save Non-Conformance Actions to Action_Tracker in Google Sheets
    await GoogleServiceAccountEngine.appendAuditActions(
      auth,
      targetSheetId,
      header.auditId,
      actions || []
    );

    // 7. Dispatch HTML Deviation Alert Email if actions exist
    if (actions && actions.length > 0) {
      try {
        await EmailService.sendDeviationEmail({
          auditId: header.auditId,
          header,
          actions,
          results: resultsWithDriveUrls,
          driveFolderUrl: folderInfo.folderUrl,
        });
      } catch (mailErr) {
        console.warn('Email dispatch notice:', mailErr);
      }
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Audit saved to Google Sheets & Drive successfully!',
      auditId: header.auditId,
      driveFolderId: folderInfo.folderId,
      driveFolderUrl: folderInfo.folderUrl,
      photosSaved: Object.keys(photoMap).length,
      resultsAdded: resultsWithDriveUrls.length,
      actionsAdded: (actions || []).length,
    });
  } catch (error: any) {
    console.error('[API audit/submit error]', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        message: error.message || 'Failed to submit audit to Google APIs.',
      },
      { status: 500 }
    );
  }
}
