'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  Layers,
  Wrench,
  CheckSquare,
  Users,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Filter,
  Sliders,
  Link,
  Settings,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { SupabaseBackendClient } from '../lib/supabaseBackend';
import { Section, SubSection, Line, Equipment, Component, Checkpoint, Employee } from '../lib/types';

interface MasterDataViewProps {
  initialTab?: 'checkpoints' | 'sections' | 'subsections' | 'lines' | 'equipment' | 'components' | 'employees';
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ initialTab = 'checkpoints' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Master Data State
  const [sections, setSections] = useState<Section[]>(StorageEngine.getSections());
  const [subSections, setSubSections] = useState<SubSection[]>(StorageEngine.getSubSections());
  const [lines, setLines] = useState<Line[]>(StorageEngine.getLines());
  const [equipment, setEquipment] = useState<Equipment[]>(StorageEngine.getEquipment());
  const [components, setComponents] = useState<Component[]>(StorageEngine.getComponents());
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(StorageEngine.getCheckpoints());

  // Section Filter for Checkpoints
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');

  // Multi-Select Checkboxes State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync / Importer States
  const [syncing, setSyncing] = useState<boolean>(false);
  const [copiedHeader, setCopiedHeader] = useState<boolean>(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  const refreshAllData = () => {
    setSections(StorageEngine.getSections());
    setSubSections(StorageEngine.getSubSections());
    setLines(StorageEngine.getLines());
    setEquipment(StorageEngine.getEquipment());
    setComponents(StorageEngine.getComponents());
    setCheckpoints(StorageEngine.getCheckpoints());
  };

  const handleCopyHeaderRow = () => {
    const headerRow = `Sr No.\tSection\tSub-Section\tLine\tEquipment\tComponent Name\tFunction of Component\tWhat Impact if This Part Gets Fail\tFunction of Part\tPart Failure Type\tImpact of Failure\tNew Checkpoint\tStandard Parameter\tUnit\tCriticality\tActive`;
    navigator.clipboard.writeText(headerRow);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 3000);
  };

