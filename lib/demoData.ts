/**
 * Initial / seed data for the Plant Engineering Audit Portal.
 *
 * RULES:
 * - initialCheckpoints = [] — NO demo audit points. User must upload via Excel.
 * - Sections, Sub-Sections, and Lines are pre-seeded with real plant structure
 *   but are fully user-editable from Plant Structure Settings.
 */
import {
  Section,
  SubSection,
  Line,
  Equipment,
  Component,
  Checkpoint,
  Employee,
  AuditHeader,
  AuditResult,
  ActionItem,
  MailConfig,
  SystemSettings,
} from './types';

// ──────────────────────────────────────────────────────────────────────────────
// SECTIONS
// ──────────────────────────────────────────────────────────────────────────────
export const initialSections: Section[] = [
  { id: 'GR', name: 'Grinding', description: 'Glass edge grinding & finishing', active: true },
  { id: 'TP', name: 'Tempering', description: 'Glass tempering furnace & quench', active: true },
  { id: 'AL', name: 'Arc Lehr', description: 'Annealing / Arc Lehr process', active: true },
  { id: 'CT', name: 'Cutting', description: 'Glass cutting lines', active: true },
  { id: 'WS', name: 'Washing', description: 'Glass washing & drying', active: true },
  { id: 'RO', name: 'Robot', description: 'Robotic handling & automation', active: true },
  { id: 'FU', name: 'Furnace', description: 'Furnace systems', active: true },
  { id: 'PK', name: 'Packing', description: 'Packing & despatch lines', active: true },
  { id: 'UT', name: 'Utilities', description: 'Compressors, HVAC, utilities', active: true },
  { id: 'CV', name: 'Conveyor', description: 'Conveyor systems', active: true },
];

// ──────────────────────────────────────────────────────────────────────────────
// SUB-SECTIONS
// ──────────────────────────────────────────────────────────────────────────────
export const initialSubSections: SubSection[] = [
  // Grinding
  { id: 'GR-M1',  name: 'M1',  sectionId: 'GR', description: 'Grinding Line M1',  active: true },
  { id: 'GR-M1A', name: 'M1A', sectionId: 'GR', description: 'Grinding Line M1A', active: true },
  { id: 'GR-M2',  name: 'M2',  sectionId: 'GR', description: 'Grinding Line M2',  active: true },

  // Tempering
  { id: 'TP-FU',  name: 'Furnace',  sectionId: 'TP', description: 'Tempering Furnace', active: true },
  { id: 'TP-QU',  name: 'Quench',   sectionId: 'TP', description: 'Quench Section',    active: true },
  { id: 'TP-LH',  name: 'Lehr',     sectionId: 'TP', description: 'Lehr',              active: true },

  // Arc Lehr
  { id: 'AL-LH',  name: 'Lehr',     sectionId: 'AL', description: 'Annealing Lehr',    active: true },

  // Cutting
  { id: 'CT-CM',  name: 'Cutting Machine', sectionId: 'CT', description: 'Cutting Machine', active: true },

  // Washing
  { id: 'WS-WM',  name: 'Washing Machine', sectionId: 'WS', description: 'Washing Machine', active: true },

  // Robot
  { id: 'RO-KU',  name: 'KUKA Robot', sectionId: 'RO', description: 'KUKA Robot Cell', active: true },

  // Furnace
  { id: 'FU-FU',  name: 'Furnace',   sectionId: 'FU', description: 'Furnace',   active: true },

  // Packing
  { id: 'PK-PK',  name: 'Packing Line', sectionId: 'PK', description: 'Packing', active: true },

  // Utilities
  { id: 'UT-CP',  name: 'Compressor', sectionId: 'UT', description: 'Air Compressor',  active: true },
  { id: 'UT-HV',  name: 'HVAC',       sectionId: 'UT', description: 'HVAC Systems',    active: true },

  // Conveyor
  { id: 'CV-CV',  name: 'Conveyor',   sectionId: 'CV', description: 'Drive Conveyors', active: true },
];

