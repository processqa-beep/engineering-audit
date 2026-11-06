import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Supabase Client on Node.js server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nywznyvvqhiiktvoskkv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_wEYpcobIlO1eWIjA7cRdFQ_SkMrwmpZ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Four core governance stakeholders required in CC of EACH mail
const CORE_FOUR_RECIPIENTS = [
  'chhayank.dave@borosil.com',
  'hiren.dodiya@borosil.com',
  'purvesh.kapadiya@borosil.com',
  'mehul.chikhaliya@borosil.com',
];

// Authentic Plant FPR Responsibility Matrix
const AUTHENTIC_FPR_MATRIX = [
  {
    department: 'Maintenance',
    sectionId: 'ALL',
    lineId: 'ALL',
    fprName: 'QA',
    fprEmail: 'process.qa@borosil.com',
    hodName: 'Process QA',
    hodEmail: 'process.qa@borosil.com, purvesh.kapadiya@borosil.com',
  },
  {
    department: 'Utilities',
    sectionId: 'GR',
    lineId: 'ALL',
    fprName: 'Rajesh Patel',
    fprEmail: 'utility.gbl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hodName: 'Kamal Verma',
    hodEmail: 'rajesh.patel@borosil.com, kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, pavan.singh@borosil.com',
  },
  {
    department: 'Production',
    sectionId: 'GR',
    lineId: 'ALL',
    fprName: 'Rajesh and Ravi',
    fprEmail: 'rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hodName: 'Kamal Verma',
    hodEmail: 'kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com',
  },
  {
    department: 'Electrical',
    sectionId: 'GR',
    lineId: 'ALL',
    fprName: 'Ashutosh Patel',
    fprEmail: 'electrical.brl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hodName: 'Kamal Verma',
    hodEmail: 'ashutosh.patel@borosil.com, bhadresh.patel@borosil.com, kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, pavan.singh@borosil.com',
  },
  {
    department: 'Maintenance',
    sectionId: 'GR',
    lineId: 'ALL',
    fprName: 'Sharvan Sahu',
    fprEmail: 'mechanical.brl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hodName: 'Kamal Verma',
    hodEmail: 'kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, jitu.patel@borosil.com, pavan.singh@borosil.com, shravan.sahu@borosil.com',
  },
  {
    department: 'Instrumentation',
    sectionId: 'ALL',
    lineId: 'ALL',
    fprName: 'Sunil chodhary',
    fprEmail: 'sunil.chodhary@borosil.com, pardeep.rathee@borosil.com',
    hodName: 'navin Singh',
    hodEmail: 'navin.singh@borosil.com, sandip.patel@borosil.com, pavan.singh@borosil.com, chhayank.dave@borosil.com, kamalmohit.verma@borosil.com',
  },
  {
    department: 'Instrumentation',
    sectionId: 'GR',
    lineId: 'ALL',
    fprName: 'Nilesh Parmar',
    fprEmail: 'nilesh.parmar@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hodName: 'Kamal Verma',
    hodEmail: 'sandip.patel@borosil.com, pavan.singh@borosil.com, chhayank.dave@borosil.com, kamalmohit.verma@borosil.com, purvesh.kapadiya@borosil.com',
  },
];

function lookupAuthenticFpr(department: string, sectionId?: string, lineId?: string) {
  const cleanDept = (department || '').trim().toLowerCase();
  const cleanSec = (sectionId || '').trim().toUpperCase();
  const cleanLine = (lineId || '').trim().toUpperCase();

  const deptEntries = AUTHENTIC_FPR_MATRIX.filter(
    (e) => e.department.toLowerCase() === cleanDept
  );
  if (deptEntries.length === 0) return null;

  let match = deptEntries.find(
    (e) => e.sectionId === cleanSec && e.lineId === cleanLine
  );
  if (!match) {
    match = deptEntries.find(
      (e) => e.sectionId === cleanSec && (e.lineId === 'ALL' || !e.lineId)
    );
  }
  if (!match) {
    match = deptEntries.find(
      (e) => (e.sectionId === 'ALL' || !e.sectionId) && e.lineId === cleanLine
    );
  }
  if (!match) {
    match = deptEntries.find(
      (e) => (e.sectionId === 'ALL' || !e.sectionId) && (e.lineId === 'ALL' || !e.lineId)
    );
  }
  return match || deptEntries[0];
}

