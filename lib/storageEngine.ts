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
  PhotoRecord,
  SystemSettings,
  MailConfig,
  UserRole,
  AuthUser,
  CheckpointImportRow,
} from './types';
import {
  initialSections,
  initialSubSections,
  initialLines,
  initialEquipment,
  initialComponents,
  initialCheckpoints,
  initialEmployees,
  initialAudits,
  initialAuditResults,
  initialActions,
  initialMailConfigs,
  defaultSettings,
} from './demoData';

// v5 keys — ensures a clean fresh start after the data model update
const STORAGE_KEYS = {
  SECTIONS:      'plant_eng_sections_v5',
  SUB_SECTIONS:  'plant_eng_subsections_v5',
  LINES:         'plant_eng_lines_v5',
  EQUIPMENT:     'plant_eng_equipment_v5',
  COMPONENTS:    'plant_eng_components_v5',
  CHECKPOINTS:   'plant_eng_checkpoints_v5',
  EMPLOYEES:     'plant_eng_employees_v5',
  AUDITS:        'plant_eng_audits_v5',
  AUDIT_RESULTS: 'plant_eng_results_v5',
  ACTIONS:       'plant_eng_actions_v5',
  PHOTOS:        'plant_eng_photos_v5',
  SETTINGS:      'plant_eng_settings_v5',
  MAIL_CONFIGS:  'plant_eng_mail_configs_v5',
  DRAFTS:        'plant_eng_drafts_v5',
  AUTH_USER:     'plant_eng_current_auth_user_v5',
};

// ──────────────────────────────────────────────────────────────────────────
// STORAGE LIMITS
// Browser localStorage is a ~5 MB cache only.
// Google Sheets / Drive hold the permanent full copy.
// ──────────────────────────────────────────────────────────────────────────
const MAX_AUDIT_HEADERS = 30;   // last 30 audit summaries (headers only)
const MAX_LAST_RESULTS  = 1;    // keep results for only the LAST audit (PDF re-gen)
const MAX_ACTION_ITEMS  = 150;  // last 150 open action items

/** Slim an AuditResult down to only what the UI needs locally. */
function slimResult(r: AuditResult): Partial<AuditResult> {
  return {
    id: r.id,
    auditId: r.auditId,
    checkpointId: r.checkpointId,
    srNo: r.srNo,
    componentName: r.componentName,
    checkpointText: r.checkpointText,
    standardParameter: r.standardParameter,
    actualValue: r.actualValue,
    status: r.status,
    observationNotes: r.observationNotes,
    isCritical: r.isCritical,
    timestamp: r.timestamp,
  };
}

