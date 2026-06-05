const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Querying business profiles...');
  const { data: profiles, error: pErr } = await supabase.from('business_profiles').select('id, name');
  if (pErr) console.error('Profiles error:', pErr.message);
  else console.log('Business profiles:', profiles);

  console.log('Querying plot_sales...');
  const { data: sales, error: sErr } = await supabase.from('plot_sales').select('id, business_id, total_sale_amount, remaining_amount, is_cancelled');
  if (sErr) console.error('Sales error:', sErr.message);
  else console.log('Active sales count:', sales?.length, 'Data:', sales);

  console.log('Querying emi_schedule...');
  const { data: emis, error: eErr } = await supabase.from('emi_schedule').select('id, sale_id, due_date, status, remaining_amount').limit(10);
  if (eErr) console.error('EMIs error:', eErr.message);
  else console.log('Sample EMIs:', emis);
}

check();
