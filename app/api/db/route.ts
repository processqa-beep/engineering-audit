import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client on Node.js server (Runs outside corporate firewall on Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nywznyvvqhiiktvoskkv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_wEYpcobIlO1eWIjA7cRdFQ_SkMrwmpZ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ── PLANT STRUCTURE HELPERS ────────────────────────────────────────────────
async function getPlantStructureFromSupabase(checkpointsData?: any[]) {
  // 1. Try fetching from plant_structure table (JSON storage)
  try {
    const { data: psData, error: psErr } = await supabase.from('plant_structure').select('*').limit(1);
    if (!psErr && psData && psData.length > 0 && psData[0].data) {
      const parsed = typeof psData[0].data === 'string' ? JSON.parse(psData[0].data) : psData[0].data;
      if (parsed && (parsed.sections || parsed.lines)) {
        return parsed;
      }
    }
  } catch (_) {}

  // 2. Try fetching from individual tables (sections, sub_sections, lines, equipment)
  try {
    const [secRes, subRes, lineRes, eqRes] = await Promise.allSettled([
      supabase.from('sections').select('*').eq('active', true),
      supabase.from('sub_sections').select('*').eq('active', true),
      supabase.from('lines').select('*').eq('active', true),
      supabase.from('equipment').select('*').eq('active', true),
    ]);

    const s = secRes.status === 'fulfilled' && secRes.value.data ? secRes.value.data : [];
    const ss = subRes.status === 'fulfilled' && subRes.value.data ? subRes.value.data : [];
    const l = lineRes.status === 'fulfilled' && lineRes.value.data ? lineRes.value.data : [];
    const eq = eqRes.status === 'fulfilled' && eqRes.value.data ? eqRes.value.data : [];

    if (s.length > 0 || l.length > 0) {
      return {
        sections: s.map((x: any) => ({ id: x.id, name: x.name, description: x.description || '', active: x.active !== false })),
        subSections: ss.map((x: any) => ({ id: x.id, name: x.name, sectionId: x.section_id || x.sectionId, description: x.description || '', active: x.active !== false })),
        lines: l.map((x: any) => ({ id: x.id, name: x.name, sectionId: x.section_id || x.sectionId, subSectionId: x.sub_section_id || x.subSectionId, description: x.description || '', active: x.active !== false })),
        equipment: eq.map((x: any) => ({ id: x.id, name: x.name, sectionId: x.section_id || x.sectionId, lineId: x.line_id || x.lineId, active: x.active !== false })),
      };
    }
  } catch (_) {}

  // 3. Fallback: extract distinct hierarchy from checkpoints data
  const ckList = checkpointsData || [];
  if (ckList.length > 0) {
    const secMap = new Map<string, any>();
    const subMap = new Map<string, any>();
    const lineMap = new Map<string, any>();
    const eqMap = new Map<string, any>();

    ckList.forEach((c: any) => {
      const secId = c.section_id || c.sectionId;
      const secName = c.section_name || c.sectionName || secId;
      if (secId && !secMap.has(secId)) {
        secMap.set(secId, { id: secId, name: secName, description: '', active: true });
      }

      const subId = c.sub_section_id || c.subSectionId;
      const subName = c.sub_section_name || c.subSectionName || subId;
      if (subId && secId && !subMap.has(subId)) {
        subMap.set(subId, { id: subId, name: subName, sectionId: secId, description: '', active: true });
      }

      const lId = c.line_id || c.lineId;
      const lName = c.line_name || c.lineName || lId;
      if (lId && secId && lId.toUpperCase() !== 'ALL' && !lineMap.has(lId)) {
        lineMap.set(lId, { id: lId, name: lName, sectionId: secId, subSectionId: subId, description: '', active: true });
      }

      const eqId = c.equipment_id || c.equipmentId;
      const eqName = c.equipment_name || c.equipmentName || eqId;
      if (eqId && secId && !eqMap.has(eqId)) {
        eqMap.set(eqId, { id: eqId, name: eqName, sectionId: secId, lineId: lId, active: true });
      }
    });

    if (secMap.size > 0 || lineMap.size > 0) {
      return {
        sections: Array.from(secMap.values()),
        subSections: Array.from(subMap.values()),
        lines: Array.from(lineMap.values()),
        equipment: Array.from(eqMap.values()),
      };
    }
  }

  return null;
}

// ── GET HANDLER (Queries) ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. PING / TEST
    if (action === 'ping') {
      const { data, error } = await supabase.from('employees').select('id').limit(1);
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Connected to Supabase via Server Proxy ✓' });
    }

    // 2. FULL SYNC (Checkpoints, Employees, FPR Matrix, Audits, Results, Actions, Plant Structure)
    if (action === 'syncAll') {
      const [ckRes, empRes, fprRes, audRes, resRes, actRes] = await Promise.allSettled([
        supabase.from('checkpoints').select('*').eq('active', true).order('sr_no', { ascending: true }),
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        supabase.from('fpr_matrix').select('*').eq('active', true),
        supabase.from('audits').select('*').order('date', { ascending: false }),
        supabase.from('audit_results').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('action_items').select('*').order('created_at', { ascending: false }),
      ]);

      const checkpoints = ckRes.status === 'fulfilled' && ckRes.value.data ? ckRes.value.data : [];
      const employees = empRes.status === 'fulfilled' && empRes.value.data ? empRes.value.data : [];
      const fprMatrix = fprRes.status === 'fulfilled' && fprRes.value.data ? fprRes.value.data : [];
      const audits = audRes.status === 'fulfilled' && audRes.value.data ? audRes.value.data : [];
      const auditResults = resRes.status === 'fulfilled' && resRes.value.data ? resRes.value.data : [];
      const actions = actRes.status === 'fulfilled' && actRes.value.data ? actRes.value.data : [];

      const plantStructure = await getPlantStructureFromSupabase(checkpoints);

      return NextResponse.json({
        success: true,
        data: {
          checkpoints,
          employees,
          fprMatrix,
          audits,
          auditResults,
          actions,
          plantStructure,
        },
      });
    }

    // 2.5 FETCH PLANT STRUCTURE
    if (action === 'fetchPlantStructure') {
      const { data: ckData } = await supabase.from('checkpoints').select('*').eq('active', true);
      const plantStructure = await getPlantStructureFromSupabase(ckData || []);
      return NextResponse.json({ success: true, data: plantStructure });
    }

    // 3. FETCH CHECKPOINTS
    if (action === 'fetchCheckpoints') {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('active', true)
        .order('sr_no', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 4. FETCH EMPLOYEES
    if (action === 'fetchEmployees') {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 5. FETCH FPR MATRIX
    if (action === 'fetchFprMatrix') {
      try {
        const { data, error } = await supabase
          .from('fpr_matrix')
          .select('*')
          .eq('active', true);
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, data });
        }
      } catch (e) {}

      // Fallback from JSON backup in plant_structure
      try {
        const { data } = await supabase
          .from('plant_structure')
          .select('data')
          .eq('id', 'fpr_matrix_backup')
          .maybeSingle();
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const mapped = data.data.map((f: any) => ({
            id: f.id,
            department: f.department,
            section_id: f.sectionId || f.section_id,
            line_id: f.lineId || f.line_id,
            fpr_name: f.fprName || f.fpr_name,
            fpr_email: f.fprEmail || f.fpr_email,
            hod_name: f.hodName || f.hod_name,
            hod_email: f.hodEmail || f.hod_email,
            active: f.active !== false,
            updated_at: f.updatedAt || f.updated_at,
          }));
          return NextResponse.json({ success: true, data: mapped });
        }
      } catch (e) {}

      return NextResponse.json({ success: true, data: [] });
    }

    // 6. FETCH AUDITS
    if (action === 'fetchAudits') {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 7. FETCH AUDIT RESULTS
    if (action === 'fetchAuditResults') {
      const auditId = searchParams.get('auditId');
      let query = supabase.from('audit_results').select('*').order('timestamp', { ascending: false });
      if (auditId) query = query.eq('audit_id', auditId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 8. FETCH ACTIONS
    if (action === 'fetchActions') {
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/db GET Error]:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

// ── POST HANDLER (Mutations & Submissions) ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // 1. SUBMIT AUDIT & UPLOAD PHOTOS
    if (action === 'SUBMIT_AUDIT') {
      const { header, results, actions } = payload;

      // Upload base64 photos to Supabase Storage on the server
      const resultsWithUploadedPhotos = await Promise.all(
        (results || []).map(async (r: any) => {
          if (r.photoUrl && r.photoUrl.startsWith('data:image')) {
            try {
              const parts = r.photoUrl.split(';base64,');
              const contentType = parts[0].split(':')[1] || 'image/jpeg';
              const buffer = Buffer.from(parts[1], 'base64');
              const fileName = `${header.auditId.replace(/[^a-zA-Z0-9_-]/g, '_')}_sr${r.srNo}_${Date.now()}.jpg`;
              const filePath = `audits/${fileName}`;

              const { error: uploadErr } = await supabase.storage
                .from('audit-photos')
                .upload(filePath, buffer, {
                  contentType,
                  upsert: true,
                });

              if (!uploadErr) {
                const { data: urlData } = supabase.storage
                  .from('audit-photos')
                  .getPublicUrl(filePath);
                if (urlData?.publicUrl) {
                  return { ...r, photoUrl: urlData.publicUrl };
                }
              }
            } catch (pErr) {
              console.warn('[Server Photo Upload Error]:', pErr);
            }
          }
          return r;
        })
      );

      // Insert Audit Header
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

      // Insert Audit Results
      if (resultsWithUploadedPhotos.length > 0) {
        const rows = resultsWithUploadedPhotos.map((r: any) => ({
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

      // Insert Action Items
      if (actions && actions.length > 0) {
        const actionRows = actions.map((a: any) => ({
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

      return NextResponse.json({
        success: true,
        message: '✅ Audit & Photos Saved via Vercel Server Proxy!',
      });
    }

    // 2. SAVE CHECKPOINTS
    if (action === 'SAVE_CHECKPOINTS') {
      const checkpoints = payload;
      const rows = checkpoints.map((c: any) => ({
        id: c.id,
        sr_no: c.srNo,
        section_id: c.sectionId,
        section_name: c.sectionName,
        sub_section_id: c.subSectionId,
        sub_section_name: c.subSectionName,
        line_id: c.lineId,
        line_name: c.lineName,
        equipment_id: c.equipmentId,
        equipment_name: c.equipmentName,
        component_id: c.componentId,
        component_name: c.componentName,
        component_reference_photo_url: c.componentReferencePhotoUrl,
        function_of_component: c.functionOfComponent,
        what_impact_if_this_part_gets_fail: c.whatImpactIfThisPartGetsFail,
        function_of_part: c.functionOfPart,
        part_failure_type: c.partFailureType,
        impact_of_failure: c.impactOfFailure,
        recommended_action: c.recommendedAction,
        checkpoint_text: c.checkpointText,
        standard_parameter: c.standardParameter,
        parameter_type: c.parameterType,
        minimum: c.minimum,
        maximum: c.maximum,
        unit: c.unit,
        applicable_lines: c.applicableLines,
        criticality: c.criticality,
        is_critical: c.isCritical || c.criticality === 'Critical',
        active: c.active !== false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('checkpoints').upsert(rows);
      if (error) throw error;
      return NextResponse.json({ success: true, count: rows.length });
    }

    // 3. SAVE FPR MATRIX
    if (action === 'SAVE_FPR_MATRIX') {
      const matrix = payload;
      const rows = matrix.map((f: any) => ({
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

      try {
        await supabase.from('fpr_matrix').upsert(rows);
      } catch (err) {
        console.warn('[Supabase fpr_matrix table save notice]:', err);
      }

      // JSON backup in plant_structure
      try {
        await supabase.from('plant_structure').upsert({
          id: 'fpr_matrix_backup',
          data: matrix,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Supabase fpr_matrix backup notice]:', err);
      }

      return NextResponse.json({ success: true, count: rows.length });
    }

    // 4. SAVE EMPLOYEES
    if (action === 'SAVE_EMPLOYEES') {
      const employees = payload;
      const rows = employees.map((e: any) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        department: e.department,
        role: e.role,
        status: e.status || 'Approved',
        email_participation: e.emailParticipation || 'NONE',
        section_scope: e.sectionScope || 'ALL',
        trigger_on: e.triggerOn || 'ANY_NG',
        active: e.active !== false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('employees').upsert(rows);
      if (error) throw error;
      return NextResponse.json({ success: true, count: rows.length });
    }

    // 5. UPDATE ACTION ITEM
    if (action === 'UPDATE_ACTION') {
      const { actionId, updates } = payload;
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status) updateData.status = updates.status;
      if (updates.rootCause !== undefined) updateData.root_cause = updates.rootCause;
      if (updates.correctiveAction !== undefined) updateData.corrective_action = updates.correctiveAction;
      if (updates.preventiveAction !== undefined) updateData.preventive_action = updates.preventiveAction;
      if (updates.targetClosureDate !== undefined) updateData.target_closure_date = updates.targetClosureDate;
      if (updates.closureRemark !== undefined) updateData.closure_remark = updates.closureRemark;
      if (updates.closurePhotoUrl !== undefined) updateData.closure_photo_url = updates.closurePhotoUrl;
      if (updates.status === 'Closed') {
        updateData.closed_date = updates.closedDate || new Date().toISOString().substring(0, 10);
        if (updates.closedBy) updateData.closed_by = updates.closedBy;
      }

      const { error } = await supabase
        .from('action_items')
        .update(updateData)
        .eq('action_id', actionId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 6. REQUEST ACCESS
    if (action === 'REQUEST_ACCESS') {
      const { name, email, department, password } = payload;
      const cleanEmail = email.trim().toLowerCase();
      const id = `EMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const { error } = await supabase.from('employees').upsert({
        id,
        name: name.trim(),
        email: cleanEmail,
        department: department.trim() || 'General / Plant',
        role: 'Viewer',
        status: 'Pending',
        email_participation: 'NONE',
        section_scope: 'ALL',
        trigger_on: 'ANY_NG',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Access request submitted to database' });
    }

    // 7. APPROVE / REJECT USER
    if (action === 'APPROVE_USER') {
      const { id, role, department, emailParticipation, sectionScope } = payload;
      const { error } = await supabase
        .from('employees')
        .update({
          role,
          department,
          email_participation: emailParticipation || 'NONE',
          section_scope: sectionScope || 'ALL',
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 8. SAVE PLANT STRUCTURE
    if (action === 'SAVE_PLANT_STRUCTURE') {
      const { sections, subSections, lines, equipment } = payload;
      const now = new Date().toISOString();

      // 1. Try saving JSON structure to plant_structure table
      try {
        await supabase.from('plant_structure').upsert({
          id: 'current',
          data: { sections, subSections, lines, equipment },
          updated_at: now,
        });
      } catch (err) {
        console.warn('[Supabase save plant_structure json notice]:', err);
      }

      // 2. Try saving to individual tables if available
      try {
        if (sections && sections.length > 0) {
          const rows = sections.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description || '',
            active: s.active !== false,
            updated_at: now,
          }));
          await supabase.from('sections').upsert(rows);
        }
      } catch (_) {}

      try {
        if (subSections && subSections.length > 0) {
          const rows = subSections.map((ss: any) => ({
            id: ss.id,
            name: ss.name,
            section_id: ss.sectionId || ss.section_id,
            description: ss.description || '',
            active: ss.active !== false,
            updated_at: now,
          }));
          await supabase.from('sub_sections').upsert(rows);
        }
      } catch (_) {}

      try {
        if (lines && lines.length > 0) {
          const rows = lines.map((l: any) => ({
            id: l.id,
            name: l.name,
            section_id: l.sectionId || l.section_id,
            sub_section_id: l.subSectionId || l.sub_section_id,
            description: l.description || '',
            active: l.active !== false,
            updated_at: now,
          }));
          await supabase.from('lines').upsert(rows);
        }
      } catch (_) {}

      try {
        if (equipment && equipment.length > 0) {
          const rows = equipment.map((e: any) => ({
            id: e.id,
            name: e.name,
            section_id: e.sectionId || e.section_id,
            line_id: e.lineId || e.line_id,
            active: e.active !== false,
            updated_at: now,
          }));
          await supabase.from('equipment').upsert(rows);
        }
      } catch (_) {}

      return NextResponse.json({ success: true, message: 'Plant structure saved to cloud database' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/db POST Error]:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
