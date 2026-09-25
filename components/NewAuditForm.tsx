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
import { SupabaseBackendClient } from '../lib/supabaseBackend';
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
  AuthUser,
  FprEntry,
  Employee,
} from '../lib/types';

interface NewAuditFormProps {
  onSuccess: (auditId: string) => void;
  onCancel: () => void;
  onNavigate?: (tab: string) => void;
  initialDraft?: any;
  currentUser?: AuthUser | null;
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

export function isNumericCheckpoint(ck: Checkpoint): boolean {
  if (ck.parameterType === 'NUMBER' || ck.parameterType === 'PERCENTAGE') return true;
  if (ck.minimum !== undefined && ck.minimum !== null && !isNaN(ck.minimum)) return true;
  if (ck.maximum !== undefined && ck.maximum !== null && !isNaN(ck.maximum)) return true;
  const sp = (ck.standardParameter || '').trim();
  if (/^[-+]?\d*\.?\d+\s*(?:[-–—]|to)\s*[-+]?\d*\.?\d+/i.test(sp)) return true;
  if (/^[<>]=?\s*[-+]?\d*\.?\d+/i.test(sp)) return true;
  if (/^±\s*\d*\.?\d+/i.test(sp)) return true;
  return false;
}

export function evaluateNumericStatus(ck: Checkpoint, val: string): StatusType | null {
  const trimmed = (val || '').trim();
  if (!trimmed) return null;
  const num = parseFloat(trimmed);
  if (isNaN(num)) return null;

  let min = ck.minimum;
  let max = ck.maximum;

  // Fallback: extract min / max from standardParameter if not set
  if (min === undefined && max === undefined && ck.standardParameter) {
    const sp = ck.standardParameter.trim();
    const rangeMatch = sp.match(/^([-+]?\d*\.?\d+)\s*(?:[-–—]|to)\s*([-+]?\d*\.?\d+)/i);
    if (rangeMatch) {
      min = parseFloat(rangeMatch[1]);
      max = parseFloat(rangeMatch[2]);
    } else {
      const gteMatch = sp.match(/^>=\s*([-+]?\d*\.?\d+)/);
      if (gteMatch) min = parseFloat(gteMatch[1]);
      const lteMatch = sp.match(/^<=\s*([-+]?\d*\.?\d+)/);
      if (lteMatch) max = parseFloat(lteMatch[1]);
      const gtMatch = sp.match(/^>\s*([-+]?\d*\.?\d+)/);
      if (gtMatch) min = parseFloat(gtMatch[1]) + 0.0001;
      const ltMatch = sp.match(/^<\s*([-+]?\d*\.?\d+)/);
      if (ltMatch) max = parseFloat(ltMatch[1]) - 0.0001;
    }
  }

  if (min !== undefined && max !== undefined) {
    return num >= min && num <= max ? 'OK' : 'NG';
  }
  if (min !== undefined) {
    return num >= min ? 'OK' : 'NG';
  }
  if (max !== undefined) {
    return num <= max ? 'OK' : 'NG';
  }

  return null;
}

export const NewAuditForm: React.FC<NewAuditFormProps> = ({ onSuccess, onCancel, onNavigate, initialDraft, currentUser }) => {
  const [sections, setSections] = useState<Section[]>(() => StorageEngine.getSections());
  const [allSubSections, setAllSubSections] = useState<SubSection[]>(() => StorageEngine.getSubSections());
  const [allLines, setAllLines] = useState<Line[]>(() => StorageEngine.getLines());
  const [allEquipment, setAllEquipment] = useState<Equipment[]>(() => StorageEngine.getEquipment());
  const [allCheckpoints, setAllCheckpoints] = useState<Checkpoint[]>(() => StorageEngine.getCheckpoints());
  const [allFprMatrix, setAllFprMatrix] = useState<FprEntry[]>(() => StorageEngine.getFprMatrix());
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => StorageEngine.getEmployees());
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);

  // Reload plant structure whenever mounting or when section changes
  useEffect(() => {
    setSections(StorageEngine.getSections());
    setAllSubSections(StorageEngine.getSubSections());
    setAllLines(StorageEngine.getLines());
    setAllEquipment(StorageEngine.getEquipment());
    setAllFprMatrix(StorageEngine.getFprMatrix());
    setAllEmployees(StorageEngine.getEmployees());
  }, []);

  // Auto-sync master checkpoints & FPR Matrix & Plant Structure from Supabase on load
  const syncCheckpointsFromCloud = useCallback(async () => {
    setSyncingCloud(true);
    try {
      if (SupabaseBackendClient.isConfigured()) {
        const [cloudCheckpoints, cloudFpr, cloudEmp, cloudPlant] = await Promise.all([
          SupabaseBackendClient.fetchCheckpoints(),
          SupabaseBackendClient.fetchFprMatrix(),
          SupabaseBackendClient.fetchEmployees(),
          SupabaseBackendClient.fetchPlantStructure(),
        ]);
        if (cloudCheckpoints && cloudCheckpoints.length > 0) {
          setAllCheckpoints(cloudCheckpoints);
        }
        if (cloudFpr && cloudFpr.length > 0) {
          setAllFprMatrix(cloudFpr);
        }
        if (cloudEmp && cloudEmp.length > 0) {
          setAllEmployees(cloudEmp);
        }
        if (cloudPlant) {
          if (cloudPlant.sections && cloudPlant.sections.length > 0) setSections(cloudPlant.sections);
          if (cloudPlant.subSections && cloudPlant.subSections.length > 0) setAllSubSections(cloudPlant.subSections);
          if (cloudPlant.lines && cloudPlant.lines.length > 0) setAllLines(cloudPlant.lines);
          if (cloudPlant.equipment && cloudPlant.equipment.length > 0) setAllEquipment(cloudPlant.equipment);
        }
      }
    } catch (err) {
      console.log('[Supabase Cloud Sync notice]:', err);
    } finally {
      setSyncingCloud(false);
    }
  }, []);

  useEffect(() => {
    syncCheckpointsFromCloud();
  }, [syncCheckpointsFromCloud]);

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
  const [auditorName, setAuditorName] = useState<string>(
    initialDraft?.header?.auditorName || currentUser?.name || 'Mehul Chikhaliya'
  );

  useEffect(() => {
    if (currentUser?.name && !initialDraft?.header?.auditorName) {
      setAuditorName(currentUser.name);
    }
  }, [currentUser, initialDraft]);

  const [checkpointStates, setCheckpointStates] = useState<CheckpointState[]>([]);
  // Session-level persistent evaluation map across all sub-sections/lines
  const [evaluatedMap, setEvaluatedMap] = useState<Map<string, CheckpointState>>(() => {
    const initialMap = new Map<string, CheckpointState>();
    if (initialDraft?.states && Array.isArray(initialDraft.states)) {
      initialDraft.states.forEach((st: CheckpointState) => {
        if (st.checkpoint?.id) {
          initialMap.set(st.checkpoint.id, st);
        }
        const key = `${st.checkpoint?.checkpointText || ''}:::${st.component?.name || ''}`;
        initialMap.set(key, st);
      });
    }
    return initialMap;
  });
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
    if (subSectionId === 'ALL') return;
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
      return al.some((l) => {
        const clean = l.trim().toLowerCase();
        return (
          clean === targetLineName ||
          clean.includes(targetLineName) ||
          targetLineName.includes(clean)
        );
      });
    };

    // applicableSubSections helper: checkpoint applies to selected sub-section?
    const subSectionApplies = (ck: Checkpoint): boolean => {
      if (!subSectionId || subSectionId === 'ALL') return true;
      const targetSub = subSectionId.trim().toLowerCase();
      const selectedSub = allSubSections.find((ss) => ss.id === subSectionId);
      const targetSubName = (selectedSub?.name || '').trim().toLowerCase();

      // 1. Check applicableSubSections array if present
      if (ck.applicableSubSections && ck.applicableSubSections.length > 0) {
        if (ck.applicableSubSections.some((s) => s.trim().toLowerCase() === 'all')) return true;
        if (
          ck.applicableSubSections.some((s) => {
            const clean = s.trim().toLowerCase();
            return (
              clean === targetSub ||
              clean === targetSubName ||
              clean.includes(targetSub) ||
              targetSub.includes(clean)
            );
          })
        ) {
          return true;
        }
      }

      // 2. Check subSectionId / subSectionName comma-separated strings
      const rawSub = `${ck.subSectionId || ''},${ck.subSectionName || ''}`.toLowerCase();
      const subList = rawSub.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      if (subList.length === 0 || subList.includes('all')) return true;
      return subList.some(
        (s) =>
          s === targetSub ||
          s === targetSubName ||
          s.includes(targetSub) ||
          targetSub.includes(s)
      );
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
      return subSectionApplies(ck) && lineApplies(ck);
    });

    // 2. Fallback: match by section keyword + subsection + applicableLines
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
        return secKw && subSectionApplies(ck) && lineApplies(ck);
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
      // Check in evaluatedMap first (tracks all user edits in session across sub-sections), fallback to initialDraft
      const compKey = `${ck.checkpointText || ''}:::${ck.componentName || ''}`;
      const savedItem =
        evaluatedMap.get(ck.id) ||
        evaluatedMap.get(compKey) ||
        initialDraft?.states?.find(
          (s: any) =>
            s.checkpoint?.id === ck.id ||
            (s.checkpoint?.checkpointText === ck.checkpointText &&
              s.component?.name === ck.componentName)
        );

      // Look up best default department from FPR matrix for this section/line, else 'Maintenance'
      const activeFprs = StorageEngine.getFprMatrix().filter((f) => f.active);
      const sectionFpr = activeFprs.find(
        (f) => (f.sectionId === targetSecId || f.sectionId === 'ALL') && (f.lineId === lineId || f.lineId === 'ALL')
      );
      const defaultDept = savedItem?.assignedDept || (sectionFpr ? sectionFpr.department : 'Maintenance');
      const fprMatch = StorageEngine.lookupFpr(defaultDept, targetSecId, lineId);
      const employees = StorageEngine.getEmployees();
      const deptEmp = employees.find((e) => e.department === defaultDept && e.status === 'Approved' && e.active);
      const defaultPerson = savedItem?.assignedTo || fprMatch?.fprName || deptEmp?.name || '';

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
        status: savedItem?.status || ('' as any),
        actualValue: savedItem?.actualValue || '',
        observationNotes: savedItem?.observationNotes || '',
        recommendedAction: savedItem?.recommendedAction || ck.recommendedAction || '',
        assignedDept: defaultDept,
        assignedTo: defaultPerson,
        photoUrl: savedItem?.photoUrl || undefined,
      };
    });

    setCheckpointStates(states);
  }, [sectionId, subSectionId, lineId, allCheckpoints, sections, allLines, allFprMatrix, evaluatedMap]);

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

  const updateCheckpointState = (
    index: number,
    updater: (prevItem: CheckpointState) => CheckpointState
  ) => {
    setCheckpointStates((prev) => {
      if (!prev[index]) return prev;
      const updatedItem = updater(prev[index]);
      const nextList = [...prev];
      nextList[index] = updatedItem;

      // Persist immediately in session evaluatedMap
      setEvaluatedMap((prevMap) => {
        const nextMap = new Map(prevMap);
        if (updatedItem.checkpoint?.id) {
          nextMap.set(updatedItem.checkpoint.id, updatedItem);
        }
        const compKey = `${updatedItem.checkpoint?.checkpointText || ''}:::${updatedItem.component?.name || ''}`;
        nextMap.set(compKey, updatedItem);
        return nextMap;
      });

      return nextList;
    });
  };

  const handleActualValueChange = (index: number, val: string) => {
    updateCheckpointState(index, (item) => {
      const updated = { ...item, actualValue: val };
      const autoStatus = evaluateNumericStatus(updated.checkpoint, val);
      if (autoStatus) {
        updated.status = autoStatus;
      } else if (!val.trim()) {
        updated.status = '' as any;
      }
      return updated;
    });
  };

  const handleStatusChange = (index: number, newStatus: StatusType) => {
    updateCheckpointState(index, (item) => {
      const updated = { ...item, status: newStatus };
      if (!isNumericCheckpoint(updated.checkpoint) || !updated.actualValue) {
        updated.actualValue = newStatus;
      }
      return updated;
    });
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    updateCheckpointState(index, (item) => ({ ...item, observationNotes: remarks }));
  };

  const handleRecommendedActionChange = (index: number, val: string) => {
    updateCheckpointState(index, (item) => ({ ...item, recommendedAction: val }));
  };

  const handleAssignedDeptChange = (index: number, dept: string) => {
    const fprMatch = StorageEngine.lookupFpr(dept, sectionId, lineId);
    const employees = StorageEngine.getEmployees();
    const deptEmp = employees.find((e) => e.department === dept && e.status === 'Approved' && e.active);
    const defaultPerson = fprMatch?.fprName || deptEmp?.name || '';

    updateCheckpointState(index, (item) => ({
      ...item,
      assignedDept: dept,
      assignedTo: defaultPerson,
    }));
  };

  const handleAssignedToChange = (index: number, val: string) => {
    updateCheckpointState(index, (item) => ({ ...item, assignedTo: val }));
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
        const MAX_DIM = 600;
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
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.45);
          updateCheckpointState(index, (item) => ({ ...item, photoUrl: compressedBase64 }));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadComponentReferencePhoto = (
    componentName: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
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
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressedPhoto = canvas.toDataURL('image/jpeg', 0.55);

          // 1. Update in allCheckpoints state
          const updatedCheckpoints = allCheckpoints.map((ck) => {
            if (ck.componentName?.toLowerCase().trim() === componentName.toLowerCase().trim()) {
              return { ...ck, componentReferencePhotoUrl: compressedPhoto, updatedAt: new Date().toISOString() };
            }
            return ck;
          });
          setAllCheckpoints(updatedCheckpoints);

          // 2. Update in current form state (checkpointStates)
          setCheckpointStates((prev) =>
            prev.map((cs) => {
              if (cs.component.name?.toLowerCase().trim() === componentName.toLowerCase().trim()) {
                return {
                  ...cs,
                  component: { ...cs.component, referencePhotoUrl: compressedPhoto },
                  checkpoint: { ...cs.checkpoint, componentReferencePhotoUrl: compressedPhoto },
                };
              }
              return cs;
            })
          );

          // 3. Persist locally permanently
          StorageEngine.saveCheckpoints(updatedCheckpoints);

          // 4. Persist to Supabase backend permanently
          SupabaseBackendClient.saveCheckpoints(updatedCheckpoints).catch((err) =>
            console.warn('[Admin SOP photo cloud sync notice]:', err)
          );

          alert(`Standard SOP photo permanently saved for "${componentName}"!`);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Consolidate all evaluated checkpoints across ALL sub-sections and current view
  const allEvaluatedList = useMemo(() => {
    const map = new Map<string, CheckpointState>();

    evaluatedMap.forEach((val, key) => {
      if (val.status && val.status !== ('' as any)) {
        const uniqueKey = val.checkpoint?.id || `${val.checkpoint?.checkpointText}:::${val.component?.name}`;
        map.set(uniqueKey, val);
      }
    });

    checkpointStates.forEach((cs) => {
      if (cs.status && cs.status !== ('' as any)) {
        const uniqueKey = cs.checkpoint?.id || `${cs.checkpoint?.checkpointText}:::${cs.component?.name}`;
        map.set(uniqueKey, cs);
      }
    });

    return Array.from(map.values());
  }, [evaluatedMap, checkpointStates]);

  const summary = useMemo(() => {
    const total = allEvaluatedList.length;
    const okCount = allEvaluatedList.filter((s) => s.status === 'OK').length;
    const ngCount = allEvaluatedList.filter((s) => s.status === 'NG').length;
    const obsCount = allEvaluatedList.filter((s) => s.status === 'Observation').length;
    const naCount = allEvaluatedList.filter((s) => s.status === 'N/A').length;

    const compliance = total > 0 ? (okCount / total) * 100 : 100;
    const hasCriticalNG = allEvaluatedList.some((s) => s.status === 'NG' && s.checkpoint.isCritical);

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
  }, [allEvaluatedList, checkpointStates.length]);

  const handleSaveDraft = () => {
    if (!sectionId) {
      alert('Please select a Section to save a draft.');
      return;
    }

    const selectedSecObj = sections.find((s) => s.id === sectionId);
    const selectedSubSecObj = allSubSections.find((ss) => ss.id === subSectionId);

    // Merge all evaluated states from across all sub-sections + current checkpointStates
    const allStatesMap = new Map<string, CheckpointState>();
    evaluatedMap.forEach((val, key) => {
      const uniqueKey = val.checkpoint?.id || key;
      allStatesMap.set(uniqueKey, val);
    });
    checkpointStates.forEach((cs) => {
      const uniqueKey = cs.checkpoint?.id || `${cs.checkpoint?.checkpointText}:::${cs.component?.name}`;
      allStatesMap.set(uniqueKey, cs);
    });
    const allCombinedStates = Array.from(allStatesMap.values());

    const draftId = initialDraft?.header?.auditId || `DRAFT-${Date.now()}`;
    const draftHeader: Partial<AuditHeader> = {
      auditId: draftId,
      date: auditDate,
      time: auditTime,
      sectionId,
      sectionName: selectedSecObj?.name || sectionId,
      subSectionId,
      subSectionName: subSectionId === 'ALL' ? 'All Sub-Sections' : (selectedSubSecObj?.name || subSectionId),
      lineId,
      equipmentId,
      auditorName: auditorName.trim() || 'Auditor (Draft)',
      isDraft: true,
    };

    StorageEngine.saveDraft({ header: draftHeader, states: allCombinedStates });
    alert(`Audit draft saved! ${allCombinedStates.length} checkpoints (${allEvaluatedList.length} evaluated) preserved across all sub-sections. You can resume anytime from the Drafts tab.`);
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

    // Only submit updated / evaluated components from across ALL sub-sections
    const evaluatedStates = allEvaluatedList;
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

    const allEmployeesList = StorageEngine.getEmployees();
    const allFprList = StorageEngine.getFprMatrix();

    const selectedSecObj = sections.find((s) => s.id === sectionId);
    const selectedSubSecObj = allSubSections.find((ss) => ss.id === subSectionId);
    const selectedLineObj = allLines.find((l) => l.id === lineId);
    const selectedEquipObj = allEquipment.find((e) => e.id === equipmentId);

    const auditorEmail =
      currentUser?.email ||
      allEmployeesList.find((e: Employee) => e.name.toLowerCase().trim() === auditorName.toLowerCase().trim())?.email ||
      '';

    const header: AuditHeader = {
      auditId,
      date: dateStr,
      time: timeStr,
      sectionId,
      sectionName: selectedSecObj?.name || sectionId,
      subSectionId,
      subSectionName: subSectionId === 'ALL' ? 'All Sub-Sections' : (selectedSubSecObj?.name || subSectionId || 'General'),
      lineId,
      lineName: selectedLineObj?.name || lineId || 'Line 1',
      equipmentId,
      equipmentName: selectedEquipObj?.name || equipmentId || 'Line Equipment',
      auditorId: currentUser?.id || 'EMP-AUDITOR',
      auditorName: auditorName.trim(),
      auditorEmail: auditorEmail || undefined,
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
      subSectionName: (cs.checkpoint.subSectionName || selectedSubSecObj?.name || subSectionId),
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
      auditorEmail: auditorEmail || undefined,
      timestamp: now.toISOString(),
    }));

    // Auto-create Actions in Action_Tracker for NG findings across ALL evaluated checkpoints
    const actions: ActionItem[] = evaluatedStates
      .filter((cs) => cs.status === 'NG')
      .map((cs, idx) => {
        const fprEntry = StorageEngine.lookupFpr(cs.assignedDept, sectionId, lineId);

        const fprByName = allFprList.find(
          (f) => f.active && f.fprName.toLowerCase().trim() === (cs.assignedTo || '').toLowerCase().trim()
        );

        const responsiblePerson = cs.assignedTo || fprByName?.fprName || fprEntry?.fprName || cs.assignedDept || 'Maintenance Lead';

        const assignedEmployee = allEmployeesList.find(
          (e) => e.name.toLowerCase().trim() === (cs.assignedTo || '').toLowerCase().trim() && e.active && e.status === 'Approved'
        );

        const deptHOD = allEmployeesList.find(
          (e) => (e.role === 'QA' || e.role === 'Engineering' || e.role === 'Admin') && e.active && e.status === 'Approved'
        );

        const assignedEmail = fprByName?.fprEmail || assignedEmployee?.email || fprEntry?.fprEmail || '';
        const ccPerson = fprByName?.hodName || fprEntry?.hodName || deptHOD?.name || 'Process QA Admin';
        const ccEmail = fprByName?.hodEmail || fprEntry?.hodEmail || deptHOD?.email || 'mehul.chikhaliya@borosil.com';

        return {
          actionId: `ACT-${auditId.replace(/[^A-Za-z0-9]/g, '')}-${idx + 1}`,
          auditId,
          sectionId,
          sectionName: selectedSecObj?.name || sectionId,
          subSectionId: cs.checkpoint.subSectionId || subSectionId,
          subSectionName: cs.checkpoint.subSectionName || selectedSubSecObj?.name || subSectionId,
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
          assignedEmail,
          auditorEmail: auditorEmail || undefined,
          ccPerson,
          ccEmail,
          targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          priority: cs.checkpoint.isCritical ? 'Critical' : 'High',
          status: 'Open',
          createdAt: now.toISOString(),
        };
      });

    // ── STEP 1: Save locally FIRST — instant, never fails ────────────────────
    StorageEngine.saveAudit(header, results, actions);

    // Delete resumed draft if exists
    if (initialDraft?.header?.auditId) {
      StorageEngine.deleteDraft(initialDraft.header.auditId);
    }

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
        let syncResult: { status: string; message: string } | undefined;
        if (SupabaseBackendClient.isConfigured()) {
          syncResult = await SupabaseBackendClient.submitAudit(header, results, actions);
        }
        // Update sync badge silently if the modal is still open
        setLastSubmittedAudit((prev) => prev ? { ...prev, syncResult } : prev);

        // Dispatch department-specific email notifications from process.qa@borosil.com
        if (actions.length > 0) {
          const deptActionMap = new Map<string, ActionItem[]>();
          actions.forEach((act) => {
            const dept = act.responsibleDepartment?.trim() || 'General Engineering';
            if (!deptActionMap.has(dept)) {
              deptActionMap.set(dept, []);
            }
            deptActionMap.get(dept)!.push(act);
          });

          // Send an email to each assigned department with ONLY their specific points
          for (const [dept, deptActions] of deptActionMap.entries()) {
            const deptToList = Array.from(new Set(deptActions.map((a) => a.assignedEmail).filter(Boolean)));
            const deptCcList = Array.from(
              new Set([
                ...deptActions
                  .map((a) => a.ccEmail)
                  .filter(Boolean)
                  .flatMap((c) => (c || '').split(',').map((x) => x.trim()).filter(Boolean)),
                ...(auditorEmail ? [auditorEmail.trim()] : []),
              ])
            );

            const deptResults = results.filter((r) =>
              deptActions.some((a) => a.checkpointText === r.checkpointText || a.componentName === r.componentName)
            );

            if (deptToList.length > 0 || deptCcList.length > 0) {
              fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: deptToList,
                  cc: deptCcList,
                  auditorEmail: auditorEmail || undefined,
                  department: dept,
                  header,
                  results: deptResults.length > 0 ? deptResults : undefined,
                  actions: deptActions,
                }),
              }).catch((mailErr) => console.warn(`[Background email dispatch notice for ${dept}]:`, mailErr));
            }
          }
        }
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
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
          {/* UPPER ACTION BAR (No need to scroll down) */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-300/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-1 z-20 backdrop-blur-md bg-white/95">
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl shrink-0 ${
                  summary.overall === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : summary.overall === 'PASS WITH OBSERVATIONS'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {summary.overall}
              </span>
              <div className="text-xs">
                <span className="font-extrabold text-slate-900">
                  {summary.okCount + summary.ngCount + summary.obsCount + summary.naCount} / {checkpointStates.length} Evaluated
                </span>
                <span className="text-slate-500 font-semibold ml-2 text-[11px]">
                  ({summary.okCount} OK, {summary.ngCount} NG)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition border border-slate-200 flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4 text-indigo-600" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2 rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Engineering Audit'}</span>
              </button>
            </div>
          </div>

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
              {/* 1. Auditor Name (Auto-filled from Logged In User) */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Auditor Name
                </label>
                <div className="flex items-center space-x-2 bg-indigo-50/70 border border-indigo-200 text-slate-900 rounded-xl px-3 py-2 font-bold shadow-xs">
                  <User className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{auditorName || currentUser?.name || 'Auditor'}</span>
                  <span className="text-[10px] text-indigo-600 font-black ml-auto shrink-0 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shadow-xs">
                    ✓ Logged In
                  </span>
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
                  <option value="ALL">🏭 All Sub-Sections (Full View)</option>
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
                Checkpoints can be managed from the <strong>Checkpoint Master</strong> tab. Click <strong>Sync Checkpoints</strong> to load active points.
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
                    <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                      {currentUser?.role === 'Admin' && (
                        <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold transition border border-indigo-200/90 shadow-xs cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload SOP Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadComponentReferencePhoto(group.componentName, e)}
                          />
                        </label>
                      )}

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
                          <th className="px-3 py-3 w-44">Assign Dept (FPR Auto)</th>
                          <th className="px-3 py-3 w-44">Recommended Action</th>
                          <th className="px-3 py-3 w-32">Remarks &amp; Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                        {group.items.map(({ state, originalIndex }, itemIdx) => {
                          const ck = state.checkpoint;
                          const isCritical = ck.isCritical || ck.criticality === 'Critical';

                          const activeFprs = allFprMatrix.filter((f) => f.active);
                          const activeEmps = allEmployees.filter((e) => e.active && e.status === 'Approved');

                          // Collect all departments from FPR Matrix + Employees + standard defaults
                          const deptOptions = Array.from(
                            new Set([
                              ...activeFprs.map((f) => f.department),
                              ...activeEmps.map((e) => e.department),
                              'Maintenance', 'Instrumentation', 'Electrical',
                              'Production', 'Quality', 'Utilities', 'EHS / Safety',
                              'Process QA', 'Engineering',
                            ].filter(Boolean))
                          );

                          // Lookup exact/best FPR match for this checkpoint's department, section, and line
                          const fprMatch = StorageEngine.lookupFpr(state.assignedDept, sectionId, lineId);

                          // Collect candidate persons for this department from FPR Matrix AND Employees
                          const fprCandidates = activeFprs
                            .filter((f) => f.department === state.assignedDept)
                            .map((f) => ({
                              name: f.fprName,
                              email: f.fprEmail,
                              label: `${f.fprName} [FPR Lead${f.sectionId !== 'ALL' ? ` - ${f.sectionId}` : ''}]`,
                              isFpr: true,
                            }));

                          const empCandidates = activeEmps
                            .filter(
                              (e) =>
                                e.department === state.assignedDept &&
                                !fprCandidates.some((f) => f.name.toLowerCase().trim() === e.name.toLowerCase().trim())
                            )
                            .map((e) => ({
                              name: e.name,
                              email: e.email,
                              label: `${e.name} (${e.role || 'Member'})`,
                              isFpr: false,
                            }));

                          const availablePersons = [...fprCandidates, ...empCandidates];

                          const hodCC = activeEmps.find(
                            (e) => (e.role === 'QA' || e.role === 'Engineering' || e.role === 'Admin') && e.active
                          );
                          const ccDisplayText = fprMatch?.hodName || fprMatch?.hodEmail || hodCC?.name;
                          const ccTooltip = fprMatch?.hodEmail || hodCC?.email || '';

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

                              {/* 5. Actual Observation / Input Value */}
                              <td className="px-3 py-3">
                                {isNumericCheckpoint(ck) ? (
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={ck.unit ? `Value (${ck.unit})...` : 'Enter value...'}
                                      value={state.actualValue}
                                      onChange={(e) => handleActualValueChange(originalIndex, e.target.value)}
                                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:outline-none transition shadow-xs ${
                                        state.status === 'OK'
                                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 focus:border-emerald-500'
                                          : state.status === 'NG'
                                          ? 'bg-rose-50/70 border-rose-300 text-rose-900 focus:border-rose-500'
                                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                                      }`}
                                    />
                                    {ck.unit && (
                                      <span className="text-[10px] text-slate-400 font-semibold block px-1">
                                        Unit: {ck.unit}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="py-1">
                                    <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400 font-semibold italic bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md">
                                      <span>Visual / Standard</span>
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 6. Status Selector */}
                              <td className="px-3 py-3 text-center">
                                <select
                                  value={state.status || ''}
                                  onChange={(e) => handleStatusChange(originalIndex, e.target.value as StatusType)}
                                  className={`w-full px-2 py-1.5 rounded-lg text-xs font-extrabold focus:outline-none cursor-pointer transition shadow-xs ${
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

                              {/* 7. Assign Dept (Auto-bound FPR & HOD CC) */}
                              <td className="px-3 py-3">
                                <div className="space-y-1.5">
                                  {/* Department Selector */}
                                  <select
                                    value={state.assignedDept}
                                    onChange={(e) => handleAssignedDeptChange(originalIndex, e.target.value)}
                                    className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-900 focus:outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
                                  >
                                    <option value="">-- Select Dept --</option>
                                    {deptOptions.map((d) => (
                                      <option key={d} value={d}>
                                        {d}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Auto-resolved FPR Lead & HOD CC from Matrix */}
                                  {fprMatch ? (
                                    <div
                                      className="bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-lg p-1.5 text-[10px] space-y-0.5 shadow-xs"
                                      title={`FPR: ${fprMatch.fprName} (${fprMatch.fprEmail})\nHOD CC: ${fprMatch.hodName} (${fprMatch.hodEmail})`}
                                    >
                                      <div className="flex items-center space-x-1 font-bold">
                                        <User className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span className="truncate">FPR: <strong>{fprMatch.fprName}</strong></span>
                                      </div>
                                      {fprMatch.hodName && (
                                        <div className="flex items-center space-x-1 text-[9px] text-emerald-700 font-semibold truncate">
                                          <span className="text-emerald-500 font-bold shrink-0">CC:</span>
                                          <span className="truncate">{fprMatch.hodName}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-2 py-1 text-[9px] font-semibold flex items-center space-x-1">
                                      <span>FPR: {state.assignedDept || 'Department'} Lead</span>
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
                                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-900 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                                  />

                                  {/* Camera Button */}
                                  <label
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition shrink-0"
                                    title="Take Photo (Camera)"
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

                                  {/* Gallery / File Picker Button */}
                                  <label
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 border border-slate-200 cursor-pointer transition shrink-0"
                                    title="Choose from Gallery / Files"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
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
                                    <span className="text-[9px] text-indigo-600 font-bold">📎 Photo Attached</span>
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
                    <p className="text-indigo-800 font-bold">Syncing to Supabase Cloud Database &amp; Storage…</p>
                    <p className="text-indigo-500 text-[10px]">You can use the portal normally. This runs silently.</p>
                  </div>
                </div>
              ) : lastSubmittedAudit.syncResult.status === 'SUCCESS' ? (
                /* Cloud sync succeeded */
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-1 font-semibold">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-extrabold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Synced to Supabase Cloud Database &amp; Storage ✓</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">Audit header, results, photos &amp; action items saved in real-time.</p>
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
