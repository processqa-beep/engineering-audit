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
  Trophy,
  Palette,
  CheckCircle,
  Tag,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Zap,
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
              <span>Borosil Renewables Ltd. • Process QA &amp; Engineering</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <span>About QA Daily Task &amp; Operations Portal</span>
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl font-medium leading-relaxed">
              The QA Daily Task &amp; Operations Portal is a specialized web application engineered for the Process Quality Assurance team to streamline daily task reporting, real-time activity tracking, automated Google Chat notifications, task assignment delegation, and executive impact analysis.
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Next.js 16 + React 19 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Code2 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
              <span>Next.js 16 + React 19</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Turbopack engine with React Server Components, server actions &amp; client state hydration.
            </p>
          </div>

          {/* Supabase Realtime */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Database className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
              <span>Supabase Realtime</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Cloud PostgreSQL database with live data synchronization, auto reconnection &amp; S3 photo storage.
            </p>
          </div>

          {/* TypeScript & Tailwind CSS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Sparkles className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
              <span>TypeScript + Tailwind CSS</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              End-to-end type safety, strict schema validation, responsive utility styling &amp; fast load times.
            </p>
          </div>

          {/* Automated Dispatch Engine */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition space-y-1 group">
            <div className="flex items-center space-x-2 text-slate-900 font-extrabold">
              <Zap className="w-4 h-4 text-purple-600 group-hover:scale-110 transition" />
              <span>Automated Dispatch Engine</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Department-filtered SMTP email notifications, FPR matrix routing &amp; Google Chat cards.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. FEATURE HIGHLIGHTS ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Key Feature Highlights &amp; Capabilities</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-semibold">
            Purpose-built tools designed to maximize quality control precision, audit compliance, and team accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* 1. Daily Task Reporting */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Daily Task Reporting</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Fast task submissions with custom work types &amp; manual date selection.
            </p>
          </div>

          {/* 2. Google Chat Webhooks */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Google Chat Webhooks</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Formatted card summaries posted directly to Gmail/Google Chat groups.
            </p>
          </div>

          {/* 3. Task Assignment System */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Task Assignment System</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Assign, prioritize &amp; track tasks across team members with real-time sync.
            </p>
          </div>

          {/* 4. Process Impact Review */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Process Impact Review</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Executive dashboard with KPI metrics &amp; 5 interactive visual charts.
            </p>
          </div>

          {/* 5. QA Analytics & Trophy Board */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">QA Analytics &amp; Trophy Board</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Member-wise productivity metrics, completion rates &amp; gold/silver trophies.
            </p>
          </div>

          {/* 6. Glassmorphism Design */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-900">Glassmorphism Design</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Modern responsive UI with Inter font, dark mode &amp; ambient background glow.
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
                Latest Release
              </span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-700 font-medium list-disc list-inside">
              <li>
                <strong>Multi-Sub-Section State Memory:</strong> Full audit checkpoint evaluation caching across sub-sections with zero data loss.
              </li>
              <li>
                <strong>Departmental Point Dispatch:</strong> Per-checkpoint email routing sending specific NG findings directly to responsible departments.
              </li>
              <li>
                <strong>Cloud &amp; Offline Sync:</strong> Automatic Supabase live database sync with local browser caching.
              </li>
              <li>
                <strong>Standard SOP Photo Registry:</strong> Permanent component standard reference photo management for Admin users.
              </li>
              <li>
                <strong>Enhanced Action Item Tracking:</strong> Streamlined RCA submission and centered modal dialogues.
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
              <li>FPR Responsibility Matrix mapping department, section, and line to action owners.</li>
              <li>Excel upload for bulk audit checkpoints and plant hierarchy setup.</li>
              <li>Role-based access permissions for Admin, QA, Engineering, and Auditors.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
