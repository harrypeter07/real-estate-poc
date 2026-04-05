/**
 * One-off: set each advisor Auth password to buildAdvisorPasswordFromNameAndPhone(name, phone).
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 * Run: node scripts/sync-advisor-auth-passwords.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function buildAdvisorPasswordFromNameAndPhone(name, phone) {
	const digits = (phone || "").replace(/\D/g, "");
	const last10 = digits.length >= 10 ? digits.slice(-10) : digits.padStart(10, "0");
	const slug = (name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 32);
	const base = `${slug || "adv"}${last10}`;
	if (base.length >= 6) return base;
	return (base + "0000000000").slice(0, 6);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
	console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

const admin = createClient(url, key);

async function main() {
	const { data: advisors, error } = await admin
		.from("advisors")
		.select("id, name, phone, auth_user_id")
		.not("auth_user_id", "is", null);

	if (error) {
		console.error(error.message);
		process.exit(1);
	}

	let ok = 0;
	let fail = 0;
	for (const a of advisors ?? []) {
		const pw = buildAdvisorPasswordFromNameAndPhone(a.name ?? "", a.phone ?? "");
		const finalPw = pw.length >= 6 ? pw : pw.padEnd(6, "0");
		const { error: uErr } = await admin.auth.admin.updateUserById(a.auth_user_id, {
			password: finalPw,
		});
		if (uErr) {
			console.error("FAIL", a.id, uErr.message);
			fail++;
		} else {
			console.log("OK", a.name, a.id);
			ok++;
		}
	}
	console.log(`Done. ${ok} updated, ${fail} failed.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
