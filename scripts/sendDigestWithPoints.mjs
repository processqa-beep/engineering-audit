import nodemailer from 'nodemailer';

// Real open deviations from the plant
const openDeviations = [
  {
    actionId: 'ACT-2026-0816-01',
    auditId: 'AUD-2026-0816-01',
    sectionName: 'Grinding',
    lineName: 'Benteler Line 1',
    componentName: 'Diamond Grinding Wheel Spindle',
    checkpointText: 'Check diamond grinding spindle bearing temperature and vibration',
    observation: 'High temperature (62°C) and excessive vibration detected on right spindle bearing.',
    recommendedAction: 'Replace spindle bearings, inspect dynamic balance, and check lubrication flow.',
    responsiblePerson: 'Hiren Patel',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'hiren.patel@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-10-25',
    priority: 'Critical',
    status: 'In Progress',
    createdAt: '2026-10-10T09:35:00.000Z',
  },
  {
    actionId: 'ACT-2026-0815-02',
    auditId: 'AUD-2026-0815-02',
    sectionName: 'Robot',
    lineName: 'Benteler Line 2',
    componentName: 'Vacuum Suction Cups & Venturi',
    checkpointText: 'Check vacuum level and rubber suction cup lip wear',
    observation: 'Vacuum leak on cup #4 due to lip tear (-0.62 bar vs std -0.80 bar); risk of glass slippage.',
    recommendedAction: 'Replace vacuum cup #4 rubber pad and clean venturi generator filter mesh.',
    responsiblePerson: 'Rakesh Gohil',
    responsibleDepartment: 'Engineering',
    assignedEmail: 'rakesh.gohil@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-10-28',
    priority: 'Critical',
    status: 'Open',
    createdAt: '2026-10-12T14:20:00.000Z',
  },
  {
    actionId: 'ACT-2026-0814-03',
    auditId: 'AUD-2026-0814-03',
    sectionName: 'Washing',
    lineName: 'Benteler Line 1',
    componentName: 'Cylindrical Brush Roller',
    checkpointText: 'Inspect nylon brush bristle height and roller alignment',
    observation: 'Uneven brush wear causing persistent water streak marks across glass center zone.',
    recommendedAction: 'Adjust brush contact height setting and schedule replacement brush roller.',
    responsiblePerson: 'Hiren Patel',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'hiren.patel@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-11-02',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '2026-10-14T11:05:00.000Z',
  },
  {
    actionId: 'ACT-2026-0818-04',
    auditId: 'AUD-2026-0818-01',
    sectionName: 'Tempering',
    lineName: 'Tempering Line 1',
    componentName: 'Quench Air Nozzle Array',
    checkpointText: 'Check quench nozzle pressure uniformity and differential gauge',
    observation: 'Nozzle pressure differential exceeded 18 mbar between top and bottom headers.',
    recommendedAction: 'Inspect damper actuators, calibrate differential transmitter, and balance airflow.',
    responsiblePerson: 'Ramesh Sharma',
    responsibleDepartment: 'Electrical',
    assignedEmail: 'ramesh.sharma@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-10-30',
    priority: 'High',
    status: 'Pending Verification',
    createdAt: '2026-10-15T16:10:00.000Z',
  },
  {
    actionId: 'ACT-2026-0820-05',
    auditId: 'AUD-2026-0820-02',
    sectionName: 'Cutting',
    lineName: 'Cutting Line 2',
    componentName: 'Carbide Cutting Wheel & Oil Dosing',
    checkpointText: 'Verify cutting oil droplet dosing rate and wheel sharpness',
    observation: 'Cutting fluid micro-dosing intermittent due to air bubbles in supply solenoid manifold.',
    recommendedAction: 'Bleed air from fluid lines, replace dosing check valve, and verify droplet frequency.',
    responsiblePerson: 'Hiren Patel',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'hiren.patel@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-11-04',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-10-18T10:30:00.000Z',
  },
  {
    actionId: 'ACT-2026-0822-06',
    auditId: 'AUD-2026-0822-01',
    sectionName: 'Utilities',
    lineName: 'Compressor House',
    componentName: 'Air Compressor #2 Intercooler',
    checkpointText: 'Monitor interstage cooling temperature and condensate drain auto-purge',
    observation: 'Intercooler discharge air temperature high (49°C vs 40°C limit); drain valve timer sticky.',
    recommendedAction: 'Service auto-purge solenoid valve and flush intercooler radiator fin tubes.',
    responsiblePerson: 'Hiren Patel',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'hiren.patel@borosil.com',
    ccEmail: 'mehul.chikhaliya@borosil.com',
    targetDate: '2026-11-01',
    priority: 'Medium',
    status: 'Open',
    createdAt: '2026-10-20T08:15:00.000Z',
  },
];

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

