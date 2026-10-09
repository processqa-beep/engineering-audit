'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  User,
  Calendar,
  Layers,
  Wrench,
  Search,
  ExternalLink,
  MessageSquare,
  Lock,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  ShieldCheck,
  Building,
  Target,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  MapPin,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { SupabaseBackendClient } from '../lib/supabaseBackend';
import { ActionItem, ActionStatus, AuthUser } from '../lib/types';

interface ActionTrackingViewProps {
  onNavigate: (tab: string) => void;
  currentUser?: AuthUser | null;
}

// ── SANITIZER HELPER (NO DUMMY / AUTO-FILLED DATA) ────────────────────────────
function sanitizeAction(
  act: ActionItem,
  auditResults: any[],
  checkpoints: any[]
): ActionItem {
  const cleaned: ActionItem = { ...act };

  // 1. Clean up closureRemark and extract CAPA metadata without raw JSON tags
  if (
    cleaned.closureRemark &&
    cleaned.closureRemark.includes('<!--CAPA_DATA:') &&
    cleaned.closureRemark.includes('-->')
  ) {
    try {
      const match = cleaned.closureRemark.match(/<!--CAPA_DATA:(.*?)-->/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        const cleanText = cleaned.closureRemark.replace(/<!--CAPA_DATA:.*?-->/, '').trim();
        cleaned.closureRemark = cleanText || meta.rmk || '';
        cleaned.rootCause = cleaned.rootCause || meta.rc || undefined;
        cleaned.correctiveAction = cleaned.correctiveAction || meta.ca || undefined;
        cleaned.preventiveAction = cleaned.preventiveAction || meta.pa || undefined;
        cleaned.targetClosureDate = cleaned.targetClosureDate || meta.tcd || undefined;
        cleaned.closedBy = cleaned.closedBy || meta.cb || undefined;
      }
    } catch (_) {}
  }

  // 2. Lookup standard spec, actual value, and potential impact strictly from audit results or master checkpoints (no dummy placeholders)
  if (!cleaned.standardParameter || !cleaned.actualValue || !cleaned.potentialImpact) {
    const matchedRes = auditResults.find(
      (r) =>
        (r.auditId === cleaned.auditId && r.checkpointText === cleaned.checkpointText) ||
        (r.auditId === cleaned.auditId && r.componentName === cleaned.componentName)
    );
    const matchedCk = checkpoints.find(
      (c) =>
        c.checkpointText === cleaned.checkpointText ||
        (c.componentName === cleaned.componentName && c.checkpointText === cleaned.checkpointText) ||
        c.componentName === cleaned.componentName
    );

    if (!cleaned.standardParameter) {
      cleaned.standardParameter =
        matchedRes?.standardParameter ||
        matchedCk?.standardParameter ||
        (matchedCk?.minimum !== undefined && matchedCk?.maximum !== undefined
          ? `${matchedCk.minimum} - ${matchedCk.maximum} ${matchedCk.unit || ''}`.trim()
          : '');
    }

    if (!cleaned.actualValue) {
      cleaned.actualValue = matchedRes?.actualValue || '';
    }

    if (!cleaned.potentialImpact) {
      cleaned.potentialImpact =
        matchedRes?.whatImpactIfThisPartGetsFail ||
        matchedRes?.impactOfFailure ||
        matchedCk?.whatImpactIfThisPartGetsFail ||
        matchedCk?.impactOfFailure ||
        '';
    }

    if (!cleaned.photoUrl && matchedRes?.photoUrl) {
      cleaned.photoUrl = matchedRes.photoUrl;
    }
  }

  return cleaned;
}

