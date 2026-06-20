import "dotenv/config";
import { Client } from "pg";
import fs from "fs";

const OLD_DB_URL = process.env.OLD_DB_URL!;
const NEW_DB_URL = process.env.NEW_DB_URL!;
const NEW_SCHEMA = process.env.NEW_SCHEMA || "pms";
const OLD_SCHEMA = process.env.OLD_SCHEMA || "public";

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
const FETCH_SIZE = Number(process.env.FETCH_SIZE || 500);
// Tables with >= this many rows commit per fetch-chunk (not one giant txn)
// so a pooler timeout never hangs/loses more than FETCH_SIZE rows.
const PER_CHUNK_COMMIT_THRESHOLD = 1000;

if (!OLD_DB_URL || !NEW_DB_URL) {
    console.error("Missing OLD_DB_URL or NEW_DB_URL in environment (.env file).");
    process.exit(1);
}

const oldDb = new Client({
    connectionString: OLD_DB_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
});

let newDb = new Client({
    connectionString: NEW_DB_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
});

// ============================================================================
// MIGRATION ORDER
// ============================================================================
const MIGRATION_ORDER = [
    "businesses",
    "modules",
    "app_users",
    "business_admins",
    "business_modules",
    "staff",
    "staff_attendance",
    "hr_employees",
    "hr_attendance",
    "hr_payout_batches",
    "hr_employee_payouts",
    "advisors",
    "projects",
    "plots",
    "enquiry_customers",
    "customers",
    "plot_sales",
    "advisor_commissions",
    "advisor_commission_payments",
    "advisor_project_commissions",
    "customer_documents",
    "office_expenses",
    "payments",
    "project_documents",
    "reminders",
    "superadmin_audit_logs",
    "_app_kv",
];

// ============================================================================
// AUTH FK CONFIG - all now point at pms.app_users via mapping file
// ============================================================================
const NULLABLE_APP_USER_FK_COLUMNS: Record<string, string[]> = {
    advisors: ["auth_user_id"],
    superadmin_audit_logs: ["target_admin_auth_user_id"],
    customers: ["created_by", "last_edited_by"],
    hr_payout_batches: ["created_by"],
};

const REQUIRED_APP_USER_FK_COLUMNS: Record<string, string[]> = {
    business_admins: ["auth_user_id"],
    superadmin_audit_logs: ["actor_auth_user_id"],
};

const AUTH_ID_MAPPING_FILE = "auth-user-id-mapping.json";

function loadAuthIdMapping(): Record<string, string> {
    if (!fs.existsSync(AUTH_ID_MAPPING_FILE)) {
        console.warn(`Warning: ${AUTH_ID_MAPPING_FILE} not found. Run populate-app-users.ts first.`);
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(AUTH_ID_MAPPING_FILE, "utf-8"));
    } catch {
        console.warn(`Warning: could not parse ${AUTH_ID_MAPPING_FILE}`);
        return {};
    }
}

const authIdMapping = loadAuthIdMapping();
console.log(`Loaded ${Object.keys(authIdMapping).length} entries from ${AUTH_ID_MAPPING_FILE}`);

// ============================================================================
// TYPES & LOGGING
// ============================================================================
interface TableReport {
    table: string;
    status: "OK" | "SKIPPED" | "FAILED";
    reason?: string;
    sourceRowCount: number;
    migratedRowCount: number;
    failedRowCount: number;
    skippedColumns: { onlyInOld: string[]; onlyInNew: string[] };
    durationMs: number;
}

const report: TableReport[] = [];
const errorLogPath = "migration-errors.log";
fs.writeFileSync(errorLogPath, `Migration run started ${new Date().toISOString()}\n\n`);

function logError(table: string, identifier: string, message: string) {
    fs.appendFileSync(errorLogPath, `[${table}] id=${identifier} :: ${message}\n`);
}

const q = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

