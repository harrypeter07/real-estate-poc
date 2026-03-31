require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createSuperAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@mginfra.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'password123';

  console.log(`Creating superadmin user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'superadmin',
      // business_id is optional for superadmin; RLS allows superadmin to read all.
    },
  });

  if (error) {
    if (String(error.message || '').toLowerCase().includes('already registered')) {
      console.log('Superadmin user already exists.');
      return;
    }
    console.error('Error creating superadmin:', error.message);
    process.exit(1);
  }

  console.log('Superadmin created successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  if (data?.user?.id) console.log(`Auth User ID: ${data.user.id}`);
}

createSuperAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});

