import { createHmac, timingSafeEqual, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

function throttleSecret(): string {
	return (
		process.env.LOGIN_THROTTLE_SECRET ||
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		"dev-login-throttle-change-me"
	);
}

/** Stable hash for DB row key (no PII stored in plain text). */
export function hashLoginThrottleKey(normalizedIdentifier: string): string {
	return createHmac("sha256", throttleSecret())
		.update(normalizedIdentifier, "utf8")
		.digest("hex");
}

export type ThrottleGate =
	| { ok: true }
	| { ok: false; error: string };

export async function assertLoginAllowed(keyHash: string): Promise<ThrottleGate> {
	const admin = createAdminClient();
	if (!admin) return { ok: true };

	const { data, error } = await admin
		.from("login_throttle")
		.select("failed_count, locked_until")
		.eq("key_hash", keyHash)
		.maybeSingle();

	if (error) return { ok: true };

	const lockedUntil = data?.locked_until ? new Date(data.locked_until as string) : null;
	if (lockedUntil && lockedUntil.getTime() > Date.now()) {
		const mins = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
		return {
			ok: false,
			error: `Too many failed attempts. Try again in ${mins} minute(s).`,
		};
	}

	return { ok: true };
}

export async function recordLoginFailure(keyHash: string): Promise<void> {
	const admin = createAdminClient();
	if (!admin) return;

	const { data } = await admin
		.from("login_throttle")
		.select("failed_count, locked_until")
		.eq("key_hash", keyHash)
		.maybeSingle();

	const now = Date.now();
	let failed = (data?.failed_count as number | undefined) ?? 0;
	failed += 1;

	let locked_until: string | null = null;
	if (failed >= MAX_FAILS) {
		locked_until = new Date(now + LOCK_MS).toISOString();
		failed = 0;
	}

	await admin.from("login_throttle").upsert(
		{
			key_hash: keyHash,
			failed_count: failed,
			locked_until,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "key_hash" },
	);
}

export async function clearLoginThrottle(keyHash: string): Promise<void> {
	const admin = createAdminClient();
	if (!admin) return;
	await admin.from("login_throttle").delete().eq("key_hash", keyHash);
}

export function safeEqualString(a: string, b: string): boolean {
	const ah = createHash("sha256").update(a, "utf8").digest();
	const bh = createHash("sha256").update(b, "utf8").digest();
	return ah.length === bh.length && timingSafeEqual(ah, bh);
}
