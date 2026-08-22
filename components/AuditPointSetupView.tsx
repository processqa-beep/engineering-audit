'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  Layers,
  Sparkles,
  Send,
  Image as ImageIcon,
} from 'lucide-react';

import { StorageEngine } from '../lib/storageEngine';
import { SupabaseBackendClient } from '../lib/supabaseBackend';
import { downloadAuditPointTemplate } from '../lib/excelTemplate';
import { parseCheckpointExcel, formatSpec } from '../lib/checkpointImporter';
import {
  Checkpoint,
  CheckpointImportRow,
  ImportPreviewSummary,
  ImportAction,
} from '../lib/types';

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────
const ACTION_BADGE: Record<ImportAction, string> = {
  NEW:       'bg-emerald-100 text-emerald-800 border border-emerald-200',
  UPDATE:    'bg-amber-100 text-amber-800 border border-amber-200',
  DUPLICATE: 'bg-slate-100 text-slate-600 border border-slate-200',
  ERROR:     'bg-rose-100 text-rose-800 border border-rose-200',
};

// ──────────────────────────────────────────────────────────────────────────────
// MANUAL ADD FORM (simple modal)
// ──────────────────────────────────────────────────────────────────────────────
function ManualAddModal({
  sections,
  subSections,
  lines,
  onClose,
  onSave,
}: {
  sections: { id: string; name: string }[];
  subSections: { id: string; name: string; sectionId: string }[];
  lines: { id: string; name: string; sectionId: string }[];
  onClose: () => void;
  onSave: (ck: Partial<Checkpoint>) => void;
}) {
  const [form, setForm] = useState<Partial<Checkpoint>>({
    active: true,
    criticality: 'Medium',
    applicableLines: ['ALL'],
    parameterType: 'OK_NG',
  });

  const set = (field: keyof Checkpoint, val: any) =>
    setForm((p) => ({ ...p, [field]: val }));

  const filteredSub = subSections.filter((ss) => !form.sectionId || ss.sectionId === form.sectionId);
  const filteredLines = lines.filter((l) => !form.sectionId || l.sectionId === form.sectionId);

  const handleSave = () => {
    if (!form.sectionId) { alert('Section is required'); return; }
    if (!form.componentName?.trim()) { alert('Component Name is required'); return; }
    if (!form.checkpointText?.trim()) { alert('Checkpoint is required'); return; }
    onSave(form);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>ADD AUDIT POINT MANUALLY</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl font-semibold">
            💡 Tip: For 10+ checkpoints, use <strong>Download Template → Upload Excel</strong> instead.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Section */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Section <span className="text-rose-500">*</span></label>
              <select
                value={form.sectionId || ''}
                onChange={(e) => set('sectionId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Sub-Section */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sub Section</label>
              <select
                value={form.subSectionId || ''}
                onChange={(e) => set('subSectionId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">General</option>
                {filteredSub.map((ss) => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
              </select>
            </div>

            {/* Line / Machine */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Line / Machine (for reference)</label>
              <select
                value={form.lineId || ''}
                onChange={(e) => set('lineId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Lines</option>
                {filteredLines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* Applicable Lines */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Applicable Lines (comma-separated or ALL)</label>
              <input
                type="text"
                placeholder="BL#1, BL#2, BL#3  or  ALL"
                value={form.applicableLines?.join(', ') || 'ALL'}
                onChange={(e) => set('applicableLines', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Component Name */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Component Name <span className="text-rose-500">*</span></label>
              <input type="text" placeholder="e.g. Vacuum Belt, Drive Motor, Heating Element…"
                value={form.componentName || ''}
                onChange={(e) => set('componentName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Function */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Function of Component</label>
              <input type="text" placeholder="What this component does…"
                value={form.functionOfComponent || ''}
                onChange={(e) => set('functionOfComponent', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Failure Impact */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">What Impact If This Part Fails</label>
              <input type="text" placeholder="Consequences if this part fails…"
                value={form.whatImpactIfThisPartGetsFail || ''}
                onChange={(e) => set('whatImpactIfThisPartGetsFail', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Checkpoint */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Checkpoint / Audit Activity <span className="text-rose-500">*</span></label>
              <textarea rows={2} placeholder="Exact check to perform…"
                value={form.checkpointText || ''}
                onChange={(e) => set('checkpointText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Standard Parameter */}
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Standard Parameter / Reference Condition</label>
              <input type="text" placeholder="e.g. Vacuum pressure, No leakage, Properly tightened…"
                value={form.standardParameter || ''}
                onChange={(e) => set('standardParameter', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Min / Max / Unit */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Min (leave blank for visual check)</label>
              <input type="number" placeholder="e.g. -0.9"
                value={form.minimum ?? ''}
                onChange={(e) => set('minimum', e.target.value === '' ? undefined : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Max (leave blank for visual check)</label>
              <input type="number" placeholder="e.g. -0.8"
                value={form.maximum ?? ''}
                onChange={(e) => set('maximum', e.target.value === '' ? undefined : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Unit</label>
              <input type="text" placeholder="bar, °C, mm, Visual…"
                value={form.unit || ''}
                onChange={(e) => set('unit', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Criticality</label>
              <select value={form.criticality || 'Medium'}
                onChange={(e) => set('criticality', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option>Critical</option>
                <option>Major</option>
                <option>Minor</option>
              </select>
            </div>

            {/* Component Reference SOP / Standard Photo */}
            <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700 block text-xs">Component Reference / Standard Photo (SOP)</label>
              <div className="flex items-center space-x-3">
                {form.componentReferencePhotoUrl ? (
                  <div className="relative group">
                    <img
                      src={form.componentReferencePhotoUrl}
                      alt="Reference"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => set('componentReferencePhotoUrl', '')}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow hover:bg-rose-700 transition"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{form.componentReferencePhotoUrl ? 'Change Reference Photo' : 'Upload Reference Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
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
                              const compressed = canvas.toDataURL('image/jpeg', 0.5);
                              set('componentReferencePhotoUrl', compressed);
                            }
                          };
                          img.src = rawDataUrl;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">Upload reference condition / standard photo for this component (compressed to &lt;50 KB).</p>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="sm:col-span-2 flex items-center space-x-3">
              <label className="font-bold text-slate-700 text-xs">Active (include in future audits)</label>
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  form.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {form.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{form.active ? 'Yes' : 'No'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition">
            Save Audit Point
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// IMPORT PREVIEW MODAL
// ──────────────────────────────────────────────────────────────────────────────
function ImportPreviewModal({
  preview,
  onConfirm,
  onCancel,
}: {
  preview: ImportPreviewSummary;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [filter, setFilter] = useState<ImportAction | 'ALL'>('ALL');
  const filtered = preview.rows.filter((r) => filter === 'ALL' || r.action === filter);

  const canImport = preview.newCount + preview.updateCount > 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">IMPORT PREVIEW</h3>
              <p className="text-[11px] text-slate-500 font-semibold">{preview.fileName}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-xl hover:bg-slate-100 transition text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 grid grid-cols-3 sm:grid-cols-6 gap-3 shrink-0 border-b border-slate-100">
          {[
            { label: 'Total Rows', value: preview.totalRows, color: 'bg-slate-50 text-slate-800 border-slate-200' },
            { label: 'New Points', value: preview.newCount, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
            { label: 'Updated', value: preview.updateCount, color: 'bg-amber-50 text-amber-800 border-amber-200' },
            { label: 'Duplicates', value: preview.duplicateCount, color: 'bg-slate-50 text-slate-600 border-slate-200' },
            { label: 'Errors', value: preview.errorCount, color: 'bg-rose-50 text-rose-800 border-rose-200' },
            { label: 'Inactive', value: preview.inactiveCount, color: 'bg-purple-50 text-purple-800 border-purple-200' },
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl p-3 border text-center ${card.color}`}>
              <div className="text-xl font-extrabold leading-none">{card.value}</div>
              <div className="text-[10px] font-bold mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-3 flex items-center space-x-2 shrink-0 border-b border-slate-100">
          <span className="text-xs font-extrabold text-slate-600 mr-1">Show:</span>
          {(['ALL', 'NEW', 'UPDATE', 'DUPLICATE', 'ERROR'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold transition ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? `All (${preview.totalRows})` : f}
            </button>
          ))}
        </div>

        {/* Preview Table */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100/95 z-10">
              <tr className="text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 w-14 text-center">Row</th>
                <th className="px-4 py-3 w-20 text-center">Action</th>
                <th className="px-4 py-3 w-24">Section</th>
                <th className="px-4 py-3 w-24">Sub Section</th>
                <th className="px-4 py-3 w-36">Component</th>
                <th className="px-4 py-3">Checkpoint</th>
                <th className="px-4 py-3 w-32">Specification</th>
                <th className="px-4 py-3 w-20">Criticality</th>
                <th className="px-4 py-3 w-40">Applicable Lines</th>
                <th className="px-4 py-3 w-14 text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr
                  key={row.rowIndex}
                  className={`transition ${
                    row.action === 'ERROR' ? 'bg-rose-50/60' :
                    row.action === 'DUPLICATE' ? 'bg-slate-50/50' :
                    row.action === 'UPDATE' ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3 text-center text-slate-400 font-mono">{row.rowIndex}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${ACTION_BADGE[row.action]}`}>
                      {row.action}
                    </span>
                    {row.errorMessage && (
                      <div className="text-[9px] text-rose-700 mt-0.5 leading-tight">{row.errorMessage}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{row.raw.sectionName || row.raw.sectionId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{row.raw.subSectionName || row.raw.subSectionId}</td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{row.raw.componentName}</td>
                  <td className="px-4 py-3 text-slate-800 leading-relaxed">{row.raw.checkpointText}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 text-[11px]">
                    <span className="font-semibold block">{row.raw.standardParameter}</span>
                    {row.specDisplay && row.specDisplay !== row.raw.standardParameter && (
                      <span className="text-indigo-600 font-bold">{row.specDisplay}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-block ${
                      row.raw.criticality?.toLowerCase() === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : row.raw.criticality?.toLowerCase() === 'major'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {row.raw.criticality || 'Medium'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-600 font-semibold">
                    {row.raw.applicableLines?.join(', ') || 'ALL'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.raw.active ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-slate-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-semibold">
            {canImport
              ? `${preview.newCount} new + ${preview.updateCount} updated checkpoints will be saved. Duplicates & errors will be skipped.`
              : 'No new or updated checkpoints to import.'}
          </p>
          <div className="flex items-center space-x-2">
            <button onClick={onCancel} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition">
              Cancel
            </button>
            {canImport && (
              <button
                onClick={onConfirm}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Import ({preview.newCount + preview.updateCount} points)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────────────────────
interface AuditPointSetupViewProps {
  isAdmin?: boolean;
}

export const AuditPointSetupView: React.FC<AuditPointSetupViewProps> = ({ isAdmin = false }) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(StorageEngine.getCheckpoints());
  const [sections]    = useState(StorageEngine.getSections());
  const [subSections] = useState(StorageEngine.getSubSections());
  const [lines]       = useState(StorageEngine.getLines());

  // Search / Filter
  const [search, setSearch]             = useState('');
  const [filterSection, setFilterSection]         = useState('ALL');
  const [filterCriticality, setFilterCriticality] = useState('ALL');
  const [filterActive, setFilterActive]           = useState<'ALL' | 'Yes' | 'No'>('ALL');

  // Upload / Preview
  const [uploading, setUploading]         = useState(false);
  const [preview, setPreview]             = useState<ImportPreviewSummary | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{ imported: number; updated: number } | null>(null);

  // Manual Add Modal
  const [showManualAdd, setShowManualAdd] = useState(false);

  const [syncingCloud, setSyncingCloud] = useState(false);
  const [dumpingCloud, setDumpingCloud] = useState(false);
  const [dumpProgress, setDumpProgress] = useState<string | null>(null);

  const reload = () => setCheckpoints(StorageEngine.getCheckpoints());

  const handleSyncFromCloud = async () => {
    setSyncingCloud(true);
    try {
      const data = await SupabaseBackendClient.fetchCheckpoints();
      if (data && data.length > 0) {
        setCheckpoints(data);
        alert(`✓ Successfully synced ${data.length} checkpoints from Supabase Database!`);
      } else {
        alert('No checkpoints returned from Supabase database.');
      }
    } catch (err: any) {
      alert(`Cloud sync notice: ${err?.message || err}`);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleDumpToCloud = async () => {
    const current = StorageEngine.getCheckpoints();
    if (current.length === 0) {
      alert('No checkpoints found to push. Please upload checkpoints or add points first.');
      return;
    }
    setDumpingCloud(true);
    setDumpProgress(`Pushing ${current.length} checkpoints to Supabase Database...`);
    try {
      await SupabaseBackendClient.saveCheckpoints(current);
      setDumpProgress(`✓ All ${current.length} checkpoints successfully saved into Supabase Database!`);
      setTimeout(() => setDumpProgress(null), 4000);
    } catch (err: any) {
      setDumpProgress(`Notice while saving: ${err?.message || err}`);
    } finally {
      setDumpingCloud(false);
    }
  };

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const existing = StorageEngine.getCheckpoints();
      const result = await parseCheckpointExcel(file, existing);
      setPreview(result);
    } catch (err: any) {
      alert(`Failed to read file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    SupabaseBackendClient.fetchCheckpoints()
      .then((data) => {
        if (data && data.length > 0) setCheckpoints(data);
      })
      .catch(() => {});
  }, []);

  const handleConfirmImport = async () => {
    if (!preview) return;
    const result = StorageEngine.importCheckpoints(preview.rows, preview.fileName);
    reload();
    setPreview(null);
    setUploadSuccess({ imported: result.imported, updated: result.updated });
    setTimeout(() => setUploadSuccess(null), 5000);

    // Auto-save all checkpoints to Supabase
    const all = StorageEngine.getCheckpoints();
    setDumpingCloud(true);
    setDumpProgress(`Auto-saving ${all.length} checkpoints to Supabase Database...`);
    try {
      await SupabaseBackendClient.saveCheckpoints(all);
      setDumpProgress(`✓ All ${all.length} checkpoints successfully saved to Supabase Database!`);
      setTimeout(() => setDumpProgress(null), 4000);
    } catch (dumpErr) {
      console.warn('Auto-save to Supabase notice:', dumpErr);
      setDumpProgress(null);
    } finally {
      setDumpingCloud(false);
    }
  };

  // ── Manual Add handler ────────────────────────────────────────────────────
  const handleManualSave = async (form: Partial<Checkpoint>) => {
    const now = new Date().toISOString();
    const newCk: Checkpoint = {
      id: `CK-MANUAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      srNo: form.srNo || (checkpoints.length + 1),
      sectionId: form.sectionId || 'GR',
      sectionName: form.sectionName || form.sectionId || 'Grinding',
      subSectionId: form.subSectionId || 'GR-M1',
      subSectionName: form.subSectionName || form.subSectionId || 'M1',
      lineId: form.lineId || 'ALL',
      lineName: form.lineName || form.lineId || 'ALL',
      equipmentId: form.equipmentId || '',
      equipmentName: form.equipmentName || '',
      componentId: form.componentId || '',
      componentName: form.componentName?.trim() || 'Component',
      componentReferencePhotoUrl: form.componentReferencePhotoUrl,
      functionOfComponent: form.functionOfComponent,
      whatImpactIfThisPartGetsFail: form.whatImpactIfThisPartGetsFail,
      functionOfPart: form.functionOfPart,
      partFailureType: form.partFailureType,
      impactOfFailure: form.impactOfFailure,
      checkpointText: form.checkpointText?.trim() || 'Audit Checkpoint',
      standardParameter: form.standardParameter?.trim() || 'Visual Check',
      parameterType: form.parameterType || 'OK_NG',
      minimum: form.minimum,
      maximum: form.maximum,
      unit: form.unit || '',
      applicableLines: form.applicableLines || ['ALL'],
      criticality: form.criticality || 'Medium',
      isCritical: form.criticality === 'Critical',
      active: form.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    const current = StorageEngine.getCheckpoints();
    const updatedAll = [newCk, ...current];
    StorageEngine.saveCheckpoints(updatedAll);
    reload();

    // Auto-save to Supabase
    try {
      await SupabaseBackendClient.saveCheckpoints(updatedAll);
    } catch (dumpErr) {
      console.warn('Auto-save to Supabase notice:', dumpErr);
    }
  };


  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = (ck: Checkpoint) => {
    if (ck.active) {
      if (!confirm(`Deactivate "${ck.checkpointText}"? It will be hidden from new audits. Historical data is preserved.`)) return;
      StorageEngine.deactivateCheckpoint(ck.id);
    } else {
      StorageEngine.activateCheckpoint(ck.id);
    }
    reload();
  };

  // ── Filtered table ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return checkpoints.filter((ck) => {
      if (filterSection !== 'ALL' && ck.sectionId !== filterSection && ck.sectionName !== filterSection) return false;
      if (filterCriticality !== 'ALL' && ck.criticality !== filterCriticality) return false;
      if (filterActive === 'Yes' && !ck.active) return false;
      if (filterActive === 'No' && ck.active) return false;
      if (q && !(
        ck.componentName?.toLowerCase().includes(q) ||
        ck.checkpointText?.toLowerCase().includes(q) ||
        ck.sectionName?.toLowerCase().includes(q) ||
        ck.subSectionName?.toLowerCase().includes(q) ||
        ck.standardParameter?.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [checkpoints, search, filterSection, filterCriticality, filterActive]);

  const activeCount = checkpoints.filter((c) => c.active).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* ── Top Banner ─────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <span>AUDIT POINT SETUP</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold max-w-xl">
              Maintain 500+ engineering audit checkpoints through a single Excel template.
              Download the template, fill it, and upload — the system handles the rest.
            </p>
            {/* Workflow pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold pt-1">
              {['Download Template','→','Fill / Update Excel','→','Upload Excel','→','Preview','→','Import','→','Available in Audit Module'].map((step, i) => (
                step === '→'
                  ? <span key={i} className="text-slate-400">→</span>
                  : <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg">{step}</span>
              ))}
            </div>
          </div>

          {/* Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSyncFromCloud}
              disabled={syncingCloud}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl font-extrabold text-xs transition shadow-sm"
              title="Sync checkpoints from Supabase Database"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${syncingCloud ? 'animate-spin' : ''}`} />
              <span>{syncingCloud ? 'Syncing...' : 'Sync from Supabase'}</span>
            </button>

            <button
              onClick={() => downloadAuditPointTemplate()}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-700 rounded-2xl font-extrabold text-xs transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>

            <label className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl font-extrabold text-xs cursor-pointer transition shadow-sm ${
              uploading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
            }`}>
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Reading Excel…' : 'Upload Excel'}</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>

            <button
              onClick={handleDumpToCloud}
              disabled={dumpingCloud}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-2xl font-extrabold text-xs transition shadow-sm"
              title="Push all checkpoints directly to Supabase Database"
            >
              <Send className={`w-4 h-4 text-indigo-600 ${dumpingCloud ? 'animate-pulse' : ''}`} />
              <span>{dumpingCloud ? 'Saving to Supabase...' : 'Push All to Supabase'}</span>
            </button>

            <button
              onClick={() => setShowManualAdd(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs transition border border-slate-200"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>+ Add Point Manually</span>
            </button>
          </div>
        </div>

        {/* Live Dump Progress Banner */}
        {dumpProgress && (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center space-x-2 text-xs font-bold text-indigo-800 animate-fade-in">
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${dumpingCloud ? 'animate-spin' : ''}`} />
            <span>{dumpProgress}</span>
          </div>
        )}

        {/* Upload Success Banner */}
        {uploadSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center space-x-2 text-xs font-bold text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Successfully imported {uploadSuccess.imported} new + {uploadSuccess.updated} updated audit points!</span>
          </div>
        )}
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Checkpoints', value: checkpoints.length, color: 'bg-indigo-600 text-white' },
          { label: 'Active in Audits', value: activeCount, color: 'bg-emerald-600 text-white' },
          { label: 'Inactive', value: checkpoints.length - activeCount, color: 'bg-slate-500 text-white' },
          { label: 'Critical Points', value: checkpoints.filter((c) => c.criticality?.toLowerCase() === 'critical').length, color: 'bg-rose-600 text-white' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-2xl ${s.color} shadow-md`}>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="text-xs font-bold mt-0.5 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search component, checkpoint, section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Section Filter */}
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All Sections</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Criticality Filter */}
        <select
          value={filterCriticality}
          onChange={(e) => setFilterCriticality(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All Criticality</option>
          <option>Critical</option>
          <option>Major</option>
          <option>Minor</option>
        </select>

        {/* Active Filter */}
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="Yes">Active Only</option>
          <option value="No">Inactive Only</option>
        </select>

        <span className="text-xs font-bold text-slate-500 shrink-0">
          {filtered.length} of {checkpoints.length}
        </span>
      </div>

      {/* ── Checkpoint Master Table ────────────────────────────────────────── */}
      {checkpoints.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 text-center space-y-4">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-800">No Audit Points Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-semibold leading-relaxed">
            Download the Excel template, fill in your checkpoints, and upload to get started.
            You can maintain 500–1000+ checkpoints through a single Excel file.
          </p>
          <button
            onClick={() => downloadAuditPointTemplate()}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel Template</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-extrabold text-slate-700">No checkpoints match your filter.</h4>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3.5 w-8 text-center">#</th>
                  <th className="px-4 py-3.5 w-24">Section</th>
                  <th className="px-4 py-3.5 w-24">Sub Section</th>
                  <th className="px-4 py-3.5 w-36">Component</th>
                  <th className="px-4 py-3.5">Checkpoint</th>
                  <th className="px-4 py-3.5 w-36">Spec / Standard</th>
                  <th className="px-4 py-3.5 w-12 text-center">Min</th>
                  <th className="px-4 py-3.5 w-12 text-center">Max</th>
                  <th className="px-4 py-3.5 w-14">Unit</th>
                  <th className="px-4 py-3.5 w-20 text-center">Criticality</th>
                  <th className="px-4 py-3.5 w-36">Applicable Lines</th>
                  <th className="px-4 py-3.5 w-16 text-center">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {filtered.map((ck, idx) => (
                  <tr
                    key={ck.id}
                    className={`transition ${ck.active ? 'hover:bg-slate-50/80' : 'opacity-50 bg-slate-50/60'}`}
                  >
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-700">{ck.sectionName || ck.sectionId}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{ck.subSectionName || ck.subSectionId}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{ck.componentName}</td>
                    <td className="px-4 py-3.5 text-slate-800 leading-relaxed">{ck.checkpointText}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">
                      <span className="block text-indigo-700 font-extrabold">
                        {formatSpec(ck.minimum, ck.maximum, ck.unit, ck.standardParameter)}
                      </span>
                      <span className="text-slate-500 text-[10px]">{ck.standardParameter}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600 font-mono">{ck.minimum ?? '—'}</td>
                    <td className="px-4 py-3.5 text-center text-slate-600 font-mono">{ck.maximum ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-semibold">{ck.unit || '—'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-xl inline-block ${
                        ck.criticality?.toLowerCase() === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        ck.criticality?.toLowerCase() === 'major' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {ck.criticality || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-600 font-semibold">
                      {ck.applicableLines?.includes('ALL') ? (
                        <span className="text-indigo-600 font-extrabold">ALL</span>
                      ) : (
                        ck.applicableLines?.join(', ')
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleActive(ck)}
                        title={ck.active ? 'Deactivate (removes from future audits)' : 'Activate'}
                        className={`p-1.5 rounded-xl transition border ${
                          ck.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                        }`}
                      >
                        {ck.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ─────────────────────────────────────────────── */}
      {preview && (
        <ImportPreviewModal
          preview={preview}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreview(null)}
        />
      )}

      {/* ── Manual Add Modal ─────────────────────────────────────────────────── */}
      {showManualAdd && typeof window !== 'undefined' && (
        <ManualAddModal
          sections={sections}
          subSections={subSections}
          lines={lines}
          onClose={() => setShowManualAdd(false)}
          onSave={handleManualSave}
        />
      )}
    </div>
  );
};
