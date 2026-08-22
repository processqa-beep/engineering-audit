'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { SupabaseBackendClient } from '../lib/supabaseBackend';
import { ActionItem, ActionStatus, AuthUser } from '../lib/types';

interface ActionTrackingViewProps {
  onNavigate: (tab: string) => void;
  currentUser?: AuthUser | null;
}

export const ActionTrackingView: React.FC<ActionTrackingViewProps> = ({ onNavigate, currentUser }) => {
  const sections = StorageEngine.getSections();
  const lines = StorageEngine.getLines();
  const [actions, setActions] = useState<ActionItem[]>(() => StorageEngine.getActions());

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Check if current user is allowed to edit this specific action item
  const canUserEditAction = (act: ActionItem): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;

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

  const departmentsList = Array.from(
    new Set(actions.map((a) => a.responsibleDepartment).filter(Boolean))
  ) as string[];

  const filteredActions = actions.filter((act) => {
    if (statusFilter !== 'ALL' && act.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && act.priority !== priorityFilter) return false;
    if (departmentFilter !== 'ALL' && act.responsibleDepartment !== departmentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = act.componentName.toLowerCase().includes(q);
      const matchCheck = act.checkpointText.toLowerCase().includes(q);
      const matchAud = act.auditId.toLowerCase().includes(q);
      const matchId = act.actionId.toLowerCase().includes(q);
      const matchResp = (act.responsiblePerson || '').toLowerCase().includes(q);
      const matchDept = (act.responsibleDepartment || '').toLowerCase().includes(q);
      if (!matchComp && !matchCheck && !matchAud && !matchId && !matchResp && !matchDept) return false;
    }
    return true;
  });

  const handleOpenStatusModal = (act: ActionItem) => {
    setEditingAction(act);
    setNewStatus(act.status || 'Open');
    setNewTcd(act.targetClosureDate || act.targetDate || '');
    setNewRootCause(act.rootCause || '');
    setNewCorrectiveAction(act.correctiveAction || act.recommendedAction || '');
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

    StorageEngine.updateActionDetailed(editingAction.actionId, updates);
    setActions(StorageEngine.getActions());

    try {
      await SupabaseBackendClient.updateActionDetailed(editingAction.actionId, updates);
    } catch (err) {
      console.warn('Action sync notice:', err);
    } finally {
      setSaving(false);
      setEditingAction(null);
    }
  };

  const openCount = actions.filter((a) => a.status === 'Open').length;
  const inProgressCount = actions.filter((a) => a.status === 'In Progress').length;
  const closedCount = actions.filter((a) => a.status === 'Closed').length;
  const overdueCount = actions.filter((a) => a.status === 'Overdue').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>ACTION ITEMS &amp; DEVIATION CLOSURE TRACKER</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Track Root Cause Analysis (RCA), Corrective &amp; Preventive Actions (CAPA), TCD, and After Evidence Photos.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold cursor-pointer"
            >
              <option value="ALL">All Status ({actions.length})</option>
              <option value="Open">Open ({openCount})</option>
              <option value="In Progress">In Progress ({inProgressCount})</option>
              <option value="Overdue">Overdue ({overdueCount})</option>
              <option value="Closed">Closed ({closedCount})</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search component, FPR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Open Actions</span>
            <div className="text-2xl font-black text-rose-600 mt-0.5">{openCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">In Progress</span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Overdue</span>
            <div className="text-2xl font-black text-red-700 mt-0.5">{overdueCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Closed / Done</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{closedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Items Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredActions.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900">No Action Items Found</h3>
            <p className="text-xs text-slate-500 font-semibold">All equipment checkpoints are in compliance or match your filter criteria.</p>
          </div>
        ) : (
          filteredActions.map((act, idx) => {
            const hasPermission = canUserEditAction(act);

            return (
              <div
                key={`${act.actionId}-${act.auditId}-${idx}`}
                className={`p-6 rounded-3xl border transition shadow-md ${
                  act.status === 'Closed'
                    ? 'bg-slate-50/80 border-slate-200 opacity-85'
                    : act.status === 'Overdue'
                    ? 'bg-rose-50/60 border-rose-300'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="space-y-2.5 flex-1">
                    {/* Header Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {act.actionId}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">• Audit: {act.auditId}</span>
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
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center space-x-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{act.responsibleDepartment}</span>
                        </span>
                      )}
                    </div>

                    {/* Component Title */}
                    <h3 className="text-base font-extrabold text-slate-900">
                      {act.componentName}
                    </h3>

                    {/* Deviation & Checkpoint Box */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                      <p className="font-semibold text-slate-800">
                        <span className="font-bold text-slate-500">Checkpoint: </span>
                        {act.checkpointText}
                      </p>
                      <p className="font-semibold text-rose-700">
                        <span className="font-bold text-slate-500">Observation: </span>
                        {act.observation}
                      </p>
                      <p className="font-semibold text-emerald-800 pt-0.5">
                        <span className="font-bold text-slate-500">Recommended Action: </span>
                        {act.recommendedAction}
                      </p>
                    </div>

                    {/* CAPA & RCA details if logged */}
                    {(act.rootCause || act.correctiveAction || act.preventiveAction || act.closureRemark) && (
                      <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-1">
                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block mb-1">
                          🛠️ CAPA &amp; Root Cause Analysis (RCA):
                        </span>
                        {act.rootCause && (
                          <p className="text-slate-800">
                            <strong className="text-slate-600">Root Cause: </strong>
                            {act.rootCause}
                          </p>
                        )}
                        {act.correctiveAction && (
                          <p className="text-slate-800">
                            <strong className="text-slate-600">Corrective Action: </strong>
                            {act.correctiveAction}
                          </p>
                        )}
                        {act.preventiveAction && (
                          <p className="text-slate-800">
                            <strong className="text-slate-600">Preventive Action: </strong>
                            {act.preventiveAction}
                          </p>
                        )}
                        {act.closureRemark && (
                          <p className="text-slate-800">
                            <strong className="text-slate-600">Closure Remarks: </strong>
                            {act.closureRemark}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meta Bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>FPR Lead: <strong className="text-slate-700">{act.responsiblePerson}</strong></span>
                      </span>

                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: <strong className="text-slate-700">{act.targetDate}</strong></span>
                      </span>

                      {act.targetClosureDate && (
                        <span className="flex items-center space-x-1 text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          <span>TCD: {act.targetClosureDate}</span>
                        </span>
                      )}

                      {act.closedDate && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          ✓ Closed on: {act.closedDate} {act.closedBy ? `by ${act.closedBy}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Photos & Action Button */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {/* Status Pill */}
                    <span
                      className={`px-3.5 py-1 text-xs font-black rounded-xl shadow-xs ${
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

                    {/* Before & After Photos */}
                    <div className="flex items-center space-x-2">
                      {act.photoUrl && (
                        <div className="text-center">
                          <img
                            src={act.photoUrl}
                            alt="Finding"
                            onClick={() => setActivePhotoModal(act.photoUrl || null)}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-300 cursor-pointer shadow-xs hover:scale-105 transition"
                            title="Click to view Finding / Before Photo"
                          />
                          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Finding</span>
                        </div>
                      )}

                      {act.closurePhotoUrl && (
                        <div className="text-center">
                          <img
                            src={act.closurePhotoUrl}
                            alt="Closure"
                            onClick={() => setActivePhotoModal(act.closurePhotoUrl || null)}
                            className="w-12 h-12 object-cover rounded-xl border border-emerald-300 ring-2 ring-emerald-400/40 cursor-pointer shadow-xs hover:scale-105 transition"
                            title="Click to view After / Closure Evidence Photo"
                          />
                          <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">After Fix</span>
                        </div>
                      )}
                    </div>

                    {/* Department-Protected Action Button */}
                    {hasPermission ? (
                      <button
                        onClick={() => handleOpenStatusModal(act)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Update RCA / Close</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[11px] font-bold border border-slate-200 flex items-center space-x-1.5" title="Only the assigned department lead or Admin can edit this action">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{act.responsibleDepartment || 'Assigned Dept'} Only</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full-Screen Photo Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActivePhotoModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl shadow-2xl">
            <img src={activePhotoModal} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 bg-slate-900/80 text-white p-1.5 rounded-full hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* UPDATE / CLOSURE / RCA MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <span>Action &amp; RCA Closure ({editingAction.actionId})</span>
              </h3>
              <button
                onClick={() => setEditingAction(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Status & TCD in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Action Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Root Cause Analysis */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Root Cause Analysis (RCA) <span className="text-slate-400 font-normal">(Why did the failure occur?)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain the root mechanism or reason for deviation..."
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Corrective Action */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Corrective Action Taken <span className="text-slate-400 font-normal">(Immediate fix)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Immediate repair, replacement, or calibration completed..."
                  value={newCorrectiveAction}
                  onChange={(e) => setNewCorrectiveAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
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
                        className="w-16 h-16 object-cover rounded-xl border border-emerald-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setNewClosurePhoto('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-700"
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
                    <label className="cursor-pointer inline-flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition">
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
                    <label className="cursor-pointer inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStatusUpdate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Update Action'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