// ──────────────────────────────────────────────────────────────────────────────
// LINES / MACHINES  (real plant line names — user-editable)
// ──────────────────────────────────────────────────────────────────────────────
export const initialLines: Line[] = [
  // Grinding — BL series
  { id: 'BL1',  name: 'BL#1',  sectionId: 'GR', subSectionId: 'GR-M1',  description: 'Benteler Grinding Line 1',  active: true },
  { id: 'BL2',  name: 'BL#2',  sectionId: 'GR', subSectionId: 'GR-M1',  description: 'Benteler Grinding Line 2',  active: true },
  { id: 'BL3',  name: 'BL#3',  sectionId: 'GR', subSectionId: 'GR-M1A', description: 'Benteler Grinding Line 3',  active: true },
  { id: 'BL4',  name: 'BL#4',  sectionId: 'GR', subSectionId: 'GR-M1A', description: 'Benteler Grinding Line 4',  active: true },
  { id: 'BL6',  name: 'BL#6',  sectionId: 'GR', subSectionId: 'GR-M2',  description: 'Benteler Grinding Line 6',  active: true },
  { id: 'BL7',  name: 'BL#7',  sectionId: 'GR', subSectionId: 'GR-M2',  description: 'Benteler Grinding Line 7',  active: true },
  { id: 'BL8',  name: 'BL#8',  sectionId: 'GR', subSectionId: 'GR-M2',  description: 'Benteler Grinding Line 8',  active: true },

  // Tempering — TL series
  { id: 'TL1',  name: 'TL#1',  sectionId: 'TP', subSectionId: 'TP-FU',  description: 'Tempering Line 1',  active: true },
  { id: 'TL2',  name: 'TL#2',  sectionId: 'TP', subSectionId: 'TP-FU',  description: 'Tempering Line 2',  active: true },
  { id: 'TL3',  name: 'TL#3',  sectionId: 'TP', subSectionId: 'TP-FU',  description: 'Tempering Line 3',  active: true },
  { id: 'TL4',  name: 'TL#4',  sectionId: 'TP', subSectionId: 'TP-FU',  description: 'Tempering Line 4',  active: true },

  // Robot
  { id: 'SG2R1', name: 'SG#2 Robot-1', sectionId: 'RO', subSectionId: 'RO-KU', description: 'SG#2 KUKA Robot 1', active: true },
  { id: 'SG2R2', name: 'SG#2 Robot-2', sectionId: 'RO', subSectionId: 'RO-KU', description: 'SG#2 KUKA Robot 2', active: true },
  { id: 'SG3R1', name: 'SG#3 Robot-1', sectionId: 'RO', subSectionId: 'RO-KU', description: 'SG#3 KUKA Robot 1', active: true },

  // Cutting
  { id: 'CT1',  name: 'Cutting Machine 1', sectionId: 'CT', subSectionId: 'CT-CM', description: 'Cutting Machine 1', active: true },
  { id: 'CT2',  name: 'Cutting Machine 2', sectionId: 'CT', subSectionId: 'CT-CM', description: 'Cutting Machine 2', active: true },

  // Washing
  { id: 'WM1',  name: 'Washing Machine 1', sectionId: 'WS', subSectionId: 'WS-WM', description: 'Washing Machine 1', active: true },
  { id: 'WM2',  name: 'Washing Machine 2', sectionId: 'WS', subSectionId: 'WS-WM', description: 'Washing Machine 2', active: true },

  // Packing
  { id: 'PK1',  name: 'Packing Line 1', sectionId: 'PK', subSectionId: 'PK-PK', description: 'Packing Line 1', active: true },

  // Utilities
  { id: 'CP1',  name: 'Compressor 1', sectionId: 'UT', subSectionId: 'UT-CP', description: 'Air Compressor 1', active: true },
  { id: 'CP2',  name: 'Compressor 2', sectionId: 'UT', subSectionId: 'UT-CP', description: 'Air Compressor 2', active: true },
];

// ──────────────────────────────────────────────────────────────────────────────
// EQUIPMENT, COMPONENTS — empty (configured via Excel / UI)
// ──────────────────────────────────────────────────────────────────────────────
export const initialEquipment: Equipment[] = [];

export const initialComponents: Component[] = [];

// ──────────────────────────────────────────────────────────────────────────────
// CHECKPOINTS — EMPTY. User must upload via Excel template.
// ──────────────────────────────────────────────────────────────────────────────
export const initialCheckpoints: Checkpoint[] = [];

// ──────────────────────────────────────────────────────────────────────────────
// EMPLOYEES
// ──────────────────────────────────────────────────────────────────────────────
export const initialEmployees: Employee[] = [
  { id: 'EMP-01', name: 'Mehul Chikhaliya',  role: 'Admin',       department: 'Process QA',  email: 'mehul.chikhaliya@borosil.com', emailParticipation: 'TO', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
  { id: 'EMP-02', name: 'Process QA Admin',  role: 'QA',          department: 'Process QA',  email: 'process.qa@borosil.com',       emailParticipation: 'TO', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
  { id: 'EMP-03', name: 'Rakesh Gohil',      role: 'Auditor',     department: 'Engineering', email: 'rakesh.gohil@borosil.com',     emailParticipation: 'CC', sectionScope: 'ALL', triggerOn: 'CRITICAL_ONLY', active: true },
  { id: 'EMP-04', name: 'Pavan Kumar',       role: 'Engineering', department: 'Maintenance', email: 'pavan.kumar@borosil.com',      emailParticipation: 'CC', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
];

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT DATA — empty (populated via real audits)
// ──────────────────────────────────────────────────────────────────────────────
export const initialAudits: AuditHeader[] = [];
export const initialAuditResults: AuditResult[] = [];
export const initialActions: ActionItem[] = [];
export const initialMailConfigs: MailConfig[] = [];

// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS
// ──────────────────────────────────────────────────────────────────────────────
export const defaultSettings: SystemSettings = {
  googleSheetId: '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0',
  googleDriveFolderId: 'Engineering Audit System',
  googleAppsScriptUrl: 'https://script.google.com/a/macros/borosil.com/s/AKfycbzSZI42dnh2VvSExq121cqhArASSDNYv4txm3rxtK9FTSxTuT91Id8ItWr9m_srjs10/exec',
  autoBackupEnabled: true,
  lastBackupDate: '',
  companyName: 'Borosil Renewables Ltd.',
  defaultSection: 'GR',
  currentUserRole: 'Admin',
};
