export type UserRole = 'Admin' | 'Engineering' | 'QA' | 'Auditor' | 'Viewer';

export type ParameterType = 'OK_NG' | 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'YES_NO' | 'DROPDOWN';

export type StatusType = 'OK' | 'NG' | 'Observation' | 'N/A';

export type OverallStatusType = 'PASS' | 'PASS WITH OBSERVATIONS' | 'FAIL' | 'PENDING';

export type ActionPriority = 'Critical' | 'Major' | 'Minor' | 'High' | 'Medium' | 'Low';

export type ActionStatus = 'Open' | 'In Progress' | 'Closed' | 'Overdue';

export type PhotoType = 'REFERENCE' | 'OBSERVATION' | 'CLOSURE';

export type ImportAction = 'NEW' | 'UPDATE' | 'DUPLICATE' | 'ERROR';

// ──────────────────────────────────────────────────────────────────────────────
// PLANT STRUCTURE
// ──────────────────────────────────────────────────────────────────────────────

export interface Section {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface SubSection {
  id: string;
  name: string;
  sectionId: string;
  description?: string;
  active: boolean;
}

export interface Line {
  id: string;
  name: string;
  sectionId: string;
  subSectionId?: string;
  description: string;
  active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  sectionId: string;
  subSectionId?: string;
  lineId: string;
  equipmentType: string;
  manufacturer: string;
  model: string;
  photoUrl?: string;
  description: string;
  active: boolean;
}

export interface Component {
  id: string;
  sectionId: string;
  subSectionId: string;
  lineId: string;
  equipmentId: string;
  name: string;
  referencePhotoUrl?: string;
  functionOfComponent?: string;
  whatImpactIfThisPartGetsFail?: string;
  functionOfPart?: string;
  partFailureType?: string;
  impactOfFailure?: string;
  checkpointText: string;
  standardParameter?: string;
  recommendedAction?: string;
  sequence?: number;
  isCritical?: boolean;
  active: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// CHECKPOINT (master audit point)
// ──────────────────────────────────────────────────────────────────────────────

export interface Checkpoint {
  id: string;
  srNo?: number;

  // Plant hierarchy
  sectionId: string;
  sectionName?: string;
  subSectionId: string;
  subSectionName?: string;
  lineId: string;
  lineName?: string;
  equipmentId?: string;
  equipmentName?: string;
  componentId?: string;

  // Component & failure info
  componentName: string;
  componentReferencePhotoUrl?: string;
  functionOfComponent?: string;
  whatImpactIfThisPartGetsFail?: string;
  functionOfPart?: string;
  partFailureType?: string;
  impactOfFailure?: string;
  recommendedAction?: string;

  // Audit point definition
  checkpointText: string;
  standardParameter: string;
  parameterType: ParameterType;
  minimum?: number;
  maximum?: number;
  unit?: string;

  // Applicable Lines: e.g. ['BL#1','BL#2'] or ['ALL']
  applicableLines: string[];

  // Classification
  criticality: string;     // 'Critical' | 'Major' | 'Minor' — open string so user can extend
  isCritical?: boolean;    // true if criticality === 'Critical'

