const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
    const { data, error } = await supabase.from('installments').select('*').limit(1);
    if (error) {
      console.log('ERROR:', error.message);
    } else {
      console.log('TABLE EXISTS', data);
    }
  } catch (e) {
    console.log('EXCEPTION:', e.message);
  }
}

test();
