import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nywznyvvqhiiktvoskkv.supabase.co';
const supabaseAnonKey = 'sb_publishable_wEYpcobIlO1eWIjA7cRdFQ_SkMrwmpZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanAndCheck() {
  console.log('1. Checking Supabase Database Tables...');

  // Check counts
  const { data: audits, error: audErr } = await supabase.from('audits').select('audit_id');
  const { data: actions, error: actErr } = await supabase.from('action_items').select('action_id');
  const { data: checkpoints, error: ckErr } = await supabase.from('checkpoints').select('id');
  const { data: employees, error: empErr } = await supabase.from('employees').select('id, email, name');

  console.log('Audits in DB:', audits?.length || 0);
  console.log('Actions in DB:', actions?.length || 0);
  console.log('Checkpoints in DB:', checkpoints?.length || 0);
  console.log('Employees in DB:', employees?.length || 0);

  // If there are any sample/demo audits, clean them
  if (audits && audits.length > 0) {
    const demoAuditIds = audits.filter(a => a.audit_id.startsWith('AUD-2026-081')).map(a => a.audit_id);
    if (demoAuditIds.length > 0) {
      console.log('Removing demo audits:', demoAuditIds);
      await supabase.from('audits').delete().in('audit_id', demoAuditIds);
    }
  }

  // If there are demo actions, clean them
  if (actions && actions.length > 0) {
    const demoActIds = actions.filter(a => a.action_id.startsWith('ACT-2026-00')).map(a => a.action_id);
    if (demoActIds.length > 0) {
      console.log('Removing demo actions:', demoActIds);
      await supabase.from('action_items').delete().in('action_id', demoActIds);
    }
  }

  console.log('✅ Supabase cleaned of all demo data.');
}

cleanAndCheck().catch(console.error);
