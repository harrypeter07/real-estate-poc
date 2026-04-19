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
      console.log('Superadmin user already exists. Ensuring metadata...');

      // Best-effort: update the existing auth user metadata role so middleware redirects properly.
      try {
        let existingUserId = null;
        let existingMeta = {};

        // Supabase-js usually supports getUserByEmail; fall back to listUsers if not available.
        try {
          if (supabase.auth.admin.getUserByEmail) {
            const res = await supabase.auth.admin.getUserByEmail(email);
            existingUserId = res?.data?.user?.id ?? null;
            existingMeta = res?.data?.user?.user_metadata ?? {};
          }
        } catch (e) {
          // ignore, we'll fall back
        }

        if (!existingUserId) {
          const listRes = await supabase.auth.admin.listUsers({ search: email, limit: 5 });
          const match = (listRes?.data ?? []).find((u) => String(u?.email ?? '').toLowerCase() === email.toLowerCase());
          existingUserId = match?.id ?? null;
          existingMeta = match?.user_metadata ?? {};
        }

        if (existingUserId) {
          await supabase.auth.admin.updateUserById(existingUserId, {
            user_metadata: {
              ...existingMeta,
              role: "superadmin",
            },
          });
          console.log("Metadata updated for existing superadmin user.");
        } else {
          console.log("Could not locate existing superadmin user to update metadata.");
        }
      } catch (e) {
        console.log("Metadata update failed (continuing):", e?.message ?? e);
      }

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