function generateHtmlCharts(stats) {
  const depts = Object.entries(stats.deptBreakdown);
  const total = stats.totalOpen || 1;
  const p0to15 = Math.round((stats.age0to15 / total) * 100);
  const p16to30 = Math.round((stats.age16to30 / total) * 100);
  const p30plus = Math.round((stats.age30plus / total) * 100);

  return `
    <!-- KPI Metric Cards Grid -->
    <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin: 16px 0;">
      <tr>
        <td style="width: 20%; background-color: #f0f9ff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 12px 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px; text-transform: uppercase;">Total Open</div>
          <div style="font-size: 26px; font-weight: 900; color: #0369a1; margin: 4px 0;">${stats.totalOpen}</div>
          <div style="font-size: 9.5px; color: #64748b; font-weight: 600;">Deviations</div>
        </td>
        <td style="width: 20%; background-color: #fef2f2; border: 1.5px solid #dc2626; border-radius: 10px; padding: 12px 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #dc2626; letter-spacing: 0.5px; text-transform: uppercase;">Overdue &gt; TCD</div>
          <div style="font-size: 26px; font-weight: 900; color: #b91c1c; margin: 4px 0;">${stats.overdue}</div>
          <div style="font-size: 9.5px; color: #991b1b; font-weight: 700;">Immediate Action</div>
        </td>
        <td style="width: 20%; background-color: #fffbeb; border: 1.5px solid #d97706; border-radius: 10px; padding: 12px 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #d97706; letter-spacing: 0.5px; text-transform: uppercase;">Pending Verify</div>
          <div style="font-size: 26px; font-weight: 900; color: #b45309; margin: 4px 0;">${stats.pendingVerify}</div>
          <div style="font-size: 9.5px; color: #92400e; font-weight: 600;">Shop-Floor Check</div>
        </td>
        <td style="width: 20%; background-color: #eef2ff; border: 1.5px solid #4f46e5; border-radius: 10px; padding: 12px 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #4f46e5; letter-spacing: 0.5px; text-transform: uppercase;">In Progress</div>
          <div style="font-size: 26px; font-weight: 900; color: #3730a3; margin: 4px 0;">${stats.inProgress}</div>
          <div style="font-size: 9.5px; color: #4338ca; font-weight: 600;">Work Underway</div>
        </td>
        <td style="width: 20%; background-color: #fdf2f8; border: 1.5px solid #db2777; border-radius: 10px; padding: 12px 8px; text-align: center; vertical-align: top;">
          <div style="font-size: 10px; font-weight: 800; color: #db2777; letter-spacing: 0.5px; text-transform: uppercase;">Critical Prio</div>
          <div style="font-size: 26px; font-weight: 900; color: #9d174d; margin: 4px 0;">${stats.critical}</div>
          <div style="font-size: 9.5px; color: #be185d; font-weight: 600;">Plant Severity</div>
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
  console.log('🚀 Preparing 15-Day Open Points Governance Digest...');

  const processedActions = openDeviations.map((a) => {
    const { days, isOverdue, overdueDays } = calculateDaysOpen(a.createdAt, a.targetDate);
    let effectiveStatus = a.status;
    if (effectiveStatus !== 'Pending Verification' && isOverdue) {
      effectiveStatus = 'Overdue';
    }
    return {
      ...a,
      daysOpen: days,
      isOverdue,
      overdueDays,
      status: effectiveStatus,
    };
  });

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
    else if (act.status === 'Pending Verification') pendingVerifyCount++;
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

  // STRICT RECIPIENT RESTRICTION: Send ONLY to Mehul Chikhaliya
  const toRecipients = ['mehul.chikhaliya@borosil.com'];
  const ccRecipients = []; // strictly 0 in CC

  const today = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateFormatted = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
  const subject = `[DEV REVIEW - MEHUL ONLY] ${stats.totalOpen} Open Deviation Points (${stats.overdue} Overdue) – Borosil Engineering (${dateFormatted})`;

  const tableRowsHtml = processedActions
    .map((act, index) => {
      const isCritical = act.priority === 'Critical';
      const isPending = act.status === 'Pending Verification';
      const isOverdue = act.isOverdue || act.status === 'Overdue';

      let agingBadge = '';
      if (act.daysOpen > 30) {
        agingBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #fecaca; display: inline-block;">⚠️ ${act.daysOpen} Days Open</span>`;
      } else if (act.daysOpen > 15) {
        agingBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #fde68a; display: inline-block;">⏰ ${act.daysOpen} Days</span>`;
      } else {
        agingBadge = `<span style="background-color: #ecfdf5; color: #065f46; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #a7f3d0; display: inline-block;">${act.daysOpen} Days</span>`;
      }

      let statusBadge = '';
      if (isPending) {
        statusBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 1px solid #f59e0b;">Pending Admin Verify</span>`;
      } else if (isOverdue) {
        statusBadge = `<span style="background-color: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 1px solid #ef4444;">Overdue (${act.overdueDays}d)</span>`;
      } else if (act.status === 'In Progress') {
        statusBadge = `<span style="background-color: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 1px solid #93c5fd;">In Progress</span>`;
      } else {
        statusBadge = `<span style="background-color: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10px; border: 1px solid #cbd5e1;">Open</span>`;
      }

      const prioBadge = isCritical
        ? `<span style="background-color: #fdf2f8; color: #be185d; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px; border: 1px solid #fbcfe8;">Critical</span>`
        : `<span style="background-color: #f8fafc; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid #e2e8f0;">${act.priority}</span>`;

      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      const highlightBorder = isCritical ? 'border-left: 4px solid #ec4899;' : isOverdue ? 'border-left: 4px solid #ef4444;' : '';

      return `
        <tr style="background-color: ${rowBg}; ${highlightBorder}">
          <td style="padding: 10px 10px; font-size: 12px; font-weight: 800; color: #4338ca; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            ${act.actionId}
            <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">#${act.auditId || '-'}</div>
          </td>
          <td style="padding: 10px 10px; font-size: 12px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <div>${act.componentName}</div>
            <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">${act.checkpointText}</div>
          </td>
          <td style="padding: 10px 10px; font-size: 11.5px; color: #b91c1c; font-weight: 600; border-bottom: 1px solid #e2e8f0; vertical-align: top; max-width: 220px;">
            ${act.observation}
          </td>
          <td style="padding: 10px 10px; font-size: 11px; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap;">
            <strong style="color: #1e293b;">${act.responsiblePerson}</strong>
            <div style="font-size: 10px; color: #64748b;">${act.responsibleDepartment} (Matrix FPR)</div>
            ${act.assignedEmail ? `<div style="font-size: 9.5px; color: #3b82f6;">${act.assignedEmail}</div>` : ''}
          </td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center; white-space: nowrap;">
            ${prioBadge}
          </td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center; white-space: nowrap;">
            ${statusBadge}
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">TCD: ${act.targetDate}</div>
          </td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center; white-space: nowrap;">
            ${agingBadge}
          </td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Calibri, Arial, sans-serif; font-size: 13px; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 20px; }
    .container { max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .portal-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 13px; letter-spacing: 0.3px; }
    .table-container { padding: 0 24px 24px 24px; overflow-x: auto; }
    table.data-table { width: 100%; border-collapse: collapse; text-align: left; }
    table.data-table th { background-color: #f8fafc; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px; border-bottom: 2px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 24px 28px 0 28px;">
      <!-- Greetings Message -->
      <p style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0;">Dear Sir,</p>
      <p style="font-size: 13px; color: #334155; margin: 0 0 16px 0; line-height: 1.5;">Please find below the open engineering deviation action points requiring your review and necessary action:</p>

      <!-- Action Required Box -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 8px; padding: 12px 16px; font-size: 12.5px; color: #1e40af; line-height: 1.6; margin-bottom: 16px;">
        📌 <strong>Action Required:</strong> Below is the comprehensive list of <strong>${stats.totalOpen} open engineering deviation points</strong>. 
        Please note that <strong>${stats.overdue} points</strong> have crossed their Target Closure Date (TCD). 
        Responsible FPR leads are requested to submit RCA/CAPA and after-evidence photos in the portal. 
        Points under <em>Pending Admin Verify</em> (${stats.pendingVerify}) require physical inspection on the shop floor before final sign-off.
      </div>

      <!-- Visual HTML Charts: KPI Cards, Aging Stack Bar & Department Breakdown -->
      ${generateHtmlCharts(stats)}
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Action ID</th>
            <th>Component &amp; Checkpoint</th>
            <th>Observation Finding</th>
            <th>Assigned FPR</th>
            <th style="text-align: center;">Priority</th>
            <th style="text-align: center;">Status / TCD</th>
            <th style="text-align: center;">Aging</th>
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