// ============================================================================
// SCHEMA INTROSPECTION
// ============================================================================
async function getColumns(client: Client, schema: string, table: string): Promise<string[]> {
    const result = await client.query(
        `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
        [schema, table]
    );
    return result.rows.map((r) => r.column_name);
}

async function getPrimaryKeyColumns(client: Client, schema: string, table: string): Promise<string[]> {
    const result = await client.query(
        `SELECT a.attname AS column_name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass
       AND i.indisprimary`,
        [schema, table]
    );
    return result.rows.map((r) => r.column_name);
}

async function tableExists(client: Client, schema: string, table: string): Promise<boolean> {
    const result = await client.query(
        `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2)`,
        [schema, table]
    );
    return result.rows[0].exists;
}

async function getRowCount(client: Client, schema: string, table: string): Promise<number> {
    const result = await client.query(
        `SELECT COUNT(*)::bigint AS count FROM ${q(schema)}.${q(table)}`
    );
    return Number(result.rows[0].count);
}

async function getAllTables(client: Client, schema: string): Promise<string[]> {
    const result = await client.query(
        `SELECT table_name FROM information_schema.tables
     WHERE table_schema=$1 AND table_type='BASE TABLE' ORDER BY table_name`,
        [schema]
    );
    return result.rows.map((r) => r.table_name);
}

interface FkConstraint { table: string; constraintName: string; }

async function getForeignKeyConstraints(client: Client, schema: string): Promise<FkConstraint[]> {
    const result = await client.query(
        `SELECT conrelid::regclass::text AS table_name, conname AS constraint_name
     FROM pg_constraint
     WHERE contype='f' AND connamespace=(SELECT oid FROM pg_namespace WHERE nspname=$1)`,
        [schema]
    );
    return result.rows.map((r) => ({
        table: r.table_name.replace(new RegExp(`^${schema}\\.`), ""),
        constraintName: r.constraint_name,
    }));
}

async function setForeignKeysDeferrable(
    client: Client, schema: string, fks: FkConstraint[], deferrable: boolean
): Promise<void> {
    for (const fk of fks) {
        const mode = deferrable ? "DEFERRABLE INITIALLY DEFERRED" : "NOT DEFERRABLE";
        await client.query(
            `ALTER TABLE ${q(schema)}.${q(fk.table)} ALTER CONSTRAINT ${q(fk.constraintName)} ${mode}`
        );
    }
}

// ============================================================================
// SAVEPOINT HELPER
// ============================================================================
let savepointCounter = 0;

async function queryWithSavepoint(sql: string, values: any[]): Promise<any> {
    const sp = `sp_${savepointCounter++}`;
    await newDb.query(`SAVEPOINT ${sp}`);
    try {
        const result = await newDb.query(sql, values);
        await newDb.query(`RELEASE SAVEPOINT ${sp}`);
        return result;
    } catch (err) {
        await newDb.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        await newDb.query(`RELEASE SAVEPOINT ${sp}`);
        throw err;
    }
}

// ============================================================================
// RECONNECT
// ============================================================================
async function reconnectNewDb(): Promise<Client> {
    console.log("\nReconnecting to destination database...");
    try { await newDb.end(); } catch { /* already dead */ }
    const fresh = new Client({
        connectionString: NEW_DB_URL,
        ssl: { rejectUnauthorized: false },
        keepAlive: true,
        keepAliveInitialDelayMillis: 5000,
    });
    await fresh.connect();
    console.log("Reconnected.");
    return fresh;
}

// ============================================================================
// INSERT HELPERS
// ============================================================================
async function insertBatch(
    table: string, columns: string[], pkColumns: string[], rows: Record<string, any>[]
): Promise<{ migrated: number; failed: number }> {
    if (rows.length === 0) return { migrated: 0, failed: 0 };
    const conflictClause = buildConflictClause(columns, pkColumns);
    try {
        const { sql, values } = buildInsertSql(table, columns, rows, conflictClause);
        const result = await queryWithSavepoint(sql, values);
        return { migrated: result.rowCount ?? rows.length, failed: 0 };
    } catch {
        let migrated = 0, failed = 0;
        for (const row of rows) {
            try {
                const { sql, values } = buildInsertSql(table, columns, [row], conflictClause);
                await queryWithSavepoint(sql, values);
                migrated++;
            } catch (rowErr: any) {
                failed++;
                logError(table, row.id ?? row.key ?? "NO_PK", rowErr.message);
            }
        }
        return { migrated, failed };
    }
}

function buildConflictClause(columns: string[], pkColumns: string[]): string {
    if (pkColumns.length === 0) return "ON CONFLICT DO NOTHING";
    const updatable = columns.filter((c) => !pkColumns.includes(c));
    if (updatable.length === 0) return `ON CONFLICT (${pkColumns.map(q).join(",")}) DO NOTHING`;
    return `ON CONFLICT (${pkColumns.map(q).join(",")}) DO UPDATE SET ${updatable.map((c) => `${q(c)}=EXCLUDED.${q(c)}`).join(",")}`;
}

function buildInsertSql(
    table: string, columns: string[], rows: Record<string, any>[], conflictClause: string
): { sql: string; values: any[] } {
    const values: any[] = [];
    const groups: string[] = [];
    for (const row of rows) {
        const placeholders: string[] = [];
        for (const col of columns) { values.push(row[col]); placeholders.push(`$${values.length}`); }
        groups.push(`(${placeholders.join(",")})`);
    }
    return {
        sql: `INSERT INTO ${q(NEW_SCHEMA)}.${q(table)} (${columns.map(q).join(",")})
          VALUES ${groups.join(",")} ${conflictClause}`,
        values,
    };
}

// ============================================================================
// MIGRATE ONE TABLE
// ============================================================================
async function migrateTable(table: string): Promise<void> {
    const startTime = Date.now();

    // app_users is populated by populate-app-users.ts, not source-migrated
    if (table === "app_users") {
        const count = await getRowCount(newDb, NEW_SCHEMA, "app_users");
        console.log(`SKIPPED app_users (populated by populate-app-users.ts — ${count} rows present)`);
        report.push({
            table, status: "SKIPPED", reason: "populated separately",
            sourceRowCount: count, migratedRowCount: count, failedRowCount: 0,
            skippedColumns: { onlyInOld: [], onlyInNew: [] }, durationMs: 0
        });
        return;
    }

    const existsInOld = await tableExists(oldDb, OLD_SCHEMA, table);
    if (!existsInOld) {
        console.log(`SKIPPED ${table} (not in old schema)`);
        report.push({
            table, status: "SKIPPED", reason: `missing in ${OLD_SCHEMA}`,
            sourceRowCount: 0, migratedRowCount: 0, failedRowCount: 0,
            skippedColumns: { onlyInOld: [], onlyInNew: [] }, durationMs: 0
        });
        return;
    }

    const existsInNew = await tableExists(newDb, NEW_SCHEMA, table);
    if (!existsInNew) {
        console.log(`SKIPPED ${table} (not in new schema)`);
        report.push({
            table, status: "SKIPPED", reason: `missing in ${NEW_SCHEMA}`,
            sourceRowCount: 0, migratedRowCount: 0, failedRowCount: 0,
            skippedColumns: { onlyInOld: [], onlyInNew: [] }, durationMs: 0
        });
        return;
    }

    const oldColumns = await getColumns(oldDb, OLD_SCHEMA, table);
    const newColumns = await getColumns(newDb, NEW_SCHEMA, table);
    const commonColumns = oldColumns.filter((c) => newColumns.includes(c));
    const onlyInOld = oldColumns.filter((c) => !newColumns.includes(c));
    const onlyInNew = newColumns.filter((c) => !oldColumns.includes(c));

    if (commonColumns.length === 0) {
        console.log(`SKIPPED ${table} (no common columns)`);
        report.push({
            table, status: "SKIPPED", reason: "no matching columns",
            sourceRowCount: 0, migratedRowCount: 0, failedRowCount: 0,
            skippedColumns: { onlyInOld, onlyInNew }, durationMs: 0
        });
        return;
    }

    const pkColumns = await getPrimaryKeyColumns(newDb, NEW_SCHEMA, table);
    const sourceRowCount = await getRowCount(oldDb, OLD_SCHEMA, table);
    const perChunkCommit = sourceRowCount >= PER_CHUNK_COMMIT_THRESHOLD;

    console.log(`\nMigrating ${table} (${sourceRowCount} rows, ${commonColumns.length} cols)${perChunkCommit ? " [per-chunk commits]" : ""}...`);
    if (onlyInOld.length > 0) console.log(`  dropped (old only): ${onlyInOld.join(", ")}`);
    if (onlyInNew.length > 0) console.log(`  defaulted (new only): ${onlyInNew.join(", ")}`);

    let migrated = 0, failed = 0;
    const nullableFkCols = NULLABLE_APP_USER_FK_COLUMNS[table] || [];
    const requiredFkCols = REQUIRED_APP_USER_FK_COLUMNS[table] || [];
    const cursorName = `cur_${table.replace(/[^a-zA-Z0-9]/g, "_")}`;

    await oldDb.query("BEGIN");
    await oldDb.query(
        `DECLARE ${cursorName} CURSOR FOR SELECT ${commonColumns.map(q).join(",")} FROM ${q(OLD_SCHEMA)}.${q(table)}`
    );

    try {
        let fetchNum = 0;
        while (true) {
            const res = await oldDb.query(`FETCH ${FETCH_SIZE} FROM ${cursorName}`);
            if (res.rows.length === 0) break;
            fetchNum++;

            // ---- Progress line (overwrites itself) ----
            const elapsedS = ((Date.now() - startTime) / 1000).toFixed(0);
            const done = migrated + failed;
            const pct = sourceRowCount > 0 ? Math.round((done / sourceRowCount) * 100) : 0;
            process.stdout.write(
                `\r  [${table}] chunk #${fetchNum} | ${done}/${sourceRowCount} (${pct}%) | migrated=${migrated} failed=${failed} | ${elapsedS}s   `
            );

            // ---- Sanitize rows ----
            const sanitizedRows: Record<string, any>[] = [];
            for (const row of res.rows) {
                const copy = { ...row };
                let skipRow = false;

                for (const col of requiredFkCols) {
                    const oldVal = copy[col];
                    if (!oldVal) {
                        logError(table, row.id ?? row.key ?? "NO_PK", `${col} is null in source but NOT NULL in dest — skipped`);
                        skipRow = true; break;
                    }
                    const newVal = authIdMapping[oldVal];
                    if (!newVal) {
                        logError(table, row.id ?? row.key ?? "NO_PK", `No mapping for ${col}=${oldVal} — run populate-app-users.ts first`);
                        skipRow = true; break;
                    }
                    copy[col] = newVal;
                }
                if (skipRow) { failed++; continue; }

                for (const col of nullableFkCols) {
                    if (copy[col]) copy[col] = authIdMapping[copy[col]] ?? null;
                }

                sanitizedRows.push(copy);
            }

            // ---- Insert (with per-chunk transaction for large tables) ----
            if (perChunkCommit) {
                await newDb.query("BEGIN");
                await newDb.query("SET CONSTRAINTS ALL DEFERRED");
            }

            for (let i = 0; i < sanitizedRows.length; i += BATCH_SIZE) {
                const chunk = sanitizedRows.slice(i, i + BATCH_SIZE);
                const result = await insertBatch(table, commonColumns, pkColumns, chunk);
                migrated += result.migrated;
                failed += result.failed;
            }

            if (perChunkCommit) {
                await newDb.query("COMMIT");
            }
        }
    } finally {
        process.stdout.write("\n"); // end progress line
        await oldDb.query(`CLOSE ${cursorName}`);
        await oldDb.query("COMMIT");
    }

    const durationMs = Date.now() - startTime;
    report.push({
        table,
        status: failed > 0 && migrated === 0 ? "FAILED" : "OK",
        sourceRowCount,
        migratedRowCount: migrated,
        failedRowCount: failed,
        skippedColumns: { onlyInOld, onlyInNew },
        durationMs,
    });

    console.log(
        `DONE ${table} | total=${sourceRowCount} migrated=${migrated} failed=${failed} (${(durationMs / 1000).toFixed(1)}s)`
    );
}

