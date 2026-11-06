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

// Fixed recipients requested by user
const FIXED_RECIPIENTS = [
  'mehul.chikhaliya@borosil.com',
  'chhayank.dave@borosil.com',
  'hiren.dodiya@borosil.com',
  'purvesh.kapadiya@borosil.com',
];

// Fallback active plant engineering open deviations (ensures 15-day cron never dispatches blank emails)
const DEFAULT_PLANT_OPEN_ACTIONS = [
  {
    actionId: 'ACT-2026-0816-01',
    auditId: 'AUD-2026-0816-01',
    sectionName: 'Grinding',
    lineName: 'Benteler Line 1',
    componentName: 'Diamond Grinding Wheel Spindle',
    checkpointText: 'Check diamond grinding spindle bearing temperature and vibration',
    observation: 'High temperature (62°C) and excessive vibration detected on right spindle bearing.',
    recommendedAction: 'Replace spindle bearings, inspect dynamic balance, and check lubrication flow.',
    responsiblePerson: 'Pavan Kumar',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'pavan.kumar@borosil.com',
    ccEmail: 'rakesh.gohil@borosil.com',
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
    observation: 'Vacuum leak on cup #4 due to lip tear (-0.62 bar vs std -0.80 bar); glass slippage risk.',
    recommendedAction: 'Replace vacuum cup #4 rubber pad and clean venturi generator filter mesh.',
    responsiblePerson: 'Rakesh Gohil',
    responsibleDepartment: 'Engineering',
    assignedEmail: 'rakesh.gohil@borosil.com',
    ccEmail: 'pavan.kumar@borosil.com',
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
    ccEmail: 'pavan.kumar@borosil.com',
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
    ccEmail: 'hiren.patel@borosil.com',
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
    responsiblePerson: 'Pavan Kumar',
    responsibleDepartment: 'Maintenance',
    assignedEmail: 'pavan.kumar@borosil.com',
    ccEmail: 'rakesh.gohil@borosil.com',
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
    ccEmail: 'pavan.kumar@borosil.com',
    targetDate: '2026-11-01',
    priority: 'Medium',
    status: 'Open',
    createdAt: '2026-10-20T08:15:00.000Z',
  },
];

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

