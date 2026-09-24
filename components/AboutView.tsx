'use client';

import React from 'react';
import {
  Info,
  Mail,
  User,
  Code2,
  Database,
  Cpu,
  Sparkles,
  Layers,
  Send,
  BarChart3,
  CheckCircle,
  Tag,
  Calendar,
  ShieldCheck,
  Zap,
  FileSpreadsheet,
  FileText,
  Camera,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in font-sans select-none">
      {/* ── 1. TOP HEADER BANNER ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-700/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 translate-y-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-indigo-200 text-xs font-bold border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Borosil Renewables Ltd. • Plant Engineering &amp; Process QA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <span>Plant Engineering Audit &amp; Quality Management Portal</span>
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl font-medium leading-relaxed">
              An enterprise-grade plant inspection, audit compliance, and deviation management platform engineered to standardize equipment evaluations, automate department-specific deviation routing (Instrumentation, Electrical, Maintenance, Utilities), and track RCA corrective closures across all plant production lines.
            </p>
          </div>

          {/* Developer Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 space-y-2 min-w-[240px]">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                MC
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Mehul Chikhaliya</h3>
                <p className="text-[11px] text-indigo-300 font-semibold">Lead Developer &amp; System Architect</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center space-x-2 text-xs">
              <Mail className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <a
                href="mailto:mehul.chikhaliya@borosil.com"
                className="text-indigo-200 hover:text-white font-mono text-[11px] font-semibold underline underline-offset-2 transition"
              >
                mehul.chikhaliya@borosil.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. TECH STACK & ARCHITECTURE PILLS ────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Technology Stack &amp; Core Architecture</span>
          </h2>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
            Next.js 16 + React 19
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Next.js 16 + React 19 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Code2 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
              <span>Next.js 16 + React 19</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Powered by Turbopack engine, React Server Actions, and client-side reactive state hydration.
            </p>
          </div>

          {/* Supabase Realtime & PostgreSQL */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Database className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
              <span>Supabase Realtime</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Cloud PostgreSQL live database sync, multi-user concurrency &amp; S3 photo bucket storage.
            </p>
          </div>

          {/* TypeScript & Tailwind CSS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Sparkles className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
              <span>TypeScript + Tailwind CSS</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              End-to-end type safety, strict checkpoint schema validation, and responsive mobile-ready UI.
            </p>
          </div>

          {/* Automated Point Dispatcher */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Zap className="w-4 h-4 text-purple-600 group-hover:scale-110 transition" />
              <span>Automated Dispatch Engine</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Department-filtered SMTP email dispatcher routing per-point deviations to Action Owners (TO) &amp; HODs (CC).
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. FEATURE HIGHLIGHTS ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Core System Modules &amp; Capabilities</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-semibold">
            Standardized engineering tools designed to maximize plant uptime, equipment reliability, and audit transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* 1. Cascading Section & Line Inspection */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Multi-Section &amp; Sub-Section Audit</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Inspection hierarchy for Sections (Grinding, Robot, Washing, Tempering, Cutting, Utilities), Sub-Sections, and Lines with evaluation memory across sub-sections.
            </p>
          </div>

          {/* 2. Numeric Parameter Boundary Checking */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Smart Numeric Evaluation</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Automated status evaluation based on standard parameters, minimum/maximum thresholds, and engineering unit checks with OK/NG/Observation determination.
            </p>
          </div>

          {/* 3. Department-Specific Deviation Routing */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Department Point Dispatching</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              NG findings are isolated and dispatched strictly to the assigned department (Instrumentation, Electrical, Maintenance, Utilities) with action emails.
            </p>
          </div>

          {/* 4. FPR Responsibility Matrix */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">FPR Responsibility Matrix</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Configurable Department × Section × Line matrix mapping deviations to designated FPR Action Owners (TO) and Section Supervisors (CC).
            </p>
          </div>

          {/* 5. Standard SOP Photo Registry */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Standard SOP Photo Master</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Admin-curated standard component SOP reference photos permanently stored in cloud storage for standard vs. actual visual comparisons.
            </p>
          </div>

          {/* 6. RCA Action Tracking & Closure */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">RCA Action Tracking &amp; Closure</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Full deviation lifecycle tracking with Root Cause Analysis (RCA), corrective action plans, target dates, closure remarks, and after-repair photo uploads.
            </p>
          </div>

          {/* 7. Executive Compliance Dashboard */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Executive Compliance Dashboard</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Real-time plant compliance rates, critical NG alerts, department-wise deviation distribution, and interactive inspection trend charts.
            </p>
          </div>

          {/* 8. Offline Drafts & Instant Reports */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">PDF &amp; Excel Report Generator</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              One-click official PDF audit report generation with photos, metrics, and compliance summary alongside multi-sheet formatted Excel data exports.
            </p>
          </div>

          {/* 9. Excel Point Setup & Plant Hierarchy */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Audit Point Master Setup</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Bulk checkpoint Excel upload, inline spec editing, multi-select line applicability, and flexible plant structure configuration.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. VERSION HISTORY & CHANGELOG ─────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              <span>Version History &amp; Changelog</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              Complete feature updates and portal release history.
            </p>
          </div>

          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black">
            Latest: v2.8.0
          </span>
        </div>

        <div className="space-y-4">
          {/* Release v2.8.0 */}
          <div className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-sm font-black bg-indigo-600 text-white px-3 py-1 rounded-xl shadow-xs">
                  v2.8.0
                </span>
                <span className="text-xs font-bold text-slate-600 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>September 1, 2026</span>
                </span>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto">
                Current Production Release
              </span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-700 font-medium list-disc list-inside">
              <li>
                <strong>Multi-Sub-Section State Memory:</strong> Full audit checkpoint evaluation caching across all sub-sections with zero data loss.
              </li>
              <li>
                <strong>Departmental Point Routing:</strong> Per-checkpoint email routing sending specific NG findings directly to responsible departments (Instrumentation, Electrical, Maintenance, Utilities).
              </li>
              <li>
                <strong>Supabase Live Cloud Synchronization:</strong> Real-time PostgreSQL database sync with local browser caching and server proxy failover.
              </li>
              <li>
                <strong>Permanent SOP Photo Master:</strong> Standard component reference photo upload &amp; persistence in Supabase S3 storage.
              </li>
              <li>
                <strong>Enhanced Action Item Tracking:</strong> Centered RCA modal dialogues with streamlined Root Cause Analysis and closure proof photo uploads.
              </li>
            </ul>
          </div>

          {/* Release v2.5.0 */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-black bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg">
                v2.5.0
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>August 2026</span>
              </span>
            </div>

            <ul className="space-y-1 text-xs text-slate-600 font-medium list-disc list-inside">
              <li>FPR Responsibility Matrix mapping department, section, and line to designated action owners.</li>
              <li>Excel upload for bulk audit checkpoints and plant hierarchy setup.</li>
              <li>Role-based access permissions for Admin, Engineering, QA, Auditor, and Viewer.</li>
            </ul>
          </div>

          {/* Release v2.0.0 */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-black bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg">
                v2.0.0
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>July 2026</span>
              </span>
            </div>

            <ul className="space-y-1 text-xs text-slate-600 font-medium list-disc list-inside">
              <li>Initial launch of Borosil Plant Engineering Audit System.</li>
              <li>Audit checklist recording, compliance score calculation, and PDF/Excel reports.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