// Department display name configuration
const PLANT_DEPT_CONFIG: Record<string, { displayName: string }> = {
  maintenance: { displayName: 'Maintenance' },
  utilities: { displayName: 'Utilities' },
  production: { displayName: 'Production' },
  electrical: { displayName: 'Electrical' },
  instrumentation: { displayName: 'Instrumentation' },
  'process qa': { displayName: 'Process QA' },
  qa: { displayName: 'Process QA' },
};

function unpackClosureRemark(rawRemark: string | null | undefined): {
  closureRemark: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  targetClosureDate?: string;
  closedBy?: string;
  resolvedBy?: string;
  resolvedDate?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  adminVerificationRemarks?: string;
} {
  if (!rawRemark) return { closureRemark: '' };
  if (rawRemark.includes('<!--CAPA_DATA:') && rawRemark.includes('-->')) {
    try {
      const match = rawRemark.match(/<!--CAPA_DATA:(.*?)-->/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        const cleanRemark = rawRemark.replace(/<!--CAPA_DATA:.*?-->/, '').trim();
        return {
          closureRemark: cleanRemark || meta.rmk || '',
          rootCause: meta.rc || undefined,
          correctiveAction: meta.ca || undefined,
          preventiveAction: meta.pa || undefined,
          targetClosureDate: meta.tcd || undefined,
          closedBy: meta.cb || undefined,
          resolvedBy: meta.rb || undefined,
          resolvedDate: meta.rd || undefined,
          verifiedBy: meta.vb || undefined,
          verifiedDate: meta.vd || undefined,
          adminVerificationRemarks: meta.vr || undefined,
        };
      }
    } catch (_) {}
  }
  return { closureRemark: rawRemark.trim() };
}

