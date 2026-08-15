'use client';

import React, { useState, useEffect } from 'react';
import { Save, Play, Trash2, Clock, Calendar, User, Layers } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { AuditHeader } from '../lib/types';

interface DraftsViewProps {
  onResumeDraft: (draft: any) => void;
}

export const DraftsView: React.FC<DraftsViewProps> = ({ onResumeDraft }) => {
  const [drafts, setDrafts] = useState<{ header: Partial<AuditHeader>; states: any[] }[]>([]);

  useEffect(() => {
    setDrafts(StorageEngine.getDrafts());
  }, []);

  const handleDeleteDraft = (draftId?: string) => {
    if (!draftId) return;
    StorageEngine.deleteDraft(draftId);
    setDrafts(StorageEngine.getDrafts());
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in font-sans">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Save className="w-5 h-5 text-indigo-600" />
            <span>SAVED AUDIT DRAFTS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Incomplete audits saved offline or during multi-stage plant inspections. Resume or finish anytime.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 text-center space-y-3">
            <Save className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-extrabold text-slate-800">No Drafts Saved</h4>
            <p className="text-xs text-slate-500 font-semibold">
              When starting an audit in New Audit Form, click "Save Draft" to preserve incomplete inspections offline.
            </p>
          </div>
        ) : (
          drafts.map((d, idx) => (
            <div
              key={d.header.auditId || idx}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-300 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-extrabold text-indigo-700">{d.header.auditId}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">Draft</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {d.header.sectionName || d.header.sectionId} Section ({d.header.subSectionName || 'General'})
                </h3>
                <div className="flex items-center space-x-4 text-xs text-slate-500 font-semibold">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.header.auditorName || 'Auditor'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.header.date}</span>
                  </span>
                  <span>{d.states?.length || 0} Checkpoints</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onResumeDraft(d)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Audit</span>
                </button>

                <button
                  onClick={() => handleDeleteDraft(d.header.auditId)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-100"
                  title="Delete Draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
