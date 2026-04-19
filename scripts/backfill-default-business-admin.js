require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

async function backfillDefaultBusinessAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env");
    process.exit(1);
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("Set DEFAULT_ADMIN_EMAIL in .env (the existing admin email you want to attach to Default Business).");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Get default_business_id
  const { data: kv, error: kvErr } = await supabase
    .from("_app_kv")
    .select("value")
    .eq("key", "default_business_id")
    .maybeSingle();
  if (kvErr || !kv?.value) {
    console.error("Could not find default_business_id in _app_kv. Did you run the multi-tenant migrations?");
    process.exit(1);
  }
  const defaultBusinessId = kv.value;

  // 2) Find auth user by email
  console.log(`Looking up existing admin user by email: ${adminEmail}`);
  let userId = null;
  let userMetadata = {};

  try {
    if (supabase.auth.admin.getUserByEmail) {
      const res = await supabase.auth.admin.getUserByEmail(adminEmail);
      if (res?.data?.user) {
        userId = res.data.user.id;
        userMetadata = res.data.user.user_metadata || {};
      }
    }
  } catch (e) {
    // ignore, we'll fall back
  }

  if (!userId) {
    const listRes = await supabase.auth.admin.listUsers({ search: adminEmail, limit: 10 });
    // Supabase SDK commonly returns: { data: { users: [...] } }
    const raw = listRes?.data;
    const users = Array.isArray(raw?.users) ? raw.users : Array.isArray(raw) ? raw : [];

    const match = users.find(
      (u) => String(u?.email || "").toLowerCase() === adminEmail.toLowerCase()
    );
    if (!match) {
      console.error("No auth user found with that email.");
      process.exit(1);
    }
    userId = match.id;
    userMetadata = match.user_metadata || {};
  }

  console.log(`Found auth user: ${userId}`);

  // 3) Upsert metadata to ensure role=admin & business_id=default
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userMetadata,
      role: "admin",
      business_id: defaultBusinessId,
    },
  });
  console.log("Updated auth user metadata with role=admin and business_id=default.");

  // 4) Insert into business_admins if missing
  const { data: existing } = await supabase
    .from("business_admins")
    .select("id")
    .eq("business_id", defaultBusinessId)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (existing?.id) {
    console.log("business_admins row already exists for this user and Default Business.");
    return;
  }

  const name = userMetadata.name || null;

  const { error: insErr } = await supabase.from("business_admins").insert({
    business_id: defaultBusinessId,
    auth_user_id: userId,
    name,
    email: adminEmail,
    is_active: true,
  });
  if (insErr) {
    console.error("Error inserting into business_admins:", insErr.message);
    process.exit(1);
  }

  console.log("Created business_admins row for Default Business + existing admin user.");
}

backfillDefaultBusinessAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});

