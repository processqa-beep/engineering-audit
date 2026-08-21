import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      cc,
      subject,
      header,
      results,
      actions,
      customHtml,
    } = body;

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || 'process.qa@borosil.com';
    const pass = process.env.SMTP_PASSWORD || 'mkse ghmg fuua uncx';
    const fromAddress = process.env.SMTP_FROM || `Process QA <${user}>`;

    if (!to && !cc) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Recipient email address (TO or CC) is required.' },
        { status: 400 }
      );
    }

    const emailAttachments: any[] = [];
    let htmlContent = customHtml;

    if (!htmlContent && header) {
      // Find NG results or map actions
      const ngResults = (results || []).filter((r: any) => r.status === 'NG' || r.status === 'Observation');
      const itemsToDisplay = (ngResults.length > 0 ? ngResults : (actions || []));

      const deviationRows = itemsToDisplay.map((item: any, idx: number) => {
        // Find matching action if item is from results
        const matchingAction = (actions || []).find((a: any) => a.checkpointText === item.checkpointText || a.componentName === item.componentName) || item;

        const sr = idx + 1;
        const component = item.componentName || matchingAction.componentName || '-';
        const checkpoint = item.checkpointText || matchingAction.checkpointText || '-';
        const stdParam = item.standardParameter || '-';
        const actualVal = item.actualValue || item.observation || '-';
        const isCritical = item.isCritical || matchingAction.priority === 'Critical';
        const critText = isCritical ? '<span style="color: #dc2626; font-weight: bold;">Critical</span>' : '<span style="color: #d97706; font-weight: bold;">Medium</span>';
        const obs = item.observationNotes || item.observation || matchingAction.observation || '-';
        const impact = item.whatImpactIfThisPartGetsFail || item.impactOfFailure || matchingAction.whatImpactIfThisPartGetsFail || 'Operational wear / equipment stoppage risk';

        let photoHtml = '<span style="color: #94a3b8; font-size: 11px;">No Photo</span>';
        if (item.photoUrl || matchingAction.photoUrl) {
          const pUrl = item.photoUrl || matchingAction.photoUrl;
          if (pUrl.startsWith('data:image')) {
            const cid = `photo_sr_${sr}`;
            const parts = pUrl.split(';base64,');
            const mime = parts[0].split(':')[1] || 'image/jpeg';
            const buffer = Buffer.from(parts[1], 'base64');
            emailAttachments.push({
              filename: `Audit_${header.auditId}_Deviation_Sr${sr}.jpg`,
              content: buffer,
              contentType: mime,
              cid: cid,
            });
            photoHtml = `<img src="cid:${cid}" alt="Photo evidence" style="max-width: 140px; max-height: 110px; border-radius: 4px; border: 1px solid #cbd5e1; display: block; margin-top: 4px;" />`;
          } else if (pUrl.startsWith('http')) {
            photoHtml = `<a href="${pUrl}" target="_blank"><img src="${pUrl}" alt="Photo evidence" style="max-width: 140px; max-height: 110px; border-radius: 4px; border: 1px solid #cbd5e1; display: block; margin-top: 4px;" /></a>`;
          }
        }

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top;">
            <td style="padding: 8px 10px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1;">${sr}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${component}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155;">${checkpoint}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #475569;">${stdParam}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">${actualVal}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${critText}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #1e293b;">${obs}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #475569;">${impact}</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${photoHtml}</td>
          </tr>
        `;
      }).join('');

      const auditDateDisplay = header.date ? new Date(header.date).toString() : new Date().toString();

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 950px; margin: 0 auto; }
            .heading { font-size: 15px; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; }
            .info-table { width: 100%; max-width: 700px; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            .info-table td { padding: 6px 12px; border: 1px solid #cbd5e1; }
            .info-table td.lbl { background-color: #f8fafc; font-weight: bold; color: #334155; width: 180px; }
            .info-table td.val { color: #0f172a; }
            .dev-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; margin-bottom: 20px; }
            .dev-table th { background-color: #1e3a8a; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: bold; border: 1px solid #1e3a8a; font-size: 12px; }
            .dev-table tr:nth-child(even) { background-color: #f8fafc; }
            .portal-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <p style="margin-top: 0;">Dear Team,</p>
            <p>Please review the following deviations identified during today's Engineering Audit. Kindly take the necessary corrective action and ensure timely closure of the identified points.</p>

            <div class="heading">Audit Information</div>
            <table class="info-table">
              <tr>
                <td class="lbl">Audit Date</td>
                <td class="val">${auditDateDisplay}</td>
              </tr>
              <tr>
                <td class="lbl">Auditor</td>
                <td class="val">${header.auditorName || 'Mehul Chikhaliya'}</td>
              </tr>
              <tr>
                <td class="lbl">Section</td>
                <td class="val">${header.sectionName || header.sectionId}</td>
              </tr>
              <tr>
                <td class="lbl">Sub Section</td>
                <td class="val">${header.subSectionName || header.subSectionId || '-'}</td>
              </tr>
              <tr>
                <td class="lbl">Line / Machine</td>
                <td class="val">${header.lineName || header.lineId}${header.equipmentName ? ` – ${header.equipmentName}` : ''}</td>
              </tr>
            </table>

            <div class="heading">Engineering Audit Deviation Summary</div>
            <table class="dev-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">Sr.</th>
                  <th>Component</th>
                  <th>Checkpoint</th>
                  <th>Standard Parameter</th>
                  <th>Actual Value</th>
                  <th style="text-align: center;">Criticality</th>
                  <th>Observation</th>
                  <th>Potential Impact</th>
                  <th style="text-align: center;">Photo / Evidence</th>
                </tr>
              </thead>
              <tbody>
                ${deviationRows}
              </tbody>
            </table>

            <p style="margin: 20px 0;">
              <a href="https://engineering-audit.vercel.app/?tab=actions" class="portal-btn" style="color: #ffffff !important;">
                View & Update Actions in Portal →
              </a>
            </p>

            <p style="color: #334155; font-size: 13px;">
              Kindly review the above engineering observations and ensure that the necessary corrective actions are completed within the specified timeline.
              <br/><br/>
              Please update the corrective action and closure status in the BRL Engineering Audit System after completion.
            </p>

            <p style="margin-top: 25px; color: #1e293b; font-size: 13px;">
              Regards,<br/>
              <strong>Process QA</strong>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: pass ? {
        user,
        pass,
      } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions: any = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || `[Audit Alert] ${header?.sectionName || 'Plant'} - ${header?.lineName || ''} Deviation Notice`,
      html: htmlContent,
      attachments: emailAttachments,
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP Success]: Email sent messageId:', info.messageId);

    return NextResponse.json({
      status: 'SUCCESS',
      message: `Email successfully sent to ${mailOptions.to}`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('[SMTP Send Error]:', err);
    return NextResponse.json(
      {
        status: 'ERROR',
        message: err?.message || 'Failed to dispatch email via SMTP',
      },
      { status: 500 }
    );
  }
}
