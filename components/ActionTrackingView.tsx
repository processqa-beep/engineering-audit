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
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { ActionItem } from '../lib/types';

interface ActionTrackingViewProps {
  onNavigate: (tab: string) => void;
}

export const ActionTrackingView: React.FC<ActionTrackingViewProps> = ({ onNavigate }) => {
  const sections = StorageEngine.getSections();
  const lines = StorageEngine.getLines();
  const [actions, setActions] = useState<ActionItem[]>(() => StorageEngine.getActions());

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [newStatus, setNewStatus] = useState<'Open' | 'In Progress' | 'Closed' | 'Overdue'>('Open');
  const [newRemarks, setNewRemarks] = useState<string>('');

  const filteredActions = actions.filter((act) => {
    if (statusFilter !== 'ALL' && act.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && act.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = act.componentName.toLowerCase().includes(q);
      const matchCheck = act.checkpointText.toLowerCase().includes(q);
      const matchAud = act.auditId.toLowerCase().includes(q);
      const matchId = act.actionId.toLowerCase().includes(q);
      if (!matchComp && !matchCheck && !matchAud && !matchId) return false;
    }
    return true;
  });

  const handleOpenStatusModal = (act: ActionItem) => {
    setEditingAction(act);
    setNewStatus(act.status);
    setNewRemarks('');
  };

  const handleSaveStatusUpdate = async () => {
    if (!editingAction) return;

    const updated: ActionItem = {
      ...editingAction,
      status: newStatus,
    };

    StorageEngine.updateAction(editingAction.actionId, newStatus, newRemarks);
    setActions(StorageEngine.getActions());

    try {
      await GasBackendClient.updateAction(editingAction.actionId, newStatus, newRemarks);
    } catch (err) {
      console.warn('Action sync notice:', err);
    }

    setEditingAction(null);
  };

  const openCount = actions.filter((a) => a.status === 'Open').length;
  const inProgressCount = actions.filter((a) => a.status === 'In Progress').length;
  const closedCount = actions.filter((a) => a.status === 'Closed').length;
  const overdueCount = actions.filter((a) => a.status === 'Overdue').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>ACTION ITEMS & PREVENTIVE MAINTENANCE TRACKER</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track corrective actions, assign responsibilities, and update status for audit deviations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold"
            >
              <option value="ALL">All Status ({actions.length})</option>
              <option value="Open">Open ({openCount})</option>
              <option value="In Progress">In Progress ({inProgressCount})</option>
              <option value="Overdue">Overdue ({overdueCount})</option>
              <option value="Closed">Closed ({closedCount})</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 focus:outline-none font-bold"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase">Open Actions</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{openCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase">In Progress</span>
            <div className="text-2xl font-extrabold text-amber-600 mt-0.5">{inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase">Overdue</span>
            <div className="text-2xl font-extrabold text-red-700 mt-0.5">{overdueCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase">Closed</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{closedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Items List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredActions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-900">No Action Items Found</h3>
            <p className="text-xs text-slate-500">All equipment checkpoints are in compliance or match your filter criteria.</p>
          </div>
        ) : (
          filteredActions.map((act, idx) => (
            <div
              key={`${act.actionId}-${act.auditId}-${idx}`}
              className={`p-6 rounded-2xl border transition shadow-sm ${
                act.status === 'Closed'
                  ? 'bg-slate-50/80 border-slate-200 opacity-80'
                  : act.status === 'Overdue'
                  ? 'bg-rose-50/60 border-rose-300'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-extrabold text-indigo-700">{act.actionId}</span>
                    <span className="text-xs text-slate-400">• Audit: {act.auditId}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                        act.priority === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : act.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {act.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900">{act.componentName}</h3>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p className="font-semibold text-slate-800">
                      <span className="font-bold text-slate-500">Checkpoint: </span>
                      {act.checkpointText}
                    </p>
                    <p className="font-semibold text-rose-700">
                      <span className="font-bold text-slate-500">Observation: </span>
                      {act.observation}
                    </p>
                    <p className="font-semibold text-emerald-800 pt-1">
                      <span className="font-bold text-slate-500">Recommended Action: </span>
                      {act.recommendedAction}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-slate-700">{act.responsiblePerson}</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: {act.targetDate}</span>
                    </span>
                  </div>
                </div>

                {/* Status Badge & Edit Action */}
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 text-xs font-extrabold rounded-xl ${
                      act.status === 'Closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : act.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-800'
                        : act.status === 'Overdue'
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {act.status}
                  </span>

                  <button
                    onClick={() => handleOpenStatusModal(act)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              <span>Update Action Status ({editingAction.actionId})</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Current Status</label>
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
                <label className="text-slate-700 font-bold block mb-1">Remarks / Maintenance Log Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter maintenance work order ID, parts replaced, or completion notes..."
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatusUpdate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/20"
              >
                Save Action Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