export const ActionTrackingView: React.FC<ActionTrackingViewProps> = ({ onNavigate, currentUser }) => {
  const [actions, setActions] = useState<ActionItem[]>(() => StorageEngine.getActions());
  const [auditResults, setAuditResults] = useState<any[]>(() => StorageEngine.getAuditResults());
  const [checkpoints, setCheckpoints] = useState<any[]>(() => StorageEngine.getCheckpoints());

  // Filter States
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'Open' | 'In Progress' | 'Overdue' | 'Closed'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>(() =>
    currentUser?.role === 'Engineering' && currentUser?.department ? currentUser.department : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Edit / Closure Modal State
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [newStatus, setNewStatus] = useState<ActionStatus>('Open');
  const [newTcd, setNewTcd] = useState<string>('');
  const [newRootCause, setNewRootCause] = useState<string>('');
  const [newCorrectiveAction, setNewCorrectiveAction] = useState<string>('');
  const [newPreventiveAction, setNewPreventiveAction] = useState<string>('');
  const [newRemarks, setNewRemarks] = useState<string>('');
  const [newClosurePhoto, setNewClosurePhoto] = useState<string>('');
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Initial Sync from Supabase Cloud
  useEffect(() => {
    if (SupabaseBackendClient.isConfigured()) {
      Promise.allSettled([
        SupabaseBackendClient.fetchActions(),
        SupabaseBackendClient.fetchAuditResults(),
        SupabaseBackendClient.fetchCheckpoints(),
      ]).then(([actRes, resRes, ckRes]) => {
        if (actRes.status === 'fulfilled' && actRes.value && actRes.value.length > 0) {
          setActions(actRes.value);
        }
        if (resRes.status === 'fulfilled' && resRes.value && resRes.value.length > 0) {
          setAuditResults(resRes.value);
        }
        if (ckRes.status === 'fulfilled' && ckRes.value && ckRes.value.length > 0) {
          setCheckpoints(ckRes.value);
        }
      });
    }
  }, []);

  // Lock body scroll when popup/modal is open
  useEffect(() => {
    if (editingAction || activePhotoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingAction, activePhotoModal]);

  // Clean actions
  const sanitizedActions = useMemo(() => {
    return actions.map((act) => sanitizeAction(act, auditResults, checkpoints));
  }, [actions, auditResults, checkpoints]);

  // Check user edit permissions
  const canUserEditAction = (act: ActionItem): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Viewer') return false;

    // Check department match
    if (
      currentUser.department &&
      act.responsibleDepartment &&
      currentUser.department.toLowerCase().trim() === act.responsibleDepartment.toLowerCase().trim()
    ) {
      return true;
    }

    // Check assigned email match
    if (
      currentUser.email &&
      act.assignedEmail &&
      currentUser.email.toLowerCase().trim() === act.assignedEmail.toLowerCase().trim()
    ) {
      return true;
    }

    // Check responsible person name match
    if (
      currentUser.name &&
      act.responsiblePerson &&
      currentUser.name.toLowerCase().trim() === act.responsiblePerson.toLowerCase().trim()
    ) {
      return true;
    }

    return false;
  };

  const departmentsList = useMemo(() => {
    return Array.from(new Set(sanitizedActions.map((a) => a.responsibleDepartment).filter(Boolean))) as string[];
  }, [sanitizedActions]);

  // Filtered Actions
  const filteredActions = useMemo(() => {
    return sanitizedActions.filter((act) => {
      if (activeSubTab !== 'ALL' && act.status !== activeSubTab) return false;
      if (priorityFilter !== 'ALL' && act.priority !== priorityFilter) return false;
      if (departmentFilter !== 'ALL' && act.responsibleDepartment !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchComp = (act.componentName || '').toLowerCase().includes(q);
        const matchCheck = (act.checkpointText || '').toLowerCase().includes(q);
        const matchAud = (act.auditId || '').toLowerCase().includes(q);
        const matchId = (act.actionId || '').toLowerCase().includes(q);
        const matchResp = (act.responsiblePerson || '').toLowerCase().includes(q);
        const matchDept = (act.responsibleDepartment || '').toLowerCase().includes(q);
        const matchObs = (act.observation || '').toLowerCase().includes(q);
        const matchRec = (act.recommendedAction || '').toLowerCase().includes(q);
        if (!matchComp && !matchCheck && !matchAud && !matchId && !matchResp && !matchDept && !matchObs && !matchRec) {
          return false;
        }
      }
      return true;
    });
  }, [sanitizedActions, activeSubTab, priorityFilter, departmentFilter, searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, priorityFilter, departmentFilter, searchQuery, pageSize]);

  // Counts for Sub-Tabs
  const totalCount = sanitizedActions.length;
  const openCount = sanitizedActions.filter((a) => a.status === 'Open').length;
  const inProgressCount = sanitizedActions.filter((a) => a.status === 'In Progress').length;
  const closedCount = sanitizedActions.filter((a) => a.status === 'Closed').length;
  const overdueCount = sanitizedActions.filter((a) => a.status === 'Overdue').length;

  // Pagination Slice
  const totalPages = Math.ceil(filteredActions.length / pageSize) || 1;
  const paginatedActions = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredActions.slice(startIdx, startIdx + pageSize);
  }, [filteredActions, currentPage, pageSize]);

  const handleOpenStatusModal = (act: ActionItem) => {
    setEditingAction(act);
    setNewStatus(act.status || 'Open');
    setNewTcd(act.targetClosureDate || act.targetDate || '');
    setNewRootCause(act.rootCause || '');
    setNewCorrectiveAction(act.correctiveAction || '');
    setNewPreventiveAction(act.preventiveAction || '');
    setNewRemarks(act.closureRemark || '');
    setNewClosurePhoto(act.closurePhotoUrl || '');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawDataUrl = evt.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX_DIM) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else if (h > MAX_DIM) {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.45);
          setNewClosurePhoto(compressed);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStatusUpdate = async () => {
    if (!editingAction) return;
    setSaving(true);

    const updates: Partial<ActionItem> = {
      status: newStatus,
      targetClosureDate: newTcd,
      rootCause: newRootCause,
      correctiveAction: newCorrectiveAction,
      preventiveAction: newPreventiveAction,
      closureRemark: newRemarks,
      closurePhotoUrl: newClosurePhoto,
      closedDate: newStatus === 'Closed' ? new Date().toISOString().substring(0, 10) : undefined,
      closedBy: currentUser?.name || 'Department Lead',
    };

    // If status is Closed, dispatch email notification
    if (newStatus === 'Closed') {
      const matchedAudit = StorageEngine.getAudits().find((a) => a.auditId === editingAction.auditId);
      const matchedResult = StorageEngine.getAuditResults().find(
        (r) =>
          (r.auditId === editingAction.auditId && r.checkpointText === editingAction.checkpointText) ||
          (r.auditId === editingAction.auditId && r.componentName === editingAction.componentName)
      );

      const closedActionItem: any = {
        ...editingAction,
        ...updates,
        photoUrl: editingAction.photoUrl || matchedResult?.photoUrl || undefined,
        auditorName: matchedAudit?.auditorName || editingAction.auditorEmail || 'Auditor',
      };

      const toList = Array.from(
        new Set([editingAction.assignedEmail, 'mehul.chikhaliya@borosil.com'].filter(Boolean))
      );
      const ccList = Array.from(
        new Set(
          [editingAction.ccEmail, editingAction.auditorEmail, 'process.qa@borosil.com']
            .filter(Boolean)
            .flatMap((c) => (c || '').split(',').map((x) => x.trim()).filter(Boolean))
        )
      );

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toList,
          cc: ccList,
          type: 'ACTION_CLOSURE',
          actionClosure: closedActionItem,
          subject: `[ACTION CLOSED] ${editingAction.componentName} - ${editingAction.lineName || editingAction.sectionName} (Audit ${editingAction.auditId})`,
        }),
      }).catch((mailErr) => console.warn('[Closure email dispatch notice]:', mailErr));
    }

    try {
      await SupabaseBackendClient.updateActionDetailed(editingAction.actionId, updates);
      const freshActions = await SupabaseBackendClient.fetchActions();
      if (freshActions && freshActions.length > 0) {
        setActions(freshActions);
      }
    } catch (err) {
      console.warn('Action sync notice:', err);
    } finally {
      setSaving(false);
      setEditingAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* ── TOP BANNER ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>ACTION ITEMS &amp; DEVIATION CLOSURE TRACKER</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Track Deviation Observations, Standard Parameters, Measured Values, Potential Impacts, RCA, and CAPA Resolutions.
          </p>
        </div>

        {/* Global Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search component, checkpoint, FPR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-xs"
          />
        </div>
      </div>

      {/* ── SUB-TABS & KPI STATUS BAR ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-xs cursor-pointer ${
            activeSubTab === 'ALL'
              ? 'bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-400/30'
              : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${activeSubTab === 'ALL' ? 'text-indigo-100' : 'text-slate-400'}`}>
              All Actions
            </span>
            <div className={`text-xl font-black mt-0.5 ${activeSubTab === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalCount}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSubTab === 'ALL' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Layers className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('Open')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-xs cursor-pointer ${
            activeSubTab === 'Open'
              ? 'bg-rose-600 border-rose-700 text-white ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200/90 hover:bg-rose-50/50 text-slate-700'
          }`}
        >
          <div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${activeSubTab === 'Open' ? 'text-rose-100' : 'text-slate-400'}`}>
              Open / Pending
            </span>
            <div className={`text-xl font-black mt-0.5 ${activeSubTab === 'Open' ? 'text-white' : 'text-rose-600'}`}>
              {openCount}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSubTab === 'Open' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('In Progress')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-xs cursor-pointer ${
            activeSubTab === 'In Progress'
              ? 'bg-amber-500 border-amber-600 text-white ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200/90 hover:bg-amber-50/50 text-slate-700'
          }`}
        >
          <div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${activeSubTab === 'In Progress' ? 'text-amber-100' : 'text-slate-400'}`}>
              In Progress
            </span>
            <div className={`text-xl font-black mt-0.5 ${activeSubTab === 'In Progress' ? 'text-white' : 'text-amber-600'}`}>
              {inProgressCount}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSubTab === 'In Progress' ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-600'}`}>
            <Clock className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('Overdue')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-xs cursor-pointer ${
            activeSubTab === 'Overdue'
              ? 'bg-red-700 border-red-800 text-white ring-2 ring-red-400/30'
              : 'bg-white border-slate-200/90 hover:bg-red-50/50 text-slate-700'
          }`}
        >
          <div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${activeSubTab === 'Overdue' ? 'text-red-100' : 'text-slate-400'}`}>
              Overdue
            </span>
            <div className={`text-xl font-black mt-0.5 ${activeSubTab === 'Overdue' ? 'text-white' : 'text-red-700'}`}>
              {overdueCount}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSubTab === 'Overdue' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
            <Clock className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('Closed')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-xs cursor-pointer ${
            activeSubTab === 'Closed'
              ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-200/90 hover:bg-emerald-50/50 text-slate-700'
          }`}
        >
          <div>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${activeSubTab === 'Closed' ? 'text-emerald-100' : 'text-slate-400'}`}>
              Closed / Done
            </span>
            <div className={`text-xl font-black mt-0.5 ${activeSubTab === 'Closed' ? 'text-white' : 'text-emerald-600'}`}>
              {closedCount}
            </div>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSubTab === 'Closed' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* ── SECONDARY FILTERS & PAGINATION CONTROLS ──────────────────────────── */}
      <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-bold">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-bold">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-bold">Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value={10}>10 items</option>
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
        </div>

        {/* Pagination Summary & Buttons */}
        <div className="flex items-center space-x-3 ml-auto">
          <span className="text-slate-500 font-bold text-[11px]">
            Showing <strong className="text-slate-800">{filteredActions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredActions.length)}</strong> of <strong className="text-slate-800">{filteredActions.length}</strong>
          </span>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold text-xs">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTION ITEMS LIST CARDS ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {paginatedActions.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900">No Action Items Found</h3>
            <p className="text-xs text-slate-500 font-semibold">
              No deviation actions match your selected tab &amp; filter criteria.
            </p>
          </div>
        ) : (
          paginatedActions.map((act, idx) => {
            const hasPermission = canUserEditAction(act);

            return (
              <div
                key={`${act.actionId}-${act.auditId}-${idx}`}
                className={`p-5 md:p-6 rounded-3xl border transition shadow-md ${
                  act.status === 'Closed'
                    ? 'bg-slate-50/90 border-slate-200 opacity-90'
                    : act.status === 'Overdue'
                    ? 'bg-rose-50/50 border-rose-300'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                {/* ── Card Header Row ─────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {act.actionId}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      Audit #{act.auditId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg ${
                        act.priority === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : act.priority === 'High'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {act.priority} Priority
                    </span>

                    {act.responsibleDepartment && (
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-lg flex items-center space-x-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{act.responsibleDepartment}</span>
                      </span>
                    )}

                    {(act.lineName || act.sectionName) && (
                      <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{act.lineName || act.sectionName}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Status Pill */}
                    <span
                      className={`px-3 py-1 text-xs font-black rounded-xl shadow-xs ${
                        act.status === 'Closed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : act.status === 'In Progress'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : act.status === 'Overdue'
                          ? 'bg-rose-200 text-rose-900 border border-rose-400'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {act.status}
                    </span>
                  </div>
                </div>

                {/* ── Component & Checkpoint Details Grid ────────────────────── */}
                <div className="space-y-3 text-xs">
                  {/* Title */}
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-slate-900">
                      {act.componentName}
                    </h3>
                  </div>

                  {/* Complete Specification & Finding Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                    {/* Checkpoint */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Audit Checkpoint
                      </span>
                      <p className="font-bold text-slate-900">{act.checkpointText || '-'}</p>
                    </div>

                    {/* Standard Parameter / Spec */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Standard Parameter / Spec
                      </span>
                      <p className="font-extrabold text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded-md border border-indigo-100 inline-block">
                        {act.standardParameter || '-'}
                      </p>
                    </div>

                    {/* Actual Value Measured */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Actual Value Measured
                      </span>
                      <p className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                        {act.actualValue || '-'}
                      </p>
                    </div>

                    {/* Observation / Deviation Finding */}
                    <div className="space-y-0.5 md:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                        Observation / Finding Remarks
                      </span>
                      <p className="font-bold text-rose-800 bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                        {act.observation || '-'}
                      </p>
                    </div>

                    {/* Potential Impact */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                        Potential Impact / Failure Risk
                      </span>
                      <p className="font-bold text-amber-900 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                        {act.potentialImpact || '-'}
                      </p>
                    </div>

                    {/* Recommended Action */}
                    <div className="space-y-0.5 md:col-span-2 lg:col-span-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                        Recommended Action
                      </span>
                      <p className="font-bold text-emerald-900 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                        {act.recommendedAction || '-'}
                      </p>
                    </div>
                  </div>

                  {/* ── CAPA & Root Cause Analysis (RCA) Section (Only when filled) ── */}
                  {(Boolean(act.rootCause) || Boolean(act.correctiveAction) || Boolean(act.preventiveAction) || Boolean(act.closureRemark)) && (
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                      <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                        <span>CAPA &amp; Root Cause Analysis (RCA)</span>
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {act.rootCause && (
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <strong className="text-slate-500 font-bold block text-[10px] uppercase">
                              Root Cause:
                            </strong>
                            <p className="text-slate-900 font-semibold mt-0.5">{act.rootCause}</p>
                          </div>
                        )}

                        {act.correctiveAction && (
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <strong className="text-slate-500 font-bold block text-[10px] uppercase">
                              Corrective Action:
                            </strong>
                            <p className="text-slate-900 font-semibold mt-0.5">{act.correctiveAction}</p>
                          </div>
                        )}

                        {act.preventiveAction && (
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <strong className="text-slate-500 font-bold block text-[10px] uppercase">
                              Preventive Action:
                            </strong>
                            <p className="text-slate-900 font-semibold mt-0.5">{act.preventiveAction}</p>
                          </div>
                        )}

                        {act.closureRemark && (
                          <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                            <strong className="text-slate-500 font-bold block text-[10px] uppercase">
                              Closure Remarks:
                            </strong>
                            <p className="text-slate-900 font-semibold mt-0.5">{act.closureRemark}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Footer Bar: FPR, Dates, Evidence Photos & Update Button ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] font-semibold">
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>FPR Lead: <strong className="text-slate-800">{act.responsiblePerson || '-'}</strong></span>
                      </span>

                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: <strong className="text-slate-800">{act.targetDate || '-'}</strong></span>
                      </span>

                      {act.targetClosureDate && (
                        <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          <span>TCD: {act.targetClosureDate}</span>
                        </span>
                      )}

                      {act.closedDate && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Closed on: {act.closedDate} {act.closedBy ? `by ${act.closedBy}` : ''}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                      {/* Before & After Photo Thumbnails */}
                      <div className="flex items-center space-x-2">
                        {act.photoUrl && (
                          <div className="text-center">
                            <img
                              src={act.photoUrl}
                              alt="Finding"
                              onClick={() => setActivePhotoModal(act.photoUrl || null)}
                              className="w-10 h-10 object-cover rounded-xl border border-slate-300 cursor-pointer shadow-xs hover:scale-105 transition"
                              title="Click to zoom Finding / Before Photo"
                            />
                            <span className="text-[8px] text-slate-400 font-bold block">Finding</span>
                          </div>
                        )}

                        {act.closurePhotoUrl && (
                          <div className="text-center">
                            <img
                              src={act.closurePhotoUrl}
                              alt="Closure"
                              onClick={() => setActivePhotoModal(act.closurePhotoUrl || null)}
                              className="w-10 h-10 object-cover rounded-xl border border-emerald-300 ring-2 ring-emerald-400/40 cursor-pointer shadow-xs hover:scale-105 transition"
                              title="Click to zoom After / Closure Evidence Photo"
                            />
                            <span className="text-[8px] text-emerald-700 font-bold block">After Fix</span>
                          </div>
                        )}
                      </div>

                      {/* Department-Protected Action Button */}
                      {hasPermission ? (
                        <button
                          onClick={() => handleOpenStatusModal(act)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Update RCA / Close</span>
                        </button>
                      ) : (
                        <div
                          className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[11px] font-bold border border-slate-200 flex items-center space-x-1.5"
                          title="Only the assigned department lead or Admin can edit this action"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{act.responsibleDepartment || 'Assigned Dept'} Only</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── BOTTOM PAGINATION BAR ───────────────────────────────────────────── */}
      {filteredActions.length > pageSize && (
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between text-xs">
          <span className="text-slate-500 font-bold text-[11px]">
            Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({filteredActions.length} total items)
          </span>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 font-bold transition"
            >
              First
            </button>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-slate-600 font-bold transition"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN PHOTO ZOOM MODAL ─────────────────────────────────────── */}
      {activePhotoModal && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-fade-in"
          onClick={() => setActivePhotoModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={activePhotoModal} alt="Enlarged finding / evidence" className="max-w-full max-h-[82vh] object-contain rounded-xl" />
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full shadow-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── UPDATE / CLOSURE / RCA MODAL (CENTERED POPUP) ────────────────────── */}
      {editingAction && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Sticky Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    {editingAction.actionId}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Audit #{editingAction.auditId}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{editingAction.componentName}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Deviation Details Summary */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800">
                  <span className="text-slate-400 font-semibold">Checkpoint: </span>
                  {editingAction.checkpointText}
                </div>
                <div className="font-bold text-rose-700">
                  <span className="text-slate-400 font-semibold">Finding / Observation: </span>
                  {editingAction.observation}
                </div>
                {editingAction.standardParameter && (
                  <div className="font-bold text-indigo-800">
                    <span className="text-slate-400 font-semibold">Standard Spec: </span>
                    {editingAction.standardParameter}
                  </div>
                )}
              </div>

              {/* Status & TCD in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Action Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed / Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Target Closure Date (TCD)</label>
                  <input
                    type="date"
                    value={newTcd}
                    onChange={(e) => setNewTcd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Root Cause Analysis (RCA) */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Root Cause Analysis (RCA) <span className="text-slate-400 font-normal">(Why did the failure occur?)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain the root mechanism or reason for deviation..."
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-xs"
                />
              </div>

              {/* Corrective Action Taken */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Corrective Action Taken <span className="text-slate-400 font-normal">(Immediate repair / fix)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Immediate repair, replacement, or calibration completed..."
                  value={newCorrectiveAction}
                  onChange={(e) => setNewCorrectiveAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-xs"
                />
              </div>

              {/* Preventive Action */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Preventive Action <span className="text-slate-400 font-normal">(To prevent recurrence)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="PM schedule update, design modification, or SOP training..."
                  value={newPreventiveAction}
                  onChange={(e) => setNewPreventiveAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-xs"
                />
              </div>

              {/* Upload After Photo (Closure Evidence) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-slate-700 font-bold block mb-1.5">
                  Upload After Photo / Closure Evidence
                </label>
                <div className="flex items-center space-x-3">
                  {newClosurePhoto ? (
                    <div className="relative group">
                      <img
                        src={newClosurePhoto}
                        alt="After evidence"
                        className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-400 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setNewClosurePhoto('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-700"
                        title="Remove Photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Camera */}
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Gallery */}
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Gallery / File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Maintenance Log Notes */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Additional Log / SAP Work Order ID</label>
                <textarea
                  rows={2}
                  placeholder="Enter SAP work order number, spares consumed, or team notes..."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500 transition shadow-xs"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end space-x-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStatusUpdate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Update Action'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
