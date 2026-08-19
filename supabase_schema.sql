-- ==============================================================================
-- BOROSIL RENEWABLES LTD. - PLANT ENGINEERING AUDIT PORTAL
-- Complete Supabase PostgreSQL Schema & Storage Setup
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PLANT STRUCTURE TABLES
-- ------------------------------------------------------------------------------

-- Sections (e.g. Grinding, Robot, Washing, Tempering)
CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-Sections
CREATE TABLE IF NOT EXISTS public.sub_sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    section_id TEXT REFERENCES public.sections(id) ON DELETE CASCADE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lines (e.g. BL#1, BL#2, TL-4)
CREATE TABLE IF NOT EXISTS public.lines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    section_id TEXT REFERENCES public.sections(id) ON DELETE CASCADE,
    sub_section_id TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Units
CREATE TABLE IF NOT EXISTS public.equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    section_id TEXT,
    sub_section_id TEXT,
    line_id TEXT,
    equipment_type TEXT,
    manufacturer TEXT,
    model TEXT,
    photo_url TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Components
CREATE TABLE IF NOT EXISTS public.components (
    id TEXT PRIMARY KEY,
    section_id TEXT,
    sub_section_id TEXT,
    line_id TEXT,
    equipment_id TEXT,
    name TEXT NOT NULL,
    reference_photo_url TEXT,
    function_of_component TEXT,
    what_impact_if_this_part_gets_fail TEXT,
    function_of_part TEXT,
    part_failure_type TEXT,
    impact_of_failure TEXT,
    checkpoint_text TEXT,
    standard_parameter TEXT,
    recommended_action TEXT,
    sequence INTEGER,
    is_critical BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. CHECKPOINT MASTER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id TEXT PRIMARY KEY,
    sr_no INTEGER,
    section_id TEXT,
    section_name TEXT,
    sub_section_id TEXT,
    sub_section_name TEXT,
    line_id TEXT,
    line_name TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    component_id TEXT,
    component_name TEXT,
    component_reference_photo_url TEXT,
    function_of_component TEXT,
    what_impact_if_this_part_gets_fail TEXT,
    function_of_part TEXT,
    part_failure_type TEXT,
    impact_of_failure TEXT,
    recommended_action TEXT,
    checkpoint_text TEXT NOT NULL,
    standard_parameter TEXT,
    parameter_type TEXT DEFAULT 'OK_NG',
    minimum NUMERIC,
    maximum NUMERIC,
    unit TEXT,
    applicable_lines TEXT[] DEFAULT ARRAY['ALL']::TEXT[],
    criticality TEXT DEFAULT 'Medium',
    is_critical BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. EMPLOYEES & USER ROLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'Auditor',
    department TEXT DEFAULT 'Maintenance',
    status TEXT DEFAULT 'Approved',
    email_participation TEXT DEFAULT 'TO',
    section_scope TEXT DEFAULT 'ALL',
    trigger_on TEXT DEFAULT 'ANY_NG',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by TEXT,
    requested_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Admin
INSERT INTO public.employees (id, name, email, password, role, department, status, email_participation, section_scope, active)
VALUES ('EMP-ADMIN-01', 'Mehul Chikhaliya', 'mehul.chikhaliya@borosil.com', 'mehul@1473', 'Admin', 'Process QA', 'Approved', 'TO', 'ALL', true)
ON CONFLICT (email) DO UPDATE SET password = 'mehul@1473', role = 'Admin', status = 'Approved';

-- ------------------------------------------------------------------------------
-- 4. FPR RESPONSIBILITY MATRIX
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fpr_matrix (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    section_id TEXT DEFAULT 'ALL',
    line_id TEXT DEFAULT 'ALL',
    fpr_name TEXT NOT NULL,
    fpr_email TEXT NOT NULL,
    hod_name TEXT,
    hod_email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. AUDIT HEADERS & EVALUATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audits (
    audit_id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    section_id TEXT,
    section_name TEXT,
    sub_section_id TEXT,
    sub_section_name TEXT,
    line_id TEXT,
    line_name TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    auditor_id TEXT,
    auditor_name TEXT NOT NULL,
    total_checkpoints INTEGER DEFAULT 0,
    ok_count INTEGER DEFAULT 0,
    ng_count INTEGER DEFAULT 0,
    obs_count INTEGER DEFAULT 0,
    na_count INTEGER DEFAULT 0,
    compliance_percent NUMERIC(5,2) DEFAULT 100.00,
    overall_status TEXT DEFAULT 'PASS',
    sync_status TEXT DEFAULT 'SYNCED',
    is_draft BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_results (
    id TEXT PRIMARY KEY,
    audit_id TEXT REFERENCES public.audits(audit_id) ON DELETE CASCADE,
    checkpoint_id TEXT,
    sr_no INTEGER,
    section_name TEXT,
    sub_section_name TEXT,
    line_name TEXT,
    equipment_name TEXT,
    component_name TEXT,
    function_of_component TEXT,
    what_impact_if_this_part_gets_fail TEXT,
    function_of_part TEXT,
    part_failure_type TEXT,
    impact_of_failure TEXT,
    checkpoint_text TEXT,
    standard_parameter TEXT,
    actual_value TEXT,
    status TEXT NOT NULL,
    observation_notes TEXT,
    recommended_action TEXT,
    photo_url TEXT,
    is_critical BOOLEAN DEFAULT false,
    auditor TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. ACTION ITEMS TRACKER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.action_items (
    action_id TEXT PRIMARY KEY,
    audit_id TEXT REFERENCES public.audits(audit_id) ON DELETE CASCADE,
    section_id TEXT,
    section_name TEXT,
    sub_section_id TEXT,
    sub_section_name TEXT,
    line_id TEXT,
    line_name TEXT,
    equipment_id TEXT,
    equipment_name TEXT,
    component_name TEXT,
    checkpoint_text TEXT,
    observation TEXT,
    recommended_action TEXT,
    responsible_person TEXT,
    responsible_department TEXT,
    assigned_email TEXT,
    cc_person TEXT,
    cc_email TEXT,
    target_date DATE,
    priority TEXT DEFAULT 'High',
    status TEXT DEFAULT 'Open',
    closure_remark TEXT,
    closure_photo_url TEXT,
    closed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKET FOR AUDIT PHOTOS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-photos', 'audit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies (Allow public uploads & public reads)
CREATE POLICY "Public Read Access for Audit Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-photos');

CREATE POLICY "Public Upload Access for Audit Photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audit-photos');

CREATE POLICY "Public Update Access for Audit Photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audit-photos');

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpr_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Allow full access with anon key for frictionless portal usage
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "anon_full_access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "authenticated_full_access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkpoints_section ON public.checkpoints(section_id, active);
CREATE INDEX IF NOT EXISTS idx_audits_date ON public.audits(date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_results_audit_id ON public.audit_results(audit_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON public.action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_audit_id ON public.action_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_fpr_dept ON public.fpr_matrix(department, active);
