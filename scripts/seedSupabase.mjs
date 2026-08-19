import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nywznyvvqhiiktvoskkv.supabase.co';
const supabaseAnonKey = 'sb_publishable_wEYpcobIlO1eWIjA7cRdFQ_SkMrwmpZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. Plant Sections
const sections = [
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

// 2. Sub-Sections
const subSections = [
  { id: 'GR-M1',  name: 'M1',  section_id: 'GR', description: 'Grinding Line M1',  active: true },
  { id: 'GR-M1A', name: 'M1A', section_id: 'GR', description: 'Grinding Line M1A', active: true },
  { id: 'GR-M2',  name: 'M2',  section_id: 'GR', description: 'Grinding Line M2',  active: true },
  { id: 'TP-FU',  name: 'Furnace',  section_id: 'TP', description: 'Tempering Furnace', active: true },
  { id: 'TP-QU',  name: 'Quench',   section_id: 'TP', description: 'Quench Section',    active: true },
  { id: 'TP-LH',  name: 'Lehr',     section_id: 'TP', description: 'Lehr',              active: true },
  { id: 'AL-LH',  name: 'Lehr',     section_id: 'AL', description: 'Annealing Lehr',    active: true },
  { id: 'CT-CM',  name: 'Cutting Machine', section_id: 'CT', description: 'Cutting Machine', active: true },
  { id: 'WS-WM',  name: 'Washing Machine', section_id: 'WS', description: 'Washing Unit',     active: true },
  { id: 'RO-RB',  name: 'Robot Cell',      section_id: 'RO', description: 'Automation Cell',  active: true },
  { id: 'FU-FN',  name: 'Furnace Main',    section_id: 'FU', description: 'Main Melting Furnace', active: true },
  { id: 'PK-PL',  name: 'Packing Line',    section_id: 'PK', description: 'Final Packing',    active: true },
  { id: 'UT-CMP', name: 'Compressor House',section_id: 'UT', description: 'Compressed Air',   active: true },
  { id: 'CV-CV',  name: 'Conveyor Lines',  section_id: 'CV', description: 'Roller Conveyors', active: true },
];

// 3. Lines
const lines = [
  { id: 'BL-1', name: 'BL#1', section_id: 'GR', sub_section_id: 'GR-M1', description: 'Borosil Line 1', active: true },
  { id: 'BL-2', name: 'BL#2', section_id: 'GR', sub_section_id: 'GR-M1A', description: 'Borosil Line 2', active: true },
  { id: 'BL-3', name: 'BL#3', section_id: 'GR', sub_section_id: 'GR-M2', description: 'Borosil Line 3', active: true },
  { id: 'BL-4', name: 'BL#4', section_id: 'TP', sub_section_id: 'TP-FU', description: 'Borosil Line 4', active: true },
  { id: 'BL-5', name: 'BL#5', section_id: 'TP', sub_section_id: 'TP-QU', description: 'Borosil Line 5', active: true },
  { id: 'BL-6', name: 'BL#6', section_id: 'CT', sub_section_id: 'CT-CM', description: 'Borosil Line 6', active: true },
  { id: 'BL-7', name: 'BL#7', section_id: 'WS', sub_section_id: 'WS-WM', description: 'Borosil Line 7', active: true },
  { id: 'BL-8', name: 'BL#8', section_id: 'RO', sub_section_id: 'RO-RB', description: 'Borosil Line 8', active: true },
  { id: 'BL-9', name: 'BL#9', section_id: 'FU', sub_section_id: 'FU-FN', description: 'Borosil Line 9', active: true },
  { id: 'BL-10', name: 'BL#10', section_id: 'PK', sub_section_id: 'PK-PL', description: 'Borosil Line 10', active: true },
  { id: 'BL-11', name: 'BL#11', section_id: 'UT', sub_section_id: 'UT-CMP', description: 'Borosil Line 11', active: true },
  { id: 'BL-12', name: 'BL#12', section_id: 'CV', sub_section_id: 'CV-CV', description: 'Borosil Line 12', active: true },
];

// 4. Employees & Users
const employees = [
  {
    id: 'EMP-001',
    name: 'Mehul Chikhaliya',
    email: 'mehul.chikhaliya@borosil.com',
    password: 'mehul@1473',
    role: 'Admin',
    department: 'Process QA',
    status: 'Approved',
    email_participation: 'TO',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-002',
    name: 'Hiren Patel',
    email: 'hiren.patel@borosil.com',
    password: 'borosil@123',
    role: 'Auditor',
    department: 'Maintenance',
    status: 'Approved',
    email_participation: 'TO',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-003',
    name: 'Ramesh Sharma',
    email: 'ramesh.sharma@borosil.com',
    password: 'borosil@123',
    role: 'Engineering',
    department: 'Electrical',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-004',
    name: 'Suresh Kumar',
    email: 'suresh.kumar@borosil.com',
    password: 'borosil@123',
    role: 'QA',
    department: 'Quality',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-005',
    name: 'Instrumentation Lead',
    email: 'inst.lead@borosil.com',
    password: 'borosil@123',
    role: 'Engineering',
    department: 'Instrumentation',
    status: 'Approved',
    email_participation: 'TO',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  }
];

// 5. FPR Matrix
const fprMatrix = [
  {
    id: 'FPR-001',
    department: 'Maintenance',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'Hiren Patel',
    fpr_email: 'hiren.patel@borosil.com',
    hod_name: 'Mehul Chikhaliya',
    hod_email: 'mehul.chikhaliya@borosil.com',
    active: true,
  },
  {
    id: 'FPR-002',
    department: 'Electrical',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'Ramesh Sharma',
    fpr_email: 'ramesh.sharma@borosil.com',
    hod_name: 'Mehul Chikhaliya',
    hod_email: 'mehul.chikhaliya@borosil.com',
    active: true,
  },
  {
    id: 'FPR-003',
    department: 'Instrumentation',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'Instrumentation Lead',
    fpr_email: 'inst.lead@borosil.com',
    hod_name: 'Mehul Chikhaliya',
    hod_email: 'mehul.chikhaliya@borosil.com',
    active: true,
  },
  {
    id: 'FPR-004',
    department: 'Quality',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'Suresh Kumar',
    fpr_email: 'suresh.kumar@borosil.com',
    hod_name: 'Mehul Chikhaliya',
    hod_email: 'mehul.chikhaliya@borosil.com',
    active: true,
  },
];

async function seed() {
  console.log('🚀 Connecting to Supabase at:', supabaseUrl);

  console.log('1. Pushing Sections...');
  const { error: secErr } = await supabase.from('sections').upsert(sections);
  if (secErr) console.error('  ❌ Sections error:', secErr.message);
  else console.log('  ✅ Sections seeded (10 rows)');

  console.log('2. Pushing Sub-Sections...');
  const { error: subErr } = await supabase.from('sub_sections').upsert(subSections);
  if (subErr) console.error('  ❌ Sub-Sections error:', subErr.message);
  else console.log('  ✅ Sub-Sections seeded (14 rows)');

  console.log('3. Pushing Lines...');
  const { error: lineErr } = await supabase.from('lines').upsert(lines);
  if (lineErr) console.error('  ❌ Lines error:', lineErr.message);
  else console.log('  ✅ Lines seeded (12 rows)');

  console.log('4. Pushing Employees & Admin Users...');
  const { error: empErr } = await supabase.from('employees').upsert(employees, { onConflict: 'email' });
  if (empErr) console.error('  ❌ Employees error:', empErr.message);
  else console.log('  ✅ Employees seeded (5 rows)');

  console.log('5. Pushing FPR Responsibility Matrix...');
  const { error: fprErr } = await supabase.from('fpr_matrix').upsert(fprMatrix);
  if (fprErr) console.error('  ❌ FPR Matrix error:', fprErr.message);
  else console.log('  ✅ FPR Matrix seeded (4 rows)');

  console.log('\n🎉 ALL INITIAL DATA SUCCESSFULLY PUSHED TO SUPABASE!');
}

seed().catch(console.error);