  const handleSyncFromCloud = async () => {
    setSyncing(true);
    try {
      const fetched = await SupabaseBackendClient.fetchCheckpoints();
      refreshAllData();
      alert(`✓ Successfully synced ${fetched.length} checkpoints from Supabase Database!`);
    } catch (err: any) {
      alert(`Sync Notice: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // SMART UNIVERSAL AUTO-DETECTOR IMPORTER
  // Automatically detects Section, Sub-Section, Component Name, Failure Impact, Audit Point, Spec, and Criticality regardless of column order or grouping!
  const handleImportBulkPasted = () => {
    if (!bulkText.trim()) return;

    const linesArr = bulkText.split('\n');
    const parsedCheckpoints: Checkpoint[] = [];

    let currentSection = 'Grinding';
    let currentSubSection = 'ALL';
    let currentComponent = 'VACUUM BELT and Driving component';
    let currentImpact = 'Glass Can Slip and Grinding not performed well';

    linesArr.forEach((lineStr, idx) => {
      const cells = lineStr.split('\t').map((s) => s.trim()).filter((s) => s.length > 0);
      if (cells.length === 0) return;

      // Skip header line
      const firstCell = cells[0].toLowerCase();
      if (firstCell.includes('sr') || firstCell.includes('activities to be followed') || firstCell === 'section') {
        return;
      }

      let srNo = idx + 1;
      let detectedSection = '';
      let detectedSubSec = '';
      let detectedComp = '';
      let detectedImpact = '';
      let detectedCheckpoint = '';
      let detectedSpec = '';
      let detectedCrit = 'Medium';

      cells.forEach((cell) => {
        const lower = cell.toLowerCase();

        // 1. Detect Section
        if (
          lower === 'grinding' ||
          lower === 'robot' ||
          lower === 'washing' ||
          lower === 'tempering' ||
          lower === 'cutting' ||
          lower === 'annealing' ||
          lower === 'packing' ||
          lower === 'utilities' ||
          lower === 'electrical' ||
          lower === 'mechanical'
        ) {
          detectedSection = cell;
        }
        // 2. Detect Sub-Section
        else if (
          lower.includes('m1') ||
          lower.includes('m1a') ||
          lower.includes('m2') ||
          lower.includes('robot-') ||
          lower.includes('furnace') ||
          lower.includes('quench') ||
          lower.includes('lehr')
        ) {
          detectedSubSec = cell.includes('/') || lower.includes('all') ? 'ALL' : cell;
        }
        // 3. Detect Criticality
        else if (lower === 'critical' || lower === 'medium' || lower === 'low' || lower === 'high') {
          detectedCrit = cell;
        }
        // 4. Detect Failure Impact
        else if (
          lower.includes('slip') ||
          lower.includes('chipping') ||
          lower.includes('breakage') ||
          lower.includes('defect') ||
          lower.includes('impact') ||
          lower.includes('issue generate')
        ) {
          detectedImpact = cell;
        }
        // 5. Detect Specification
        else if (
          lower.includes('±') ||
          lower.includes('mm') ||
          lower.includes('˚c') ||
          lower.includes('bar') ||
          lower.includes('sec') ||
          lower.includes('60-100') ||
          lower.includes('24±3') ||
          lower.includes('strech limit')
        ) {
          if (!detectedSpec) detectedSpec = cell;
        }
        // 6. Detect Audit Point / Activity
        else if (
          lower.includes('ensure') ||
          lower.includes('check') ||
          lower.includes('inspect') ||
          lower.includes('clean') ||
          lower.includes('align') ||
          lower.includes('tighten') ||
          lower.includes('method') ||
          lower.includes('should be') ||
          cell.length > 25
        ) {
          if (!detectedCheckpoint) detectedCheckpoint = cell;
        }
        // 7. Detect Component Name
        else if (
          lower.includes('vacuum belt') ||
          lower.includes('roller') ||
          lower.includes('gripper') ||
          lower.includes('nozzle') ||
          lower.includes('benteler machine') ||
          lower.includes('component')
        ) {
          if (!detectedComp) detectedComp = cell;
        } else if (!isNaN(Number(cell))) {
          srNo = Number(cell);
        }
      });

      // Update state inheritance
      if (detectedSection) currentSection = detectedSection;
      if (detectedSubSec) currentSubSection = detectedSubSec;
      if (detectedComp && !detectedComp.toLowerCase().includes('all')) currentComponent = detectedComp;
      if (detectedImpact) currentImpact = detectedImpact;

      // Fallback for checkpoint text
      if (!detectedCheckpoint) {
        const textCandidates = cells.filter(
          (c) =>
            c.length > 10 &&
            !c.toLowerCase().includes('grinding') &&
            !c.toLowerCase().includes('benteler') &&
            c !== detectedComp &&
            c !== detectedImpact
        );
        if (textCandidates.length > 0) {
          detectedCheckpoint = textCandidates[0];
        }
      }

      if (detectedCheckpoint) {
        const isCrit = detectedCrit.toLowerCase().includes('crit') || detectedCrit.toLowerCase().includes('high');

        parsedCheckpoints.push({
          id: `CKP-SMART-${Date.now()}-${idx + 1}`,
          srNo,
          sectionId: currentSection,
          sectionName: currentSection,
          subSectionId: currentSubSection,
          subSectionName: currentSubSection,
          lineId: 'ALL',
          lineName: 'ALL',
          equipmentId: 'EQ-01',
          equipmentName: 'Benteler Edger / Plant Equipment',
          componentId: `CMP-${idx}`,
          componentName: detectedComp || currentComponent,
          whatImpactIfThisPartGetsFail: detectedImpact || currentImpact,
          checkpointText: detectedCheckpoint,
          standardParameter: detectedSpec || 'Standard Specification OK',
          parameterType: 'OK_NG',
          criticality: isCrit ? 'Critical' : 'Medium',
          isCritical: isCrit,
          applicableLines: ['ALL'],
          active: true,
        });

      }
    });

    if (parsedCheckpoints.length > 0) {
      StorageEngine.saveCheckpoints([...parsedCheckpoints, ...checkpoints]);
      refreshAllData();
      setIsBulkPasteOpen(false);
      setBulkText('');
      alert(`✓ Smart Auto-Detector imported ${parsedCheckpoints.length} audit points cleanly into your portal!`);
    } else {
      alert('Could not parse checkpoints. Please paste tabular rows directly from your Excel or Google Sheet.');
    }
  };

  const filteredCheckpoints = checkpoints.filter((ck) => {
    if (selectedSectionFilter === 'ALL') return true;
    return ck.sectionId === selectedSectionFilter || ck.sectionName === selectedSectionFilter;
  });

  // Checkbox Select All Logic
  const isAllSelected =
    filteredCheckpoints.length > 0 && filteredCheckpoints.every((ck) => selectedIds.has(ck.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredCheckpoints.forEach((ck) => newSet.add(ck.id));
      setSelectedIds(newSet);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected audit points?`)) {
      const updated = checkpoints.filter((ck) => !selectedIds.has(ck.id));
      StorageEngine.saveCheckpoints(updated);
      setCheckpoints(updated);
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSingle = (id: string) => {
    if (confirm('Are you sure you want to delete this audit point?')) {
      const updated = checkpoints.filter((ck) => ck.id !== id);
      StorageEngine.saveCheckpoints(updated);
      setCheckpoints(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <span>MASTER CONFIGURATION DATA</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Plant Sections, Lines, Equipment Units, Components, and Master Checkpoints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyHeaderRow}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition border border-slate-200"
          >
            {copiedHeader ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copiedHeader ? 'Header Copied!' : 'Copy Excel Header Row'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkPasteOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold transition border border-indigo-200"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Smart Auto-Detect Paste</span>
          </button>

          <button
            type="button"
            onClick={handleSyncFromCloud}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync from Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('checkpoints')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
            activeTab === 'checkpoints'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Checkpoints ({checkpoints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
            activeTab === 'sections'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sections ({sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subsections')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
            activeTab === 'subsections'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Sub-Sections ({subSections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lines')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 ${
            activeTab === 'lines'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Lines ({lines.length})</span>
        </button>
      </div>

      {/* CHECKPOINTS TAB */}
      {activeTab === 'checkpoints' && (
        <div className="space-y-4">
          {/* Section Filter & Delete Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Section Filter:</span>
              </span>

              <button
                onClick={() => setSelectedSectionFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition ${
                  selectedSectionFilter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Sections ({checkpoints.length})
              </button>

              {sections.map((sec) => {
                const count = checkpoints.filter((ck) => ck.sectionId === sec.id || ck.sectionName === sec.name).length;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSectionFilter(sec.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition ${
                      selectedSectionFilter === sec.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sec.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Selection & Delete Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition border border-slate-200"
              >
                {isAllSelected ? 'Deselect All' : `Select All (${filteredCheckpoints.length})`}
              </button>
            </div>
          </div>

          {/* Checkpoints Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="px-4 py-3.5 w-14 text-center">Sr.No</th>
                    <th className="px-4 py-3.5 w-28">Section</th>
                    <th className="px-4 py-3.5 w-28">Sub-Section</th>
                    <th className="px-4 py-3.5 w-40">Component Name</th>
                    <th className="px-4 py-3.5">Activities to be Followed (Audit Point)</th>
                    <th className="px-4 py-3.5 w-36">Specification</th>
                    <th className="px-4 py-3.5 w-24 text-center">Criticality</th>
                    <th className="px-4 py-3.5 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                  {filteredCheckpoints.map((ck, idx) => {
                    const isSelected = selectedIds.has(ck.id);

                    return (
                      <tr
                        key={ck.id + '-' + idx}
                        className={`transition ${isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80'}`}
                      >
                        {/* Checkbox Column */}
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(ck.id)}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                        </td>

                        <td className="px-4 py-3.5 text-center font-extrabold text-slate-500">{ck.srNo || idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-indigo-700">{ck.sectionName || ck.sectionId}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{ck.subSectionName || ck.subSectionId || 'M1'}</td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-900">{ck.componentName}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 leading-relaxed">{ck.checkpointText}</td>
                        <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-700">{ck.standardParameter || 'N/A'}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl inline-block ${
                              ck.isCritical || ck.criticality === 'Critical'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {ck.criticality || 'Medium'}
                          </span>
                        </td>

                        {/* Individual Delete Action */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(ck.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-100"
                            title="Delete Checkpoint"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTIONS TAB */}
      {activeTab === 'subsections' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Plant Sub-Sections Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subSections.map((ss) => (
              <div key={ss.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {ss.id}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">{ss.name}</h4>
                <p className="text-xs text-slate-500 font-semibold">Section: {ss.sectionId}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTIONS TAB */}
      {activeTab === 'sections' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Engineering Sections Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((sec) => (
              <div key={sec.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {sec.id}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">{sec.name}</h4>
                <p className="text-xs text-slate-500 font-semibold">{sec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SMART AUTO-DETECT PASTE MODAL */}
      {isBulkPasteOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-fade-in border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>SMART AUTO-DETECT EXCEL IMPORTER</span>
                </h3>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Paste your Excel tabular rows below. The Smart Auto-Detector automatically extracts Section, Sub-Section, Component Name, Failure Impact, Audit Points, and Specifications regardless of column order!
              </p>

              <textarea
                rows={9}
                placeholder="Paste any Excel rows here..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkPasteOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportBulkPasted}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20"
                >
                  Auto-Detect &amp; Import Checkpoints Now
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
