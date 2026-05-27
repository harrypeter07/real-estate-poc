const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Testing RPC run_sql...');
  const { data: d1, error: e1 } = await supabase.rpc('run_sql', { 
    sql_query: "ALTER TABLE plots ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'plot';" 
  });
  
  if (e1) {
    console.log('run_sql RPC failed or does not exist:', e1.message);
  } else {
    console.log('run_sql RPC executed successfully!', d1);
  }
}

main();