function calculateDaysOpen(createdAt?: string, targetDate?: string): { days: number; isOverdue: boolean; overdueDays: number } {
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

function formatAuditDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Generate modern, pure HTML/CSS Visual Charts (KPI Cards and Aging Stack Bar)
function generateHtmlCharts(stats: {
  totalOpen: number;
  openOnly: number;
  inProgress: number;
  pendingVerify: number;
  overdue: number;
  critical: number;
  deptBreakdown: Record<string, number>;
  age0to15: number;
  age16to30: number;
  age30plus: number;
}): string {
  const total = stats.totalOpen || 1;
  const p0to15 = Math.round((stats.age0to15 / total) * 100);
  const p16to30 = Math.round((stats.age16to30 / total) * 100);
  const p30plus = Math.max(0, 100 - p0to15 - p16to30);

  return `
    <!-- KPI Summary Row -->
    <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin: 14px 0 16px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #1e3a8a, #2563eb); border-radius: 8px; padding: 10px 12px; text-align: center; color: #ffffff; width: 25%;">
          <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.9;">Total Open</div>
          <div style="font-size: 24px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.totalOpen}</div>
          <div style="font-size: 9.5px; opacity: 0.85; margin-top: 2px;">Points Requiring Action</div>
        </td>
        <td style="background: linear-gradient(135deg, #991b1b, #dc2626); border-radius: 8px; padding: 10px 12px; text-align: center; color: #ffffff; width: 25%;">
          <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.9;">Overdue</div>
          <div style="font-size: 24px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.overdue}</div>
          <div style="font-size: 9.5px; opacity: 0.85; margin-top: 2px;">&gt; Target Closure Date</div>
        </td>
        <td style="background: linear-gradient(135deg, #831843, #db2777); border-radius: 8px; padding: 10px 12px; text-align: center; color: #ffffff; width: 25%;">
          <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.9;">Critical Priority</div>
          <div style="font-size: 24px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.critical}</div>
          <div style="font-size: 9.5px; opacity: 0.85; margin-top: 2px;">High Plant Risk</div>
        </td>
        <td style="background: linear-gradient(135deg, #92400e, #d97706); border-radius: 8px; padding: 10px 12px; text-align: center; color: #ffffff; width: 25%;">
          <div style="font-size: 9.5px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; opacity: 0.9;">Pending Verify</div>
          <div style="font-size: 24px; font-weight: 900; line-height: 1.2; margin-top: 2px;">${stats.pendingVerify}</div>
          <div style="font-size: 9.5px; opacity: 0.85; margin-top: 2px;">Shop Floor Check</div>
        </td>
      </tr>
    </table>

    <!-- Aging Progress Stack Chart -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
      <div style="font-size: 10.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">
        📊 Deviation Aging Breakdown
      </div>
      <table style="width: 100%; height: 12px; border-collapse: collapse; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
        <tr>
          ${stats.age0to15 > 0 ? `<td style="width: ${p0to15}%; background-color: #10b981;" title="0-15 Days (${stats.age0to15})"></td>` : ''}
          ${stats.age16to30 > 0 ? `<td style="width: ${p16to30}%; background-color: #f59e0b;" title="16-30 Days (${stats.age16to30})"></td>` : ''}
          ${stats.age30plus > 0 ? `<td style="width: ${p30plus}%; background-color: #ef4444;" title=">30 Days (${stats.age30plus})"></td>` : ''}
          ${stats.totalOpen === 0 ? `<td style="width: 100%; background-color: #10b981;"></td>` : ''}
        </tr>
      </table>
      <table style="width: 100%; font-size: 10.5px;">
        <tr>
          <td style="color: #065f46; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #10b981; border-radius: 2px; margin-right: 4px;"></span>0–15d: <strong>${stats.age0to15}</strong></td>
          <td style="color: #92400e; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #f59e0b; border-radius: 2px; margin-right: 4px;"></span>16–30d: <strong>${stats.age16to30}</strong></td>
          <td style="color: #991b1b; font-weight: 700;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #ef4444; border-radius: 2px; margin-right: 4px;"></span>&gt;30d: <strong>${stats.age30plus}</strong></td>
        </tr>
      </table>
    </div>
  `;
}

function buildDepartmentHtml(deptDisplayName: string, actions: any[]): string {
  let age0to15 = 0;
  let age16to30 = 0;
  let age30plus = 0;
  let overdueCount = 0;
  let criticalCount = 0;
  let inProgressCount = 0;
  let pendingVerifyCount = 0;
  let openOnlyCount = 0;

  actions.forEach((act) => {
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
    totalOpen: actions.length,
    openOnly: openOnlyCount,
    inProgress: inProgressCount,
    pendingVerify: pendingVerifyCount,
    overdue: overdueCount,
    critical: criticalCount,
    deptBreakdown: { [deptDisplayName]: actions.length },
    age0to15,
    age16to30,
    age30plus,
  };

  const tableRowsHtml = actions
    .map((act, index) => {
      const isCritical = act.priority === 'Critical';
      const isOverdue = act.isOverdue || act.status === 'Overdue';
      const isPending = act.status === 'Pending Verification' || act.status === 'Pending Admin Verify';

      let agingBadge = '';
      if (act.daysOpen > 30) {
        agingBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #fecaca; display: inline-block;">${act.daysOpen}d</span>`;
      } else if (act.daysOpen > 15) {
        agingBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #fde68a; display: inline-block;">${act.daysOpen}d</span>`;
      } else {
        agingBadge = `<span style="background-color: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #a7f3d0; display: inline-block;">${act.daysOpen}d</span>`;
      }

      let statusBadge = '';
      if (isPending) {
        statusBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #f59e0b; display: inline-block;">Pending Verify</span>`;
      } else if (isOverdue) {
        statusBadge = `<span style="background-color: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #ef4444; display: inline-block;">Overdue (${act.overdueDays}d)</span>`;
      } else if (act.status === 'In Progress') {
        statusBadge = `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #93c5fd; display: inline-block;">In Progress</span>`;
      } else {
        statusBadge = `<span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #cbd5e1; display: inline-block;">Open</span>`;
      }

      const prioBadge = isCritical
        ? `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9.5px; border: 1px solid #fecaca; display: inline-block;">CRITICAL</span>`
        : `<span style="background-color: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9.5px; border: 1px solid #fed7aa; display: inline-block;">${act.priority}</span>`;

      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      const highlightBorder = isCritical ? 'border-left: 3px solid #db2777;' : isOverdue ? 'border-left: 3px solid #ef4444;' : '';

      return `
        <tr style="background-color: ${rowBg}; ${highlightBorder}">
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 10.5px; color: #334155; font-weight: 600;">
            ${act.auditDate}
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <strong style="color: #0f172a; font-size: 11px; display: block;">${act.lineName || '-'}</strong>
            <span style="font-size: 9.5px; color: #64748b;">${act.sectionName || '-'}</span>
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <span style="font-size: 10.5px; color: #334155; font-weight: 600;">${act.subSectionName || '-'}</span>
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <strong style="color: #0f172a; font-size: 11px; display: block;">${act.componentName}</strong>
            <div style="font-size: 10px; color: #64748b; line-height: 1.35; margin-top: 2px;">${act.checkpointText}</div>
          </td>
          <td style="padding: 8px 6px; font-size: 10.5px; color: #b91c1c; font-weight: 600; line-height: 1.35; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            ${act.observation}
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <strong style="color: #1e293b; font-size: 10.5px; display: block;">${act.responsiblePerson}</strong>
            <div style="font-size: 9.5px; color: #64748b;">${act.responsibleDepartment}</div>
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
            ${prioBadge}
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
            ${statusBadge}
            <div style="font-size: 9px; color: #64748b; margin-top: 3px;">TCD: ${act.targetDate}</div>
          </td>
          <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: center;">
            ${agingBadge}
          </td>
        </tr>
      `;
    })
    .join('');

  const today = new Date();

  return `
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
        <p style="margin: 0 0 10px 0;">Currently, <strong>${stats.totalOpen} engineering deviation points</strong> are open in the <strong>${deptDisplayName} Department</strong>, and all have exceeded their Target Closure Dates (TCDs).</p>
        <p style="margin: 0 0 10px 0;">Concerned FPR leads are requested to submit RCA/CAPA and after-action photos in the portal at the earliest.</p>
        <p style="margin: 0 0 4px 0;">Kindly prioritize these points and ensure timely closure.</p>
      </div>

      <!-- Visual HTML Charts: KPI Cards & Aging Stack Bar -->
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
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Calibri, Arial, sans-serif; text-align: center;">
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
        Borosil Renewables Ltd | BRL Engineering audit portal
      </div>
      <div style="font-size: 11px; color: #64748b; line-height: 1.5; margin-bottom: 8px;">
        Note: This is an automated email generated .Support: <a href="mailto:mehul.chikhaliya@borosil.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">mehul.chikhaliya@borosil.com</a> | <a href="mailto:process.qa@borosil.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">process.qa@borosil.com</a>
      </div>
      <div style="font-size: 10.5px; color: #94a3b8;">
        © ${today.getFullYear()} Borosil Renewables Ltd. • Process Quality Assurance Department.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Handler execution logic (supports both GET for Vercel Cron and POST for manual trigger)
async function handleCronTrigger(req: NextRequest) {
  try {
    let clientActions: any[] = [];
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body && Array.isArray(body.actions) && body.actions.length > 0) {
          clientActions = body.actions;
        }
      } catch (_) {}
    }

    // 1. Fetch action items from Supabase if not directly provided in POST body
    let actions: any[] = clientActions;
    if (actions.length === 0) {
      try {
        const { data, error } = await supabase
          .from('action_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          actions = data;
        }
      } catch (sbErr) {
        console.warn('[Supabase query fallback notice]:', sbErr);
      }
    }

    // 1b. Fallback to real plant actions if Supabase is unavailable or empty
    if (actions.length === 0) {
      try {
        const realActions = (await import('@/lib/realPlantActions.json')).default;
        if (Array.isArray(realActions) && realActions.length > 0) {
          actions = realActions;
        }
      } catch (e) {
        console.warn('[Real plant actions load notice]:', e);
      }
    }

    // 2. Filter for non-closed points (Open, In Progress, Pending Verification, Overdue)
    const openActions = actions.filter((a) => {
      const s = (a.status || 'Open').toLowerCase().trim();
      return s !== 'closed' && s !== 'done';
    });

    // 3. Process actions: calculate days open, unpack CAPA, map to Matrix FPR, sort by severity and aging
    const processedActions = openActions.map((a) => {
      const capa = unpackClosureRemark(a.closure_remark || a.closureRemark);
      const targetDate = capa.targetClosureDate || a.target_closure_date || a.targetClosureDate || a.target_date || a.targetDate;
      const { days, isOverdue, overdueDays } = calculateDaysOpen(a.created_at || a.createdAt, targetDate);

      // Force status to Overdue if target date has passed
      let effectiveStatus = a.status || 'Open';
      if (effectiveStatus !== 'Pending Verification' && effectiveStatus !== 'Pending Admin Verify' && isOverdue) {
        effectiveStatus = 'Overdue';
      }

      const dept = a.responsible_department || a.responsibleDepartment || a.department || 'Maintenance';
      const auditDate = formatAuditDate(a.audit_date || a.auditDate || a.created_at || a.createdAt);

      return {
        ...a,
        actionId: a.action_id || a.actionId || a.id,
        auditId: a.audit_id || a.auditId,
        auditDate,
        lineName: a.line_name || a.lineName || a.lineId || '-',
        sectionName: a.section_name || a.sectionName || a.sectionId || '-',
        subSectionName: a.sub_section_name || a.subSectionName || a.subSectionId || '-',
        componentName: a.component_name || a.componentName || '-',
        checkpointText: a.checkpoint_text || a.checkpointText || '-',
        observation: a.observation || '-',
        responsiblePerson: a.responsible_person || a.responsiblePerson || 'General FPR',
        responsibleDepartment: dept,
        assignedEmail: a.assigned_email || a.assignedEmail || '',
        ccEmail: a.cc_email || a.ccEmail || '',
        targetDate: targetDate || '-',
        priority: a.priority || 'Medium',
        status: effectiveStatus,
        daysOpen: days,
        isOverdue,
        overdueDays,
        resolvedBy: capa.resolvedBy || a.resolvedBy,
        resolvedDate: capa.resolvedDate || a.resolvedDate,
        photoUrl: a.photo_url || a.photoUrl || null,
        closurePhotoUrl: a.closure_photo_url || a.closurePhotoUrl || null,
      };
    });

    // 4. Setup Transporter
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || 'process.qa@borosil.com';
    const pass = process.env.SMTP_PASSWORD || 'mkse ghmg fuua uncx';
    const fromAddress = process.env.SMTP_FROM || `Process QA <${user}>`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: pass ? { user, pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    // 5. Group actions by department
    const groups: Record<string, { rawName: string; items: any[] }> = {};
    processedActions.forEach((act) => {
      const rawDept = (act.responsibleDepartment || 'Maintenance').trim();
      const key = rawDept.toLowerCase();
      if (!groups[key]) groups[key] = { rawName: rawDept, items: [] };
      groups[key].items.push(act);
    });

    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

    const dispatchedResults = [];

    // 6. Send individual department emails
    for (const [key, { rawName, items }] of Object.entries(groups)) {
      const displayName = PLANT_DEPT_CONFIG[key]?.displayName || rawName;

      const toSet = new Set<string>();
      const ccSet = new Set<string>(CORE_FOUR_RECIPIENTS);

      items.forEach((it) => {
        // Look up against authentic FPR Responsibility Matrix for this section/line
        const matchedFpr = lookupAuthenticFpr(it.responsibleDepartment || rawName, it.sectionId, it.lineId);
        if (matchedFpr) {
          (matchedFpr.fprEmail || '')
            .split(',')
            .map((s: string) => s.trim().toLowerCase())
            .filter(Boolean)
            .forEach((e: string) => toSet.add(e));

          (matchedFpr.hodEmail || '')
            .split(',')
            .map((s: string) => s.trim().toLowerCase())
            .filter(Boolean)
            .forEach((e: string) => ccSet.add(e));
        }

        (it.assignedEmail || '')
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach((e: string) => toSet.add(e));

        (it.ccEmail || '')
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach((e: string) => ccSet.add(e));
      });

      CORE_FOUR_RECIPIENTS.forEach((e) => ccSet.add(e.toLowerCase()));
      toSet.forEach((e) => ccSet.delete(e));

      const toList = Array.from(toSet);
      const ccList = Array.from(ccSet);

      const subject = `⚠️ [Action Required] Engineering Audit (${displayName}): ${items.length} Open Deviations (All Overdue) — ${dateFormatted}`;
      const htmlContent = buildDepartmentHtml(displayName, items);

      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: toList.join(', '),
          cc: ccList.join(', '),
          subject,
          html: htmlContent,
        });

        dispatchedResults.push({
          department: displayName,
          pointsCount: items.length,
          to: toList,
          cc: ccList,
          messageId: info.messageId,
          success: true,
        });
      } catch (err: any) {
        console.error(`[Error sending to department ${displayName}]:`, err);
        dispatchedResults.push({
          department: displayName,
          pointsCount: items.length,
          error: err.message,
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `✅ Department governance digest emails dispatched! (${dispatchedResults.length} departments, ${processedActions.length} open points total)`,
      totalOpenPoints: processedActions.length,
      departmentsNotified: dispatchedResults.length,
      dispatches: dispatchedResults,
    });
  } catch (err: any) {
    console.error('[CRON /api/cron/open-points-digest error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Support both GET (for Vercel Cron Jobs & automated curls) and POST (for admin manual triggers)
export async function GET(req: NextRequest) {
  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}