/** Nuke all audit result data from localStorage. Call on QuotaExceededError. */
function clearAuditResultsFromStorage(): void {
  try { localStorage.removeItem(STORAGE_KEYS.AUDIT_RESULTS); } catch (_) {}
}

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(key, serialized);
  } catch (e: any) {
    const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    if (isQuota) {
      console.warn(`[StorageEngine] Quota exceeded on "${key}" — clearing audit results and retrying.`);
      // Nuclear option: wipe all result data (it lives in Google Sheets)
      clearAuditResultsFromStorage();
      try { localStorage.removeItem(STORAGE_KEYS.AUDITS); } catch (_) {}
      try {
        localStorage.setItem(key, serialized);
      } catch (retryErr) {
        // Still failing — log but DO NOT crash the app
        console.error(`[StorageEngine] Cannot write "${key}" even after clearing results. Data is safe in Google Sheets.`, retryErr);
      }
    } else {
      console.error(`[StorageEngine] Error writing "${key}":`, e);
    }
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from storage:`, e);
  }
}

export class StorageEngine {
  // Initialise plant structure (sections/subsections/lines) on first visit.
  // Checkpoints are NOT seeded — user must upload Excel.
  public static initializeDemoData(force: boolean = false): void {
    if (typeof window === 'undefined') return;
    const isInitialized = localStorage.getItem('plant_eng_portal_initialized_v5');
    if (!isInitialized || force) {
      setItem(STORAGE_KEYS.SECTIONS,     initialSections);
      setItem(STORAGE_KEYS.SUB_SECTIONS, initialSubSections);
      setItem(STORAGE_KEYS.LINES,        initialLines);
      setItem(STORAGE_KEYS.EQUIPMENT,    initialEquipment);
      setItem(STORAGE_KEYS.COMPONENTS,   initialComponents);
      setItem(STORAGE_KEYS.CHECKPOINTS,  initialCheckpoints);   // []
      setItem(STORAGE_KEYS.EMPLOYEES,    initialEmployees);
      setItem(STORAGE_KEYS.AUDITS,       initialAudits);
      setItem(STORAGE_KEYS.AUDIT_RESULTS, initialAuditResults);
      setItem(STORAGE_KEYS.ACTIONS,      initialActions);
      setItem(STORAGE_KEYS.MAIL_CONFIGS, initialMailConfigs);
      setItem(STORAGE_KEYS.SETTINGS,     defaultSettings);
      localStorage.setItem('plant_eng_portal_initialized_v5', 'true');
    }
  }

  // ── SECTIONS ──────────────────────────────────────────────────────────────
  public static getSections(): Section[] {
    return getItem(STORAGE_KEYS.SECTIONS, initialSections);
  }
  public static saveSections(sections: Section[]): void {
    setItem(STORAGE_KEYS.SECTIONS, sections);
  }

  // ── SUB-SECTIONS ──────────────────────────────────────────────────────────
  public static getSubSections(): SubSection[] {
    return getItem(STORAGE_KEYS.SUB_SECTIONS, initialSubSections);
  }
  public static saveSubSections(subSections: SubSection[]): void {
    setItem(STORAGE_KEYS.SUB_SECTIONS, subSections);
  }

  // ── LINES ─────────────────────────────────────────────────────────────────
  public static getLines(): Line[] {
    return getItem(STORAGE_KEYS.LINES, initialLines);
  }
  public static saveLines(lines: Line[]): void {
    setItem(STORAGE_KEYS.LINES, lines);
  }

  // ── EQUIPMENT ─────────────────────────────────────────────────────────────
  public static getEquipment(): Equipment[] {
    return getItem(STORAGE_KEYS.EQUIPMENT, initialEquipment);
  }
  public static saveEquipment(equip: Equipment[]): void {
    setItem(STORAGE_KEYS.EQUIPMENT, equip);
  }

  // ── COMPONENTS ────────────────────────────────────────────────────────────
  public static getComponents(): Component[] {
    return getItem(STORAGE_KEYS.COMPONENTS, initialComponents);
  }
  public static saveComponents(components: Component[]): void {
    setItem(STORAGE_KEYS.COMPONENTS, components);
  }

  // ── CHECKPOINTS ───────────────────────────────────────────────────────────
  public static getCheckpoints(): Checkpoint[] {
    return getItem(STORAGE_KEYS.CHECKPOINTS, initialCheckpoints);
  }
  public static saveCheckpoints(checkpoints: Checkpoint[]): void {
    setItem(STORAGE_KEYS.CHECKPOINTS, checkpoints);
  }

  /**
   * Process an approved import preview.
   * - NEW  → create checkpoint
   * - UPDATE → overwrite existing checkpoint (preserve id)
   * - DUPLICATE / ERROR → skip
   * - Active = No → keep in master but inactive
   */
  public static importCheckpoints(
    rows: CheckpointImportRow[],
    fileName: string
  ): { imported: number; updated: number; skipped: number } {
    const existing = this.getCheckpoints();
    const byId = new Map<string, Checkpoint>(existing.map((ck) => [ck.id, ck]));
    const now = new Date().toISOString();

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    rows.forEach((row) => {
      if (row.action === 'ERROR' || row.action === 'DUPLICATE') {
        skipped++;
        return;
      }

      if (row.action === 'UPDATE' && row.existingId && byId.has(row.existingId)) {
        const existing = byId.get(row.existingId)!;
        byId.set(row.existingId, {
          ...existing,
          ...row.raw,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now,
          importedFrom: fileName,
          applicableLines: row.raw.applicableLines || existing.applicableLines,
        } as Checkpoint);
        updated++;
        return;
      }

      if (row.action === 'NEW') {
        const id = `CKP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const newCk: Checkpoint = {
          id,
          srNo: row.raw.srNo || existing.length + imported + 1,
          sectionId: row.raw.sectionId || '',
          sectionName: row.raw.sectionName || row.raw.sectionId || '',
          subSectionId: row.raw.subSectionId || 'General',
          subSectionName: row.raw.subSectionName || row.raw.subSectionId || 'General',
          lineId: row.raw.lineId || 'ALL',
          lineName: row.raw.lineName || row.raw.lineId || 'ALL',
          componentName: row.raw.componentName || '',
          functionOfComponent: row.raw.functionOfComponent,
          whatImpactIfThisPartGetsFail: row.raw.whatImpactIfThisPartGetsFail,
          checkpointText: row.raw.checkpointText || '',
          standardParameter: row.raw.standardParameter || '',
          parameterType: row.raw.parameterType || 'OK_NG',
          minimum: row.raw.minimum,
          maximum: row.raw.maximum,
          unit: row.raw.unit,
          applicableLines: row.raw.applicableLines || ['ALL'],
          criticality: row.raw.criticality || 'Medium',
          isCritical: (row.raw.criticality || '').toLowerCase() === 'critical',
          active: row.raw.active !== undefined ? row.raw.active : true,
          importedFrom: fileName,
          createdAt: now,
          updatedAt: now,
        };
        byId.set(id, newCk);
        imported++;
      }
    });

    this.saveCheckpoints(Array.from(byId.values()));
    return { imported, updated, skipped };
  }

  /**
   * Deactivate a checkpoint — sets active = false.
   * Never deletes. Historical audits are unaffected.
   */
  public static deactivateCheckpoint(id: string): void {
    const checkpoints = this.getCheckpoints();
    const idx = checkpoints.findIndex((ck) => ck.id === id);
    if (idx >= 0) {
      checkpoints[idx] = { ...checkpoints[idx], active: false, updatedAt: new Date().toISOString() };
      this.saveCheckpoints(checkpoints);
    }
  }

  /**
   * Re-activate a checkpoint.
   */
  public static activateCheckpoint(id: string): void {
    const checkpoints = this.getCheckpoints();
    const idx = checkpoints.findIndex((ck) => ck.id === id);
    if (idx >= 0) {
      checkpoints[idx] = { ...checkpoints[idx], active: true, updatedAt: new Date().toISOString() };
      this.saveCheckpoints(checkpoints);
    }
  }

  // ── EMPLOYEES / USERS ─────────────────────────────────────────────────────
  public static getEmployees(): Employee[] {
    return getItem(STORAGE_KEYS.EMPLOYEES, initialEmployees);
  }

  public static saveEmployees(employees: Employee[]): void {
    setItem(STORAGE_KEYS.EMPLOYEES, employees);
  }

  // ── AUDITS ────────────────────────────────────────────────────────────────
  public static getAudits(): AuditHeader[] {
    return getItem(STORAGE_KEYS.AUDITS, initialAudits);
  }

  public static getAuditResults(): AuditResult[] {
    return getItem(STORAGE_KEYS.AUDIT_RESULTS, initialAuditResults);
  }

  public static saveAudit(header: AuditHeader, results: AuditResult[], actions: ActionItem[]): void {
    // ── 1. Audit Headers (slim summaries, last 30) ─────────────────────────
    const audits = this.getAudits();
    const existingIndex = audits.findIndex((a) => a.auditId === header.auditId);
    if (existingIndex >= 0) {
      audits[existingIndex] = header;
    } else {
      audits.unshift(header);
    }
    setItem(STORAGE_KEYS.AUDITS, audits.slice(0, MAX_AUDIT_HEADERS));

    // ── 2. Audit Results — store ONLY the latest audit's results (slim) ───
    // Older audit details live permanently in Google Sheets.
    // We keep 1 audit's results locally so PDF can be re-generated immediately.
    const slimResults = results.map(slimResult);
    setItem(STORAGE_KEYS.AUDIT_RESULTS, slimResults);

    // ── 3. Action Items (last 150 open items) ─────────────────────────────
    if (actions && actions.length > 0) {
      const allActions = this.getActions();
      const newActionIds = new Set(actions.map((a) => a.actionId));
      const filteredActions = allActions.filter((a) => !newActionIds.has(a.actionId));
      setItem(STORAGE_KEYS.ACTIONS, [...actions, ...filteredActions].slice(0, MAX_ACTION_ITEMS));
    }
  }

  /**
   * Emergency: wipe all audit result data from localStorage.
   * Run this in browser console if you ever see QuotaExceededError:
   *   StorageEngine.clearStorage()
   */
  public static clearStorage(): void {
    if (typeof window === 'undefined') return;
    clearAuditResultsFromStorage();
    try { localStorage.removeItem(STORAGE_KEYS.AUDITS); } catch (_) {}
    try { localStorage.removeItem(STORAGE_KEYS.ACTIONS); } catch (_) {}
    console.log('[StorageEngine] Audit cache cleared. Checkpoint master data preserved. Reload the page.');
  }

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  public static getActions(): ActionItem[] {
    return getItem(STORAGE_KEYS.ACTIONS, initialActions);
  }

  public static updateActionStatus(actionId: string, status: any, closureRemark?: string, closurePhotoUrl?: string): void {
    const actions = this.getActions();
    const idx = actions.findIndex((a) => a.actionId === actionId);
    if (idx >= 0) {
      actions[idx].status = status;
      if (closureRemark)   actions[idx].closureRemark   = closureRemark;
      if (closurePhotoUrl) actions[idx].closurePhotoUrl = closurePhotoUrl;
      if (status === 'Closed') actions[idx].closedDate = new Date().toISOString().substring(0, 10);
      setItem(STORAGE_KEYS.ACTIONS, actions);
    }
  }

  public static updateAction(actionId: string, status: any, closureRemark?: string, closurePhotoUrl?: string): void {
    this.updateActionStatus(actionId, status, closureRemark, closurePhotoUrl);
  }

  public static getTemplates(): any[] { return []; }

  // ── MAIL CONFIGS ──────────────────────────────────────────────────────────
  public static getMailConfigs(): MailConfig[] {
    return getItem(STORAGE_KEYS.MAIL_CONFIGS, initialMailConfigs);
  }
  public static saveMailConfigs(configs: MailConfig[]): void {
    setItem(STORAGE_KEYS.MAIL_CONFIGS, configs);
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  public static getSettings(): SystemSettings {
    return getItem(STORAGE_KEYS.SETTINGS, defaultSettings);
  }
  public static saveSettings(settings: SystemSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  }
  public static getCurrentRole(): UserRole {
    return this.getSettings().currentUserRole || 'Admin';
  }

  // ── DRAFTS ────────────────────────────────────────────────────────────────
  public static getDrafts(): { header: Partial<AuditHeader>; states: any[] }[] {
    return getItem(STORAGE_KEYS.DRAFTS, []);
  }
  public static saveDraft(draft: { header: Partial<AuditHeader>; states: any[] }): void {
    const drafts = this.getDrafts();
    const draftId = draft.header.auditId || `DRAFT-${Date.now()}`;
    draft.header.auditId = draftId;
    const filtered = drafts.filter((d) => d.header.auditId !== draftId);
    setItem(STORAGE_KEYS.DRAFTS, [draft, ...filtered]);
  }
  public static deleteDraft(draftId: string): void {
    const drafts = this.getDrafts();
    setItem(STORAGE_KEYS.DRAFTS, drafts.filter((d) => d.header.auditId !== draftId));
  }

  // ── AUTHENTICATION & LOGIN SESSION ───────────────────────────────────────
  public static getCurrentUser(): AuthUser | null {
    return getItem(STORAGE_KEYS.AUTH_USER, null);
  }

  public static setCurrentUser(user: AuthUser | null): void {
    if (user) {
      setItem(STORAGE_KEYS.AUTH_USER, user);
      const settings = this.getSettings();
      settings.currentUserRole = user.role;
      this.saveSettings(settings);
    } else {
      removeItem(STORAGE_KEYS.AUTH_USER);
    }
  }

  public static logout(): void {
    removeItem(STORAGE_KEYS.AUTH_USER);
  }
}