// ============================================================================
// VALIDATION
// ============================================================================
async function validateMigration() {
    const results = [];
    for (const entry of report) {
        if (entry.status === "SKIPPED") continue;
        const existsInNew = await tableExists(newDb, NEW_SCHEMA, entry.table);
        if (!existsInNew) continue;
        const destCount = await getRowCount(newDb, NEW_SCHEMA, entry.table);
        const expectedMin = entry.sourceRowCount - entry.failedRowCount;
        const match = entry.status !== "FAILED"
            && !(entry.sourceRowCount > 0 && destCount === 0)
            && destCount >= expectedMin;
        results.push({ table: entry.table, sourceCount: entry.sourceRowCount, destCount, match });
    }
    return results;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
    await oldDb.connect();
    await newDb.connect();
    console.log("Connected to both databases.");
    console.log(`FETCH_SIZE=${FETCH_SIZE}  BATCH_SIZE=${BATCH_SIZE}  PER_CHUNK_COMMIT_THRESHOLD=${PER_CHUNK_COMMIT_THRESHOLD}\n`);

    if (process.argv.includes("--restore-fks")) {
        const fks = await getForeignKeyConstraints(newDb, NEW_SCHEMA);
        console.log(`Restoring ${fks.length} FK constraints to NOT DEFERRABLE...`);
        await setForeignKeysDeferrable(newDb, NEW_SCHEMA, fks, false);
        console.log("Done.");
        await oldDb.end(); await newDb.end();
        return;
    }

    const allOldTables = await getAllTables(oldDb, OLD_SCHEMA);
    const orderedKnown = MIGRATION_ORDER.filter((t) => allOldTables.includes(t) || t === "app_users");
    const remaining = allOldTables.filter((t) => !MIGRATION_ORDER.includes(t));
    const finalOrder = [...orderedKnown, ...remaining];

    console.log(`Found ${allOldTables.length} tables in old DB.`);
    console.log(`Order: ${finalOrder.join(" -> ")}\n`);

    const fkConstraints = await getForeignKeyConstraints(newDb, NEW_SCHEMA);
    console.log(`Marking ${fkConstraints.length} FK constraints DEFERRABLE...`);
    await setForeignKeysDeferrable(newDb, NEW_SCHEMA, fkConstraints, true);

    // Cyclic pair (enquiry_customers <-> customers) must share a transaction.
    // Large tables (plots, plot_sales etc) now commit per chunk internally,
    // so they don't need a single outer transaction.
    const cyclicGroup = ["enquiry_customers", "customers"];
    const batches: string[][] = [];
    let cyclicAdded = false;
    for (const table of finalOrder) {
        if (cyclicGroup.includes(table)) {
            if (!cyclicAdded) {
                batches.push(cyclicGroup.filter((t) => finalOrder.includes(t) || cyclicGroup.includes(t)));
                cyclicAdded = true;
            }
            continue;
        }
        batches.push([table]);
    }

    let anyFailed = false;

    try {
        for (const batch of batches) {
            const isLargeBatch = batch.length === 1 &&
                (await getRowCount(oldDb, OLD_SCHEMA, batch[0]).catch(() => 0)) >= PER_CHUNK_COMMIT_THRESHOLD;

            try {
                // For large single-table batches, migrateTable handles its own
                // per-chunk transactions internally. For small tables and the cyclic
                // pair, wrap in one transaction here.
                if (!isLargeBatch) {
                    await newDb.query("BEGIN");
                    await newDb.query("SET CONSTRAINTS ALL DEFERRED");
                }

                for (const table of batch) {
                    await migrateTable(table);
                }

                if (!isLargeBatch) {
                    await newDb.query("COMMIT");
                }

            } catch (err: any) {
                anyFailed = true;
                console.error(`\nError in batch [${batch.join(", ")}]: ${err.message}`);

                const isConnLoss = /Connection terminated|ECONNRESET|ETIMEDOUT|connection.*closed/i.test(err.message);
                if (isConnLoss) {
                    try {
                        newDb = await reconnectNewDb();
                    } catch (reconnErr: any) {
                        console.error("Could not reconnect:", reconnErr.message);
                        fs.appendFileSync(errorLogPath, `\nFATAL: reconnect failed :: ${reconnErr.message}\n`);
                        break;
                    }
                } else {
                    try { await newDb.query("ROLLBACK"); } catch { /* ignore */ }
                }

                try { await oldDb.query("ROLLBACK"); } catch { /* ignore */ }
                fs.appendFileSync(errorLogPath, `\nBATCH FAILED [${batch.join(", ")}] :: ${err.message}\n`);

                for (const table of batch) {
                    if (!report.some((r) => r.table === table)) {
                        report.push({
                            table, status: "FAILED", reason: err.message,
                            sourceRowCount: 0, migratedRowCount: 0, failedRowCount: 0,
                            skippedColumns: { onlyInOld: [], onlyInNew: [] }, durationMs: 0
                        });
                    }
                }
            }
        }

        console.log(anyFailed
            ? "\nSome batches failed — see migration-errors.log. Already-committed chunks are safe; rerun to retry."
            : "\nAll tables committed successfully."
        );

    } finally {
        try {
            console.log("Restoring FK constraints to NOT DEFERRABLE...");
            await setForeignKeysDeferrable(newDb, NEW_SCHEMA, fkConstraints, false);
        } catch (restoreErr: any) {
            console.error(`Could not restore FKs: ${restoreErr.message}. Run: npx tsx scripts/migrate.ts --restore-fks`);
        }
    }

    fs.writeFileSync("migration-report.json", JSON.stringify(report, null, 2));

    console.log("\nRunning validation...");
    const validation = await validateMigration();
    fs.writeFileSync("validation-report.json", JSON.stringify(validation, null, 2));

    const mismatches = validation.filter((v) => !v.match);
    if (mismatches.length > 0) {
        console.log(`\nVALIDATION WARNINGS (${mismatches.length} mismatches):`);
        for (const m of mismatches) console.log(`  ${m.table}: source=${m.sourceCount} dest=${m.destCount}`);
    } else {
        console.log("Validation passed — all counts match.");
    }

    await oldDb.end();
    await newDb.end();
    console.log("\nMigration complete. See migration-report.json and migration-errors.log");
}

main().catch(async (err) => {
    console.error("FATAL:", err);
    try { await newDb.query("ROLLBACK"); } catch { /* ignore */ }
    process.exit(1);
});