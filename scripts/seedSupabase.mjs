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
    name: 'Process QA Admin',
    email: 'process.qa@borosil.com',
    password: 'borosil@123',
    role: 'QA',
    department: 'Process QA',
    status: 'Approved',
    email_participation: 'TO',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-003',
    name: 'Purvesh Kapadiya',
    email: 'purvesh.kapadiya@borosil.com',
    password: 'borosil@123',
    role: 'HOD',
    department: 'Engineering',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-004',
    name: 'Chhayank Dave',
    email: 'chhayank.dave@borosil.com',
    password: 'borosil@123',
    role: 'Engineering',
    department: 'Engineering',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-005',
    name: 'Hiren Dodiya',
    email: 'hiren.dodiya@borosil.com',
    password: 'borosil@123',
    role: 'Engineering',
    department: 'Engineering',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
  {
    id: 'EMP-006',
    name: 'Kamal Verma',
    email: 'kamalmohit.verma@borosil.com',
    password: 'borosil@123',
    role: 'HOD',
    department: 'Production',
    status: 'Approved',
    email_participation: 'CC',
    section_scope: 'ALL',
    trigger_on: 'ANY_NG',
    active: true,
  },
];

// 5. FPR Matrix (Authentic Plant Matrix)
const fprMatrix = [
  {
    id: 'FPR-001',
    department: 'Maintenance',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'QA',
    fpr_email: 'process.qa@borosil.com',
    hod_name: 'Process QA',
    hod_email: 'process.qa@borosil.com, purvesh.kapadiya@borosil.com',
    active: true,
  },
  {
    id: 'FPR-002',
    department: 'Utilities',
    section_id: 'GR',
    line_id: 'ALL',
    fpr_name: 'Rajesh Patel',
    fpr_email: 'utility.gbl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hod_name: 'Kamal Verma',
    hod_email: 'rajesh.patel@borosil.com, kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, pavan.singh@borosil.com',
    active: true,
  },
  {
    id: 'FPR-003',
    department: 'Production',
    section_id: 'GR',
    line_id: 'ALL',
    fpr_name: 'Rajesh and Ravi',
    fpr_email: 'rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hod_name: 'Kamal Verma',
    hod_email: 'kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com',
    active: true,
  },
  {
    id: 'FPR-004',
    department: 'Electrical',
    section_id: 'GR',
    line_id: 'ALL',
    fpr_name: 'Ashutosh Patel',
    fpr_email: 'electrical.brl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hod_name: 'Kamal Verma',
    hod_email: 'ashutosh.patel@borosil.com, bhadresh.patel@borosil.com, kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, pavan.singh@borosil.com',
    active: true,
  },
  {
    id: 'FPR-005',
    department: 'Maintenance',
    section_id: 'GR',
    line_id: 'ALL',
    fpr_name: 'Sharvan Sahu',
    fpr_email: 'mechanical.brl@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hod_name: 'Kamal Verma',
    hod_email: 'kamalmohit.verma@borosil.com, process.qa@borosil.com, chhayank.dave@borosil.com, purvesh.kapadiya@borosil.com, jitu.patel@borosil.com, pavan.singh@borosil.com, shravan.sahu@borosil.com',
    active: true,
  },
  {
    id: 'FPR-006',
    department: 'Instrumentation',
    section_id: 'ALL',
    line_id: 'ALL',
    fpr_name: 'Sunil chodhary',
    fpr_email: 'sunil.chodhary@borosil.com, pardeep.rathee@borosil.com',
    hod_name: 'navin Singh',
    hod_email: 'navin.singh@borosil.com, sandip.patel@borosil.com, pavan.singh@borosil.com, chhayank.dave@borosil.com, kamalmohit.verma@borosil.com',
    active: true,
  },
  {
    id: 'FPR-007',
    department: 'Instrumentation',
    section_id: 'GR',
    line_id: 'ALL',
    fpr_name: 'Nilesh Parmar',
    fpr_email: 'nilesh.parmar@borosil.com, rajesh.thakur@borosil.com, ravi.srivastav@borosil.com',
    hod_name: 'Kamal Verma',
    hod_email: 'sandip.patel@borosil.com, pavan.singh@borosil.com, chhayank.dave@borosil.com, kamalmohit.verma@borosil.com, purvesh.kapadiya@borosil.com',
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
  // Clean up any old dummy employees from previous seeds
  await supabase.from('employees').delete().in('email', ['suresh.kumar@borosil.com', 'inst.lead@borosil.com', 'hiren.patel@borosil.com', 'ramesh.sharma@borosil.com']);
  const { error: empErr } = await supabase.from('employees').upsert(employees, { onConflict: 'email' });
  if (empErr) console.error('  ❌ Employees error:', empErr.message);
  else console.log(`  ✅ Employees seeded (${employees.length} rows)`);

  console.log('5. Pushing FPR Responsibility Matrix...');
  // Clean up any old dummy FPR matrix rows
  await supabase.from('fpr_matrix').delete().neq('id', 'NONE');
  const { error: fprErr } = await supabase.from('fpr_matrix').upsert(fprMatrix);
  if (fprErr) console.error('  ❌ FPR Matrix error:', fprErr.message);
  else console.log(`  ✅ FPR Matrix seeded (${fprMatrix.length} rows)`);

  // Also update backup in plant_structure
  try {
    await supabase.from('plant_structure').upsert({
      id: 'fpr_matrix_backup',
      data: fprMatrix,
      updated_at: new Date().toISOString(),
    });
    console.log('  ✅ FPR Matrix backup updated in plant_structure');
  } catch (err) {
    console.warn('  ⚠️ FPR Matrix backup notice:', err);
  }

  console.log('\n🎉 ALL INITIAL DATA SUCCESSFULLY PUSHED TO SUPABASE!');
}

seed().catch(console.error);