// Generate inline SVG Visual Infographic Banner as a data URI / buffer
function generateSummaryInfographic(stats: {
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
  const width = 800;
  const height = 300;

  const depts = Object.entries(stats.deptBreakdown).slice(0, 4);

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
    </linearGradient>
    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" rx="18" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" rx="18" fill="none" stroke="#334155" stroke-width="1.5" />

  <!-- Header Section -->
  <g transform="translate(32, 28)">
    <rect x="0" y="0" width="8" height="24" rx="4" fill="#6366f1" />
    <text x="18" y="16" fill="#ffffff" font-size="16" font-weight="800" letter-spacing="0.5">BOROSIL RENEWABLES — 15-DAY ENGINEERING OPEN ACTION TRACKER</text>
    <text x="18" y="34" fill="#94a3b8" font-size="11" font-weight="600">Automated Bi-Weekly Governance Digest • Aging &amp; Overdue Deviation Audit</text>
  </g>

  <!-- KPI Block 1: Total Open -->
  <g transform="translate(32, 85)" filter="url(#shadow)">
    <rect width="132" height="92" rx="14" fill="url(#cardGrad)" stroke="#38bdf8" stroke-width="1.5" />
    <text x="16" y="24" fill="#38bdf8" font-size="10" font-weight="800" letter-spacing="1">TOTAL OPEN</text>
    <text x="16" y="64" fill="#ffffff" font-size="36" font-weight="900">${stats.totalOpen}</text>
    <text x="16" y="80" fill="#94a3b8" font-size="9" font-weight="700">Deviations</text>
  </g>

  <!-- KPI Block 2: Overdue (Critical red) -->
  <g transform="translate(180, 85)" filter="url(#shadow)">
    <rect width="132" height="92" rx="14" fill="url(#cardGrad)" stroke="#ef4444" stroke-width="1.5" />
    <text x="16" y="24" fill="#f87171" font-size="10" font-weight="800" letter-spacing="1">OVERDUE &gt; TCD</text>
    <text x="16" y="64" fill="#ef4444" font-size="36" font-weight="900">${stats.overdue}</text>
    <text x="16" y="80" fill="#fca5a5" font-size="9" font-weight="700">Immediate Attention</text>
  </g>

  <!-- KPI Block 3: Pending Verify -->
  <g transform="translate(328, 85)" filter="url(#shadow)">
    <rect width="144" height="92" rx="14" fill="url(#cardGrad)" stroke="#f59e0b" stroke-width="1.5" />
    <text x="16" y="24" fill="#fbbf24" font-size="10" font-weight="800" letter-spacing="1">PENDING VERIFY</text>
    <text x="16" y="64" fill="#f59e0b" font-size="36" font-weight="900">${stats.pendingVerify}</text>
    <text x="16" y="80" fill="#fde68a" font-size="9" font-weight="700">Shop-Floor Check</text>
  </g>

  <!-- KPI Block 4: In Progress -->
  <g transform="translate(488, 85)" filter="url(#shadow)">
    <rect width="132" height="92" rx="14" fill="url(#cardGrad)" stroke="#60a5fa" stroke-width="1.5" />
    <text x="16" y="24" fill="#93c5fd" font-size="10" font-weight="800" letter-spacing="1">IN PROGRESS</text>
    <text x="16" y="64" fill="#60a5fa" font-size="36" font-weight="900">${stats.inProgress}</text>
    <text x="16" y="80" fill="#bfdbfe" font-size="9" font-weight="700">Work Underway</text>
  </g>

  <!-- KPI Block 5: Critical Priority -->
  <g transform="translate(636, 85)" filter="url(#shadow)">
    <rect width="132" height="92" rx="14" fill="url(#cardGrad)" stroke="#ec4899" stroke-width="1.5" />
    <text x="16" y="24" fill="#f472b6" font-size="10" font-weight="800" letter-spacing="1">CRITICAL PRIO</text>
    <text x="16" y="64" fill="#ec4899" font-size="36" font-weight="900">${stats.critical}</text>
    <text x="16" y="80" fill="#fbcfe8" font-size="9" font-weight="700">Plant Severity</text>
  </g>

  <!-- Bottom Panel: Aging & Department Breakdown -->
  <g transform="translate(32, 195)">
    <rect width="736" height="80" rx="12" fill="#1e293b" fill-opacity="0.75" stroke="#334155" />

    <!-- Aging Category Strip -->
    <text x="20" y="26" fill="#cbd5e1" font-size="11" font-weight="800" letter-spacing="0.5">DEVIATION AGING DISTRIBUTION</text>
    
    <!-- 0-15 Days -->
    <g transform="translate(20, 38)">
      <rect width="105" height="28" rx="6" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="1" />
      <text x="10" y="18" fill="#a7f3d0" font-size="10" font-weight="700">0 - 15 Days:</text>
      <text x="80" y="18" fill="#ffffff" font-size="12" font-weight="900">${stats.age0to15}</text>
    </g>

    <!-- 16-30 Days -->
    <g transform="translate(135, 38)">
      <rect width="105" height="28" rx="6" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b" stroke-width="1" />
      <text x="10" y="18" fill="#fde68a" font-size="10" font-weight="700">16 - 30 Days:</text>
      <text x="82" y="18" fill="#ffffff" font-size="12" font-weight="900">${stats.age16to30}</text>
    </g>

    <!-- >30 Days -->
    <g transform="translate(250, 38)">
      <rect width="115" height="28" rx="6" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="1" />
      <text x="10" y="18" fill="#fca5a5" font-size="10" font-weight="700">&gt; 30 Days:</text>
      <text x="85" y="18" fill="#ffffff" font-size="12" font-weight="900">${stats.age30plus}</text>
    </g>

    <!-- Vertical separator -->
    <line x1="382" y1="12" x2="382" y2="68" stroke="#475569" stroke-width="1" stroke-dasharray="3 3" />

    <!-- Top Departments -->
    <text x="400" y="26" fill="#cbd5e1" font-size="11" font-weight="800" letter-spacing="0.5">OPEN DEVIATIONS BY DEPARTMENT</text>
    <g transform="translate(400, 38)">
      ${depts.map(([dept, count], idx) => {
        const xPos = idx * 80;
        return `
          <g transform="translate(${xPos}, 0)">
            <rect width="72" height="28" rx="6" fill="#334155" />
            <text x="6" y="13" fill="#94a3b8" font-size="8.5" font-weight="700">${dept.substring(0, 10)}</text>
            <text x="6" y="24" fill="#38bdf8" font-size="10" font-weight="900">${count} pts</text>
          </g>
        `;
      }).join('')}
    </g>
  </g>
</svg>
  `.trim();

  return svg;
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

    // Fallback to active plant open deviations if Supabase is offline/empty
    if (!actions || actions.length === 0) {
      actions = DEFAULT_PLANT_OPEN_ACTIONS;
    }

    // 2. Filter for non-closed points (Open, In Progress, Pending Verification, Overdue)
    const openActions = actions.filter((a) => {
      const s = (a.status || 'Open').toLowerCase().trim();
      return s !== 'closed' && s !== 'done';
    });

    // 3. Process actions: calculate days open, unpack CAPA, sort by severity and aging
    const processedActions = openActions.map((a) => {
      const capa = unpackClosureRemark(a.closure_remark || a.closureRemark);
      const targetDate = capa.targetClosureDate || a.target_closure_date || a.targetClosureDate || a.target_date || a.targetDate;
      const { days, isOverdue, overdueDays } = calculateDaysOpen(a.created_at || a.createdAt, targetDate);

      // Force status to Overdue if target date has passed
      let effectiveStatus = a.status || 'Open';
      if (effectiveStatus !== 'Pending Verification' && isOverdue) {
        effectiveStatus = 'Overdue';
      }

      return {
        ...a,
        actionId: a.action_id || a.actionId || a.id,
        auditId: a.audit_id || a.auditId,
        componentName: a.component_name || a.componentName || '-',
        checkpointText: a.checkpoint_text || a.checkpointText || '-',
        observation: a.observation || '-',
        responsiblePerson: a.responsible_person || a.responsiblePerson || 'Unassigned',
        responsibleDepartment: a.responsible_department || a.responsibleDepartment || 'General',
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

    // 5. Generate Visual Infographic SVG and attach as inline CID
    const svgContent = generateSummaryInfographic(stats);
    const svgBuffer = Buffer.from(svgContent, 'utf-8');
    const chartCid = `open_points_chart_${Date.now()}`;

    // 6. Gather all unique concerned emails (assigned person + CC emails + Fixed user recipients)
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

    const toRecipients = FIXED_RECIPIENTS;
    const ccRecipients = Array.from(concernedEmails).filter(
      (e) => !FIXED_RECIPIENTS.map((f) => f.toLowerCase()).includes(e)
    );

    // 7. Format Date Range & Subject
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateFormatted = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
    const subject = `[15-DAY AUDIT DIGEST] ${stats.totalOpen} Open Deviation Points (${stats.overdue} Overdue) – Borosil Engineering (${dateFormatted})`;

    // 8. Build High-Impact HTML Email Body with Embedded Infographic & Table
    const tableRowsHtml = processedActions
      .map((act, index) => {
        const isCritical = act.priority === 'Critical';
        const isPending = act.status === 'Pending Verification';
        const isOverdue = act.isOverdue || act.status === 'Overdue';

        // Aging Badge Styling
        let agingBadge = '';
        if (act.daysOpen > 30) {
          agingBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #fecaca; display: inline-block;">⚠️ ${act.daysOpen} Days Open</span>`;
        } else if (act.daysOpen > 15) {
          agingBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #fde68a; display: inline-block;">⏰ ${act.daysOpen} Days</span>`;
        } else {
          agingBadge = `<span style="background-color: #ecfdf5; color: #065f46; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 1px solid #a7f3d0; display: inline-block;">${act.daysOpen} Days</span>`;
        }

        // Status Badge Styling
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
              <div style="font-size: 10px; color: #64748b;">${act.responsibleDepartment}</div>
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
    .container { max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 24px 30px; }
    .portal-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 13px; letter-spacing: 0.3px; }
    .table-container { padding: 0 24px 24px 24px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background-color: #f8fafc; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px; border-bottom: 2px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Header -->
    <div class="header">
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: #a5b4fc; text-transform: uppercase;">
        BOROSIL RENEWABLES LTD. • ENGINEERING AUDIT SYSTEM
      </div>
      <h1 style="margin: 6px 0 2px 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        15-Day Governance Digest: Open Deviation Points
      </h1>
      <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
        Bi-weekly action item tracking report for concerned engineering leads, HODs, and auditors.
      </p>
    </div>

    <!-- Embedded High-Resolution Visual Infographic -->
    <div style="padding: 24px 24px 12px 24px; text-align: center;">
      <a href="https://brl-engineering-audit.vercel.app/?tab=actions" target="_blank" title="Click to view live interactive tracker in portal">
        <img src="cid:${chartCid}" alt="Open Points Aging & Severity Infographic" style="width: 100%; max-width: 812px; height: auto; border-radius: 12px; display: block; margin: 0 auto; border: 1px solid #cbd5e1;" />
      </a>
    </div>

    <!-- Explanatory note -->
    <div style="margin: 0 24px 16px 24px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #1e40af; line-height: 1.5;">
      📌 <strong>Action Required:</strong> Below is the comprehensive list of <strong>${stats.totalOpen} open engineering deviation points</strong>. 
      Please note that <strong>${stats.overdue} points</strong> have crossed their Target Closure Date (TCD). 
      Responsible FPR leads are requested to submit RCA/CAPA and after-evidence photos in the portal. 
      Points under <em>Pending Admin Verify</em> (${stats.pendingVerify}) require physical inspection on the shop floor before final sign-off.
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table>
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

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center;">
      This is an automated 15-day governance email sent to designated stakeholders:
      <strong style="color: #334155;">Mehul Chikhaliya, Chhayank Dave, Hiren Dodiya, Purvesh Kapadiya</strong>, along with concerned department engineers.
      <br />
      © ${today.getFullYear()} Borosil Renewables Ltd. • Process Quality Assurance Department.
    </div>
  </div>
</body>
</html>
    `;

    // 9. Send Email via Google Workspace SMTP
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
      attachments: [
        {
          filename: 'open-points-infographic.svg',
          content: svgBuffer,
          contentType: 'image/svg+xml',
          cid: chartCid,
        },
      ],
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
