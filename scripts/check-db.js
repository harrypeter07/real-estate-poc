const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Querying projects columns...');
  const { data: projCols, error: err1 } = await supabase.from('projects').select('*').limit(1);
  if (err1) {
    console.error('Projects table error:', err1.message);
  } else {
    console.log('Projects table keys:', Object.keys(projCols[0] || {}));
  }

  console.log('\nQuerying advisor_project_commissions columns...');
  const { data: commCols, error: err2 } = await supabase.from('advisor_project_commissions').select('*').limit(1);
  if (err2) {
    console.error('Advisor project commissions error:', err2.message);
  } else {
    console.log('Advisor project commissions keys:', Object.keys(commCols[0] || {}));
  }
}

main();