  // Lifecycle
  active: boolean;
  importedFrom?: string;   // original Excel filename
  createdAt?: string;
  updatedAt?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// EXCEL IMPORT TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface CheckpointImportRow {
  rowIndex: number;                // 1-based row number in Excel
  raw: Partial<Checkpoint>;        // parsed data
  action: ImportAction;            // what will happen on import
  errorMessage?: string;           // for ERROR rows
  existingId?: string;             // existing checkpoint ID if UPDATE/DUPLICATE
  specDisplay?: string;            // formatted spec string, e.g. "4–6 bar"
}

export interface ImportPreviewSummary {
  fileName: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  duplicateCount: number;
  errorCount: number;
  inactiveCount: number;
  rows: CheckpointImportRow[];
}

export type EmailParticipationType = 'TO' | 'CC' | 'NONE';
export type UserApprovalStatus = 'Approved' | 'Pending' | 'Rejected';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  loginMethod: 'email_password' | 'google' | 'borosil_sso';
  loginAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
  password?: string;
  status?: UserApprovalStatus;
  emailParticipation?: EmailParticipationType;
  sectionScope?: string;
  triggerOn?: 'ANY_NG' | 'CRITICAL_ONLY' | 'ALL_AUDITS';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  requestedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT RECORDS
// ──────────────────────────────────────────────────────────────────────────────

export interface AuditHeader {
  auditId: string;
  date: string;
  time: string;
  sectionId: string;
  sectionName: string;
  subSectionId: string;
  subSectionName: string;
  lineId: string;
  lineName: string;
  equipmentId: string;
  equipmentName: string;
  auditorId: string;
  auditorName: string;
  totalCheckpoints: number;
  okCount: number;
  ngCount: number;
  obsCount: number;
  naCount: number;
  compliancePercent: number;
  overallStatus: OverallStatusType;
  driveFolderId?: string;
  reportFileId?: string;
  isDraft?: boolean;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface AuditResult {
  id: string;
  auditId: string;
  checkpointId: string;
  srNo: number;
  sectionName: string;
  subSectionName: string;
  lineName: string;
  equipmentName: string;
  componentName: string;
  functionOfComponent?: string;
  whatImpactIfThisPartGetsFail?: string;
  functionOfPart?: string;
  partFailureType?: string;
  impactOfFailure?: string;
  checkpointText: string;
  standardParameter: string;
  standardRange?: string;
  level?: string;
  fpr?: number;
  actualValue: string;
  status: StatusType;
  observationNotes: string;
  recommendedAction: string;
  photoFileId?: string;
  photoUrl?: string;
  isCritical: boolean;
  auditor: string;
  timestamp: string;
}

export interface ActionItem {
  actionId: string;
  auditId: string;
  sectionId: string;
  sectionName?: string;
  subSectionId: string;
  subSectionName?: string;
  lineId: string;
  lineName?: string;
  equipmentId: string;
  equipmentName?: string;
  componentName: string;
  checkpointText: string;
  observation: string;
  recommendedAction: string;
  responsiblePerson: string;
  responsibleDepartment?: string;
  assignedEmail?: string;      // direct email of the assigned person
  ccPerson?: string;           // CC person name (HOD/Process Owner)
  ccEmail?: string;            // CC email
  targetDate: string;
  priority: ActionPriority;
  status: ActionStatus;
  closureRemark?: string;
  closurePhotoUrl?: string;
  closedDate?: string;
  createdAt: string;
}

export interface PhotoRecord {
  photoId: string;
  auditId?: string;
  componentId?: string;
  photoType: PhotoType;
  driveFileId: string;
  webViewLink: string;
  fileName: string;
  uploadedAt: string;
}

export interface SystemSettings {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  autoBackupEnabled: boolean;
  lastBackupDate: string;
  companyName: string;
  defaultSection: string;
  currentUserRole: UserRole;
  googleSheetId?: string;
  googleDriveFolderId?: string;
  googleAppsScriptUrl?: string;
}

export interface MailConfig {
  id: string;
  sectionId: string;
  lineId: string;
  recipientName: string;
  email: string;
  role: string;
  triggerOn: 'CRITICAL_ONLY' | 'ANY_NG' | 'ALL_AUDITS';
  active: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// FPR MATRIX — Department × Section/Line → Responsible Person + CC
// ──────────────────────────────────────────────────────────────────────────────
export interface FprEntry {
  id: string;
  department: string;    // e.g. "Maintenance"
  sectionId: string;     // e.g. "GR" or "ALL"
  lineId: string;        // e.g. "BL-1" or "ALL"
  fprName: string;       // Functionally Responsible Person name
  fprEmail: string;      // their @borosil.com email
  hodName: string;       // HOD / Process Owner name (CC)
  hodEmail: string;      // HOD email (CC)
  active: boolean;
  updatedAt?: string;
}
