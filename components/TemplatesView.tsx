'use client';

import React from 'react';
import { FileCheck2, Plus, ArrowRight } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';

interface TemplatesViewProps {
  onSelectTemplate?: (templateId: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onSelectTemplate }) => {
  const templates = StorageEngine.getTemplates();
  const sections = StorageEngine.getSections();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            <span>REUSABLE AUDIT TEMPLATES</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configured M1/M1A/M2 checkpoint suites for Grinding, Washing, Tempering, and Robotic lines.
          </p>
        </div>

        <button className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/20">
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tpl) => {
          const sec = sections.find((s) => s.id === tpl.sectionId);
          return (
            <div key={tpl.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4 flex flex-col justify-between hover:shadow-lg transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    {tpl.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Section: {sec?.name || tpl.sectionId}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{tpl.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{tpl.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {tpl.componentIds.length > 0 ? `${tpl.componentIds.length} Checkpoints included` : 'Auto M1/M1A/M2 Suite'}
                </span>

                <button
                  onClick={() => onSelectTemplate && onSelectTemplate(tpl.id)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <span>Start Audit with Template</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
