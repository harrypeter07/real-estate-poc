const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Checking projects for down_payment_amount and down_payment_percent...');
  
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, down_payment_amount')
    .limit(1);

  if (error) {
    console.error('\n❌ down_payment_amount check failed!');
    console.error('Error Details:', error.message);
  } else {
    console.log('\n✅ down_payment_amount check successful!');
    console.log('Sample Row Data:', data);
  }

  const { data: data2, error: error2 } = await supabase
    .from('projects')
    .select('id, name, down_payment_percent')
    .limit(1);

  if (error2) {
    console.log('\n❌ down_payment_percent is not accessible (this is expected if renamed):', error2.message);
  } else {
    console.log('\n⚠️ down_payment_percent is still accessible! (not renamed?):', data2);
  }
}

main();
