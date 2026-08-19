'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  FileText,
  Upload,
  Folder,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { generateAuditPdfReport } from '../lib/pdfGenerator';
import { generateAuditExcelReport } from '../lib/excelGenerator';
import { AuditHeader, AuditResult } from '../lib/types';
import { PhotoModal } from './PhotoModal';

export const AuditHistoryView: React.FC = () => {
  const [audits, setAudits] = useState<AuditHeader[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');

  const [selectedAuditHeader, setSelectedAuditHeader] = useState<AuditHeader | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | undefined>();

  useEffect(() => {
    setAudits(StorageEngine.getAudits());
    setAuditResults(StorageEngine.getAuditResults());
  }, []);

  const filteredAudits = audits.filter((a) => {
    if (selectedSectionFilter !== 'ALL' && a.sectionId !== selectedSectionFilter && a.sectionName !== selectedSectionFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = a.auditId.toLowerCase().includes(q);
      const matchAuditor = a.auditorName.toLowerCase().includes(q);
      const matchSec = (a.sectionName || '').toLowerCase().includes(q);
      const matchSubSec = (a.subSectionName || '').toLowerCase().includes(q);
      const matchLine = (a.lineName || '').toLowerCase().includes(q);
      return matchId || matchAuditor || matchSec || matchSubSec || matchLine;
    }
    return true;
  });

  const selectedAuditResults = selectedAuditHeader
    ? auditResults.filter((r) => r.auditId === selectedAuditHeader.auditId)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>AUDIT HISTORY &amp; REPORTS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            View completed engineering audit snapshots, PDF reports, Excel downloads, and evaluation history.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Audit ID, Auditor, Sub-Section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:bg-white focus:border-indigo-500 focus:outline-none transition shadow-xs w-64"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
        {filteredAudits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-extrabold text-slate-800">No Audits Found</h4>
            <p className="text-xs text-slate-500 font-semibold">Perform an audit in New Audit Form to populate historical records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3.5">Audit ID</th>
                  <th className="px-4 py-3.5 w-28">Date</th>
                  <th className="px-4 py-3.5">Section</th>
                  <th className="px-4 py-3.5">Sub-Section</th>
                  <th className="px-4 py-3.5">Line</th>
                  <th className="px-4 py-3.5">Equipment</th>
                  <th className="px-4 py-3.5">Auditor</th>
                  <th className="px-4 py-3.5 text-center">Total Points</th>
                  <th className="px-4 py-3.5 text-center">OK</th>
                  <th className="px-4 py-3.5 text-center">NG</th>
                  <th className="px-4 py-3.5 text-center">Compliance %</th>
                  <th className="px-4 py-3.5 text-center">Overall Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {filteredAudits.map((a) => (
                  <tr key={a.auditId} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-4 font-mono font-extrabold text-indigo-700">{a.auditId}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{a.date}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{a.sectionName}</td>
                    <td className="px-4 py-4 font-extrabold text-slate-900">{a.subSectionName || 'General'}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{a.lineName}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{a.equipmentName}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{a.auditorName}</td>
                    <td className="px-4 py-4 text-center font-bold text-slate-700">{a.totalCheckpoints}</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600">{a.okCount}</td>
                    <td className="px-4 py-4 text-center font-bold text-rose-600">{a.ngCount}</td>
                    <td className="px-4 py-4 text-center font-mono font-extrabold text-indigo-700">
                      {a.compliancePercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl inline-block ${
                          a.overallStatus === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.overallStatus === 'PASS WITH OBSERVATIONS'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {a.overallStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedAuditHeader(a)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                          title="View Audit Snapshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            generateAuditPdfReport(
                              a,
                              auditResults.filter((r) => r.auditId === a.auditId),
                              []
                            )
                          }
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Download PDF Report"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            generateAuditExcelReport(
                              a,
                              auditResults.filter((r) => r.auditId === a.auditId),
                              []
                            )
                          }
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                          title="Export Excel Data"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Snapshot Modal */}
      {selectedAuditHeader && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Audit Snapshot: <span className="font-mono text-indigo-700">{selectedAuditHeader.auditId}</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Auditor: {selectedAuditHeader.auditorName} | Date: {selectedAuditHeader.date} | Section: {selectedAuditHeader.sectionName} ({selectedAuditHeader.subSectionName})
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditHeader(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b">
                    <th className="p-2 w-12 text-center">Sr</th>
                    <th className="p-2 w-36">Component</th>
                    <th className="p-2">Checkpoint</th>
                    <th className="p-2 w-28">Specification</th>
                    <th className="p-2 w-24">Actual</th>
                    <th className="p-2 w-20 text-center">Status</th>
                    <th className="p-2 w-32">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAuditResults.map((r, i) => (
                    <tr key={r.id + '-' + i}>
                      <td className="p-2 text-center font-bold text-slate-500">{r.srNo || i + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{r.componentName}</td>
                      <td className="p-2 font-semibold text-slate-800">{r.checkpointText}</td>
                      <td className="p-2 font-mono text-slate-600">{r.standardRange || r.standardParameter}</td>
                      <td className="p-2 font-semibold">{r.actualValue}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            r.status === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600">{r.observationNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
