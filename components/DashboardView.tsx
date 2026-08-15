'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  AlertOctagon,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  PlusCircle,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  FileCheck2,
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
  const [subSections] = useState(StorageEngine.getSubSections());
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Dynamic Dashboard Filters
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedSubSection, setSelectedSubSection] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('ALL');
  const [selectedAuditor, setSelectedAuditor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');

  const loadData = () => {
    setAudits(StorageEngine.getAudits());
    setAuditResults(StorageEngine.getAuditResults());
    setActions(StorageEngine.getActions());
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      if (selectedSection !== 'ALL' && a.sectionId !== selectedSection && a.sectionName !== selectedSection) return false;
      if (selectedSubSection !== 'ALL' && a.subSectionId !== selectedSubSection && a.subSectionName !== selectedSubSection) return false;
      if (selectedLine !== 'ALL' && a.lineId !== selectedLine && a.lineName !== selectedLine) return false;
      if (selectedEquipment !== 'ALL' && a.equipmentId !== selectedEquipment && a.equipmentName !== selectedEquipment) return false;
      if (selectedAuditor !== 'ALL' && a.auditorName !== selectedAuditor) return false;
      if (selectedStatus !== 'ALL' && a.overallStatus !== selectedStatus) return false;
      return true;
    });
  }, [audits, selectedSection, selectedSubSection, selectedLine, selectedEquipment, selectedAuditor, selectedStatus]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    const auditIds = new Set(filteredAudits.map((a) => a.auditId));
    return auditResults.filter((r) => {
      if (!auditIds.has(r.auditId)) return false;
      if (selectedCriticality !== 'ALL') {
        const isCrit = r.isCritical || r.checkpointId?.includes('CRIT');
        if (selectedCriticality === 'Critical' && !isCrit) return false;
        if (selectedCriticality === 'Non-Critical' && isCrit) return false;
      }
      return true;
    });
  }, [auditResults, filteredAudits, selectedCriticality]);

  // Filtered Actions
  const filteredActions = useMemo(() => {
    const auditIds = new Set(filteredAudits.map((a) => a.auditId));
    return actions.filter((act) => auditIds.has(act.auditId));
  }, [actions, filteredAudits]);

  // Dynamic KPIs
  const totalAuditsCount = filteredAudits.length;
  const totalCheckpointsCount = filteredResults.length;
  const okPoints = filteredResults.filter((r) => r.status === 'OK').length;
  const ngPoints = filteredResults.filter((r) => r.status === 'NG').length;
  const obsPoints = filteredResults.filter((r) => r.status === 'Observation').length;
  const openActionsCount = filteredActions.filter((a) => a.status === 'Open' || a.status === 'In Progress').length;
  const overdueActionsCount = filteredActions.filter((a) => a.status === 'Overdue').length;
  const criticalIssuesCount = filteredResults.filter((r) => r.status === 'NG' && r.isCritical).length;

  const avgCompliance =
    totalAuditsCount > 0
      ? filteredAudits.reduce((acc, curr) => acc + curr.compliancePercent, 0) / totalAuditsCount
      : 100;

  // Chart 1: Audit Trend (Date-wise)
  const auditTrendData = useMemo(() => {
    const map: Record<string, { date: string; compliance: number; audits: number; count: number }> = {};
    filteredAudits.forEach((a) => {
      const d = a.date;
      if (!map[d]) map[d] = { date: d, compliance: 0, audits: 0, count: 0 };
      map[d].compliance += a.compliancePercent;
      map[d].audits += 1;
      map[d].count += 1;
    });
    return Object.values(map)
      .map((g) => ({ date: g.date, compliance: Math.round(g.compliance / g.count), audits: g.audits }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAudits]);

  // Chart 2: Section-wise Audit Count
  const sectionBarData = useMemo(() => {
    const map: Record<string, { name: string; ok: number; ng: number }> = {};
    filteredResults.forEach((r) => {
      const secName = r.sectionName || 'Grinding';
      if (!map[secName]) map[secName] = { name: secName, ok: 0, ng: 0 };
      if (r.status === 'OK') map[secName].ok += 1;
      if (r.status === 'NG') map[secName].ng += 1;
    });
    return Object.values(map);
  }, [filteredResults]);

  // Chart 3: Sub-Section-wise Audit Distribution (M1, M1A, M2, Robot-1, Furnace, etc.)
  const subSectionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredResults.forEach((r) => {
      const subName = r.subSectionName || 'General';
      map[subName] = (map[subName] || 0) + 1;
    });
    return Object.keys(map).map((k) => ({ name: k, value: map[k] }));
  }, [filteredResults]);

  // Chart 4: OK vs NG Pie Data
  const pieData = [
    { name: 'OK', value: okPoints, color: '#10b981' },
    { name: 'NG', value: ngPoints, color: '#f43f5e' },
    { name: 'Observation', value: obsPoints, color: '#f59e0b' },
  ];

  if (!isMounted) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3 text-slate-500 text-xs font-extrabold animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading Plant Engineering Dashboard...</span>
        </div>
      </div>
    );
  }

  // REQUIREMENT #15: If there are NO audits, display "No audit data available."
  if (audits.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 text-center space-y-5 my-8 max-w-2xl mx-auto animate-fade-in font-sans">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <Activity className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900">No audit data available.</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-md mx-auto">
            No audits have been submitted yet. Perform your first plant audit to dynamically generate real-time compliance KPIs, section trends, and equipment health metrics.
          </p>
        </div>

        <div className="pt-3">
          <button
            onClick={() => onNavigate('new-audit')}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/30 transition active:scale-95 flex items-center space-x-2 mx-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start First Engineering Audit</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in font-sans">
      {/* Top Title Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>PLANT ENGINEERING EXECUTIVE DASHBOARD</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-semibold">
            Real-time multi-section plant equipment health, sub-section breakdown, and active maintenance actions.
          </p>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Section Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold"
            >
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Section Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <select
              value={selectedSubSection}
              onChange={(e) => setSelectedSubSection(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold"
            >
              <option value="ALL">All Sub-Sections</option>
              {subSections.map((ss) => (
                <option key={ss.id} value={ss.id}>
                  {ss.name} ({ss.sectionId})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSelectedSection('ALL');
              setSelectedSubSection('ALL');
              setSelectedLine('ALL');
              setSelectedEquipment('ALL');
              setSelectedAuditor('ALL');
              setSelectedStatus('ALL');
              setSelectedCriticality('ALL');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-extrabold text-[11px] transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* REAL DATA KPI CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Audits */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Total Audits</span>
          <div className="text-xl font-extrabold text-slate-900">{totalAuditsCount}</div>
          <span className="text-[10px] text-indigo-600 font-bold">Logged Audits</span>
        </div>

        {/* 2. Checkpoints */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Checkpoints</span>
          <div className="text-xl font-extrabold text-slate-900">{totalCheckpointsCount}</div>
          <span className="text-[10px] text-slate-500 font-bold">Evaluated</span>
        </div>

        {/* 3. OK Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase">OK Points</span>
          <div className="text-xl font-extrabold text-emerald-600">{okPoints}</div>
          <span className="text-[10px] text-emerald-700 font-bold">Compliant</span>
        </div>

        {/* 4. NG Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase">NG Findings</span>
          <div className="text-xl font-extrabold text-rose-600">{ngPoints}</div>
          <span className="text-[10px] text-rose-700 font-bold">Deviations</span>
        </div>

        {/* 5. Observations */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-amber-600 uppercase">Observations</span>
          <div className="text-xl font-extrabold text-amber-600">{obsPoints}</div>
          <span className="text-[10px] text-amber-700 font-bold">Monitor</span>
        </div>

        {/* 6. Open Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase">Open Actions</span>
          <div className="text-xl font-extrabold text-indigo-600">{openActionsCount}</div>
          <span className="text-[10px] text-indigo-700 font-bold">In Tracking</span>
        </div>

        {/* 7. Critical Issues */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-rose-700 uppercase">Critical Issues</span>
          <div className="text-xl font-extrabold text-rose-700">{criticalIssuesCount}</div>
          <span className="text-[10px] text-rose-800 font-bold">Urgent Repair</span>
        </div>

        {/* 8. Compliance % */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Compliance %</span>
          <div className="text-xl font-extrabold text-indigo-600 font-mono">{avgCompliance.toFixed(1)}%</div>
          <span className="text-[10px] text-emerald-600 font-bold">Plant Health</span>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Audit Compliance Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Plant Audit Compliance &amp; Volume Trend</span>
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={auditTrendData}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="compliance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorComp)" name="Compliance %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. OK vs NG Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <span>Inspection Status Ratio</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={4}>
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

        {/* 3. Section-wise Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Section-wise OK vs NG Findings</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="ok" fill="#10b981" radius={[6, 6, 0, 0]} name="OK Points" />
                <Bar dataKey="ng" fill="#f43f5e" radius={[6, 6, 0, 0]} name="NG Deviations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Sub-Section Distribution (M1, M1A, M2, Robot-1, Furnace) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Sub-Section Evaluation Volume</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subSectionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Checkpoints" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
