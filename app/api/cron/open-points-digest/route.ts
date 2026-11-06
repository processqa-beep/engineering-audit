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

// Fixed recipients requested by user for production broadcast
const FIXED_RECIPIENTS = [
  'mehul.chikhaliya@borosil.com',
  'chhayank.dave@borosil.com',
  'hiren.dodiya@borosil.com',
  'purvesh.kapadiya@borosil.com',
];

// STRICT DEVELOPMENT ENFORCEMENT:
// As instructed: "first send only to Mehul.chikhaliya - no mail should be go to any person unless i tell to send all It is under devlopment"
// When true, all emails are strictly restricted to mehul.chikhaliya@borosil.com ONLY (0 CCs).
const DEV_MODE_ONLY_MEHUL = true;

// Plant FPR Responsibility Matrix (maps department -> assigned FPR engineer & HOD)
const PLANT_FPR_MATRIX: Record<string, { fprName: string; fprEmail: string; hodName: string; hodEmail: string }> = {
  maintenance: {
    fprName: 'Hiren Patel',
    fprEmail: 'hiren.patel@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  electrical: {
    fprName: 'Ramesh Sharma',
    fprEmail: 'ramesh.sharma@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  instrumentation: {
    fprName: 'Instrumentation Lead',
    fprEmail: 'inst.lead@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  quality: {
    fprName: 'Suresh Kumar',
    fprEmail: 'suresh.kumar@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  qa: {
    fprName: 'Suresh Kumar',
    fprEmail: 'suresh.kumar@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  'process qa': {
    fprName: 'Process QA Admin',
    fprEmail: 'process.qa@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
  engineering: {
    fprName: 'Rakesh Gohil',
    fprEmail: 'rakesh.gohil@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  },
};

function resolveMatrixAssignment(dept?: string): { fprName: string; fprEmail: string; hodName: string; hodEmail: string } {
  const key = (dept || 'maintenance').toLowerCase().trim();
  for (const [k, v] of Object.entries(PLANT_FPR_MATRIX)) {
    if (key.includes(k) || k.includes(key)) {
      return v;
    }
  }
  return {
    fprName: 'Plant Maintenance Lead',
    fprEmail: 'hiren.patel@borosil.com',
    hodName: 'Mehul Chikhaliya',
    hodEmail: 'mehul.chikhaliya@borosil.com',
  };
}

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
  return { closureRemark: rawRemark };
}

// Calculate days open between created_at / target_date and today
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

// Generate modern, pure HTML/CSS Visual Charts (KPI Cards, Aging Stack Bar, and Department Pills)
// Zero external image attachments required — renders 100% reliably in all email clients without image blocks
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
      if (effectiveStatus !== 'Pending Verification' && isOverdue) {
        effectiveStatus = 'Overdue';
      }

      const dept = a.responsible_department || a.responsibleDepartment || a.department || 'Maintenance';
      const matrixMatch = resolveMatrixAssignment(dept);

      const responsiblePerson = a.responsible_person || a.responsiblePerson || matrixMatch.fprName;
      const assignedEmail = a.assigned_email || a.assignedEmail || matrixMatch.fprEmail;
      const ccEmail = a.cc_email || a.ccEmail || matrixMatch.hodEmail;

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
        responsiblePerson,
        responsibleDepartment: dept,
        assignedEmail,
        ccEmail,
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

    // Sort: Critical first, then Overdue, then longest Days Open
    processedActions.sort((a, b) => {
      const prioOrder: Record<string, number> = { Critical: 4, High: 3, Major: 3, Medium: 2, Minor: 1, Low: 1 };
      const prioDiff = (prioOrder[b.priority] || 1) - (prioOrder[a.priority] || 1);
      if (prioDiff !== 0) return prioDiff;
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return b.daysOpen - a.daysOpen;
    });

    // 4. Calculate Summary Statistics
    const deptBreakdown: Record<string, number> = {};
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

    // 5. Gather all unique concerned emails (assigned person + CC emails + Fixed user recipients)
    const concernedEmails = new Set<string>(FIXED_RECIPIENTS.map((e) => e.trim().toLowerCase()));

    processedActions.forEach((act) => {
      if (act.assignedEmail) {
        act.assignedEmail.split(',').forEach((em: string) => {
          const clean = em.trim().toLowerCase();
          if (clean && clean.includes('@')) concernedEmails.add(clean);
        });
      }
      if (act.ccEmail) {
        act.ccEmail.split(',').forEach((em: string) => {
          const clean = em.trim().toLowerCase();
          if (clean && clean.includes('@')) concernedEmails.add(clean);
        });
      }
    });

    // STRICT RECIPIENT CONTROL DURING DEVELOPMENT:
    // "first send only to Mehul.chikhaliya - no mail should be go to any person unless i tell to send all It is under devlopment"
    let toRecipients: string[] = [];
    let ccRecipients: string[] = [];

    if (DEV_MODE_ONLY_MEHUL) {
      toRecipients = ['mehul.chikhaliya@borosil.com'];
      ccRecipients = []; // strictly 0 recipients in CC
    } else {
      toRecipients = FIXED_RECIPIENTS;
      ccRecipients = Array.from(concernedEmails).filter(
        (e) => !FIXED_RECIPIENTS.map((f) => f.toLowerCase()).includes(e)
      );
    }

    // 7. Format Date Range & Subject
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
    const subject = DEV_MODE_ONLY_MEHUL
      ? `[DEV REVIEW - MEHUL ONLY] ${stats.totalOpen} Open Deviation Points (${stats.overdue} Overdue) – Borosil Engineering (${dateFormatted})`
      : `[15-DAY AUDIT DIGEST] ${stats.totalOpen} Open Deviation Points (${stats.overdue} Overdue) – Borosil Engineering (${dateFormatted})`;

    // 8. Build High-Impact HTML Email Body with Embedded Infographic & Table
    const tableRowsHtml = processedActions.length > 0
      ? processedActions
          .map((act, index) => {
            const isCritical = act.priority === 'Critical';
            const isPending = act.status === 'Pending Verification';
            const isOverdue = act.isOverdue || act.status === 'Overdue';

            // Aging Badge Styling (Compact)
            let agingBadge = '';
            if (act.daysOpen > 30) {
              agingBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #fecaca; display: inline-block;">${act.daysOpen}d</span>`;
            } else if (act.daysOpen > 15) {
              agingBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #fde68a; display: inline-block;">${act.daysOpen}d</span>`;
            } else {
              agingBadge = `<span style="background-color: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10.5px; border: 1px solid #a7f3d0; display: inline-block;">${act.daysOpen}d</span>`;
            }

            // Status Badge Styling (Compact)
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
          .join('')
      : `
        <tr>
          <td colspan="9" style="padding: 24px; text-align: center; color: #047857; font-weight: 700; font-size: 13px; background-color: #f0fdf4;">
            🎉 <strong>Zero Open Deviations!</strong> All engineering audit checkpoints across all plant sections are currently compliant.
          </td>
        </tr>
      `;

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

    // 9. Send Email via Google Workspace SMTP (zero image attachments)
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

    const mailOptions = {
      from: fromAddress,
      to: toRecipients.join(', '),
      cc: ccRecipients.length > 0 ? ccRecipients.join(', ') : undefined,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `✅ 15-Day Open Points Cron Digest sent successfully! (${processedActions.length} open points)`,
      stats,
      messageId: info.messageId,
      to: toRecipients,
      ccCount: ccRecipients.length,
      cc: ccRecipients,
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
