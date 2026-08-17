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
  { id: 'EMP-01', name: 'Mehul Chikhaliya',  role: 'Admin',       department: 'Process QA',  email: 'mehul.chikhaliya@borosil.com', password: 'borosil123', status: 'Approved', emailParticipation: 'TO', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
  { id: 'EMP-02', name: 'Process QA Admin',  role: 'QA',          department: 'Process QA',  email: 'process.qa@borosil.com',       password: 'borosil123', status: 'Approved', emailParticipation: 'TO', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
  { id: 'EMP-03', name: 'Rakesh Gohil',      role: 'Auditor',     department: 'Engineering', email: 'rakesh.gohil@borosil.com',     password: 'borosil123', status: 'Approved', emailParticipation: 'CC', sectionScope: 'ALL', triggerOn: 'CRITICAL_ONLY', active: true },
  { id: 'EMP-04', name: 'Pavan Kumar',       role: 'Engineering', department: 'Maintenance', email: 'pavan.kumar@borosil.com',      password: 'borosil123', status: 'Approved', emailParticipation: 'CC', sectionScope: 'ALL', triggerOn: 'ANY_NG', active: true },
];

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT DATA — Pre-populated with realistic Borosil plant engineering audits
// ──────────────────────────────────────────────────────────────────────────────
export const initialAudits: AuditHeader[] = [
  {
    auditId: 'AUD-2026-0816-01',
    date: '2026-08-16',
    time: '09:30',
    sectionId: 'GR',
    sectionName: 'Grinding',
    subSectionId: 'M1',
    subSectionName: 'M1 Machine',
    lineId: 'BL#1',
    lineName: 'Benteler Line 1',
    equipmentId: 'EQ-01',
    equipmentName: 'Benteler Edger #1',
    auditorId: 'EMP-01',
    auditorName: 'Mehul Chikhaliya',
    totalCheckpoints: 24,
    okCount: 21,
    ngCount: 2,
    obsCount: 1,
    naCount: 0,
    compliancePercent: 87.5,
    overallStatus: 'FAIL',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-16T09:30:00.000Z',
    updatedAt: '2026-08-16T09:35:00.000Z',
  },
  {
    auditId: 'AUD-2026-0815-02',
    date: '2026-08-15',
    time: '14:15',
    sectionId: 'RO',
    sectionName: 'Robot',
    subSectionId: 'Robot-1',
    subSectionName: 'Robot Unloader',
    lineId: 'BL#2',
    lineName: 'Benteler Line 2',
    equipmentId: 'EQ-02',
    equipmentName: 'Fanuc Handling Robot #2',
    auditorId: 'EMP-02',
    auditorName: 'Process QA Admin',
    totalCheckpoints: 18,
    okCount: 17,
    ngCount: 1,
    obsCount: 0,
    naCount: 0,
    compliancePercent: 94.4,
    overallStatus: 'FAIL',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-15T14:15:00.000Z',
    updatedAt: '2026-08-15T14:20:00.000Z',
  },
  {
    auditId: 'AUD-2026-0814-03',
    date: '2026-08-14',
    time: '11:00',
    sectionId: 'WS',
    sectionName: 'Washing',
    subSectionId: 'Pre-Wash',
    subSectionName: 'High Pressure Pre-Wash',
    lineId: 'BL#1',
    lineName: 'Benteler Line 1',
    equipmentId: 'EQ-03',
    equipmentName: 'Glass Washing Machine #1',
    auditorId: 'EMP-03',
    auditorName: 'Rakesh Gohil',
    totalCheckpoints: 15,
    okCount: 12,
    ngCount: 3,
    obsCount: 0,
    naCount: 0,
    compliancePercent: 80.0,
    overallStatus: 'FAIL',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-14T11:00:00.000Z',
    updatedAt: '2026-08-14T11:05:00.000Z',
  },
  {
    auditId: 'AUD-2026-0813-04',
    date: '2026-08-13',
    time: '16:45',
    sectionId: 'TP',
    sectionName: 'Tempering',
    subSectionId: 'Furnace',
    subSectionName: 'Tempering Furnace',
    lineId: 'Line-3',
    lineName: 'Tempering Line 3',
    equipmentId: 'EQ-04',
    equipmentName: 'Glaston Tempering Furnace',
    auditorId: 'EMP-04',
    auditorName: 'Pavan Kumar',
    totalCheckpoints: 20,
    okCount: 20,
    ngCount: 0,
    obsCount: 0,
    naCount: 0,
    compliancePercent: 100.0,
    overallStatus: 'PASS',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-13T16:45:00.000Z',
    updatedAt: '2026-08-13T16:50:00.000Z',
  },
  {
    auditId: 'AUD-2026-0812-05',
    date: '2026-08-12',
    time: '10:20',
    sectionId: 'CT',
    sectionName: 'Cutting',
    subSectionId: 'CNC-Cut',
    subSectionName: 'CNC Glass Cutting Bridge',
    lineId: 'Line-4',
    lineName: 'Cutting Line 4',
    equipmentId: 'EQ-05',
    equipmentName: 'Bystronic CNC Cutting Table',
    auditorId: 'EMP-01',
    auditorName: 'Mehul Chikhaliya',
    totalCheckpoints: 16,
    okCount: 14,
    ngCount: 2,
    obsCount: 0,
    naCount: 0,
    compliancePercent: 87.5,
    overallStatus: 'FAIL',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-12T10:20:00.000Z',
    updatedAt: '2026-08-12T10:25:00.000Z',
  },
  {
    auditId: 'AUD-2026-0811-06',
    date: '2026-08-11',
    time: '15:30',
    sectionId: 'GR',
    sectionName: 'Grinding',
    subSectionId: 'M2',
    subSectionName: 'M2 Machine',
    lineId: 'BL#2',
    lineName: 'Benteler Line 2',
    equipmentId: 'EQ-01',
    equipmentName: 'Benteler Edger #2',
    auditorId: 'EMP-03',
    auditorName: 'Rakesh Gohil',
    totalCheckpoints: 22,
    okCount: 21,
    ngCount: 1,
    obsCount: 0,
    naCount: 0,
    compliancePercent: 95.5,
    overallStatus: 'FAIL',
    syncStatus: 'SYNCED',
    createdAt: '2026-08-11T15:30:00.000Z',
    updatedAt: '2026-08-11T15:35:00.000Z',
  },
];

export const initialAuditResults: AuditResult[] = [
  {
    id: 'RES-01',
    auditId: 'AUD-2026-0816-01',
    checkpointId: 'CKP-01',
    srNo: 1,
    sectionName: 'Grinding',
    subSectionName: 'M1 Machine',
    lineName: 'Benteler Line 1',
    equipmentName: 'Benteler Edger #1',
    componentName: 'Diamond Grinding Wheel Spindle',
    whatImpactIfThisPartGetsFail: 'Edge chipping and glass breakage during tempering',
    checkpointText: 'Check diamond grinding spindle bearing temperature and vibration',
    standardParameter: 'Max 55°C, Vibration < 1.8 mm/s',
    actualValue: '62°C (Vibration 2.4 mm/s)',
    status: 'NG',
    observationNotes: 'High temperature and vibration detected on right spindle',
    recommendedAction: 'Replace spindle bearings and check lubrication flow',
    isCritical: true,
    auditor: 'Mehul Chikhaliya',
    timestamp: '2026-08-16T09:32:00.000Z',
  },
  {
    id: 'RES-02',
    auditId: 'AUD-2026-0816-01',
    checkpointId: 'CKP-02',
    srNo: 2,
    sectionName: 'Grinding',
    subSectionName: 'M1 Machine',
    lineName: 'Benteler Line 1',
    equipmentName: 'Benteler Edger #1',
    componentName: 'Coolant Water Spray Nozzle',
    whatImpactIfThisPartGetsFail: 'Insufficient cooling causes wheel burning and micro-cracks',
    checkpointText: 'Ensure all coolant nozzles are unclogged and aimed at glass contact point',
    standardParameter: 'Flow > 45 L/min, 2.5 bar',
    actualValue: 'Clogged nozzle on bottom head',
    status: 'NG',
    observationNotes: 'Bottom nozzle clogged with glass fines',
    recommendedAction: 'Clean nozzle and inspect line filtration mesh',
    isCritical: false,
    auditor: 'Mehul Chikhaliya',
    timestamp: '2026-08-16T09:34:00.000Z',
  },
  {
    id: 'RES-03',
    auditId: 'AUD-2026-0815-02',
    checkpointId: 'CKP-03',
    srNo: 1,
    sectionName: 'Robot',
    subSectionName: 'Robot Unloader',
    lineName: 'Benteler Line 2',
    equipmentName: 'Fanuc Handling Robot #2',
    componentName: 'Vacuum Suction Cups & Venturi',
    whatImpactIfThisPartGetsFail: 'Glass slip or dropped sheet causing major safety hazard',
    checkpointText: 'Check vacuum level and rubber suction cup lip wear',
    standardParameter: 'Min -0.75 bar vacuum, No cracks',
    actualValue: '-0.62 bar (Worn cup lip)',
    status: 'NG',
    observationNotes: 'Vacuum leak on cup #4 due to lip tear',
    recommendedAction: 'Replace vacuum cup #4 rubber pad',
    isCritical: true,
    auditor: 'Process QA Admin',
    timestamp: '2026-08-15T14:18:00.000Z',
  },
  {
    id: 'RES-04',
    auditId: 'AUD-2026-0814-03',
    checkpointId: 'CKP-04',
    srNo: 1,
    sectionName: 'Washing',
    subSectionName: 'High Pressure Pre-Wash',
    lineName: 'Benteler Line 1',
    equipmentName: 'Glass Washing Machine #1',
    componentName: 'Cylindrical Brush Roller',
    whatImpactIfThisPartGetsFail: 'Scratches on glass surface or residue remaining',
    checkpointText: 'Inspect nylon brush bristle height and roller alignment',
    standardParameter: 'Bristle height > 18mm, uniform contact',
    actualValue: 'Bristle worn down to 14mm',
    status: 'NG',
    observationNotes: 'Uneven brush wear causing water streak marks',
    recommendedAction: 'Adjust brush height setting and plan replacement roller',
    isCritical: false,
    auditor: 'Rakesh Gohil',
    timestamp: '2026-08-14T11:02:00.000Z',
  },
  {
    id: 'RES-05',
    auditId: 'AUD-2026-0812-05',
    checkpointId: 'CKP-05',
    srNo: 1,
    sectionName: 'Cutting',
    subSectionName: 'CNC Glass Cutting Bridge',
    lineName: 'Cutting Line 4',
    equipmentName: 'Bystronic CNC Cutting Table',
    componentName: 'Carbide Cutting Wheel & Oil Dispenser',
    whatImpactIfThisPartGetsFail: 'Bad breakout, serrated glass edge, cutting defects',
    checkpointText: 'Verify cutting oil droplet dosing and wheel sharpness',
    standardParameter: 'Continuous oil film, wheel rotation free',
    actualValue: 'Dry cutting on right bridge area',
    status: 'NG',
    observationNotes: 'Cutting oil line air bubble preventing oil flow',
    recommendedAction: 'Bleed air from cutting fluid dispenser solenoid valve',
    isCritical: true,
    auditor: 'Mehul Chikhaliya',
    timestamp: '2026-08-12T10:22:00.000Z',
  },
];

export const initialActions: ActionItem[] = [
  {
    actionId: 'ACT-2026-001',
    auditId: 'AUD-2026-0816-01',
    sectionId: 'GR',
    sectionName: 'Grinding',
    subSectionId: 'M1',
    subSectionName: 'M1 Machine',
    lineId: 'BL#1',
    lineName: 'Benteler Line 1',
    equipmentId: 'EQ-01',
    equipmentName: 'Benteler Edger #1',
    componentName: 'Diamond Grinding Wheel Spindle',
    checkpointText: 'Check diamond grinding spindle bearing temperature and vibration',
    observation: 'High temperature (62°C) and vibration detected on right spindle',
    recommendedAction: 'Replace spindle bearings and check lubrication flow',
    responsiblePerson: 'Pavan Kumar (Maintenance)',
    targetDate: '2026-08-18',
    priority: 'Critical',
    status: 'In Progress',
    createdAt: '2026-08-16T09:35:00.000Z',
  },
  {
    actionId: 'ACT-2026-002',
    auditId: 'AUD-2026-0815-02',
    sectionId: 'RO',
    sectionName: 'Robot',
    subSectionId: 'Robot-1',
    subSectionName: 'Robot Unloader',
    lineId: 'BL#2',
    lineName: 'Benteler Line 2',
    equipmentId: 'EQ-02',
    equipmentName: 'Fanuc Handling Robot #2',
    componentName: 'Vacuum Suction Cups & Venturi',
    checkpointText: 'Check vacuum level and rubber suction cup lip wear',
    observation: 'Vacuum leak on cup #4 due to lip tear (-0.62 bar)',
    recommendedAction: 'Replace vacuum cup #4 rubber pad',
    responsiblePerson: 'Automation Lead',
    targetDate: '2026-08-17',
    priority: 'Critical',
    status: 'Open',
    createdAt: '2026-08-15T14:20:00.000Z',
  },
  {
    actionId: 'ACT-2026-003',
    auditId: 'AUD-2026-0814-03',
    sectionId: 'WS',
    sectionName: 'Washing',
    subSectionId: 'Pre-Wash',
    subSectionName: 'High Pressure Pre-Wash',
    lineId: 'BL#1',
    lineName: 'Benteler Line 1',
    equipmentId: 'EQ-03',
    equipmentName: 'Glass Washing Machine #1',
    componentName: 'Cylindrical Brush Roller',
    checkpointText: 'Inspect nylon brush bristle height and roller alignment',
    observation: 'Uneven brush wear causing water streak marks',
    recommendedAction: 'Adjust brush height setting and plan replacement roller',
    responsiblePerson: 'Maintenance Lead',
    targetDate: '2026-08-20',
    priority: 'Medium',
    status: 'Open',
    createdAt: '2026-08-14T11:05:00.000Z',
  },
  {
    actionId: 'ACT-2026-004',
    auditId: 'AUD-2026-0812-05',
    sectionId: 'CT',
    sectionName: 'Cutting',
    subSectionId: 'CNC-Cut',
    subSectionName: 'CNC Glass Cutting Bridge',
    lineId: 'Line-4',
    lineName: 'Cutting Line 4',
    equipmentId: 'EQ-05',
    equipmentName: 'Bystronic CNC Cutting Table',
    componentName: 'Carbide Cutting Wheel & Oil Dispenser',
    checkpointText: 'Verify cutting oil droplet dosing and wheel sharpness',
    observation: 'Cutting oil line air bubble preventing oil flow',
    recommendedAction: 'Bleed air from cutting fluid dispenser solenoid valve',
    responsiblePerson: 'Mechanical Engineer',
    targetDate: '2026-08-15',
    priority: 'Critical',
    status: 'Closed',
    closureRemark: 'Air purged, oil dosing restored to 12 drops/min.',
    closedDate: '2026-08-15',
    createdAt: '2026-08-12T10:25:00.000Z',
  },
];

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
