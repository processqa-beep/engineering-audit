import nodemailer from 'nodemailer';

export class EmailService {
  public static async sendDeviationEmail({
    auditId,
    header,
    actions,
    results,
    driveFolderUrl,
  }: {
    auditId: string;
    header: any;
    actions: any[];
    results: any[];
    driveFolderUrl: string;
  }) {
    if (!actions || actions.length === 0) return { sent: false, reason: 'No deviations to report' };

    const recipients = process.env.NOTIFICATION_EMAILS || 'mehul.chikhaliya@borosil.com, process.qa@borosil.com';
    const auditDate = header.date || new Date().toISOString().substring(0, 10);
    const auditorName = header.auditorName || 'Auditor';
    const section = header.sectionName || header.sectionId || 'Engineering';
    const subSection = header.subSectionName || header.subSectionId || 'General';
    const lineMachine = `${header.lineName || header.lineId || ''} - ${header.equipmentName || header.equipmentId || ''}`;
    const totalDeviations = actions.length;
    const criticalCount = actions.filter((a) => String(a.priority || a.prio).toLowerCase() === 'critical').length;
    const auditUrl = driveFolderUrl || `https://docs.google.com/spreadsheets/d/1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0`;

    const isSingle = totalDeviations === 1;
    const singleAction = actions[0] || {};
    const matchingResult = results.find(
      (r) => r.comp === singleAction.comp || r.ck === singleAction.ck || r.sr === singleAction.sr
    );

    const subject = `${criticalCount > 0 ? '⚠️ CRITICAL DEVIATION' : '⚠️ AUDIT DEVIATION'} — ${auditId} (${section})`;

    let deviationRowsHtml = '';
    for (const act of actions) {
      const isCrit = String(act.priority || act.prio).toLowerCase() === 'critical';
      deviationRowsHtml += `<tr>
        <td>${lineMachine}</td>
        <td>${act.comp || act.componentName || '-'}</td>
        <td>${act.ck || act.checkpointText || '-'}</td>
        <td>${act.obs || act.observation || '-'}</td>
        <td style="color:${isCrit ? '#c62828' : '#b71c1c'}; font-weight:bold;">${act.prio || act.priority || 'Medium'}</td>
        <td>${act.status || 'Open'}</td>
      </tr>`;
    }

    const compName = singleAction.comp || singleAction.componentName || 'Component';
    const ckText = singleAction.ck || singleAction.checkpointText || 'Checkpoint';
    const stdParam = matchingResult?.std || 'Standard Parameter';
    const actVal = matchingResult?.val || singleAction.obs || 'NG';
    const crit = singleAction.prio || singleAction.priority || 'Medium';
    const obs = singleAction.obs || singleAction.observation || 'Deviation observed during audit';
    const failImpact =
      matchingResult?.whatImpactIfThisPartGetsFail ||
      matchingResult?.impactOfFailure ||
      'Equipment wear / operational stoppage';
    const corrAction = singleAction.act || singleAction.recommendedAction || 'Perform corrective maintenance';
    const targetDate = singleAction.target || singleAction.targetDate || 'Immediate';
    const photoUrl = matchingResult?.photoUrl || '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BRL Engineering Audit - Deviation Report</title>
<style>
    body { margin: 0; padding: 20px; background: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #222; }
    .container { max-width: 900px; margin: auto; background: #ffffff; border: 1px solid #d9dee3; }
    .header { padding: 20px 25px; border-bottom: 3px solid #1f4e78; }
    .header h1 { margin: 0; font-size: 22px; color: #1f4e78; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #666; }
    .intro { padding: 20px 25px 0px 25px; font-size: 14px; line-height: 1.6; }
    .status { margin: 20px 25px; padding: 12px 15px; background: #fff1f1; border-left: 5px solid #d32f2f; color: #b71c1c; font-weight: bold; }
    .summary { margin: 20px 25px; padding: 12px 15px; background: #f3f8fc; border-left: 5px solid #1f4e78; font-size: 13px; }
    .section { margin: 20px 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #1f4e78; padding-bottom: 8px; border-bottom: 1px solid #ddd; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { width: 25%; background: #f2f5f7; text-align: left; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
    td { padding: 10px; border: 1px solid #ddd; }
    .critical { color: #c62828; font-weight: bold; }
    .observation { background: #fff8e1; padding: 12px; border: 1px solid #f0d98a; line-height: 1.6; }
    .action { background: #f3f8fc; padding: 12px; border: 1px solid #c8dcea; line-height: 1.6; }
    .photo { text-align: center; margin-top: 10px; }
    .photo img { max-width: 500px; width: 100%; border: 1px solid #ccc; }
    .button { display: inline-block; padding: 10px 18px; background: #1f4e78; color: white !important; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .footer { margin-top: 25px; padding: 15px 25px; background: #f2f5f7; font-size: 12px; color: #666; text-align: center; line-height: 1.6; }
    .signature { padding: 20px 25px; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>BRL Engineering Audit – Deviation Notification</h1>
        <p>Automated Engineering Audit Management System</p>
    </div>
    <div class="intro">
        <p>Dear Process Owner,</p>
        <p>Please review the following deviations identified during today's process audit. Kindly take the necessary corrective action and ensure timely closure of the identified points.</p>
    </div>
    <div class="status">⚠ DEVIATION IDENTIFIED – ACTION REQUIRED</div>
    <div class="summary">
        <strong>Audit Date:</strong> ${auditDate}<br>
        <strong>Auditor:</strong> ${auditorName}<br>
        <strong>Section:</strong> ${section}<br>
        <strong>Sub Section:</strong> ${subSection}<br>
        <strong>Total Deviations:</strong> ${totalDeviations}<br>
        <strong>Critical Deviations:</strong> ${criticalCount}
    </div>

    ${
      isSingle
        ? `<div class="section">
        <div class="section-title">Deviation Details</div>
        <table>
            <tr><th>Audit ID</th><td>${auditId}</td></tr>
            <tr><th>Line / Machine</th><td>${lineMachine}</td></tr>
            <tr><th>Component</th><td>${compName}</td></tr>
            <tr><th>Checkpoint</th><td>${ckText}</td></tr>
            <tr><th>Standard Parameter</th><td>${stdParam}</td></tr>
            <tr><th>Actual Value</th><td class="critical">${actVal}</td></tr>
            <tr><th>Criticality</th><td class="critical">${crit}</td></tr>
            <tr><th>Status</th><td>${singleAction.status || 'NG'}</td></tr>
        </table>
    </div>
    <div class="section">
        <div class="section-title">Observation</div>
        <div class="observation">${obs}</div>
    </div>
    <div class="section">
        <div class="section-title">Potential Impact</div>
        <div class="observation">${failImpact}</div>
    </div>
    <div class="section">
        <div class="section-title">Corrective Action Required</div>
        <div class="action">${corrAction}</div>
    </div>
    <div class="section">
        <div class="section-title">Responsibility & Target Completion Date</div>
        <table>
            <tr><th>Responsible Person</th><td>Process Engineering Team</td></tr>
            <tr><th>Department</th><td>Engineering / Maintenance</td></tr>
            <tr><th>Target Completion Date</th><td>${targetDate}</td></tr>
        </table>
    </div>
    ${
      photoUrl
        ? `<div class="section">
        <div class="section-title">Deviation Photograph</div>
        <div class="photo"><img src="${photoUrl}" alt="Deviation Photo"></div>
    </div>`
        : ''
    }`
        : `<div class="section">
        <div class="section-title">Deviation Summary</div>
        <table>
            <thead><tr><th>Line / Machine</th><th>Component</th><th>Checkpoint</th><th>Observation</th><th>Criticality</th><th>Status</th></tr></thead>
            <tbody>${deviationRowsHtml}</tbody>
        </table>
    </div>`
    }

    <div class="section" style="text-align:center;">
        <a href="${auditUrl}" class="button">View Audit Records in Drive</a>
    </div>
    <div class="signature">
        <p>Kindly review the above observations and ensure that the necessary corrective actions are implemented within the specified timeline.</p>
        <p>For any clarification, please contact the Audit Team.</p>
        <p>Regards,<br><strong>BRL Engineering Audit Team</strong></p>
    </div>
    <div class="footer">
        This is an automatically generated notification from the BRL Engineering Audit Management System.<br><br>
        Please do not reply directly to this email.
    </div>
</div>
</body>
</html>`;

    // Configure SMTP transport (defaults to environment settings or SMTP)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"BRL Engineering Audit" <${process.env.SMTP_USER}>`,
        to: recipients,
        subject,
        html,
      });

      return { sent: true, method: 'SMTP' };
    }

    return { sent: false, reason: 'SMTP credentials not configured' };
  }
}
