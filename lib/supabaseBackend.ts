import {
  AuditHeader,
  AuditResult,
  ActionItem,
  Checkpoint,
  Employee,
  FprEntry,
  Section,
  SubSection,
  Line,
  Equipment,
} from './types';
import { StorageEngine } from './storageEngine';

/**
 * SupabaseBackendClient
 *
 * ALL database operations are routed through the Next.js Server API Proxy (/api/db).
 * This completely eliminates direct client-to-Supabase connections from the user's browser,
 * allowing the portal to work 100% seamlessly behind corporate firewalls and VPNs!
 */
export class SupabaseBackendClient {
  public static isConfigured(): boolean {
    return true;
  }

  // ── 1. TEST CONNECTION VIA SERVER PROXY ────────────────────────────────────
  public static async ping(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/db?action=ping');
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Server proxy connection failed' };
      }
      return { success: true, message: 'Connected to Supabase via Server Proxy ✓' };
    } catch (err: any) {
      return { success: false, message: `Server error: ${err.message}` };
    }
  }

  // ── 2. SUBMIT AUDIT VIA SERVER PROXY ───────────────────────────────────────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string }> {
    // 1. Always save in local storage first for offline recovery
    StorageEngine.saveAudit(header, results, actions);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_AUDIT',
          payload: { header, results, actions },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[Server Proxy Submit Notice]:', data.message);
        return { status: 'LOCAL_SAVED', message: `Saved locally. Notice: ${data.message}` };
      }

      return {
        status: 'SUCCESS',
        message: '✅ Audit & Photos Saved via Vercel Server Proxy!',
      };
    } catch (err: any) {
      console.warn('[Server Proxy Submit Exception]:', err);
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Notice: ${err.message}`,
      };
    }
  }

  // ── 3. CHECKPOINTS VIA SERVER PROXY ────────────────────────────────────────
  public static async fetchCheckpoints(): Promise<Checkpoint[]> {
    try {
      const res = await fetch('/api/db?action=fetchCheckpoints');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getCheckpoints();
      }

      const mapped: Checkpoint[] = json.data.map((d: any) => ({
        id: d.id,
        srNo: d.sr_no,
        sectionId: d.section_id,
        sectionName: d.section_name,
        subSectionId: d.sub_section_id,
        subSectionName: d.sub_section_name,
        lineId: d.line_id,
        lineName: d.line_name,
        equipmentId: d.equipment_id,
        equipmentName: d.equipment_name,
        componentId: d.component_id,
        componentName: d.component_name,
        componentReferencePhotoUrl: d.component_reference_photo_url,
        functionOfComponent: d.function_of_component,
        whatImpactIfThisPartGetsFail: d.what_impact_if_this_part_gets_fail,
        functionOfPart: d.function_of_part,
        partFailureType: d.part_failure_type,
        impactOfFailure: d.impact_of_failure,
        recommendedAction: d.recommended_action,
        checkpointText: d.checkpoint_text,
        standardParameter: d.standard_parameter,
        parameterType: d.parameter_type || 'OK_NG',
        minimum: d.minimum,
        maximum: d.maximum,
        unit: d.unit,
        applicableLines: d.applicable_lines || ['ALL'],
        criticality: d.criticality || 'Medium',
        isCritical: d.is_critical || d.criticality === 'Critical',
        active: d.active !== false,
      }));

      StorageEngine.saveCheckpoints(mapped);
      return mapped;
    } catch {
      return StorageEngine.getCheckpoints();
    }
  }

  public static async saveCheckpoints(checkpoints: Checkpoint[]): Promise<boolean> {
    StorageEngine.saveCheckpoints(checkpoints);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_CHECKPOINTS',
          payload: checkpoints,
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch (err) {
      console.warn('[Server Proxy Save Checkpoints Notice]:', err);
      return false;
    }
  }

  public static async updateCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CHECKPOINT',
          payload: checkpoint,
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  public static async deleteCheckpoint(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_CHECKPOINT',
          payload: { id },
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  public static async batchDeleteCheckpoints(ids: string[]): Promise<boolean> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BATCH_DELETE_CHECKPOINTS',
          payload: { ids },
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  // ── 4. EMPLOYEES VIA SERVER PROXY ──────────────────────────────────────────
  public static async fetchEmployees(): Promise<Employee[]> {
    try {
      const res = await fetch('/api/db?action=fetchEmployees');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getEmployees();
      }

      const mapped: Employee[] = json.data.map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        department: d.department,
        role: d.role,
        password: '',
        status: d.status || 'Approved',
        emailParticipation: d.email_participation || 'NONE',
        sectionScope: d.section_scope || 'ALL',
        triggerOn: d.trigger_on || 'ANY_NG',
        active: d.active !== false,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      StorageEngine.saveEmployees(mapped);
      return mapped;
    } catch {
      return StorageEngine.getEmployees();
    }
  }

  public static async saveEmployees(employees: Employee[]): Promise<boolean> {
    StorageEngine.saveEmployees(employees);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_EMPLOYEES',
          payload: employees,
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  public static async requestAccess(
    name: string,
    email: string,
    department: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    StorageEngine.requestAccess(name, email, department, password);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_ACCESS',
          payload: { name, email, department, password },
        }),
      });
      const json = await res.json();
      return { success: true, message: json.message || 'Access request submitted' };
    } catch {
      return { success: true, message: 'Saved locally' };
    }
  }

  public static async approveUser(
    id: string,
    role: any,
    department?: string,
    emailParticipation?: any,
    sectionScope?: string
  ): Promise<boolean> {
    StorageEngine.approveUser(id, role, department, emailParticipation, sectionScope);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_USER',
          payload: { id, role, department, emailParticipation, sectionScope },
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  public static async rejectUser(id: string): Promise<boolean> {
    StorageEngine.rejectUser(id);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT_USER',
          payload: { id },
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  // ── 5. FPR MATRIX VIA SERVER PROXY ─────────────────────────────────────────
  public static async fetchFprMatrix(): Promise<FprEntry[]> {
    try {
      const res = await fetch('/api/db?action=fetchFprMatrix');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getFprMatrix();
      }

      const mapped: FprEntry[] = json.data.map((d: any) => ({
        id: d.id,
        department: d.department,
        sectionId: d.section_id,
        lineId: d.line_id,
        fprName: d.fpr_name,
        fprEmail: d.fpr_email,
        hodName: d.hod_name,
        hodEmail: d.hod_email,
        active: d.active !== false,
        updatedAt: d.updated_at,
      }));

      StorageEngine.saveFprMatrix(mapped);
      return mapped;
    } catch {
      return StorageEngine.getFprMatrix();
    }
  }

  public static async saveFprMatrix(matrix: FprEntry[]): Promise<boolean> {
    StorageEngine.saveFprMatrix(matrix);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_FPR_MATRIX',
          payload: matrix,
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  // ── 6. AUDITS & RESULTS VIA SERVER PROXY ───────────────────────────────────
  public static async fetchAudits(): Promise<AuditHeader[]> {
    try {
      const res = await fetch('/api/db?action=fetchAudits');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getAudits();
      }

      const mapped: AuditHeader[] = json.data.map((d: any) => ({
        auditId: d.audit_id,
        date: d.date,
        time: d.time,
        sectionId: d.section_id,
        sectionName: d.section_name,
        subSectionId: d.sub_section_id,
        subSectionName: d.sub_section_name,
        lineId: d.line_id,
        lineName: d.line_name,
        equipmentId: d.equipment_id,
        equipmentName: d.equipment_name,
        auditorId: d.auditor_id,
        auditorName: d.auditor_name,
        totalCheckpoints: d.total_checkpoints,
        okCount: d.ok_count,
        ngCount: d.ng_count,
        obsCount: d.obs_count,
        naCount: d.na_count,
        compliancePercent: Number(d.compliance_percent),
        overallStatus: d.overall_status,
        syncStatus: 'SYNCED',
        isDraft: d.is_draft,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      StorageEngine.saveAudits(mapped);
      return mapped;
    } catch {
      return StorageEngine.getAudits();
    }
  }

  public static async fetchAuditResults(auditId?: string): Promise<AuditResult[]> {
    try {
      const url = auditId ? `/api/db?action=fetchAuditResults&auditId=${encodeURIComponent(auditId)}` : '/api/db?action=fetchAuditResults';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getAuditResults();
      }

      const mapped: AuditResult[] = json.data.map((d: any) => ({
        id: d.id,
        auditId: d.audit_id,
        checkpointId: d.checkpoint_id,
        srNo: d.sr_no,
        sectionName: d.section_name,
        subSectionName: d.sub_section_name,
        lineName: d.line_name,
        equipmentName: d.equipment_name,
        componentName: d.component_name,
        functionOfComponent: d.function_of_component,
        whatImpactIfThisPartGetsFail: d.what_impact_if_this_part_gets_fail,
        functionOfPart: d.function_of_part,
        partFailureType: d.part_failure_type,
        impactOfFailure: d.impact_of_failure,
        checkpointText: d.checkpoint_text,
        standardParameter: d.standard_parameter,
        actualValue: d.actual_value,
        status: d.status,
        observationNotes: d.observation_notes,
        recommendedAction: d.recommended_action,
        photoUrl: d.photo_url,
        isCritical: d.is_critical,
        auditor: d.auditor,
        timestamp: d.timestamp,
      }));

      StorageEngine.saveAuditResults(mapped);
      return mapped;
    } catch {
      return StorageEngine.getAuditResults();
    }
  }

  // ── 7. ACTIONS VIA SERVER PROXY ────────────────────────────────────────────
  public static async fetchActions(): Promise<ActionItem[]> {
    try {
      const res = await fetch('/api/db?action=fetchActions');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data || json.data.length === 0) {
        return StorageEngine.getActions();
      }

      const mapped: ActionItem[] = json.data.map((d: any) => ({
        actionId: d.action_id,
        auditId: d.audit_id,
        sectionId: d.section_id,
        sectionName: d.section_name,
        subSectionId: d.sub_section_id,
        subSectionName: d.sub_section_name,
        lineId: d.line_id,
        lineName: d.line_name,
        equipmentId: d.equipment_id,
        equipmentName: d.equipment_name,
        componentName: d.component_name,
        checkpointText: d.checkpoint_text,
        observation: d.observation,
        recommendedAction: d.recommended_action,
        responsiblePerson: d.responsible_person,
        responsibleDepartment: d.responsible_department,
        assignedEmail: d.assigned_email,
        ccPerson: d.cc_person,
        ccEmail: d.cc_email,
        targetDate: d.target_date,
        targetClosureDate: d.target_closure_date,
        priority: d.priority,
        status: d.status,
        rootCause: d.root_cause,
        correctiveAction: d.corrective_action,
        preventiveAction: d.preventive_action,
        closureRemark: d.closure_remark,
        closurePhotoUrl: d.closure_photo_url,
        closedDate: d.closed_date,
        closedBy: d.closed_by,
        createdAt: d.created_at,
      }));

      StorageEngine.saveActions(mapped);
      return mapped;
    } catch {
      return StorageEngine.getActions();
    }
  }

  public static async updateActionDetailed(
    actionId: string,
    updates: Partial<ActionItem>
  ): Promise<{ status: string; message: string }> {
    StorageEngine.updateActionDetailed(actionId, updates);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ACTION',
          payload: { actionId, updates },
        }),
      });
      const json = await res.json();
      return { status: json.success ? 'SUCCESS' : 'LOCAL_SAVED', message: 'Action details updated' };
    } catch (err: any) {
      return { status: 'LOCAL_SAVED', message: 'Saved locally' };
    }
  }

  public static async updateActionStatus(
    actionId: string,
    status: string,
    closureRemark?: string,
    closurePhotoUrl?: string
  ): Promise<{ status: string; message: string }> {
    return this.updateActionDetailed(actionId, {
      status: status as any,
      closureRemark,
      closurePhotoUrl,
      closedDate: status === 'Closed' ? new Date().toISOString().substring(0, 10) : undefined,
    });
  }

  // ── 8. FULL SYSTEM SYNC VIA 1-CALL SERVER PROXY ────────────────────────────
  public static async syncAllFromCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/db?action=syncAll');
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Sync failed');
      }

      const { checkpoints, employees, fprMatrix, audits, auditResults, actions, plantStructure } = json.data;

      if (plantStructure) {
        if (plantStructure.sections && plantStructure.sections.length > 0) StorageEngine.saveSections(plantStructure.sections);
        if (plantStructure.subSections && plantStructure.subSections.length > 0) StorageEngine.saveSubSections(plantStructure.subSections);
        if (plantStructure.lines && plantStructure.lines.length > 0) StorageEngine.saveLines(plantStructure.lines);
        if (plantStructure.equipment && plantStructure.equipment.length > 0) StorageEngine.saveEquipment(plantStructure.equipment);
      }

      if (checkpoints && checkpoints.length > 0) {
        const mappedCk: Checkpoint[] = checkpoints.map((d: any) => ({
          id: d.id,
          srNo: d.sr_no,
          sectionId: d.section_id,
          sectionName: d.section_name,
          subSectionId: d.sub_section_id,
          subSectionName: d.sub_section_name,
          lineId: d.line_id,
          lineName: d.line_name,
          equipmentId: d.equipment_id,
          equipmentName: d.equipment_name,
          componentId: d.component_id,
          componentName: d.component_name,
          componentReferencePhotoUrl: d.component_reference_photo_url,
          functionOfComponent: d.function_of_component,
          whatImpactIfThisPartGetsFail: d.what_impact_if_this_part_gets_fail,
          functionOfPart: d.function_of_part,
          partFailureType: d.part_failure_type,
          impactOfFailure: d.impact_of_failure,
          recommendedAction: d.recommended_action,
          checkpointText: d.checkpoint_text,
          standardParameter: d.standard_parameter,
          parameterType: d.parameter_type || 'OK_NG',
          minimum: d.minimum,
          maximum: d.maximum,
          unit: d.unit,
          applicableLines: d.applicable_lines || ['ALL'],
          criticality: d.criticality || 'Medium',
          isCritical: d.is_critical || d.criticality === 'Critical',
          active: d.active !== false,
        }));
        StorageEngine.saveCheckpoints(mappedCk);
      }

      if (employees && employees.length > 0) {
        const mappedEmp: Employee[] = employees.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          department: d.department,
          role: d.role,
          password: '',
          status: d.status || 'Approved',
          emailParticipation: d.email_participation || 'NONE',
          sectionScope: d.section_scope || 'ALL',
          triggerOn: d.trigger_on || 'ANY_NG',
          active: d.active !== false,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        StorageEngine.saveEmployees(mappedEmp);
      }

      if (fprMatrix && fprMatrix.length > 0) {
        const mappedFpr: FprEntry[] = fprMatrix.map((d: any) => ({
          id: d.id,
          department: d.department,
          sectionId: d.section_id,
          lineId: d.line_id,
          fprName: d.fpr_name,
          fprEmail: d.fpr_email,
          hodName: d.hod_name,
          hodEmail: d.hod_email,
          active: d.active !== false,
          updatedAt: d.updated_at,
        }));
        StorageEngine.saveFprMatrix(mappedFpr);
      }

      if (audits && audits.length > 0) {
        const mappedAud: AuditHeader[] = audits.map((d: any) => ({
          auditId: d.audit_id,
          date: d.date,
          time: d.time,
          sectionId: d.section_id,
          sectionName: d.section_name,
          subSectionId: d.sub_section_id,
          subSectionName: d.sub_section_name,
          lineId: d.line_id,
          lineName: d.line_name,
          equipmentId: d.equipment_id,
          equipmentName: d.equipment_name,
          auditorId: d.auditor_id,
          auditorName: d.auditor_name,
          totalCheckpoints: d.total_checkpoints,
          okCount: d.ok_count,
          ngCount: d.ng_count,
          obsCount: d.obs_count,
          naCount: d.na_count,
          compliancePercent: Number(d.compliance_percent),
          overallStatus: d.overall_status,
          syncStatus: 'SYNCED',
          isDraft: d.is_draft,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        StorageEngine.saveAudits(mappedAud);
      }

      if (auditResults && auditResults.length > 0) {
        const mappedRes: AuditResult[] = auditResults.map((d: any) => ({
          id: d.id,
          auditId: d.audit_id,
          checkpointId: d.checkpoint_id,
          srNo: d.sr_no,
          sectionName: d.section_name,
          subSectionName: d.sub_section_name,
          lineName: d.line_name,
          equipmentName: d.equipment_name,
          componentName: d.component_name,
          functionOfComponent: d.function_of_component,
          whatImpactIfThisPartGetsFail: d.what_impact_if_this_part_gets_fail,
          functionOfPart: d.function_of_part,
          partFailureType: d.part_failure_type,
          impactOfFailure: d.impact_of_failure,
          checkpointText: d.checkpoint_text,
          standardParameter: d.standard_parameter,
          actualValue: d.actual_value,
          status: d.status,
          observationNotes: d.observation_notes,
          recommendedAction: d.recommended_action,
          photoUrl: d.photo_url,
          isCritical: d.is_critical,
          auditor: d.auditor,
          timestamp: d.timestamp,
        }));
        StorageEngine.saveAuditResults(mappedRes);
      }

      if (actions && actions.length > 0) {
        const mappedAct: ActionItem[] = actions.map((d: any) => ({
          actionId: d.action_id,
          auditId: d.audit_id,
          sectionId: d.section_id,
          sectionName: d.section_name,
          subSectionId: d.sub_section_id,
          subSectionName: d.sub_section_name,
          lineId: d.line_id,
          lineName: d.line_name,
          equipmentId: d.equipment_id,
          equipmentName: d.equipment_name,
          componentName: d.component_name,
          checkpointText: d.checkpoint_text,
          observation: d.observation,
          recommendedAction: d.recommended_action,
          responsiblePerson: d.responsible_person,
          responsibleDepartment: d.responsible_department,
          assignedEmail: d.assigned_email,
          ccPerson: d.cc_person,
          ccEmail: d.cc_email,
          targetDate: d.target_date,
          targetClosureDate: d.target_closure_date,
          priority: d.priority,
          status: d.status,
          rootCause: d.root_cause,
          correctiveAction: d.corrective_action,
          preventiveAction: d.preventive_action,
          closureRemark: d.closure_remark,
          closurePhotoUrl: d.closure_photo_url,
          closedDate: d.closed_date,
          closedBy: d.closed_by,
          createdAt: d.created_at,
        }));
        StorageEngine.saveActions(mappedAct);
      }

      const msg = `Synced via Server Proxy: ${checkpoints?.length || 0} points, ${fprMatrix?.length || 0} FPR rules, ${audits?.length || 0} audits`;
      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('[Server Proxy Global Sync Notice]:', err);
      return { success: false, message: err?.message || 'Sync notice' };
    }
  }

  // ── 9. PLANT STRUCTURE VIA SERVER PROXY ────────────────────────────────────
  public static async fetchPlantStructure(): Promise<{
    sections: Section[];
    subSections: SubSection[];
    lines: Line[];
    equipment: Equipment[];
  }> {
    try {
      const res = await fetch('/api/db?action=fetchPlantStructure');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const { sections, subSections, lines, equipment } = json.data;
        if (sections && sections.length > 0) StorageEngine.saveSections(sections);
        if (subSections && subSections.length > 0) StorageEngine.saveSubSections(subSections);
        if (lines && lines.length > 0) StorageEngine.saveLines(lines);
        if (equipment && equipment.length > 0) StorageEngine.saveEquipment(equipment);
        return {
          sections: sections || StorageEngine.getSections(),
          subSections: subSections || StorageEngine.getSubSections(),
          lines: lines || StorageEngine.getLines(),
          equipment: equipment || StorageEngine.getEquipment(),
        };
      }
    } catch (err) {
      console.warn('[Server Proxy Fetch Plant Structure Notice]:', err);
    }
    return {
      sections: StorageEngine.getSections(),
      subSections: StorageEngine.getSubSections(),
      lines: StorageEngine.getLines(),
      equipment: StorageEngine.getEquipment(),
    };
  }

  public static async savePlantStructure(structure: {
    sections: Section[];
    subSections: SubSection[];
    lines: Line[];
    equipment: Equipment[];
  }): Promise<boolean> {
    StorageEngine.saveSections(structure.sections);
    StorageEngine.saveSubSections(structure.subSections);
    StorageEngine.saveLines(structure.lines);
    StorageEngine.saveEquipment(structure.equipment);

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_PLANT_STRUCTURE',
          payload: structure,
        }),
      });
      const json = await res.json();
      return Boolean(json.success);
    } catch (err) {
      console.warn('[Server Proxy Save Plant Structure Notice]:', err);
      return false;
    }
  }
}
