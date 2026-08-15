'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Layers, Wrench, ChevronRight } from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { Section, SubSection, Line } from '../lib/types';

export const PlantStructurePanel: React.FC = () => {
  const [sections,    setSections]    = useState<Section[]>(StorageEngine.getSections());
  const [subSections, setSubSections] = useState<SubSection[]>(StorageEngine.getSubSections());
  const [lines,       setLines]       = useState<Line[]>(StorageEngine.getLines());

  // Add Section
  const [newSecName, setNewSecName] = useState('');
  const [newSecDesc, setNewSecDesc] = useState('');

  // Add Sub-Section
  const [newSubName,    setNewSubName]    = useState('');
  const [newSubSecId,   setNewSubSecId]   = useState('');

  // Add Line
  const [newLineName,   setNewLineName]   = useState('');
  const [newLineSecId,  setNewLineSecId]  = useState('');
  const [newLineSubId,  setNewLineSubId]  = useState('');

  const addSection = () => {
    if (!newSecName.trim()) return;
    const id = newSecName.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 6);
    const sec: Section = { id, name: newSecName.trim(), description: newSecDesc.trim(), active: true };
    const updated = [...sections, sec];
    StorageEngine.saveSections(updated);
    setSections(updated);
    setNewSecName(''); setNewSecDesc('');
  };

  const addSubSection = () => {
    if (!newSubName.trim() || !newSubSecId) return;
    const id = `${newSubSecId}-${newSubName.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 6)}`;
    const ss: SubSection = { id, name: newSubName.trim(), sectionId: newSubSecId, active: true };
    const updated = [...subSections, ss];
    StorageEngine.saveSubSections(updated);
    setSubSections(updated);
    setNewSubName('');
  };

  const addLine = () => {
    if (!newLineName.trim() || !newLineSecId) return;
    const id = newLineName.trim().replace(/[^a-zA-Z0-9#]/g, '').toUpperCase().slice(0, 10) + '-' + Date.now().toString().slice(-4);
    const line: Line = {
      id,
      name: newLineName.trim(),
      sectionId: newLineSecId,
      subSectionId: newLineSubId || undefined,
      description: '',
      active: true,
    };
    const updated = [...lines, line];
    StorageEngine.saveLines(updated);
    setLines(updated);
    setNewLineName('');
  };

  const removeSection = (id: string) => {
    if (!confirm('Remove this section? Sub-sections and lines will remain but must be reassigned.')) return;
    const updated = sections.filter((s) => s.id !== id);
    StorageEngine.saveSections(updated);
    setSections(updated);
  };

  const removeSubSection = (id: string) => {
    if (!confirm('Remove this sub-section?')) return;
    const updated = subSections.filter((ss) => ss.id !== id);
    StorageEngine.saveSubSections(updated);
    setSubSections(updated);
  };

  const removeLine = (id: string) => {
    if (!confirm('Remove this line / machine?')) return;
    const updated = lines.filter((l) => l.id !== id);
    StorageEngine.saveLines(updated);
    setLines(updated);
  };

  return (
    <div className="space-y-6 font-sans">
      <p className="text-xs text-slate-500 font-semibold">
        Define your plant hierarchy here. These values are used in the Audit Form dropdowns and audit point configuration.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── SECTIONS ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-white" />
            <h3 className="text-sm font-extrabold text-white">Sections ({sections.length})</h3>
          </div>

          <div className="p-4 space-y-2">
            {sections.map((sec) => (
              <div key={sec.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 group">
                <div>
                  <span className="font-extrabold text-slate-900 text-xs">{sec.name}</span>
                  <span className="text-[10px] text-slate-400 ml-2 font-mono">{sec.id}</span>
                </div>
                <button
                  onClick={() => removeSection(sec.id)}
                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="Section name (e.g. Grinding)"
                value={newSecName}
                onChange={(e) => setNewSecName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newSecDesc}
                onChange={(e) => setNewSecDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={addSection}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── SUB-SECTIONS ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 flex items-center space-x-2">
            <ChevronRight className="w-4 h-4 text-white" />
            <h3 className="text-sm font-extrabold text-white">Sub-Sections ({subSections.length})</h3>
          </div>

          <div className="p-4 space-y-2">
            {subSections.map((ss) => {
              const sec = sections.find((s) => s.id === ss.sectionId);
              return (
                <div key={ss.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 group">
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs">{ss.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2">({sec?.name || ss.sectionId})</span>
                  </div>
                  <button
                    onClick={() => removeSubSection(ss.id)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <select
                value={newSubSecId}
                onChange={(e) => setNewSubSecId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Sub-section name (e.g. M1, Furnace)"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={addSubSection}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sub-Section</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── LINES / MACHINES ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-4 flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-white" />
            <h3 className="text-sm font-extrabold text-white">Lines / Machines ({lines.length})</h3>
          </div>

          <div className="p-4 space-y-2">
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {lines.map((l) => {
                const sec = sections.find((s) => s.id === l.sectionId);
                return (
                  <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 group">
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs">{l.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({sec?.name || l.sectionId})</span>
                    </div>
                    <button
                      onClick={() => removeLine(l.id)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <select
                value={newLineSecId}
                onChange={(e) => { setNewLineSecId(e.target.value); setNewLineSubId(''); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                value={newLineSubId}
                onChange={(e) => setNewLineSubId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Sub-Section (optional)</option>
                {subSections.filter((ss) => !newLineSecId || ss.sectionId === newLineSecId).map((ss) => (
                  <option key={ss.id} value={ss.id}>{ss.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Line name (e.g. BL#9, TL#5)"
                value={newLineName}
                onChange={(e) => setNewLineName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={addLine}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line / Machine</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
