import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load real plant actions extracted directly from plant storage
const realActionsPath = path.join(__dirname, '../lib/realPlantActions.json');
const allActions = JSON.parse(fs.readFileSync(realActionsPath, 'utf-8'));

// Filter strictly for open actions (Open, In Progress, Pending Verification)
const openDeviations = allActions.filter((a) => {
  const s = (a.status || 'Open').toLowerCase().trim();
  return s !== 'closed' && s !== 'done';
});

console.log(`Loaded ${openDeviations.length} real open plant deviations.`);

function calculateDaysOpen(createdAt, targetDate) {
  const now = new Date();
  const created = createdAt ? new Date(createdAt) : now;
  const diffTime = Math.max(0, now.getTime() - created.getTime());
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let isOverdue = false;
  let overdueDays = 0;
  if (targetDate) {
    const target = new Date(targetDate);
    if (!isNaN(target.getTime())) {
      const targetDiff = now.getTime() - target.getTime();
      if (targetDiff > 0) {
        isOverdue = true;
        overdueDays = Math.floor(targetDiff / (1000 * 60 * 60 * 24));
      }
    }
  }

  return { days, isOverdue, overdueDays };
}

function formatAuditDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function generateHtmlCharts(stats) {
  const depts = Object.entries(stats.deptBreakdown);
  const total = stats.totalOpen || 1;
  const p0to15 = Math.round((stats.age0to15 / total) * 100);
  const p16to30 = Math.round((stats.age16to30 / total) * 100);
  const p30plus = Math.max(0, 100 - p0to15 - p16to30);

  return `
    <!-- KPI Summary Row -->
    <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin: 16px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #1e3a8a, #2563eb); border-radius: 10px; padding: 12px 14px; text-align: center; color: #ffffff; width: 20%;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.85;">Total Open</div>
          <div style="font-size: 26px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.totalOpen}</div>
          <div style="font-size: 10px; opacity: 0.85; margin-top: 2px;">Active Plant Points</div>
        </td>
        <td style="background: linear-gradient(135deg, #991b1b, #dc2626); border-radius: 10px; padding: 12px 14px; text-align: center; color: #ffffff; width: 20%;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.85;">Overdue</div>
          <div style="font-size: 26px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.overdue}</div>
          <div style="font-size: 10px; opacity: 0.85; margin-top: 2px;">&gt; Target Closure Date</div>
        </td>
        <td style="background: linear-gradient(135deg, #92400e, #d97706); border-radius: 10px; padding: 12px 14px; text-align: center; color: #ffffff; width: 20%;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.85;">Pending Verify</div>
          <div style="font-size: 26px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.pendingVerify}</div>
          <div style="font-size: 10px; opacity: 0.85; margin-top: 2px;">Awaiting Physical Sign-off</div>
        </td>
        <td style="background: linear-gradient(135deg, #065f46, #059669); border-radius: 10px; padding: 12px 14px; text-align: center; color: #ffffff; width: 20%;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.85;">In Progress</div>
          <div style="font-size: 26px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.inProgress}</div>
          <div style="font-size: 10px; opacity: 0.85; margin-top: 2px;">CAPA Underway</div>
        </td>
        <td style="background: linear-gradient(135deg, #831843, #db2777); border-radius: 10px; padding: 12px 14px; text-align: center; color: #ffffff; width: 20%;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.85;">Critical Priority</div>
          <div style="font-size: 26px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.critical}</div>
          <div style="font-size: 10px; opacity: 0.85; margin-top: 2px;">High Plant Risk</div>
        </td>
      </tr>
    </table>

    <!-- Visual Distribution Charts (Aging & Department) -->
    <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 16px;">
      <tr>
        <!-- Aging Progress Stack Chart -->
        <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            📊 Deviation Aging Distribution
          </div>
          <table style="width: 100%; height: 16px; border-collapse: collapse; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <tr>
              ${stats.age0to15 > 0 ? `<td style="width: ${p0to15}%; background-color: #10b981;" title="0-15 Days (${stats.age0to15})"></td>` : ''}
              ${stats.age16to30 > 0 ? `<td style="width: ${p16to30}%; background-color: #f59e0b;" title="16-30 Days (${stats.age16to30})"></td>` : ''}
              ${stats.age30plus > 0 ? `<td style="width: ${p30plus}%; background-color: #ef4444;" title=">30 Days (${stats.age30plus})"></td>` : ''}
              ${stats.totalOpen === 0 ? `<td style="width: 100%; background-color: #10b981;"></td>` : ''}
            </tr>
          </table>
          <table style="width: 100%; font-size: 11px;">
            <tr>
              <td style="color: #065f46; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #10b981; border-radius: 2px; margin-right: 4px;"></span>0–15d: <strong>${stats.age0to15}</strong></td>
              <td style="color: #92400e; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #f59e0b; border-radius: 2px; margin-right: 4px;"></span>16–30d: <strong>${stats.age16to30}</strong></td>
              <td style="color: #991b1b; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #ef4444; border-radius: 2px; margin-right: 4px;"></span>&gt;30d: <strong>${stats.age30plus}</strong></td>
            </tr>
          </table>
        </td>

        <!-- Department Breakdown Summary -->
        <td style="width: 50%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; vertical-align: top;">
          <div style="font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🏭 Open Deviations by Department
          </div>
          <div>
            ${depts.length > 0 ? depts.map(([dept, count]) => `
              <span style="display: inline-block; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 10.5px; color: #1e293b;">
                <strong>${dept}</strong>: <span style="color: #2563eb; font-weight: 800;">${count}</span>
              </span>
            `).join('') : '<span style="font-size: 11px; color: #64748b;">No department deviations recorded</span>'}
          </div>
        </td>
      </tr>
    </table>
  `;
}

