import "dotenv/config";
import { Client } from "pg";
import * as bcrypt from "bcryptjs";
import fs from "fs";

// =============================================================================
// populate-app-users.ts
// =============================================================================
// Run AFTER schema-change.sql, BEFORE migrate.ts.
//
// What this does:
//   1. Reads every auth_user_id referenced by business_admins, advisors, and
//      superadmin_audit_logs from the OLD database.
//   2. Looks up each user's email (and name if in metadata) from old auth.users.
//   3. Inserts a matching row into pms.app_users in the NEW database, with a
//      bcrypt-hashed password (DEFAULT_PASSWORD from .env, default: password123).
//   4. Writes auth-user-id-mapping.json  { oldAuthUserId -> newAppUserId }
//      which migrate.ts reads to rewrite auth_user_id columns before inserting.
//
// Rerunnable: existing emails in pms.app_users are detected and reused (no
// duplicates). Safe to run multiple times.
// =============================================================================

const OLD_DB_URL = process.env.OLD_DB_URL!;
const NEW_DB_URL = process.env.NEW_DB_URL!;
const OLD_SCHEMA = process.env.OLD_SCHEMA || "public";
const NEW_SCHEMA = process.env.NEW_SCHEMA || "pms";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "password123";
const MAPPING_FILE = "auth-user-id-mapping.json";
const REPORT_FILE = "app-users-report.json";
const DRY_RUN = process.argv.includes("--dry-run");
const BCRYPT_ROUNDS = 10;

if (!OLD_DB_URL || !NEW_DB_URL) {
    console.error("Missing OLD_DB_URL or NEW_DB_URL in .env");
    process.exit(1);
}

const oldDb = new Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
const newDb = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

// =============================================================================
// TYPES
// =============================================================================

interface OldAuthUser {
    id: string;
    email: string | null;
    phone: string | null;
    raw_user_meta_data: Record<string, any> | null;
}

interface ReportEntry {
    oldId: string;
    newId: string | null;
    email: string | null;
    status: "CREATED" | "ALREADY_EXISTS" | "SKIPPED_NO_EMAIL" | "FAILED" | "DRY_RUN";
    reason?: string;
}

const reportEntries: ReportEntry[] = [];

// =============================================================================
// STEP 1: collect every auth_user_id referenced in old business tables
// =============================================================================

async function collectReferencedIds(): Promise<Set<string>> {
    const ids = new Set<string>();

    const queries = [
        `SELECT DISTINCT auth_user_id AS id
     FROM ${OLD_SCHEMA}.business_admins
     WHERE auth_user_id IS NOT NULL`,

        `SELECT DISTINCT auth_user_id AS id
     FROM ${OLD_SCHEMA}.advisors
     WHERE auth_user_id IS NOT NULL`,

        `SELECT DISTINCT actor_auth_user_id AS id
     FROM ${OLD_SCHEMA}.superadmin_audit_logs
     WHERE actor_auth_user_id IS NOT NULL`,

        `SELECT DISTINCT target_admin_auth_user_id AS id
     FROM ${OLD_SCHEMA}.superadmin_audit_logs
     WHERE target_admin_auth_user_id IS NOT NULL`,
    ];

    for (const sql of queries) {
        try {
            const res = await oldDb.query(sql);
            for (const row of res.rows) ids.add(row.id);
        } catch (err: any) {
            console.warn(`  Skipping query (table may not exist): ${err.message}`);
        }
    }

    return ids;
}

// =============================================================================
// STEP 2: look up old auth.users record
// =============================================================================

async function getOldAuthUser(id: string): Promise<OldAuthUser | null> {
    try {
        const res = await oldDb.query(
            `SELECT id::text, email, phone, raw_user_meta_data
       FROM auth.users WHERE id = $1`,
            [id]
        );
        return res.rows[0] ?? null;
    } catch (err: any) {
        console.warn(`  Could not query auth.users for ${id}: ${err.message}`);
        return null;
    }
}

// =============================================================================
// STEP 3: insert into pms.app_users (or find existing by email)
// =============================================================================

