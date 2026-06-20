import "dotenv/config";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// ============================================================================
// CONFIG
// ============================================================================
//
// This script solves a problem the main migrate.ts script cannot solve on
// its own: business_admins.auth_user_id is NOT NULL and is a foreign key
// into auth.users. The new Supabase project's auth.users is empty (or at
// least does not contain the old project's user ids), so every
// business_admins row fails with:
//
//   null value in column "auth_user_id" of relation "business_admins"
//   violates not-null constraint
//
// auth.users is not an ordinary table - it's managed by Supabase's auth
// service (GoTrue) and cannot be safely bulk-INSERTed into directly. The
// only supported way to create real, working accounts is the Admin API.
//
// This script:
//   1. Reads every distinct auth_user_id referenced by business_admins (and
//      optionally superadmin_audit_logs) from the OLD database.
//   2. Looks up each one's email/metadata in the OLD database's auth.users.
//   3. Calls supabase.auth.admin.createUser() against the NEW project for
//      each one, with email_confirm: true and a shared DEFAULT_PASSWORD
//      (no invite emails sent - this is for test/dummy data).
//   4. Writes a JSON mapping file { oldAuthUserId: newAuthUserId } that
//      migrate.ts will read and use to rewrite auth_user_id columns before
//      inserting business_admins / superadmin_audit_logs rows.
//
// Rerunnable: if a user with that email already exists in the new project,
// the existing id is reused instead of erroring out.
// ============================================================================

const OLD_DB_URL = process.env.OLD_DB_URL!;
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL!; // e.g. https://pmpntcfwhbtsapfpgger.supabase.co
const NEW_SERVICE_ROLE_KEY = process.env.NEW_SERVICE_ROLE_KEY!; // service_role key, NOT anon key
const OLD_SCHEMA = process.env.OLD_SCHEMA || "public";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "password123";
const MAPPING_FILE = "auth-user-id-mapping.json";
const DRY_RUN = process.argv.includes("--dry-run");

if (!OLD_DB_URL) {
    console.error("Missing OLD_DB_URL in environment (.env file).");
    process.exit(1);
}
if (!DRY_RUN && (!NEW_SUPABASE_URL || !NEW_SERVICE_ROLE_KEY)) {
    console.error(
        "Missing NEW_SUPABASE_URL or NEW_SERVICE_ROLE_KEY in environment (.env file).\n" +
        "Find these in: New Supabase Project -> Project Settings -> API.\n" +
        "NEW_SERVICE_ROLE_KEY is the 'service_role' secret key, NOT the anon/public key.\n" +
        "(You can run with --dry-run to preview without these.)"
    );
    process.exit(1);
}

const oldDb = new Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });

const supabaseAdmin = DRY_RUN
    ? null
    : createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// ============================================================================
// TYPES
// ============================================================================

interface OldAuthUser {
    id: string;
    email: string | null;
    raw_user_meta_data: Record<string, any> | null;
    created_at: string | null;
}

interface MappingEntry {
    oldId: string;
    newId: string | null;
    email: string | null;
    status: "CREATED" | "ALREADY_EXISTS" | "SKIPPED_NO_EMAIL" | "FAILED";
    reason?: string;
}

const results: MappingEntry[] = [];

// ============================================================================
// STEP 1: find every auth_user_id we actually need, from the OLD database
// ============================================================================

async function getReferencedAuthUserIds(): Promise<Set<string>> {
    const ids = new Set<string>();

    const queries = [
        `SELECT DISTINCT auth_user_id AS id FROM ${OLD_SCHEMA}.business_admins WHERE auth_user_id IS NOT NULL`,
        `SELECT DISTINCT actor_auth_user_id AS id FROM ${OLD_SCHEMA}.superadmin_audit_logs WHERE actor_auth_user_id IS NOT NULL`,
        `SELECT DISTINCT target_admin_auth_user_id AS id FROM ${OLD_SCHEMA}.superadmin_audit_logs WHERE target_admin_auth_user_id IS NOT NULL`,
    ];

    for (const sql of queries) {
        try {
            const res = await oldDb.query(sql);
            for (const row of res.rows) ids.add(row.id);
        } catch (err: any) {
            // Table might not exist or have no rows yet - not fatal, just skip it.
            console.warn(`   Skipping a source query (${err.message})`);
        }
    }

    return ids;
}