async function sendDigestDirectly() {
  const processedActions = openDeviations.map((a) => {
    const targetDate = a.targetDate || a.targetClosureDate || a.target_date || '-';
    const { days, isOverdue, overdueDays } = calculateDaysOpen(a.createdAt || a.created_at, targetDate);
    const auditDate = formatAuditDate(a.auditDate || a.audit_date || a.createdAt || a.created_at);

    let effectiveStatus = a.status || 'Open';
    if (effectiveStatus !== 'Pending Verification' && effectiveStatus !== 'Pending Admin Verify' && isOverdue) {
      effectiveStatus = 'Overdue';
    }

    return {
      ...a,
      actionId: a.actionId || a.action_id || a.id,
      auditId: a.auditId || a.audit_id || '-',
      auditDate,
      lineName: a.lineName || a.line_name || a.lineId || '-',
      sectionName: a.sectionName || a.section_name || a.sectionId || '-',
      subSectionName: a.subSectionName || a.sub_section_name || a.subSectionId || '-',
      componentName: a.componentName || a.component_name || '-',
      checkpointText: a.checkpointText || a.checkpoint_text || '-',
      observation: a.observation || '-',
      responsiblePerson: a.responsiblePerson || a.responsible_person || 'General FPR',
      responsibleDepartment: a.responsibleDepartment || a.responsible_department || 'Maintenance',
      assignedEmail: a.assignedEmail || a.assigned_email || '',
      ccEmail: a.ccEmail || a.cc_email || '',
      targetDate,
      priority: a.priority || 'Medium',
      status: effectiveStatus,
      daysOpen: days,
      isOverdue,
      overdueDays,
    };
  });

  // Sort: Critical first, then Overdue, then longest Days Open
  processedActions.sort((a, b) => {
    const prioOrder = { Critical: 4, High: 3, Major: 3, Medium: 2, Minor: 1, Low: 1 };
    const prioDiff = (prioOrder[b.priority] || 1) - (prioOrder[a.priority] || 1);
    if (prioDiff !== 0) return prioDiff;
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return b.daysOpen - a.daysOpen;
  });

  const deptBreakdown = {};
  let age0to15 = 0;
  let age16to30 = 0;
  let age30plus = 0;
  let overdueCount = 0;
  let criticalCount = 0;
  let inProgressCount = 0;
  let pendingVerifyCount = 0;
  let openOnlyCount = 0;

  processedActions.forEach((act) => {
    const dept = act.responsibleDepartment || 'General';
    deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;

    if (act.daysOpen <= 15) age0to15++;
    else if (act.daysOpen <= 30) age16to30++;
    else age30plus++;

    if (act.isOverdue || act.status === 'Overdue') overdueCount++;
    if (act.priority === 'Critical') criticalCount++;
    if (act.status === 'In Progress') inProgressCount++;
    else if (act.status === 'Pending Verification' || act.status === 'Pending Admin Verify') pendingVerifyCount++;
    else openOnlyCount++;
  });

  const stats = {
    totalOpen: processedActions.length,
    openOnly: openOnlyCount,
    inProgress: inProgressCount,
    pendingVerify: pendingVerifyCount,
    overdue: overdueCount,
    critical: criticalCount,
    deptBreakdown,
    age0to15,
    age16to30,
    age30plus,
  };

  // Strictly Mehul Chikhaliya only while in dev mode
  const DEV_MODE_ONLY_MEHUL = true;
  let toRecipients = [];
  let ccRecipients = [];

  if (DEV_MODE_ONLY_MEHUL) {
    toRecipients = ['mehul.chikhaliya@borosil.com'];
    ccRecipients = [];
  }

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const subject = `⚠️ [Action Required] Plant Engineering Audit: ${stats.totalOpen} Open Deviations (${stats.overdue} Overdue) — ${dateFormatted}`;

  const tableRowsHtml = processedActions.map((act, index) => {
    const isCritical = act.priority === 'Critical';
    const isOverdue = act.isOverdue || act.status === 'Overdue';
    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';

    let prioBadge = '<span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9.5px; border: 1px solid #e2e8f0; display: inline-block;">Medium</span>';
    if (act.priority === 'Critical') {
      prioBadge = '<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #fecaca; display: inline-block;">CRITICAL</span>';
    } else if (act.priority === 'High' || act.priority === 'Major') {
      prioBadge = '<span style="background-color: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9.5px; border: 1px solid #fed7aa; display: inline-block;">HIGH</span>';
    }

    let statusBadge = `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 800; border: 1px solid #93c5fd; display: inline-block;">${act.status}</span>`;
    if (act.status === 'Pending Verification' || act.status === 'Pending Admin Verify') {
      statusBadge = '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 800; border: 1px solid #f59e0b; display: inline-block;">Pending Verify</span>';
    } else if (isOverdue) {
      statusBadge = `<span style="background-color: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 800; border: 1px solid #ef4444; display: inline-block;">Overdue (${act.overdueDays}d)</span>`;
    }

    let agingBadge = `<span style="background-color: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 800; border: 1px solid #a7f3d0; display: inline-block;">${act.daysOpen}d</span>`;
    if (act.daysOpen > 30) {
      agingBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 800; border: 1px solid #fecaca; display: inline-block;">${act.daysOpen}d</span>`;
    } else if (act.daysOpen > 15) {
      agingBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 800; border: 1px solid #fde68a; display: inline-block;">${act.daysOpen}d</span>`;
    }

    const highlightBorder = isCritical ? 'border-left: 3px solid #db2777;' : isOverdue ? 'border-left: 3px solid #ef4444;' : '';

    return `
      <tr style="background-color: ${rowBg}; ${highlightBorder}">
        <!-- Date of Audit -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10.5px; color: #334155; font-weight: 600;">
          ${act.auditDate}
        </td>

        <!-- Line / Area -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          <strong style="color: #0f172a; font-size: 11px; display: block;">${act.lineName || '-'}</strong>
          <span style="font-size: 9.5px; color: #64748b;">${act.sectionName || '-'}</span>
        </td>

        <!-- Sub-Section -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          <span style="font-size: 10.5px; color: #334155; font-weight: 600;">${act.subSectionName || '-'}</span>
        </td>

        <!-- Component & Checkpoint -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          <strong style="color: #0f172a; font-size: 11px; display: block;">${act.componentName}</strong>
          <div style="font-size: 10px; color: #64748b; line-height: 1.35; margin-top: 2px;">${act.checkpointText}</div>
        </td>

        <!-- Observation Finding -->
        <td style="padding: 8px 6px; font-size: 10.5px; color: #b91c1c; font-weight: 600; line-height: 1.35; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          ${act.observation}
        </td>

        <!-- Assigned FPR -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          <strong style="color: #1e293b; font-size: 10.5px; display: block;">${act.responsiblePerson}</strong>
          <div style="font-size: 9.5px; color: #64748b;">${act.responsibleDepartment}</div>
        </td>

        <!-- Priority -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
          ${prioBadge}
        </td>

        <!-- Status / TCD -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
          ${statusBadge}
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">TCD: ${act.targetDate}</div>
        </td>

        <!-- Aging -->
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
          ${agingBadge}
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Calibri, Arial, sans-serif; font-size: 12px; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 12px; }
    .container { width: 100% !important; max-width: 100% !important; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); box-sizing: border-box; }
    .portal-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 12.5px; letter-spacing: 0.3px; }
    .table-container { padding: 0 16px 20px 16px; width: 100%; box-sizing: border-box; }
    table.data-table { width: 100% !important; border-collapse: collapse; table-layout: fixed; word-break: break-word; overflow-wrap: break-word; }
    table.data-table th { background-color: #f8fafc; font-size: 9.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #cbd5e1; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 20px 20px 0 20px;">
      <!-- Greetings Message (Exact User Requested Format) -->
      <div style="font-size: 13px; line-height: 1.6; color: #1e293b; margin-bottom: 16px;">
        <p style="margin: 0 0 10px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">Dear Sir,</p>
        <p style="margin: 0 0 10px 0;">Currently, <strong>${stats.totalOpen} engineering deviation points</strong> are open, and all have exceeded their Target Closure Dates (TCDs).</p>
        <p style="margin: 0 0 10px 0;">Concerned FPR leads are requested to submit RCA/CAPA and after-action photos in the portal at the earliest.</p>
        <p style="margin: 0 0 4px 0;">Kindly prioritize these points and ensure timely closure.</p>
      </div>

      <!-- Visual HTML Charts: KPI Cards, Aging Stack Bar & Department Breakdown -->
      ${generateHtmlCharts(stats)}
    </div>

    <!-- Data Table (Fits 100% width with no horizontal scroll) -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 8%; padding: 8px 6px;">Date of Audit</th>
            <th style="width: 9%; padding: 8px 6px;">Line / Area</th>
            <th style="width: 9%; padding: 8px 6px;">Sub-Section</th>
            <th style="width: 24%; padding: 8px 6px;">Component &amp; Checkpoint</th>
            <th style="width: 20%; padding: 8px 6px;">Observation Finding</th>
            <th style="width: 13%; padding: 8px 6px;">Assigned FPR</th>
            <th style="width: 6%; padding: 8px 6px; text-align: center;">Priority</th>
            <th style="width: 7%; padding: 8px 6px; text-align: center;">Status / TCD</th>
            <th style="width: 4%; padding: 8px 6px; text-align: center;">Aging</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Call to action button -->
    <div style="text-align: center; padding: 10px 24px 24px 24px;">
      <a href="https://brl-engineering-audit.vercel.app/?tab=actions" class="portal-btn">
        Open Interactive Action Tracker in Portal →
      </a>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
        Login with your corporate Borosil email to update Root Cause, Corrective Actions, or complete verification.
      </div>
    </div>

    <!-- Clean Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center;">
      © ${today.getFullYear()} Borosil Renewables Ltd. • Process Quality Assurance Department.
    </div>
  </div>
</body>
</html>
  `;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'process.qa@borosil.com',
      pass: 'mkse ghmg fuua uncx',
    },
    tls: { rejectUnauthorized: false },
  });

  console.log('Sending email...');
  console.log('TO:', toRecipients.join(', '));
  console.log('CC:', ccRecipients.length > 0 ? ccRecipients.join(', ') : '(None - Strictly Dev Mode)');

  const info = await transporter.sendMail({
    from: 'Process QA <process.qa@borosil.com>',
    to: toRecipients.join(', '),
    subject,
    html: htmlContent,
  });

  console.log(`✅ SUCCESS! Email successfully dispatched to Mehul Chikhaliya!`);
  console.log(`Message ID: ${info.messageId}`);
  console.log(`Stats: Total Open: ${stats.totalOpen}, Overdue: ${stats.overdue}, Critical: ${stats.critical}`);
}

sendDigestDirectly().catch(console.error);
