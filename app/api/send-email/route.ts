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
        const actualVal = item.actualValue || item.observation || matchingAction.observation || '-';
        const recAction = item.recommendedAction || matchingAction.recommendedAction || 'Inspect and rectify deviation';
        const remarks = item.observationNotes || item.observation || matchingAction.observation || '-';
        const impact = item.whatImpactIfThisPartGetsFail || item.impactOfFailure || matchingAction.whatImpactIfThisPartGetsFail || 'Operational wear / equipment stoppage risk';

        let photoHtml = '<span style="color: #94a3b8; font-size: 11px;">-</span>';
        const pUrl = item.photoUrl || matchingAction.photoUrl;
        if (pUrl) {
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
            photoHtml = `
              <a href="cid:${cid}" target="_blank" title="Click to view full image">
                <img src="cid:${cid}" alt="Photo evidence" style="max-width: 120px; max-height: 95px; border-radius: 4px; border: 1px solid #cbd5e1; display: block; margin: 0 auto;" />
              </a>
            `;
          } else if (pUrl.startsWith('http')) {
            photoHtml = `
              <a href="${pUrl}" target="_blank" title="Click to view full screen photo">
                <img src="${pUrl}" alt="Photo evidence" style="max-width: 120px; max-height: 95px; border-radius: 4px; border: 1px solid #cbd5e1; display: block; margin: 0 auto;" />
              </a>
            `;
          }
        }

        return `
          <tr style="border-bottom: 1px solid #cbd5e1; font-size: 12px; vertical-align: top; background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
            <td style="padding: 8px 6px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1;">${sr}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${component}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #334155;">${checkpoint}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #475569;">${stdParam}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #dc2626; font-weight: bold;">${actualVal}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 500;">${recAction}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #1e293b;">${remarks}</td>
            <td style="padding: 8px 8px; border: 1px solid #cbd5e1; color: #475569;">${impact}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center;">${photoHtml}</td>
          </tr>
        `;
      }).join('');

      const auditDateDisplay = header.date ? new Date(header.date).toString() : new Date().toString();
      const lineEquip = `${header.lineName || header.lineId || 'Line'}${header.equipmentName ? ` – ${header.equipmentName}` : ''}`;

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 980px; margin: 0 auto; }
            .info-card { background-color: #ebf5fb; border: 1px solid #d4e6f1; border-radius: 8px; padding: 18px 22px; margin: 16px 0 24px 0; }
            .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .info-table td { padding: 6px 6px; }
            .info-lbl { color: #566573; font-weight: bold; width: 14%; }
            .info-val { color: #17202a; width: 36%; }
            .heading { font-size: 15px; font-weight: bold; color: #1a5276; margin: 0 0 12px 0; }
            .sub-heading { font-size: 15px; font-weight: bold; color: #1a5276; margin: 24px 0 10px 0; }
            .dev-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; margin-bottom: 20px; }
            .dev-table th { background-color: #1a5276; color: #ffffff; padding: 8px 8px; text-align: left; font-weight: bold; border: 1px solid #1a5276; font-size: 12px; }
            .portal-btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <p style="margin-top: 0;">Dear Team,</p>
            <p>Please review the following deviations identified during today's Engineering Audit. Kindly take the necessary corrective action and ensure timely closure of the identified points.</p>

            <div class="info-card">
              <div class="heading">Audit Information</div>
              <table class="info-table">
                <tr>
                  <td class="info-lbl">Audit ID</td>
                  <td class="info-val" style="font-weight: bold;">${header.auditId}</td>
                  <td class="info-lbl">Audit Date</td>
                  <td class="info-val">${auditDateDisplay}</td>
                </tr>
                <tr>
                  <td class="info-lbl">Auditor</td>
                  <td class="info-val">${header.auditorName || 'Mehul'}</td>
                  <td class="info-lbl">Section</td>
                  <td class="info-val">${header.sectionName || header.sectionId}</td>
                </tr>
                <tr>
                  <td class="info-lbl">Sub Section</td>
                  <td class="info-val">${header.subSectionName || header.subSectionId || '-'}</td>
                  <td class="info-lbl">Line / Machine</td>
                  <td class="info-val">${lineEquip}</td>
                </tr>
              </table>
            </div>

            <div class="sub-heading">Engineering Audit Deviation Summary</div>
            <table class="dev-table">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">Sr.</th>
                  <th>Component</th>
                  <th>Checkpoint</th>
                  <th>Standard Parameter</th>
                  <th>Actual Value</th>
                  <th>Recommended Action</th>
                  <th>Remarks</th>
                  <th>Potential Impact</th>
                  <th style="text-align: center; width: 130px;">Photo / Evidence</th>
                </tr>
              </thead>
              <tbody>
                ${deviationRows}
              </tbody>
            </table>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://brl-engineering-audit.vercel.app/?tab=actions" class="portal-btn" style="color: #ffffff !important;">
                View & Update Actions in Portal →
              </a>
            </div>

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

    // Format Subject: ENGINEERING AUDIT DEVIATION – BL#1 – Line Equipment (18-Aug-2026 at 07:18)
    const auditDt = header?.date ? new Date(header.date) : new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(auditDt.getDate()).padStart(2, '0');
    const mon = months[auditDt.getMonth()];
    const yr = auditDt.getFullYear();
    const tm = header?.time || auditDt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedDateTime = `${day}-${mon}-${yr} at ${tm}`;
    const lineEquip = `${header?.lineName || header?.lineId || 'Line'}${header?.equipmentName ? ` – ${header.equipmentName}` : ''}`;
    const finalSubject = subject || `ENGINEERING AUDIT DEVIATION – ${lineEquip} (${formattedDateTime})`;

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
      subject: finalSubject,
      html: htmlContent,
      attachments: emailAttachments,
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP Success]: Email sent messageId:', info.messageId, 'Subject:', finalSubject);

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
