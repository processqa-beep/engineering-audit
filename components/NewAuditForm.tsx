'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Info,
  Sparkles,
  FileText,
  Upload,
  User,
  AlertCircle,
  Layers,
  CheckSquare,
  Wrench,
  Filter,
  ArrowLeft,
  Image as ImageIcon,
  Save,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { generateAuditPdfReport } from '../lib/pdfGenerator';
import { generateAuditExcelReport } from '../lib/excelGenerator';
import { PhotoModal } from './PhotoModal';
import {
  Section,
  SubSection,
  Line,
  Equipment,
  Component,
  Checkpoint,
  AuditHeader,
  AuditResult,
  ActionItem,
  StatusType,
  OverallStatusType,
} from '../lib/types';

interface NewAuditFormProps {
  onSuccess: (auditId: string) => void;
  onCancel: () => void;
  onNavigate?: (tab: string) => void;
  initialDraft?: any;
}

interface CheckpointState {
  checkpoint: Checkpoint;
  component: Partial<Component>;
  status: StatusType;
  actualValue: string;
  observationNotes: string;
  recommendedAction: string;
  assignedDept: string;
  assignedTo: string;
  photoUrl?: string;
}

interface ComponentGroup {
  componentName: string;
  component: Partial<Component>;
  items: { state: CheckpointState; originalIndex: number }[];
}