async function getOldAuthUser(id: string): Promise<OldAuthUser | null> {
    const res = await oldDb.query(
        `SELECT id, email, raw_user_meta_data, created_at FROM auth.users WHERE id = $1`,
        [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
}

// ============================================================================
// STEP 2: create (or find existing) user in the NEW project via Admin API
// ============================================================================

async function findExistingUserByEmail(email: string): Promise<string | null> {
    if (!supabaseAdmin) return null;
    // listUsers does not support filtering by email directly in older SDK
    // versions, so we page through. For a few hundred admins this is fine.
    let page = 1;
    const perPage = 200;
    while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (match) return match.id;
        if (data.users.length < perPage) return null; // last page
        page++;
    }
}

async function createOrReuseAuthUser(oldUser: OldAuthUser): Promise<MappingEntry> {
    const email = oldUser.email?.trim();

    if (!email) {
        return {
            oldId: oldUser.id,
            newId: null,
            email: null,
            status: "SKIPPED_NO_EMAIL",
            reason: "old auth.users row has no email - cannot create a matching account",
        };
    }

    if (DRY_RUN) {
        return { oldId: oldUser.id, newId: "DRY_RUN_PLACEHOLDER", email, status: "CREATED" };
    }

    // Rerun safety: if this email already exists in the new project (e.g. from
    // a previous run of this script, or someone signed up independently),
    // reuse that id instead of erroring.
    try {
        const existingId = await findExistingUserByEmail(email);
        if (existingId) {
            return { oldId: oldUser.id, newId: existingId, email, status: "ALREADY_EXISTS" };
        }
    } catch (err: any) {
        console.warn(`   Warning: could not check for existing user ${email} (${err.message})`);
    }

    try {
        const { data, error } = await supabaseAdmin!.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true, // mark confirmed immediately, no confirmation email sent
            user_metadata: oldUser.raw_user_meta_data ?? undefined,
        });
        if (error) throw error;
        return { oldId: oldUser.id, newId: data.user.id, email, status: "CREATED" };
    } catch (err: any) {
        return {
            oldId: oldUser.id,
            newId: null,
            email,
            status: "FAILED",
            reason: err.message,
        };
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    await oldDb.connect();
    console.log("Connected to old database.");
    if (DRY_RUN) console.log("DRY RUN - no users will actually be created.\n");

    const ids = await getReferencedAuthUserIds();
    console.log(`Found ${ids.size} distinct auth_user_id(s) referenced by business data.\n`);

    let i = 0;
    for (const id of ids) {
        i++;
        const oldUser = await getOldAuthUser(id);
        if (!oldUser) {
            results.push({
                oldId: id,
                newId: null,
                email: null,
                status: "SKIPPED_NO_EMAIL",
                reason: "id not found in old auth.users (orphaned reference)",
            });
            console.log(`[${i}/${ids.size}] ${id} -> NOT FOUND in old auth.users, skipping`);
            continue;
        }

        const entry = await createOrReuseAuthUser(oldUser);
        results.push(entry);
        console.log(
            `[${i}/${ids.size}] ${oldUser.email ?? "(no email)"} -> ${entry.status}${entry.newId ? ` (${entry.newId})` : ""
            }${entry.reason ? ` :: ${entry.reason}` : ""}`
        );

        // Be gentle with the Admin API - small delay to avoid rate limits on
        // large admin lists.
        await new Promise((r) => setTimeout(r, 150));
    }

    // Build the simple old-id -> new-id lookup that migrate.ts will consume.
    const mapping: Record<string, string> = {};
    for (const r of results) {
        if (r.newId) mapping[r.oldId] = r.newId;
    }

    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
    fs.writeFileSync("auth-user-recreation-report.json", JSON.stringify(results, null, 2));

    const created = results.filter((r) => r.status === "CREATED").length;
    const reused = results.filter((r) => r.status === "ALREADY_EXISTS").length;
    const skipped = results.filter((r) => r.status === "SKIPPED_NO_EMAIL").length;
    const failed = results.filter((r) => r.status === "FAILED").length;

    console.log("\n=== SUMMARY ===");
    console.log(`Created:        ${created}`);
    console.log(`Already existed: ${reused}`);
    console.log(`Skipped (no email): ${skipped}`);
    console.log(`Failed:         ${failed}`);
    console.log(`\nMapping written to ${MAPPING_FILE} (${Object.keys(mapping).length} entries).`);
    console.log(`Full report written to auth-user-recreation-report.json.`);

    if (skipped > 0) {
        console.log(
            `\n${skipped} user(s) had no email and could not get an account created - their ` +
            `business_admins row(s) will still fail the NOT NULL constraint on auth_user_id. ` +
            `You'll need to handle those manually (e.g. find a contact email some other way, or decide to drop those rows).`
        );
    }
    if (!DRY_RUN && created > 0) {
        console.log(
            `\n${created} admin(s) created in the new project with password: ${DEFAULT_PASSWORD}\n` +
            `This is a shared default password for test/dummy data - force a password reset before any real use.`
        );
    }

    await oldDb.end();
}

main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
});