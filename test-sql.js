const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Querying counts...');
  const { data: d1, error: e1 } = await supabase.rpc('run_sql', { 
    sql_query: "SELECT (SELECT COUNT(*) FROM public.plot_sales) as sales_count, (SELECT COUNT(*) FROM public.emi_schedule) as emis_count, (SELECT COUNT(*) FROM public.payments) as payments_count;" 
  });
  
  if (e1) {
    fs.writeFileSync('counts.txt', 'Error: ' + e1.message);
  } else {
    fs.writeFileSync('counts.txt', JSON.stringify(d1));
  }
}

main();
