'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  AlertOctagon,
  TrendingUp,
  Filter,
  RefreshCw,
  PlusCircle,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  FileCheck2,
  Users,
  Search,
  Calendar,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Award,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  ComposedChart,
  Line,
} from 'recharts';
import { StorageEngine } from '../lib/storageEngine';
import { AuditHeader, AuditResult, ActionItem } from '../lib/types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [audits, setAudits] = useState<AuditHeader[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [sections] = useState(StorageEngine.getSections());
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Dynamic Dashboard Filters
  const [timeHorizon, setTimeHorizon] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH'>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedAuditor, setSelectedAuditor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Table Tab State
  const [activeTableTab, setActiveTableTab] = useState<'lines' | 'auditors' | 'audits'>('lines');

  const loadData = () => {
    setAudits(StorageEngine.getAudits());
    setAuditResults(StorageEngine.getAuditResults());
    setActions(StorageEngine.getActions());
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  // Extract unique lines and auditors for dropdowns
  const availableLines = useMemo(() => {
    const set = new Set<string>();
    audits.forEach((a) => {
      if (a.lineName) set.add(a.lineName);
      else if (a.lineId) set.add(a.lineId);
    });
    return Array.from(set).sort();
  }, [audits]);

  const availableAuditors = useMemo(() => {
    const set = new Set<string>();
    audits.forEach((a) => {
      if (a.auditorName) set.add(a.auditorName);
    });
    return Array.from(set).sort();
  }, [audits]);

  // Filtered Audits based on all controls
  const filteredAudits = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const thisMonthStr = todayStr.substring(0, 7);

    return audits.filter((a) => {
      // Time Horizon
      if (timeHorizon === 'TODAY' && a.date !== todayStr) return false;
      if (timeHorizon === '7DAYS' && a.date < d7) return false;
      if (timeHorizon === '30DAYS' && a.date < d30) return false;
      if (timeHorizon === 'THIS_MONTH' && !a.date.startsWith(thisMonthStr)) return false;

      // Section
      if (selectedSection !== 'ALL' && a.sectionId !== selectedSection && a.sectionName !== selectedSection) return false;

      // Line
      if (selectedLine !== 'ALL' && a.lineId !== selectedLine && a.lineName !== selectedLine) return false;

      // Auditor
      if (selectedAuditor !== 'ALL' && a.auditorName !== selectedAuditor) return false;

      // Status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PASS' && a.overallStatus !== 'PASS') return false;
        if (selectedStatus === 'FAIL' && a.overallStatus !== 'FAIL') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          a.auditId.toLowerCase().includes(q) ||
          (a.sectionName && a.sectionName.toLowerCase().includes(q)) ||
          (a.lineName && a.lineName.toLowerCase().includes(q)) ||
          (a.equipmentName && a.equipmentName.toLowerCase().includes(q)) ||
          (a.auditorName && a.auditorName.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [audits, timeHorizon, selectedSection, selectedLine, selectedAuditor, selectedStatus, searchQuery]);

  // Filtered Results & Actions
  const filteredAuditIds = useMemo(() => new Set(filteredAudits.map((a) => a.auditId)), [filteredAudits]);

  const filteredResults = useMemo(() => {
    return auditResults.filter((r) => filteredAuditIds.has(r.auditId));
  }, [auditResults, filteredAuditIds]);

  const filteredActions = useMemo(() => {
    return actions.filter((act) => filteredAuditIds.has(act.auditId));
  }, [actions, filteredAuditIds]);

  // Top-Level KPIs
  const totalAuditsCount = filteredAudits.length;
  const totalCheckpointsCount = filteredAudits.reduce((acc, a) => acc + (a.totalCheckpoints || 0), 0);
  const okPoints = filteredAudits.reduce((acc, a) => acc + (a.okCount || 0), 0);
  const ngPoints = filteredAudits.reduce((acc, a) => acc + (a.ngCount || 0), 0);
  const obsPoints = filteredAudits.reduce((acc, a) => acc + (a.obsCount || 0), 0);
  const openActionsCount = filteredActions.filter((a) => a.status === 'Open' || a.status === 'In Progress').length;
  const criticalCount = filteredActions.filter((a) => a.priority === 'Critical').length +
    filteredResults.filter((r) => r.status === 'NG' && r.isCritical).length;

  const avgCompliance =
    totalAuditsCount > 0
      ? filteredAudits.reduce((acc, curr) => acc + curr.compliancePercent, 0) / totalAuditsCount
      : 100;

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 1: LINE-WISE DEVIATIONS (Which Lines Have More Deviations)
  // ──────────────────────────────────────────────────────────────────────────
  const lineDeviationData = useMemo(() => {
    const map: Record<string, { line: string; section: string; ngCount: number; totalAudits: number; okCount: number; avgComp: number; compSum: number }> = {};

    filteredAudits.forEach((a) => {
      const lineKey = a.lineName || a.lineId || 'Plant Line';
      if (!map[lineKey]) {
        map[lineKey] = {
          line: lineKey,
          section: a.sectionName || a.sectionId || '',
          ngCount: 0,
          totalAudits: 0,
          okCount: 0,
          avgComp: 0,
          compSum: 0,
        };
      }
      map[lineKey].ngCount += a.ngCount || 0;
      map[lineKey].okCount += a.okCount || 0;
      map[lineKey].totalAudits += 1;
      map[lineKey].compSum += a.compliancePercent || 0;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgComp: Math.round(item.compSum / item.totalAudits),
      }))
      .sort((a, b) => b.ngCount - a.ngCount); // Highest deviations first
  }, [filteredAudits]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 2: AUDITOR ACTIVITY & AUDITS TAKEN (Who Have Taken Audits)
  // ──────────────────────────────────────────────────────────────────────────
  const auditorActivityData = useMemo(() => {
    const map: Record<string, { auditor: string; audits: number; ngFound: number; okPoints: number; totalPoints: number; avgScore: number; scoreSum: number }> = {};

    filteredAudits.forEach((a) => {
      const name = a.auditorName || 'Auditor';
      if (!map[name]) {
        map[name] = {
          auditor: name,
          audits: 0,
          ngFound: 0,
          okPoints: 0,
          totalPoints: 0,
          avgScore: 0,
          scoreSum: 0,
        };
      }
      map[name].audits += 1;
      map[name].ngFound += a.ngCount || 0;
      map[name].okPoints += a.okCount || 0;
      map[name].totalPoints += a.totalCheckpoints || 0;
      map[name].scoreSum += a.compliancePercent || 0;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgScore: Math.round(item.scoreSum / item.audits),
      }))
      .sort((a, b) => b.audits - a.audits);
  }, [filteredAudits]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 3: SECTION COMPLIANCE HEALTH (%)
  // ──────────────────────────────────────────────────────────────────────────
  const sectionComplianceData = useMemo(() => {
    const map: Record<string, { section: string; totalAudits: number; scoreSum: number; ngCount: number }> = {};

    filteredAudits.forEach((a) => {
      const sec = a.sectionName || a.sectionId || 'General';
      if (!map[sec]) {
        map[sec] = { section: sec, totalAudits: 0, scoreSum: 0, ngCount: 0 };
      }
      map[sec].totalAudits += 1;
      map[sec].scoreSum += a.compliancePercent || 0;
      map[sec].ngCount += a.ngCount || 0;
    });

    return Object.values(map).map((s) => ({
      section: s.section,
      compliance: Math.round(s.scoreSum / s.totalAudits),
      deviations: s.ngCount,
      audits: s.totalAudits,
    }));
  }, [filteredAudits]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 4: STATUS RATIO PIE
  // ──────────────────────────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    const list = [
      { name: 'OK (Compliant)', value: okPoints, color: '#10b981' },
      { name: 'NG (Deviations)', value: ngPoints, color: '#f43f5e' },
    ];
    if (obsPoints > 0) {
      list.push({ name: 'Observation', value: obsPoints, color: '#f59e0b' });
    }
    return list.filter((p) => p.value > 0);
  }, [okPoints, ngPoints, obsPoints]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 5: TIMELINE & COMPLIANCE TREND
  // ──────────────────────────────────────────────────────────────────────────
  const timelineTrendData = useMemo(() => {
    const map: Record<string, { date: string; compliance: number; audits: number; deviations: number; count: number }> = {};
    filteredAudits.forEach((a) => {
      const d = a.date;
      if (!map[d]) map[d] = { date: d, compliance: 0, audits: 0, deviations: 0, count: 0 };
      map[d].compliance += a.compliancePercent;
      map[d].audits += 1;
      map[d].deviations += a.ngCount || 0;
      map[d].count += 1;
    });
    return Object.values(map)
      .map((g) => ({
        date: g.date.substring(5), // MM-DD
        compliance: Math.round(g.compliance / g.count),
        audits: g.audits,
        deviations: g.deviations,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAudits]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART 6: TOP 5 PROBLEMATIC COMPONENTS (Frequent Failure Points)
  // ──────────────────────────────────────────────────────────────────────────
  const topFailureComponents = useMemo(() => {
    const map: Record<string, { component: string; count: number; section: string }> = {};

    filteredResults.forEach((r) => {
      if (r.status === 'NG' && r.componentName) {
        const key = r.componentName.trim();
        if (!map[key]) {
          map[key] = { component: key, count: 0, section: r.sectionName || '' };
        }
        map[key].count += 1;
      }
    });

    filteredActions.forEach((a) => {
      if (a.componentName) {
        const key = a.componentName.trim();
        if (!map[key]) {
          map[key] = { component: key, count: 0, section: a.sectionName || '' };
        }
        map[key].count += 1;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredResults, filteredActions]);

  const handleResetFilters = () => {
    setTimeHorizon('ALL');
    setSelectedSection('ALL');
    setSelectedLine('ALL');
    setSelectedAuditor('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  if (!isMounted) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 text-xs font-extrabold animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading Plant Engineering Executive Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP EXECUTIVE HEADER & FILTERS BAR */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <span>PLANT ENGINEERING EXECUTIVE DASHBOARD</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Live plant compliance metrics, line deviation analysis, auditor activity tracking, and equipment failure hotspots.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('new-audit')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-2xl font-extrabold text-xs shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Audit</span>
            </button>
          </div>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-extrabold text-slate-500 flex items-center space-x-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Time Horizon:</span>
          </span>

          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: '7DAYS', label: 'Last 7 Days' },
            { id: '30DAYS', label: 'Last 30 Days' },
            { id: 'THIS_MONTH', label: 'This Month' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeHorizon(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                timeHorizon === t.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dynamic Multi-Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit, line, auditor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Section Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none w-full truncate"
            >
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Line / Machine Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none w-full truncate"
            >
              <option value="ALL">All Lines / Machines</option>
              {availableLines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Auditor Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedAuditor}
              onChange={(e) => setSelectedAuditor(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none w-full truncate"
            >
              <option value="ALL">All Auditors</option>
              {availableAuditors.map((aud) => (
                <option key={aud} value={aud}>
                  {aud}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Reset */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-slate-700 font-bold focus:outline-none w-full"
              >
                <option value="ALL">All Status</option>
                <option value="PASS">PASS (Compliant)</option>
                <option value="FAIL">FAIL (Deviations)</option>
              </select>
            </div>

            <button
              onClick={handleResetFilters}
              title="Reset All Filters"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. REAL DATA EXECUTIVE KPI CARDS GRID */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Audits */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Audits</span>
          <div className="text-xl font-black text-slate-900">{totalAuditsCount}</div>
          <span className="text-[10px] text-indigo-600 font-bold flex items-center space-x-1">
            <FileCheck2 className="w-3 h-3" />
            <span>Logged</span>
          </span>
        </div>

        {/* 2. Checkpoints */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Checkpoints</span>
          <div className="text-xl font-black text-slate-900">{totalCheckpointsCount}</div>
          <span className="text-[10px] text-slate-500 font-bold">Evaluated</span>
        </div>

        {/* 3. OK Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">OK Points</span>
          <div className="text-xl font-black text-emerald-600">{okPoints}</div>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Compliant</span>
          </span>
        </div>

        {/* 4. NG Count */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm space-y-1 bg-rose-50/20">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">NG Deviations</span>
          <div className="text-xl font-black text-rose-600">{ngPoints}</div>
          <span className="text-[10px] text-rose-700 font-bold flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Defects</span>
          </span>
        </div>

        {/* 5. Observations */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Observations</span>
          <div className="text-xl font-black text-amber-600">{obsPoints}</div>
          <span className="text-[10px] text-amber-700 font-bold">Monitor</span>
        </div>

        {/* 6. Open Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Open Actions</span>
          <div className="text-xl font-black text-indigo-600">{openActionsCount}</div>
          <span className="text-[10px] text-indigo-700 font-bold">In Tracking</span>
        </div>

        {/* 7. Critical Issues */}
        <div className="bg-white p-4 rounded-2xl border border-rose-300 shadow-sm space-y-1 bg-rose-50/40">
          <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">Critical</span>
          <div className="text-xl font-black text-rose-700">{criticalCount}</div>
          <span className="text-[10px] text-rose-800 font-bold flex items-center space-x-1">
            <AlertOctagon className="w-3 h-3" />
            <span>Urgent</span>
          </span>
        </div>

        {/* 8. Compliance % */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-1 bg-indigo-50/20">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Compliance</span>
          <div className="text-xl font-black text-indigo-600 font-mono">{avgCompliance.toFixed(1)}%</div>
          <span className="text-[10px] text-emerald-600 font-bold">Plant Health</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. CHARTS ROW 1: LINE DEVIATIONS (With Data Labels) & AUDITOR ACTIVITY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: LINE-WISE DEVIATIONS (WHICH LINES HAVE MORE DEVIATIONS) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Line-Wise Deviation Ranking (Which Lines Have More NG Findings)</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Total NG defect count identified per production line. Numeric data labels displayed.
              </p>
            </div>
            <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
              Ranked by Defects
            </span>
          </div>

          <div className="h-72">
            {lineDeviationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No deviations found matching the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineDeviationData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="line" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(value: any) => [`${value} Deviations`, 'NG Count']}
                  />
                  <Bar dataKey="ngCount" fill="#f43f5e" radius={[8, 8, 0, 0]} name="Deviations (NG)">
                    <LabelList dataKey="ngCount" position="top" fill="#be123c" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: AUDITOR ACTIVITY & VOLUME (WHO HAVE TAKEN AUDITS) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Auditor Inspection Activity (Who Has Taken Audits)</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Total completed audits logged per auditor with exact volume count labels.
              </p>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
              Auditor Leaderboard
            </span>
          </div>

          <div className="h-72">
            {auditorActivityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No auditor activity for selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={auditorActivityData}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="auditor" type="category" stroke="#64748b" fontSize={11} width={110} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} Audits (Avg Score: ${item.payload.avgScore}%)`,
                      'Audits Completed',
                    ]}
                  />
                  <Bar dataKey="audits" fill="#6366f1" radius={[0, 8, 8, 0]} name="Audits Completed">
                    <LabelList dataKey="audits" position="right" fill="#4338ca" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. CHARTS ROW 2: SECTION COMPLIANCE & STATUS RATIO */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 3: SECTION COMPLIANCE HEALTH (%) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Section Compliance &amp; Quality Health Comparison (%)</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Average compliance percentage score by plant section with direct percentage labels.
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
              Target $\ge$ 95%
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionComplianceData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="section" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  formatter={(value: any) => [`${value}% Compliance`, 'Section Score']}
                />
                <Bar dataKey="compliance" fill="#10b981" radius={[8, 8, 0, 0]} name="Compliance %">
                  <LabelList
                    dataKey="compliance"
                    position="top"
                    formatter={(val: any) => `${val}%`}
                    fill="#047857"
                    fontSize={11}
                    fontWeight="bold"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: INSPECTION STATUS RATIO DONUT */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <span>Inspection Status Ratio</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent, value }) => `${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. CHARTS ROW 3: COMPLIANCE TIMELINE & FREQUENT FAILURE HOTSPOTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 5: HISTORICAL COMPLIANCE & AUDIT VOLUME TREND */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Audit Volume &amp; Compliance History Timeline</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Daily trend showing audit volume (bars) and average compliance rate (line).
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineTrendData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar yAxisId="right" dataKey="audits" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Audits Count" />
                <Line yAxisId="left" type="monotone" dataKey="compliance" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} name="Compliance %">
                  <LabelList dataKey="compliance" position="top" formatter={(v: any) => `${v}%`} fill="#4338ca" fontSize={10} fontWeight="bold" />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: TOP FREQUENT FAILURE HOTSPOTS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Top Failure Components</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Most frequent component failure points.
              </p>
            </div>
          </div>

          <div className="h-64">
            {topFailureComponents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No component failure data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topFailureComponents}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="component" type="category" stroke="#64748b" fontSize={10} width={100} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Defect Count">
                    <LabelList dataKey="count" position="right" fill="#b45309" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. INTERACTIVE EXECUTIVE DATA TABLES */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
        {/* Table Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTableTab('lines')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
                activeTableTab === 'lines'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Line Risk &amp; Deviation Matrix ({lineDeviationData.length})</span>
            </button>

            <button
              onClick={() => setActiveTableTab('auditors')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
                activeTableTab === 'auditors'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Auditor Activity Matrix ({auditorActivityData.length})</span>
            </button>

            <button
              onClick={() => setActiveTableTab('audits')}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
                activeTableTab === 'audits'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Recent Audit Log ({filteredAudits.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LINE RISK & DEVIATIONS TABLE */}
        {activeTableTab === 'lines' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Line / Machine Name</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3 text-center">Audits Taken</th>
                  <th className="px-4 py-3 text-center">OK Points</th>
                  <th className="px-4 py-3 text-center">NG Deviations</th>
                  <th className="px-4 py-3 text-center">Compliance Score</th>
                  <th className="px-4 py-3 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {lineDeviationData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      No line data available for the active filters.
                    </td>
                  </tr>
                ) : (
                  lineDeviationData.map((row, idx) => {
                    const isHighRisk = row.ngCount >= 3 || row.avgComp < 85;
                    const isModRisk = !isHighRisk && (row.ngCount > 0 || row.avgComp < 95);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-extrabold text-slate-900">{row.line}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{row.section || 'General'}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{row.totalAudits}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.okCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${
                            row.ngCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {row.ngCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-indigo-700 font-mono">
                          {row.avgComp}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isHighRisk ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px] border border-rose-200">
                              <AlertOctagon className="w-3 h-3" />
                              <span>High Risk</span>
                            </span>
                          ) : isModRisk ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Moderate Risk</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Low Risk</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: AUDITOR PERFORMANCE TABLE */}
        {activeTableTab === 'auditors' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Auditor Name</th>
                  <th className="px-4 py-3 text-center">Audits Completed</th>
                  <th className="px-4 py-3 text-center">Total Points Inspected</th>
                  <th className="px-4 py-3 text-center">OK Points</th>
                  <th className="px-4 py-3 text-center">Deviations Found</th>
                  <th className="px-4 py-3 text-right">Avg Compliance Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditorActivityData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      No auditor data available.
                    </td>
                  </tr>
                ) : (
                  auditorActivityData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-extrabold text-slate-900 flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                          {row.auditor.charAt(0)}
                        </div>
                        <span>{row.auditor}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-indigo-600">
                        {row.audits}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.totalPoints}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.okPoints}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600">{row.ngFound}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                        <span className={`px-2 py-0.5 rounded-md ${
                          row.avgScore >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {row.avgScore}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: RECENT AUDIT LOG TABLE */}
        {activeTableTab === 'audits' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Audit ID</th>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Section &amp; Line</th>
                  <th className="px-4 py-3">Auditor</th>
                  <th className="px-4 py-3 text-center">Score %</th>
                  <th className="px-4 py-3 text-center">Findings</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      No audits found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.slice(0, 15).map((a) => (
                    <tr key={a.auditId} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">{a.auditId}</td>
                      <td className="px-4 py-3 text-slate-600">{a.date} {a.time}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{a.sectionName}</span>
                        <span className="text-slate-400 ml-1">({a.lineName || a.lineId})</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.auditorName}</td>
                      <td className="px-4 py-3 text-center font-mono font-black text-slate-900">
                        {a.compliancePercent}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-700 font-bold">{a.okCount} OK</span>
                        {a.ngCount > 0 && (
                          <span className="text-rose-600 font-bold ml-2">/ {a.ngCount} NG</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          a.overallStatus === 'PASS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {a.overallStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
