'use client';

import React from 'react';
import { X, FileText, Upload } from 'lucide-react';
import { AuditHeader, AuditResult, ActionItem } from '../lib/types';
import { generateAuditPdfReport } from '../lib/pdfGenerator';
import { generateAuditExcelReport } from '../lib/excelGenerator';

interface AuditDetailModalProps {
  audit: AuditHeader | null;
  results: AuditResult[];
  actions: ActionItem[];
  onClose: () => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ audit, results, actions, onClose }) => {
  if (!audit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="text-xs text-indigo-700 font-mono font-extrabold">{audit.auditId}</span>
            <h3 className="text-base font-extrabold text-slate-900">
              {audit.sectionName} ({audit.lineName}) - {audit.equipmentName}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => generateAuditPdfReport(audit, results, actions)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>

            <button
              onClick={() => generateAuditExcelReport(audit, results, actions)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Excel Export</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-white">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-slate-500 block font-semibold">Audit Date</span>
              <span className="text-slate-900 font-extrabold">{audit.date} {audit.time}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Auditor</span>
              <span className="text-slate-900 font-extrabold">{audit.auditorName}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Compliance Rate</span>
              <span className="text-emerald-600 font-extrabold">{audit.compliancePercent.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Overall Status</span>
              <span
                className={`font-extrabold ${
                  audit.overallStatus === 'PASS'
                    ? 'text-emerald-700'
                    : audit.overallStatus === 'PASS WITH OBSERVATIONS'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {audit.overallStatus}
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Checkpoint Results ({results.length})
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Lvl</th>
                    <th className="px-3 py-2.5">Component</th>
                    <th className="px-3 py-2.5">Checkpoint</th>
                    <th className="px-3 py-2.5">Standard</th>
                    <th className="px-3 py-2.5">Actual</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {results.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-extrabold text-indigo-700">{res.level}</td>
                      <td className="px-3 py-2.5 font-extrabold text-slate-900">{res.componentName}</td>
                      <td className="px-3 py-2.5">{res.checkpointText}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-800">{res.standardRange}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-900 font-bold">{res.actualValue}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            res.status === 'OK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.status === 'NG'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action items if any */}
          {actions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">
                Generated Action Items ({actions.length})
              </h4>
              <div className="space-y-2">
                {actions.map((act) => (
                  <div key={act.actionId} className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-extrabold">
                      <span className="text-slate-900">{act.componentName}</span>
                      <span className="text-rose-700">{act.priority} Priority</span>
                    </div>
                    <p className="text-slate-800 font-semibold">{act.observation}</p>
                    <p className="text-slate-600">Rec: {act.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
