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

    // Build email HTML content
    let htmlContent = customHtml;
    if (!htmlContent && header) {
      const isFail = header.overallStatus === 'FAIL' || (header.ngCount && header.ngCount > 0);
      const badgeColor = isFail ? '#e11d48' : '#059669';
      const badgeText = isFail ? 'FAIL / DEVIATIONS OBSERVED' : 'PASS / 100% COMPLIANT';

      const actionRows = (actions || []).map((a: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 10px; font-weight: bold; color: #1e293b;">#${idx + 1}</td>
          <td style="padding: 10px; color: #0f172a;">
            <strong>${a.componentName || 'Component'}</strong><br/>
            <span style="color: #64748b; font-size: 12px;">${a.checkpointText || ''}</span>
          </td>
          <td style="padding: 10px; color: #dc2626; font-weight: 600;">
            ${a.observation || 'Deviation finding'}
          </td>
          <td style="padding: 10px; color: #0369a1;">
            ${a.recommendedAction || 'Recommended corrective action'}
          </td>
          <td style="padding: 10px; color: #334155;">
            <strong>${a.responsiblePerson || 'Assigned Lead'}</strong><br/>
            <span style="color: #64748b; font-size: 11px;">${a.assignedEmail || ''}</span>
          </td>
          <td style="padding: 10px; color: #b45309; font-weight: bold;">
            ${a.targetDate || 'Within 3 days'}
          </td>
        </tr>
      `).join('');

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 750px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 24px; text-align: left; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; color: #ffffff; font-weight: bold; font-size: 12px; background-color: ${badgeColor}; }
            .meta-grid { display: table; width: 100%; padding: 16px 24px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .meta-cell { display: table-cell; padding: 4px 12px; }
            .table-container { padding: 20px 24px; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background-color: #f8fafc; padding: 10px; color: #475569; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc;">Borosil Renewables Ltd. • Engineering Audit System</p>
              <h2 style="margin: 6px 0 12px 0; font-size: 20px;">PLANT AUDIT DEVIATION NOTIFICATION</h2>
              <span class="badge">${badgeText} • Score: ${header.compliancePercent || 0}%</span>
            </div>

            <div class="meta-grid">
              <div class="meta-cell"><strong>Audit ID:</strong> ${header.auditId}</div>
              <div class="meta-cell"><strong>Section:</strong> ${header.sectionName || header.sectionId}</div>
              <div class="meta-cell"><strong>Line:</strong> ${header.lineName || header.lineId}</div>
              <div class="meta-cell"><strong>Auditor:</strong> ${header.auditorName || 'Mehul Chikhaliya'}</div>
              <div class="meta-cell"><strong>Date & Time:</strong> ${header.date} ${header.time || ''}</div>
            </div>

            <div class="table-container">
              <h3 style="margin-top: 0; font-size: 15px; color: #0f172a;">Assigned Corrective Action Points (${(actions || []).length}):</h3>
              ${(actions && actions.length > 0) ? `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Equipment / Checkpoint</th>
                      <th>Observation Finding</th>
                      <th>Recommended Action</th>
                      <th>Assigned To</th>
                      <th>Target Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${actionRows}
                  </tbody>
                </table>
              ` : `<p style="color: #059669; font-weight: bold;">✓ All checkpoints verified OK. No corrective actions required.</p>`}
            </div>

            <div class="footer">
              This is an automated notification dispatched from the <strong>Borosil Engineering Audit Portal</strong>.<br/>
              Sender: <code>${user}</code> • For queries, contact Process QA Department.
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: pass ? {
        user,
        pass,
      } : undefined,
      tls: {
        rejectUnauthorized: false, // Prevents corporate SSL interception errors
      },
    });

    const mailOptions: any = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || `[Audit Alert] ${header?.sectionName || 'Plant'} - ${header?.auditId || 'Deviation Notice'}`,
      html: htmlContent,
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    // Send email
    if (!pass) {
      console.log('[SMTP Notice]: No SMTP_PASSWORD provided in environment. Simulating dispatch for:', mailOptions.to);
      return NextResponse.json({
        status: 'SIMULATED',
        message: `Email prepared for ${mailOptions.to}. Configure SMTP_PASSWORD in .env.local to enable live delivery from ${user}.`,
        details: { to: mailOptions.to, cc: mailOptions.cc, subject: mailOptions.subject },
      });
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
