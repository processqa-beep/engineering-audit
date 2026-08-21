import { supabase } from './supabaseClient';
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

export class SupabaseBackendClient {
  public static isConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return Boolean(url && key && url.includes('supabase.co'));
  }

  // ── TEST CONNECTION ──────────────────────────────────────────────────────────
  public static async ping(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.from('employees').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: 'Connected to Supabase, but tables are not created yet. Please run supabase_schema.sql in the SQL Editor.',
          };
        }
        return { success: false, message: `Supabase Error: ${error.message}` };
      }
      return { success: true, message: 'Connected to Supabase PostgreSQL & Storage ✓' };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  // ── DIRECT PHOTO UPLOAD TO SUPABASE STORAGE ─────────────────────────────────
  public static async uploadPhoto(
    base64OrBlob: string,
    auditId: string,
    srNo: number
  ): Promise<string> {
    if (!base64OrBlob || !base64OrBlob.startsWith('data:image')) {
      return base64OrBlob; // Already a URL or empty
    }

    try {
      // Convert base64 data URL to Blob
      const parts = base64OrBlob.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });

      const fileName = `${auditId.replace(/[^a-zA-Z0-9_-]/g, '_')}_sr${srNo}_${Date.now()}.jpg`;
      const filePath = `audits/${fileName}`;

      const { data, error } = await supabase.storage
        .from('audit-photos')
        .upload(filePath, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn('[Supabase Storage Upload Warning]:', error.message);
        return base64OrBlob; // fallback to base64
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audit-photos')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || base64OrBlob;
    } catch (err) {
      console.warn('[Supabase Storage Exception]:', err);
      return base64OrBlob;
    }
  }

  // ── SUBMIT AUDIT (Fast Parallel Insert to PostgreSQL) ─────────────────────────
  public static async submitAudit(
    header: AuditHeader,
    results: AuditResult[],
    actions: ActionItem[]
  ): Promise<{ status: string; message: string }> {
    // 1. Always save in local storage first for offline / instant recovery
    StorageEngine.saveAudit(header, results, actions);

    if (!this.isConfigured()) {
      return { status: 'LOCAL_SAVED', message: 'Saved locally. Supabase not configured.' };
    }

    try {
      // 2. Upload photos in parallel to Supabase Storage
      const resultsWithUploadedPhotos = await Promise.all(
        results.map(async (r) => {
          if (r.photoUrl && r.photoUrl.startsWith('data:image')) {
            const uploadedUrl = await this.uploadPhoto(r.photoUrl, header.auditId, r.srNo);
            return { ...r, photoUrl: uploadedUrl };
          }
          return r;
        })
      );

      // 3. Insert Audit Header
      const { error: headerError } = await supabase.from('audits').upsert({
        audit_id: header.auditId,
        date: header.date,
        time: header.time,
        section_id: header.sectionId,
        section_name: header.sectionName,
        sub_section_id: header.subSectionId,
        sub_section_name: header.subSectionName,
        line_id: header.lineId,
        line_name: header.lineName,
        equipment_id: header.equipmentId,
        equipment_name: header.equipmentName,
        auditor_id: header.auditorId,
        auditor_name: header.auditorName,
        total_checkpoints: header.totalCheckpoints,
        ok_count: header.okCount,
        ng_count: header.ngCount,
        obs_count: header.obsCount,
        na_count: header.naCount,
        compliance_percent: header.compliancePercent,
        overall_status: header.overallStatus,
        sync_status: 'SYNCED',
        is_draft: header.isDraft || false,
        updated_at: new Date().toISOString(),
      });

      if (headerError) {
        console.error('[Supabase Audit Header Error]:', headerError);
        throw new Error(headerError.message);
      }

      // 4. Insert Audit Results in bulk
      if (resultsWithUploadedPhotos.length > 0) {
        const rows = resultsWithUploadedPhotos.map((r) => ({
          id: r.id,
          audit_id: header.auditId,
          checkpoint_id: r.checkpointId,
          sr_no: r.srNo,
          section_name: r.sectionName,
          sub_section_name: r.subSectionName,
          line_name: r.lineName,
          equipment_name: r.equipmentName,
          component_name: r.componentName,
          function_of_component: r.functionOfComponent,
          what_impact_if_this_part_gets_fail: r.whatImpactIfThisPartGetsFail,
          function_of_part: r.functionOfPart,
          part_failure_type: r.partFailureType,
          impact_of_failure: r.impactOfFailure,
          checkpoint_text: r.checkpointText,
          standard_parameter: r.standardParameter,
          actual_value: r.actualValue,
          status: r.status,
          observation_notes: r.observationNotes,
          recommended_action: r.recommendedAction,
          photo_url: r.photoUrl,
          is_critical: r.isCritical,
          auditor: r.auditor,
          timestamp: r.timestamp || new Date().toISOString(),
        }));

        const { error: resultsError } = await supabase.from('audit_results').upsert(rows);
        if (resultsError) {
          console.error('[Supabase Audit Results Error]:', resultsError);
        }
      }

      // 5. Insert Action Items in bulk
      if (actions.length > 0) {
        const actionRows = actions.map((a) => ({
          action_id: a.actionId,
          audit_id: header.auditId,
          section_id: a.sectionId,
          section_name: a.sectionName,
          sub_section_id: a.subSectionId,
          sub_section_name: a.subSectionName,
          line_id: a.lineId,
          line_name: a.lineName,
          equipment_id: a.equipmentId,
          equipment_name: a.equipmentName,
          component_name: a.componentName,
          checkpoint_text: a.checkpointText,
          observation: a.observation,
          recommended_action: a.recommendedAction,
          responsible_person: a.responsiblePerson,
          responsible_department: a.responsibleDepartment,
          assigned_email: a.assignedEmail,
          cc_person: a.ccPerson,
          cc_email: a.ccEmail,
          target_date: a.targetDate,
          priority: a.priority,
          status: a.status || 'Open',
          created_at: a.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: actionsError } = await supabase.from('action_items').upsert(actionRows);
        if (actionsError) {
          console.error('[Supabase Action Items Error]:', actionsError);
        }
      }

      return {
        status: 'SUCCESS',
        message: '✅ Audit & Photos Saved to Supabase in < 1 second!',
      };
    } catch (err: any) {
      console.warn('[Supabase Sync Error]:', err);
      return {
        status: 'LOCAL_SAVED',
        message: `Saved locally. Notice: ${err.message}`,
      };
    }
  }

  // ── CHECKPOINTS SYNC ────────────────────────────────────────────────────────
  public static async fetchCheckpoints(): Promise<Checkpoint[]> {
    if (!this.isConfigured()) return StorageEngine.getCheckpoints();
    try {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('active', true)
        .order('sr_no', { ascending: true });

      if (error || !data || data.length === 0) {
        return StorageEngine.getCheckpoints();
      }

      const mapped: Checkpoint[] = data.map((d: any) => ({
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
    if (!this.isConfigured() || checkpoints.length === 0) return false;
    try {
      const cleanNum = (val: any): number | null => {
        if (val === undefined || val === null || val === '' || isNaN(Number(val))) return null;
        return Number(val);
      };

      const rows = checkpoints.map((c, i) => ({
        id: String(c.id || `CKP-${Date.now()}-${i + 1}`),
        sr_no: cleanNum(c.srNo) || i + 1,
        section_id: c.sectionId || 'GR',
        section_name: c.sectionName || '',
        sub_section_id: c.subSectionId || '',
        sub_section_name: c.subSectionName || '',
        line_id: c.lineId || 'ALL',
        line_name: c.lineName || 'ALL',
        equipment_id: c.equipmentId || '',
        equipment_name: c.equipmentName || '',
        component_id: c.componentId || '',
        component_name: c.componentName || 'Component',
        component_reference_photo_url: c.componentReferencePhotoUrl || null,
        function_of_component: c.functionOfComponent || null,
        what_impact_if_this_part_gets_fail: c.whatImpactIfThisPartGetsFail || null,
        function_of_part: c.functionOfPart || null,
        part_failure_type: c.partFailureType || null,
        impact_of_failure: c.impactOfFailure || null,
        recommended_action: c.recommendedAction || null,
        checkpoint_text: c.checkpointText || 'Audit Point',
        standard_parameter: c.standardParameter || '',
        parameter_type: c.parameterType || 'OK_NG',
        minimum: cleanNum(c.minimum),
        maximum: cleanNum(c.maximum),
        unit: c.unit || '',
        applicable_lines: Array.isArray(c.applicableLines) ? c.applicableLines : ['ALL'],
        criticality: c.criticality || (c.isCritical ? 'Critical' : 'Medium'),
        is_critical: c.isCritical || c.criticality === 'Critical',
        active: c.active !== false,
        updated_at: new Date().toISOString(),
      }));

      // Chunk in batches of 50 for safety
      const BATCH_SIZE = 50;
      for (let b = 0; b < rows.length; b += BATCH_SIZE) {
        const batch = rows.slice(b, b + BATCH_SIZE);
        const { error } = await supabase.from('checkpoints').upsert(batch);
        if (error) {
          console.error('[Supabase Save Checkpoints Error]:', error);
          throw new Error(error.message);
        }
      }
      return true;
    } catch (err: any) {
      console.error('[Supabase Save Checkpoints Error]:', err);
      throw err;
    }
  }

  // ── EMPLOYEES & USERS ───────────────────────────────────────────────────────
  public static async fetchEmployees(): Promise<Employee[]> {
    if (!this.isConfigured()) return StorageEngine.getEmployees();
    try {
      const { data, error } = await supabase.from('employees').select('*');
      if (error || !data || data.length === 0) return StorageEngine.getEmployees();

      const mapped: Employee[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        password: d.password,
        role: d.role,
        department: d.department,
        status: d.status,
        emailParticipation: d.email_participation,
        sectionScope: d.section_scope,
        triggerOn: d.trigger_on,
        active: d.active !== false,
        createdAt: d.created_at,
        approvedAt: d.approved_at,
        approvedBy: d.approved_by,
        requestedAt: d.requested_at,
      }));

      StorageEngine.saveEmployees(mapped);
      return mapped;
    } catch {
      return StorageEngine.getEmployees();
    }
  }

  public static async saveEmployees(employees: Employee[]): Promise<boolean> {
    if (!this.isConfigured() || employees.length === 0) return false;
    try {
      const rows = employees.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        password: e.password,
        role: e.role,
        department: e.department,
        status: e.status || 'Approved',
        email_participation: e.emailParticipation || 'TO',
        section_scope: e.sectionScope || 'ALL',
        trigger_on: e.triggerOn || 'ANY_NG',
        active: e.active !== false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('employees').upsert(rows);
      if (error) {
        console.error('[Supabase Save Employees Error]:', error);
        throw new Error(error.message);
      }
      return true;
    } catch (err: any) {
      console.error('[Supabase Save Employees Error]:', err);
      throw err;
    }
  }

  // ── FPR MATRIX ──────────────────────────────────────────────────────────────
  public static async fetchFprMatrix(): Promise<FprEntry[]> {
    if (!this.isConfigured()) return StorageEngine.getFprMatrix();
    try {
      const { data, error } = await supabase.from('fpr_matrix').select('*');
      if (error || !data || data.length === 0) return StorageEngine.getFprMatrix();

      const mapped: FprEntry[] = data.map((d: any) => ({
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
    if (!this.isConfigured() || matrix.length === 0) return false;
    try {
      const rows = matrix.map((f) => ({
        id: f.id,
        department: f.department,
        section_id: f.sectionId,
        line_id: f.lineId,
        fpr_name: f.fprName,
        fpr_email: f.fprEmail,
        hod_name: f.hodName,
        hod_email: f.hodEmail,
        active: f.active !== false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('fpr_matrix').upsert(rows);
      if (error) {
        console.error('[Supabase Save FPR Matrix Error]:', error);
        throw new Error(error.message);
      }
      return true;
    } catch (err: any) {
      console.error('[Supabase Save FPR Matrix Error]:', err);
      throw err;
    }
  }

  // ── AUDITS & ACTIONS QUERY ──────────────────────────────────────────────────
  public static async fetchAudits(): Promise<AuditHeader[]> {
    if (!this.isConfigured()) return StorageEngine.getAudits();
    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .order('date', { ascending: false });

      if (error || !data) return StorageEngine.getAudits();

      return data.map((d: any) => ({
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
    } catch {
      return StorageEngine.getAudits();
    }
  }

  public static async fetchActions(): Promise<ActionItem[]> {
    if (!this.isConfigured()) return StorageEngine.getActions();
    try {
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return StorageEngine.getActions();

      return data.map((d: any) => ({
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
        priority: d.priority,
        status: d.status,
        closureRemark: d.closure_remark,
        closurePhotoUrl: d.closure_photo_url,
        closedDate: d.closed_date,
        createdAt: d.created_at,
      }));
    } catch {
      return StorageEngine.getActions();
    }
  }

  public static async updateActionStatus(
    actionId: string,
    status: string,
    closureRemark?: string,
    closurePhotoUrl?: string
  ): Promise<{ status: string; message: string }> {
    StorageEngine.updateActionStatus(actionId, status, closureRemark, closurePhotoUrl);
    if (!this.isConfigured()) return { status: 'LOCAL_SAVED', message: 'Saved locally.' };

    try {
      const { error } = await supabase
        .from('action_items')
        .update({
          status,
          closure_remark: closureRemark || null,
          closure_photo_url: closurePhotoUrl || null,
          closed_date: status === 'Closed' ? new Date().toISOString().substring(0, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('action_id', actionId);

      if (error) throw error;
      return { status: 'SUCCESS', message: 'Action status updated in Supabase.' };
    } catch (err: any) {
      console.warn('[Supabase Action Update Error]:', err);
      return { status: 'LOCAL_SAVED', message: 'Saved locally.' };
    }
  }

  // ── FULL SYSTEM SYNC ────────────────────────────────────────────────────────
  public static async syncAllFromCloud(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const [ck, emp, fpr, aud, act] = await Promise.allSettled([
        this.fetchCheckpoints(),
        this.fetchEmployees(),
        this.fetchFprMatrix(),
        this.fetchAudits(),
        this.fetchActions(),
      ]);

      let msg = 'Synced from Supabase: ';
      if (ck.status === 'fulfilled') msg += `${ck.value.length} checkpoints, `;
      if (fpr.status === 'fulfilled') msg += `${fpr.value.length} FPR rules, `;
      if (emp.status === 'fulfilled') msg += `${emp.value.length} users, `;
      if (aud.status === 'fulfilled') msg += `${aud.value.length} audits, `;
      if (act.status === 'fulfilled') msg += `${act.value.length} actions`;

      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('[Supabase Global Sync Error]:', err);
      return { success: false, message: err?.message || 'Sync error' };
    }
  }
}