async function upsertAppUser(oldUser: OldAuthUser): Promise<ReportEntry> {
    const email = oldUser.email?.trim() ?? null;

    if (!email) {
        return {
            oldId: oldUser.id,
            newId: null,
            email: null,
            status: "SKIPPED_NO_EMAIL",
            reason: "old auth.users row has no email",
        };
    }

    if (DRY_RUN) {
        return { oldId: oldUser.id, newId: "DRY_RUN", email, status: "DRY_RUN" };
    }

    // Extract name from Supabase user_metadata if present
    const meta = oldUser.raw_user_meta_data ?? {};
    const name: string | null =
        meta.full_name ?? meta.name ?? meta.display_name ?? null;

    // Check if this email already exists in pms.app_users
    const existing = await newDb.query(
        `SELECT id::text FROM ${NEW_SCHEMA}.app_users WHERE email = $1`,
        [email]
    );

    if (existing.rows.length > 0) {
        return {
            oldId: oldUser.id,
            newId: existing.rows[0].id,
            email,
            status: "ALREADY_EXISTS",
        };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    try {
        const res = await newDb.query(
            `INSERT INTO ${NEW_SCHEMA}.app_users (email, password_hash, name, phone, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id::text`,
            [email, passwordHash, name, oldUser.phone ?? null]
        );
        return {
            oldId: oldUser.id,
            newId: res.rows[0].id,
            email,
            status: "CREATED",
        };
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

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    await oldDb.connect();
    await newDb.connect();
    console.log("Connected to both databases.");

    if (DRY_RUN) {
        console.log("DRY RUN — no rows will be inserted.\n");
    }

    // Collect IDs
    const ids = await collectReferencedIds();
    console.log(`Found ${ids.size} distinct auth_user_id(s) to migrate into pms.app_users.\n`);

    // Hash password once for logging (don't log the hash)
    if (!DRY_RUN) {
        console.log(`Password for all accounts: ${DEFAULT_PASSWORD}  (bcrypt-hashed before storage)\n`);
    }

    let i = 0;
    for (const id of ids) {
        i++;

        const oldUser = await getOldAuthUser(id);
        if (!oldUser) {
            const entry: ReportEntry = {
                oldId: id,
                newId: null,
                email: null,
                status: "SKIPPED_NO_EMAIL",
                reason: "not found in old auth.users (orphaned FK reference)",
            };
            reportEntries.push(entry);
            console.log(`[${i}/${ids.size}] ${id} -> NOT FOUND in old auth.users, skipped`);
            continue;
        }

        const entry = await upsertAppUser(oldUser);
        reportEntries.push(entry);

        console.log(
            `[${i}/${ids.size}] ${entry.email ?? "(no email)"} -> ${entry.status}` +
            (entry.newId && entry.status !== "DRY_RUN" ? ` (new id: ${entry.newId})` : "") +
            (entry.reason ? `  !! ${entry.reason}` : "")
        );
    }

    // Build old→new mapping file for migrate.ts
    const mapping: Record<string, string> = {};
    for (const e of reportEntries) {
        if (e.newId && e.status !== "DRY_RUN") {
            mapping[e.oldId] = e.newId;
        }
    }

    if (!DRY_RUN) {
        fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
        console.log(`\nMapping written to ${MAPPING_FILE}  (${Object.keys(mapping).length} entries)`);
    }

    fs.writeFileSync(REPORT_FILE, JSON.stringify(reportEntries, null, 2));

    // Summary
    const counts = {
        created: reportEntries.filter(e => e.status === "CREATED").length,
        alreadyExist: reportEntries.filter(e => e.status === "ALREADY_EXISTS").length,
        skipped: reportEntries.filter(e => e.status === "SKIPPED_NO_EMAIL").length,
        failed: reportEntries.filter(e => e.status === "FAILED").length,
        dryRun: reportEntries.filter(e => e.status === "DRY_RUN").length,
    };

    console.log("\n=== SUMMARY ===");
    if (DRY_RUN) {
        console.log(`Would process:  ${counts.dryRun} users`);
    } else {
        console.log(`Created:        ${counts.created}`);
        console.log(`Already existed:${counts.alreadyExist}`);
        console.log(`Skipped (no email): ${counts.skipped}`);
        console.log(`Failed:         ${counts.failed}`);
    }
    console.log(`Report:         ${REPORT_FILE}`);

    if (counts.failed > 0) {
        console.log(`\n${counts.failed} user(s) failed - check ${REPORT_FILE} for details.`);
    }
    if (counts.skipped > 0) {
        console.log(
            `\n${counts.skipped} user(s) had no email. Their business_admins/advisors rows ` +
            `will fail the FK check during migration - you'll need to handle those manually.`
        );
    }

    await oldDb.end();
    await newDb.end();
    console.log("\nDone. Now run: npx tsx scripts/migrate.ts");
}

main().catch(err => {
    console.error("FATAL:", err);
    process.exit(1);
});