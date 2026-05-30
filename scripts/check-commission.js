const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Running Verification...');
  console.log('Checking advisor_project_commissions for commission_rate...');
  
  const { data, error } = await supabase
    .from('advisor_project_commissions')
    .select('id, commission_rate')
    .limit(1);

  if (error) {
    console.error('\n❌ verification failed!');
    console.error('Error Details:', error.message);
    console.log('\nMake sure you run the SQL statements in the Supabase SQL editor first.');
  } else {
    console.log('\n✅ Verification successful!');
    console.log('The "commission_rate" column is active and accessible!');
    console.log('Sample Row Data:', data);
  }
}

main();