export const NewAuditForm: React.FC<NewAuditFormProps> = ({ onSuccess, onCancel, onNavigate, initialDraft }) => {
  const [sections, setSections] = useState<Section[]>(() => StorageEngine.getSections());
  const [allSubSections, setAllSubSections] = useState<SubSection[]>(() => StorageEngine.getSubSections());
  const [allLines, setAllLines] = useState<Line[]>(() => StorageEngine.getLines());
  const [allEquipment, setAllEquipment] = useState<Equipment[]>(() => StorageEngine.getEquipment());
  const [allCheckpoints, setAllCheckpoints] = useState<Checkpoint[]>(() => StorageEngine.getCheckpoints());
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);

  // Reload plant structure whenever mounting or when section changes
  useEffect(() => {
    setSections(StorageEngine.getSections());
    setAllSubSections(StorageEngine.getSubSections());
    setAllLines(StorageEngine.getLines());
    setAllEquipment(StorageEngine.getEquipment());
  }, []);

  // Auto-sync master checkpoints from Google Sheets on load
  const syncCheckpointsFromGoogleSheet = useCallback(async () => {
    setSyncingCloud(true);
    try {
      const cloudCheckpoints = await GasBackendClient.syncMasterData();
      if (cloudCheckpoints && cloudCheckpoints.length > 0) {
        setAllCheckpoints(cloudCheckpoints);
      }
    } catch (err) {
      console.log('[Cloud Checkpoints Sync notice]:', err);
    } finally {
      setSyncingCloud(false);
    }
  }, []);

  useEffect(() => {
    syncCheckpointsFromGoogleSheet();
  }, [syncCheckpointsFromGoogleSheet]);

  // Form Header State
  const [sectionId, setSectionId] = useState<string>(initialDraft?.header?.sectionId || '');
  const [subSectionId, setSubSectionId] = useState<string>(initialDraft?.header?.subSectionId || '');
  const [lineId, setLineId] = useState<string>(initialDraft?.header?.lineId || '');
  const [equipmentId, setEquipmentId] = useState<string>(initialDraft?.header?.equipmentId || '');

  const [auditDate, setAuditDate] = useState<string>(
    initialDraft?.header?.date || new Date().toISOString().substring(0, 10)
  );
  const [auditTime, setAuditTime] = useState<string>(
    initialDraft?.header?.time || new Date().toTimeString().substring(0, 5)
  );
  const [auditorName, setAuditorName] = useState<string>(initialDraft?.header?.auditorName || '');

  const [checkpointStates, setCheckpointStates] = useState<CheckpointState[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | undefined>();
  const [lastSubmittedAudit, setLastSubmittedAudit] = useState<{
    header: AuditHeader;
    results: AuditResult[];
    actions: ActionItem[];
    syncResult?: { status: string; message: string; driveFolderId?: string; driveFolderUrl?: string };
  } | null>(null);

  // Cascading Sub-Sections for selected Section
  const filteredSubSections = useMemo(() => {
    if (!sectionId) return [];
    return allSubSections.filter(
      (ss) => ss.sectionId === sectionId || ss.sectionId.toLowerCase().startsWith(sectionId.toLowerCase().slice(0, 2))
    );
  }, [allSubSections, sectionId]);

  // Cascading Lines for selected Section
  const filteredLines = useMemo(() => {
    if (!sectionId) return allLines;
    return allLines.filter(
      (l) => l.sectionId === sectionId || l.sectionId.toLowerCase().startsWith(sectionId.toLowerCase().slice(0, 2))
    );
  }, [allLines, sectionId]);

  // Cascading Equipment for selected Section
  const filteredEquipment = useMemo(() => {
    return allEquipment.filter(
      (e) => (e.sectionId === sectionId || !sectionId) && e.active
    );
  }, [allEquipment, sectionId]);

  // Update Sub-Section selection
  useEffect(() => {
    if (filteredSubSections.length > 0 && !filteredSubSections.some((ss) => ss.id === subSectionId)) {
      setSubSectionId(filteredSubSections[0].id);
    }
  }, [filteredSubSections, subSectionId]);

  // Update Line selection
  useEffect(() => {
    if (filteredLines.length > 0 && !filteredLines.some((l) => l.id === lineId)) {
      setLineId(filteredLines[0].id);
    }
  }, [filteredLines, lineId]);

  // Update Equipment selection
  useEffect(() => {
    if (filteredEquipment.length > 0 && !filteredEquipment.some((e) => e.id === equipmentId)) {
      setEquipmentId(filteredEquipment[0].id);
    }
  }, [filteredEquipment, equipmentId]);

  // Lock body scroll when Success Modal is open
  useEffect(() => {
    if (lastSubmittedAudit) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lastSubmittedAudit]);

  // Bulletproof Flexible Section, Sub-Section & Line Checkpoint Matcher
  useEffect(() => {
    if (!sectionId) {
      setCheckpointStates([]);
      return;
    }

    const selectedSec = sections.find((s) => s.id === sectionId);
    const selectedLine = allLines.find((l) => l.id === lineId);
    const targetSecId = sectionId.toLowerCase().trim();
    const targetSecName = (selectedSec?.name || '').toLowerCase().trim();
    // Line name used for applicableLines matching (e.g. "BL#1")
    const targetLineName = (selectedLine?.name || lineId || '').toLowerCase().trim();

    // applicableLines helper: checkpoint applies to selected line?
    const lineApplies = (ck: Checkpoint): boolean => {
      const al = ck.applicableLines;
      if (!al || al.length === 0) return true;                              // no restriction → applies to all
      if (al.some((l) => l.trim().toLowerCase() === 'all')) return true;   // ALL → applies everywhere
      if (!targetLineName) return true;                                      // no line selected → show all
      return al.some((l) => l.trim().toLowerCase() === targetLineName);
    };

    // 1. Primary strict match
    let matched = allCheckpoints.filter((ck) => {
      if (!ck.active) return false;

      const ckSecId = (ck.sectionId || '').toLowerCase().trim();
      const ckSecName = (ck.sectionName || '').toLowerCase().trim();

      const secMatch =
        ckSecId === 'all' ||
        ckSecId === targetSecId ||
        ckSecName === targetSecId ||
        (targetSecName && (ckSecId === targetSecName || ckSecName === targetSecName)) ||
        (targetSecId.startsWith('gr') && (ckSecId.includes('grind') || ckSecName.includes('grind'))) ||
        (targetSecId.startsWith('ro') && (ckSecId.includes('robot') || ckSecName.includes('robot'))) ||
        (targetSecId.startsWith('ws') && (ckSecId.includes('wash') || ckSecName.includes('wash'))) ||
        (targetSecId.startsWith('tp') && (ckSecId.includes('temp') || ckSecName.includes('temp'))) ||
        (targetSecId.startsWith('ct') && (ckSecId.includes('cut') || ckSecName.includes('cut')));

      if (!secMatch) return false;

      // Sub-Section match
      if (subSectionId && subSectionId !== 'ALL') {
        const targetSub = subSectionId.toLowerCase().trim();
        const ckSubId = (ck.subSectionId || '').toLowerCase().trim();
        const ckSubName = (ck.subSectionName || '').toLowerCase().trim();

        if (ckSubId === 'all' || ckSubName === 'all' || !ckSubId) {
          // sub-section pass — now check line
        } else if (!(ckSubId === targetSub || ckSubName === targetSub || ckSubId.includes(targetSub) || ckSubName.includes(targetSub))) {
          return false;
        }
      }

      // Line / applicableLines match
      return lineApplies(ck);
    });

    // 2. Fallback: match by section keyword alone (but still respect applicableLines)
    if (matched.length === 0) {
      matched = allCheckpoints.filter((ck) => {
        if (!ck.active) return false;
        const ckSecId = (ck.sectionId || '').toLowerCase().trim();
        const ckSecName = (ck.sectionName || '').toLowerCase().trim();
        const secKw =
          ckSecId === targetSecId ||
          ckSecName === targetSecId ||
          (targetSecName && (ckSecId === targetSecName || ckSecName === targetSecName)) ||
          (targetSecId.startsWith('gr') && (ckSecId.includes('grind') || ckSecName.includes('grind'))) ||
          (targetSecId.startsWith('ro') && (ckSecId.includes('robot') || ckSecName.includes('robot'))) ||
          (targetSecId.startsWith('ws') && (ckSecId.includes('wash') || ckSecName.includes('wash'))) ||
          (targetSecId.startsWith('tp') && (ckSecId.includes('temp') || ckSecName.includes('temp'))) ||
          (targetSecId.startsWith('ct') && (ckSecId.includes('cut') || ckSecName.includes('cut')));
        return secKw && lineApplies(ck);
      });
    }

    // 3. Ultimate Fallback: return ALL active checkpoints for this section so user is never blocked
    if (matched.length === 0) {
      matched = allCheckpoints.filter((ck) => ck.active && (
        (ck.sectionId || '').toLowerCase() === targetSecId ||
        (ck.sectionName || '').toLowerCase() === targetSecName
      ));
    }

    const states: CheckpointState[] = matched.map((ck) => {
      return {
        checkpoint: ck,
        component: {
          name: ck.componentName || 'Engineering Component',
          referencePhotoUrl: ck.componentReferencePhotoUrl,
          functionOfComponent: ck.functionOfComponent,
          whatImpactIfThisPartGetsFail: ck.whatImpactIfThisPartGetsFail,
          functionOfPart: ck.functionOfPart,
          partFailureType: ck.partFailureType,
          impactOfFailure: ck.impactOfFailure,
          recommendedAction: ck.recommendedAction,
        },
        status: '' as any,
        actualValue: '',
        observationNotes: '',
        recommendedAction: ck.recommendedAction || '',
        assignedDept: 'Maintenance',
        assignedTo: '',
      };
    });

    setCheckpointStates(states);
  }, [sectionId, subSectionId, lineId, allCheckpoints, sections, allLines]);

  // Group Checkpoints by Component for Separate Rounded Cards
  const groupedComponentSections = useMemo(() => {
    const map = new Map<string, ComponentGroup>();

    checkpointStates.forEach((state, originalIndex) => {
      const compKey = state.component.name || 'General Inspection Component';
      if (!map.has(compKey)) {
        map.set(compKey, {
          componentName: compKey,
          component: state.component,
          items: [],
        });
      }
      map.get(compKey)!.items.push({ state, originalIndex });
    });

    return Array.from(map.values());
  }, [checkpointStates]);

  const handleActualValueChange = (index: number, val: string) => {
    setCheckpointStates((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.actualValue = val;

      const ck = item.checkpoint;
      if (ck.parameterType === 'NUMBER' || ck.parameterType === 'PERCENTAGE') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (ck.minimum !== undefined && ck.maximum !== undefined) {
            item.status = num >= ck.minimum && num <= ck.maximum ? 'OK' : 'NG';
          }
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleStatusChange = (index: number, newStatus: StatusType) => {
    setCheckpointStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    setCheckpointStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], observationNotes: remarks };
      return updated;
    });
  };

  const handleRecommendedActionChange = (index: number, val: string) => {
    setCheckpointStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], recommendedAction: val };
      return updated;
    });
  };

  const handleAssignedDeptChange = (index: number, dept: string) => {
    // When dept changes, auto-pick first matching employee for that dept
    const employees = StorageEngine.getEmployees();
    const deptEmp = employees.find((e) => e.department === dept && e.status === 'Approved' && e.active);
    setCheckpointStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], assignedDept: dept, assignedTo: deptEmp?.name || '' };
      return updated;
    });
  };

  const handleAssignedToChange = (index: number, val: string) => {
    setCheckpointStates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], assignedTo: val };
      return updated;
    });
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 500;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.55);
          setCheckpointStates((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], photoUrl: compressedBase64 };
            return updated;
          });
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const summary = useMemo(() => {
    // Only count checkpoints that have been evaluated / updated by the auditor
    const evaluatedStates = checkpointStates.filter((s) => s.status && s.status !== ('' as any));
    const total = evaluatedStates.length;
    const okCount = evaluatedStates.filter((s) => s.status === 'OK').length;
    const ngCount = evaluatedStates.filter((s) => s.status === 'NG').length;
    const obsCount = evaluatedStates.filter((s) => s.status === 'Observation').length;
    const naCount = evaluatedStates.filter((s) => s.status === 'N/A').length;

    const compliance = total > 0 ? (okCount / total) * 100 : 100;
    const hasCriticalNG = evaluatedStates.some((s) => s.status === 'NG' && s.checkpoint.isCritical);

    let overall: OverallStatusType = 'PASS';
    if (total === 0) {
      overall = 'PENDING';
    } else if (hasCriticalNG || ngCount > 0) {
      overall = 'FAIL';
    } else if (obsCount > 0) {
      overall = 'PASS WITH OBSERVATIONS';
    }

    return {
      total,
      okCount,
      ngCount,
      obsCount,
      naCount,
      compliance,
      overall,
      hasCriticalNG,
      totalAvailable: checkpointStates.length,
    };
  }, [checkpointStates]);

  const handleSaveDraft = () => {
    if (!sectionId) {
      alert('Please select a Section to save a draft.');
      return;
    }

    const selectedSecObj = sections.find((s) => s.id === sectionId);
    const selectedSubSecObj = allSubSections.find((ss) => ss.id === subSectionId);

    const draftHeader: Partial<AuditHeader> = {
      auditId: `DRAFT-${Date.now()}`,
      date: auditDate,
      time: auditTime,
      sectionId,
      sectionName: selectedSecObj?.name || sectionId,
      subSectionId,
      subSectionName: selectedSubSecObj?.name || subSectionId,
      lineId,
      equipmentId,
      auditorName: auditorName.trim() || 'Auditor (Draft)',
      isDraft: true,
    };

    StorageEngine.saveDraft({ header: draftHeader, states: checkpointStates });
    alert('Audit draft saved locally! You can resume this audit anytime from the Drafts tab.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorName.trim()) {
      alert('Please enter Auditor Name before submitting.');
      return;
    }
    if (!sectionId) {
      alert('Please select a Section.');
      return;
    }

    // Only submit updated / evaluated components
    const evaluatedStates = checkpointStates.filter((cs) => cs.status && cs.status !== ('' as any));
    if (evaluatedStates.length === 0) {
      alert('Please evaluate at least one component / checkpoint before submitting.');
      return;
    }

    setSubmitting(true);

    const now = new Date();
    const dateStr = auditDate;
    const timeStr = auditTime;
    const cleanLine = (lineId || 'TL04').replace(/[^A-Za-z0-9]/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const auditId = `ENG-${dateStr.replace(/-/g, '')}-${cleanLine}-${randNum}`;

    const selectedSecObj = sections.find((s) => s.id === sectionId);
    const selectedSubSecObj = allSubSections.find((ss) => ss.id === subSectionId);
    const selectedLineObj = allLines.find((l) => l.id === lineId);
    const selectedEquipObj = allEquipment.find((e) => e.id === equipmentId);

    const header: AuditHeader = {
      auditId,
      date: dateStr,
      time: timeStr,
      sectionId,
      sectionName: selectedSecObj?.name || sectionId,
      subSectionId,
      subSectionName: selectedSubSecObj?.name || subSectionId || 'General',
      lineId,
      lineName: selectedLineObj?.name || lineId || 'Line 1',
      equipmentId,
      equipmentName: selectedEquipObj?.name || equipmentId || 'Line Equipment',
      auditorId: 'EMP-AUDITOR',
      auditorName: auditorName.trim(),
      totalCheckpoints: summary.total,
      okCount: summary.okCount,
      ngCount: summary.ngCount,
      obsCount: summary.obsCount,
      naCount: summary.naCount,
      compliancePercent: summary.compliance,
      overallStatus: summary.overall,
      syncStatus: 'SYNCED',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Save ONLY updated / evaluated checkpoints so untouched ones are left blank and not dumped
    const results: AuditResult[] = evaluatedStates.map((cs, idx) => ({
      id: `RES-${auditId}-${idx + 1}`,
      auditId,
      checkpointId: cs.checkpoint.id,
      srNo: cs.checkpoint.srNo || idx + 1,
      sectionName: selectedSecObj?.name || sectionId,
      subSectionName: selectedSubSecObj?.name || subSectionId,
      lineName: selectedLineObj?.name || lineId,
      equipmentName: selectedEquipObj?.name || equipmentId,
      componentName: cs.component.name || 'Component',
      functionOfComponent: cs.component.functionOfComponent || '',
      whatImpactIfThisPartGetsFail: cs.component.whatImpactIfThisPartGetsFail || '',
      functionOfPart: cs.component.functionOfPart || '',
      partFailureType: cs.component.partFailureType || '',
      impactOfFailure: cs.component.impactOfFailure || '',
      checkpointText: cs.checkpoint.checkpointText,
      standardParameter: cs.checkpoint.standardParameter || '',
      actualValue: cs.actualValue || (cs.status === 'OK' ? 'OK' : cs.status),
      status: cs.status,
      observationNotes: cs.observationNotes,
      recommendedAction: cs.recommendedAction || cs.component.recommendedAction || '',
      photoUrl: cs.photoUrl,
      isCritical: cs.checkpoint.isCritical || cs.checkpoint.criticality === 'Critical',
      auditor: auditorName.trim(),
      timestamp: now.toISOString(),
    }));

    // Auto-create Actions in Action_Tracker for NG findings
    // Also collect CC recipients: HODs and Process Owners for the assigned department
    const allEmployees = StorageEngine.getEmployees();
    const actions: ActionItem[] = checkpointStates
      .filter((cs) => cs.status === 'NG')
      .map((cs, idx) => {
        // Determine responsible person: use assignedTo from checkpoint state
        const responsiblePerson = cs.assignedTo || cs.assignedDept || 'Maintenance Lead';

        // CC: find HOD / QA lead / process owner for that department
        const deptHOD = allEmployees.find(
          (e) => (e.department === cs.assignedDept || e.sectionScope === 'ALL') &&
          (e.role === 'QA' || e.role === 'Engineering' || e.role === 'Admin') &&
          e.active && e.status === 'Approved'
        );
        const ccRecipient = deptHOD?.name || 'Process QA Admin';

        return {
          actionId: `ACT-${auditId.replace(/[^A-Za-z0-9]/g, '')}-${idx + 1}`,
          auditId,
          sectionId,
          sectionName: selectedSecObj?.name || sectionId,
          subSectionId,
          subSectionName: selectedSubSecObj?.name || subSectionId,
          lineId,
          lineName: selectedLineObj?.name || lineId,
          equipmentId,
          equipmentName: selectedEquipObj?.name || equipmentId,
          componentName: cs.component.name || 'Component',
          checkpointText: cs.checkpoint.checkpointText,
          observation: cs.observationNotes || `NG finding observed on ${cs.component.name}`,
          recommendedAction: cs.recommendedAction || cs.component.recommendedAction || 'Inspect & repair component',
          responsiblePerson,
          responsibleDepartment: cs.assignedDept,
          ccPerson: ccRecipient,
          targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          priority: cs.checkpoint.isCritical ? 'Critical' : 'High',
          status: 'Open',
          createdAt: now.toISOString(),
        };
      });

    // ── STEP 1: Save locally FIRST — instant, never fails ────────────────────
    StorageEngine.saveAudit(header, results, actions);

    // ── STEP 2: Show success screen IMMEDIATELY (no waiting for network) ─────
    setSubmitting(false);
    setLastSubmittedAudit({ header, results, actions, syncResult: undefined });

    if (summary.overall !== 'FAIL') {
      try { confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
    }

    // ── STEP 3: Fire cloud sync + email in background (non-blocking) ──────────
    // This runs silently after the user is already on the success screen.
    (async () => {
      try {
        const syncResult = await GasBackendClient.submitAudit(header, results, actions);
        // Update sync badge silently if the modal is still open
        setLastSubmittedAudit((prev) => prev ? { ...prev, syncResult } : prev);
      } catch (err: any) {
        console.log('[Background sync notice]:', err?.message);
        setLastSubmittedAudit((prev) =>
          prev
            ? {
                ...prev,
                syncResult: {
                  status: 'LOCAL_SAVED',
                  message: 'Syncing in background. Audit saved locally.',
                },
              }
            : prev
        );
      }
    })();
  };

  const selectedSecObj = sections.find((s) => s.id === sectionId);
  const selectedSubSecObj = allSubSections.find((ss) => ss.id === subSectionId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <span>PLANT ENGINEERING AUDIT SYSTEM</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Master checkpoints configured from Google Sheets (<span className="font-mono text-indigo-700 font-bold">Checkpoint_Master</span>).
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={syncCheckpointsFromGoogleSheet}
            disabled={syncingCloud}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-extrabold transition border border-indigo-200"
            title="Sync all audit checkpoints from Google Sheets Checkpoint_Master tab"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncingCloud ? 'animate-spin' : ''}`} />
            <span>{syncingCloud ? 'Syncing...' : 'Sync Checkpoints'}</span>
          </button>

          {sectionId && (
            <>
              <button
                onClick={handleSaveDraft}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold transition border border-slate-200"
              >
                <Save className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={() => setSectionId('')}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-extrabold transition border border-indigo-200/80"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Change Section</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* STEP 1: SECTION SELECTION PROMPT */}
      {!sectionId ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Filter className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-slate-900">SELECT ENGINEERING SECTION TO START AUDIT</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Sections configured from <strong>Plant Structure Settings</strong>. Select an area below to load its active audit checkpoints.
            </p>
          </div>

          {/* Section Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-2">
            {sections.map((sec) => {
              const count = allCheckpoints.filter(
                (ck) => ck.sectionId === sec.id || ck.sectionName === sec.name || ck.sectionId === sec.name
              ).length;

              return (
                <div
                  key={sec.id}
                  onClick={() => setSectionId(sec.id)}
                  className="bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md group space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {sec.id}
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {count > 0 ? `${count} Points` : 'Active'}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-900">{sec.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 font-medium">
                    {sec.description || 'Configured in Plant Structure Settings'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Link to Plant Structure Settings */}
          {onNavigate && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onNavigate('plant-structure')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-2xl transition border border-indigo-200/80"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>⚙️ Manage Sections, Sub-Sections &amp; Lines in Plant Structure Settings</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: CASCADING DROPDOWNS & AUDIT FORM */
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          {/* HEADER SELECTION GRID */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>AUDIT HEADER DETAILS ({selectedSecObj?.name})</span>
              </h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                {checkpointStates.length} Active Checkpoints across {groupedComponentSections.length} Components
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              {/* 1. Auditor Name */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Auditor Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Auditor Name..."
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl pl-9 pr-3 py-2 font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-xs"
                    required
                  />
                </div>
              </div>

              {/* 2. Sub-Section */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Sub-Section</label>
                <select
                  value={subSectionId}
                  onChange={(e) => setSubSectionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-xs"
                >
                  {filteredSubSections.map((ss) => (
                    <option key={ss.id} value={ss.id}>
                      {ss.name}
                    </option>
                  ))}
                  {filteredSubSections.length === 0 && <option value="M1">M1 (Sub-Section)</option>}
                </select>
              </div>

              {/* 3. Line Selection */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Line / Area</label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-xs"
                >
                  {filteredLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                  {filteredLines.length === 0 && <option value="TL-4">TL-4 (Line 4)</option>}
                </select>
              </div>

              {/* 4. Equipment */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Equipment Unit</label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-bold focus:border-indigo-500 focus:bg-white focus:outline-none transition shadow-xs"
                >
                  {filteredEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                  {filteredEquipment.length === 0 && <option value="EQ-01">Benteler Double Edger Machine</option>}
                </select>
              </div>

              {/* 5. Date */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Audit Date</label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* COMPONENT SECTIONS - Separate Rounded Cards */}
          {groupedComponentSections.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-base font-extrabold text-slate-900">
                No Active Checkpoints for {selectedSecObj?.name} {selectedSubSecObj ? `(${selectedSubSecObj.name})` : ''}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Paste checkpoints into your Google Sheet <span className="font-mono text-indigo-700 font-bold">Checkpoint_Master</span> tab and click <strong>Sync Master</strong> in the top header.
              </p>
            </div>
          ) : (
            groupedComponentSections.map((group, compIdx) => {
              const comp = group.component;
              const totalInComp = group.items.length;
              const evaluatedInComp = group.items.filter((item) => item.state.status && item.state.status !== ('' as any));
              const okInComp = evaluatedInComp.filter((item) => item.state.status === 'OK').length;
              const passRateInComp = evaluatedInComp.length > 0 ? (okInComp / evaluatedInComp.length) * 100 : 0;

              return (
                <div
                  key={group.componentName + '-' + compIdx}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 overflow-hidden mb-6"
                >
                  {/* Component Header Bar */}
                  <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-indigo-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg shadow-xs">
                          Component #{compIdx + 1}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900">{group.componentName}</h4>
                      </div>
                      {comp.whatImpactIfThisPartGetsFail && (
                        <div className="text-[11px] text-amber-900 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/80 inline-block">
                          Failure Impact: {comp.whatImpactIfThisPartGetsFail}
                        </div>
                      )}
                    </div>

                    {/* Right Header: Component Reference Photo & Pass Rate */}
                    <div className="flex items-center space-x-3 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePhotoUrl(
                            comp.referencePhotoUrl ||
                              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
                          );
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold transition border border-slate-200/80 shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>📷 Component Reference Photo</span>
                      </button>

                      <span className="text-slate-700 font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        {evaluatedInComp.length > 0
                          ? `Pass Rate: ${passRateInComp.toFixed(0)}% (${okInComp}/${evaluatedInComp.length} OK)`
                          : `Not Evaluated (0/${totalInComp})`}
                      </span>
                    </div>
                  </div>

                  {/* Component Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-extrabold text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="px-3 py-3 w-10 text-center">Sr.</th>
                          <th className="px-3 py-3">Audit Point</th>
                          <th className="px-3 py-3 w-32">Specification</th>
                          <th className="px-3 py-3 w-20 text-center">Criticality</th>
                          <th className="px-3 py-3 w-32">Actual Observation</th>
                          <th className="px-3 py-3 w-24 text-center">Status</th>
                          <th className="px-3 py-3 w-44">Assign To</th>
                          <th className="px-3 py-3 w-44">Recommended Action</th>
                          <th className="px-3 py-3 w-32">Remarks &amp; Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                        {group.items.map(({ state, originalIndex }, itemIdx) => {
                          const ck = state.checkpoint;
                          const isCritical = ck.isCritical || ck.criticality === 'Critical';
                          const allEmployees = StorageEngine.getEmployees().filter((e) => e.active && e.status === 'Approved');
                          const deptOptions = Array.from(new Set(allEmployees.map((e) => e.department).filter(Boolean)));
                          const deptEmployees = allEmployees.filter((e) => e.department === state.assignedDept);
                          // HOD / CC: first QA/Engineering/Admin person from that dept or any process owner
                          const hodCC = allEmployees.find(
                            (e) => (e.role === 'QA' || e.role === 'Engineering' || e.role === 'Admin') && e.active
                          );

                          return (
                            <tr
                              key={ck.id + '-' + itemIdx}
                              className={`hover:bg-slate-50/80 transition ${
                                state.status === 'NG' ? 'bg-rose-50/30' : ''
                              }`}
                            >
                              {/* 1. Sr.No */}
                              <td className="px-3 py-3 text-center font-extrabold text-slate-500 text-[11px]">
                                {ck.srNo || itemIdx + 1}
                              </td>

                              {/* 2. Audit Point */}
                              <td className="px-3 py-3 space-y-0.5">
                                <div className="font-bold text-slate-900 text-xs leading-snug">
                                  {ck.checkpointText}
                                </div>
                                {ck.functionOfPart && (
                                  <div className="text-[10px] text-slate-500">
                                    {ck.functionOfPart}
                                  </div>
                                )}
                              </td>

                              {/* 3. Specification */}
                              <td className="px-3 py-3 font-bold text-slate-700 font-mono text-[10px]">
                                {ck.standardParameter || 'N/A'} {ck.unit ? `(${ck.unit})` : ''}
                              </td>

                              {/* 4. Criticality */}
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg inline-block ${
                                    isCritical
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {ck.criticality || (isCritical ? 'Critical' : 'Medium')}
                                </span>
                              </td>

                              {/* 5. Actual Observation */}
                              <td className="px-3 py-3">
                                <input
                                  type="text"
                                  placeholder="Value / observation..."
                                  value={state.actualValue}
                                  onChange={(e) => handleActualValueChange(originalIndex, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                                />
                              </td>

                              {/* 6. Status Selector */}
                              <td className="px-3 py-3 text-center">
                                <select
                                  value={state.status || ''}
                                  onChange={(e) => handleStatusChange(originalIndex, e.target.value as StatusType)}
                                  className={`w-full px-2 py-1.5 rounded-lg text-xs font-extrabold focus:outline-none cursor-pointer transition ${
                                    state.status === 'OK'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : state.status === 'NG'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : state.status === 'Observation'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : state.status === 'N/A'
                                      ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                      : 'bg-white text-slate-400 border border-dashed border-slate-300'
                                  }`}
                                >
                                  <option value="">-- Status --</option>
                                  <option value="OK">✅ OK</option>
                                  <option value="NG">❌ NG</option>
                                  <option value="Observation">⚠️ Obs.</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </td>

                              {/* 7. Assign To (Dept + Person) */}
                              <td className="px-3 py-3">
                                <div className="space-y-1">
                                  {/* Department Selector */}
                                  <select
                                    value={state.assignedDept}
                                    onChange={(e) => handleAssignedDeptChange(originalIndex, e.target.value)}
                                    className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="">-- Dept --</option>
                                    {deptOptions.length > 0
                                      ? deptOptions.map((d) => <option key={d} value={d}>{d}</option>)
                                      : [
                                          'Maintenance', 'Instrumentation', 'Electrical',
                                          'Production', 'Quality', 'Utilities', 'EHS / Safety',
                                          'Process QA', 'Engineering',
                                        ].map((d) => <option key={d} value={d}>{d}</option>)
                                    }
                                  </select>

                                  {/* Person selector within selected department */}
                                  {deptEmployees.length > 0 ? (
                                    <select
                                      value={state.assignedTo}
                                      onChange={(e) => handleAssignedToChange(originalIndex, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    >
                                      <option value="">-- Person --</option>
                                      {deptEmployees.map((e) => (
                                        <option key={e.id} value={e.name}>{e.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="Responsible person..."
                                      value={state.assignedTo}
                                      onChange={(e) => handleAssignedToChange(originalIndex, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    />
                                  )}

                                  {/* CC HOD / Process Owner info */}
                                  {hodCC && (
                                    <div className="text-[9px] text-slate-500 flex items-center space-x-1">
                                      <span className="font-bold text-slate-400">CC:</span>
                                      <span className="font-semibold text-indigo-600">{hodCC.name}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 8. Recommended Action */}
                              <td className="px-3 py-3">
                                <textarea
                                  rows={2}
                                  placeholder="Recommended corrective action..."
                                  value={state.recommendedAction}
                                  onChange={(e) => handleRecommendedActionChange(originalIndex, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none transition resize-none leading-snug"
                                />
                              </td>

                              {/* 9. Remarks & Photo Upload (compact) */}
                              <td className="px-3 py-3">
                                <div className="flex items-center space-x-1.5">
                                  <input
                                    type="text"
                                    placeholder="Remark..."
                                    value={state.observationNotes}
                                    onChange={(e) => handleRemarksChange(originalIndex, e.target.value)}
                                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                                  />

                                  <label
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 border border-slate-200 cursor-pointer transition shrink-0"
                                    title="Capture / Upload Photo"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(e) => handlePhotoUpload(originalIndex, e)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>

                                {state.photoUrl && (
                                  <div className="flex items-center space-x-1.5 pt-1.5">
                                    <img
                                      src={state.photoUrl}
                                      alt="Photo"
                                      onClick={() => setActivePhotoUrl(state.photoUrl)}
                                      className="w-8 h-8 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-xs hover:scale-105 transition"
                                    />
                                    <span className="text-[9px] text-indigo-600 font-bold">📎</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}

          {/* Bottom Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 font-bold block">Overall Audit Status</span>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`px-3 py-1 text-xs font-extrabold rounded-xl ${
                    summary.overall === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : summary.overall === 'PASS WITH OBSERVATIONS'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {summary.overall}
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  {summary.okCount} PASS / {summary.ngCount} DEVIATIONS
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition border border-slate-200 flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4 text-indigo-600" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-7 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/30 transition active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Saving Audit...' : 'Submit Engineering Audit'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Success Modal - Portal to document.body */}
      {lastSubmittedAudit &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
            <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl animate-fade-in border border-slate-200">
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Audit Successfully Submitted &amp; Saved!</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Audit ID: <span className="font-mono text-indigo-700 font-bold">{lastSubmittedAudit.header.auditId}</span> | Auditor: {lastSubmittedAudit.header.auditorName}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-semibold">
                <div className="flex justify-between text-slate-700">
                  <span>Section / Sub-Section:</span>
                  <strong className="text-slate-900">{lastSubmittedAudit.header.sectionName} ({lastSubmittedAudit.header.subSectionName})</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Line / Equipment:</span>
                  <strong className="text-slate-900">{lastSubmittedAudit.header.lineName} - {lastSubmittedAudit.header.equipmentName}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Overall Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                      lastSubmittedAudit.header.overallStatus === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {lastSubmittedAudit.header.overallStatus}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Compliance Rate:</span>
                  <strong className="text-indigo-700 font-mono">{lastSubmittedAudit.header.compliancePercent.toFixed(1)}%</strong>
                </div>
              </div>

              {/* Background Sync Status — three clean states */}
              {!lastSubmittedAudit.syncResult ? (
                /* Syncing in background */
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs flex items-center space-x-2.5 font-semibold">
                  <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" />
                  <div>
                    <p className="text-indigo-800 font-bold">Syncing to Google Sheets in background…</p>
                    <p className="text-indigo-500 text-[10px]">You can use the portal normally. This runs silently.</p>
                  </div>
                </div>
              ) : lastSubmittedAudit.syncResult.status === 'SUCCESS' ? (
                /* Cloud sync succeeded */
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-1 font-semibold">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-extrabold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Synced to Google Sheets &amp; Drive ✓</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">Audit_Master, Audit_Details, Action_Tracker updated.</p>
                  {lastSubmittedAudit.syncResult.driveFolderUrl && (
                    <a
                      href={lastSubmittedAudit.syncResult.driveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-indigo-700 hover:text-indigo-900 underline font-extrabold text-[11px] pt-0.5"
                    >
                      <span>📁 Open Folder in Drive</span>
                      <span className="text-[9px]">↗</span>
                    </a>
                  )}
                </div>
              ) : (
                /* Saved locally only — neutral, not alarming */
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex items-center space-x-2.5 font-semibold">
                  <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-slate-700 font-bold">Saved Locally — Syncing when connected</p>
                    <p className="text-slate-400 text-[10px]">Audit is recorded. Cloud sync will retry automatically.</p>
                  </div>
                </div>
              )}


              {/* Export Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => generateAuditPdfReport(lastSubmittedAudit.header, lastSubmittedAudit.results, lastSubmittedAudit.actions)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF Audit Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateAuditExcelReport(lastSubmittedAudit.header, lastSubmittedAudit.results, lastSubmittedAudit.actions)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Export Excel Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLastSubmittedAudit(null);
                    onSuccess(lastSubmittedAudit.header.auditId);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl font-bold text-xs transition"
                >
                  Done &amp; Return to Dashboard
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Photo Viewer Modal */}
      {activePhotoUrl && (
        <PhotoModal isOpen={Boolean(activePhotoUrl)} photoUrl={activePhotoUrl} onClose={() => setActivePhotoUrl(undefined)} />
      )}
    </div>
  );
};
