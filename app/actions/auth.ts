"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAdvisorPasswordFromNameAndPhone } from "@/lib/auth/advisor-password";
import {
	assertLoginAllowed,
	clearLoginThrottle,
	hashLoginThrottleKey,
	recordLoginFailure,
} from "@/lib/auth/login-throttle";
import { sanitizeLoginIdentifier } from "@/lib/auth/sanitize-login";
import {
	isSuperadminMfaConfigured,
	verifySuperadminSecondFactor,
} from "@/lib/auth/superadmin-mfa";
import { setSuperAdminSessionCookie } from "@/lib/auth/superadmin-session-cookie";
import { redirect } from "next/navigation";

export type AuthResult = { success: boolean; error?: string };

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

function readRole(user: { user_metadata?: unknown; app_metadata?: unknown } | null): string {
	if (!user) return "";
	const md = (user.user_metadata ?? {}) as Record<string, unknown>;
	const appMd = (user.app_metadata ?? {}) as Record<string, unknown>;
	return String(md.role ?? appMd.role ?? "").trim().toLowerCase();
}

async function finalizeSuperAdminLogin(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	keyHash: string,
): Promise<never> {
	await clearLoginThrottle(keyHash);
	await setSuperAdminSessionCookie();
	redirect("/superadmin");
}

async function finalizeNonSuperAdminLogin(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	keyHash: string,
	role: string,
): Promise<never> {
	await clearLoginThrottle(keyHash);
	if (role === "advisor") redirect("/advisor");
	redirect("/dashboard");
}

export async function signInWithEmailOrPhone(
	identifier: string,
	password: string,
	secondFactor?: string,
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const idRaw = sanitizeLoginIdentifier(identifier);
	if (!idRaw || idRaw.length < 3) {
		return { success: false, error: "Enter email or phone" };
	}

	const rawPassword = typeof password === "string" ? password.trim() : "";
	const second = typeof secondFactor === "string" ? secondFactor.trim() : "";

	if (rawPassword.length > 500) {
		return { success: false, error: "Invalid credentials." };
	}

	const id = idRaw;

	if (!id.includes("@")) {
		const digits = id.replace(/\D/g, "");
		const last10 = digits.slice(-10);
		if (!last10 || last10.length < 10) {
			return { success: false, error: "Enter a valid 10-digit phone number" };
		}

		const keyHash = hashLoginThrottleKey(`phone:${last10}`);
		const gate = await assertLoginAllowed(keyHash);
		if (!gate.ok) return { success: false, error: gate.error };

		const admin = createAdminClient();
		if (!admin) {
			await recordLoginFailure(keyHash);
			return { success: false, error: "Invalid credentials." };
		}

		const { data: advisors } = await admin
			.from("advisors")
			.select("id, name, email, phone, auth_user_id, is_active, business_id, parent_advisor_id")
			.eq("is_active", true);

		const match = advisors?.find((a: { phone?: string }) => {
			const p = (a.phone || "").replace(/\D/g, "").slice(-10);
			return p === last10;
		});

		if (!match?.id) {
			await recordLoginFailure(keyHash);
			return { success: false, error: "No advisor found for this phone." };
		}

		const resolvedEmail =
			(String(match.email || "").trim() || toAdvisorEmail(String(match.phone || last10))).toLowerCase();
		if (!match.email) {
			await admin.from("advisors").update({ email: resolvedEmail }).eq("id", match.id);
		}

		const defaultPw = buildAdvisorPasswordFromNameAndPhone(
			String(match.name ?? ""),
			String(match.phone ?? ""),
		);
		const effectivePassword =
			rawPassword.length > 0
				? rawPassword.length >= 6
					? rawPassword
					: rawPassword.padEnd(6, "0")
				: defaultPw.length >= 6
					? defaultPw
					: defaultPw.padEnd(6, "0");

		if (!match.auth_user_id) {
			const { data: authUser, error: authError } = await admin.auth.admin.createUser({
				email: resolvedEmail,
				password: effectivePassword,
				email_confirm: true,
				user_metadata: {
					role: "advisor",
					advisor_id: match.id,
					business_id: match.business_id ?? null,
					parent_advisor_id: match.parent_advisor_id ?? null,
				},
			});

			if (!authError && authUser?.user?.id) {
				await admin
					.from("advisors")
					.update({ auth_user_id: authUser.user.id, email: resolvedEmail })
					.eq("id", match.id);
			}
		}

		const { error: finalErr } = await supabase.auth.signInWithPassword({
			email: resolvedEmail,
			password: effectivePassword,
		});

		if (finalErr) {
			await recordLoginFailure(keyHash);
			return { success: false, error: "Invalid credentials." };
		}

		const { data: roleUser } = await supabase.auth.getUser();
		const role = readRole(roleUser.user);
		if (role === "superadmin") {
			if (!isSuperadminMfaConfigured()) {
				await supabase.auth.signOut();
				await recordLoginFailure(keyHash);
				return {
					success: false,
					error:
						"Super admin two-step sign-in is not configured. Set SUPERADMIN_TOTP_SECRET or SUPERADMIN_SECOND_PASSWORD.",
				};
			}
			const mfa = verifySuperadminSecondFactor(second);
			if (!mfa.ok) {
				await supabase.auth.signOut();
				await recordLoginFailure(keyHash);
				return { success: false, error: mfa.error };
			}
			await finalizeSuperAdminLogin(supabase, keyHash);
			return { success: true };
		}

		await finalizeNonSuperAdminLogin(supabase, keyHash, role);
		return { success: true };
	}

	const email = id.toLowerCase();
	const keyHash = hashLoginThrottleKey(`email:${email}`);
	const gate = await assertLoginAllowed(keyHash);
	if (!gate.ok) return { success: false, error: gate.error };

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password: rawPassword,
	});

	if (error) {
		await recordLoginFailure(keyHash);
		return { success: false, error: "Invalid credentials." };
	}

	const { data: roleUser } = await supabase.auth.getUser();
	const role = readRole(roleUser.user);

	if (role === "superadmin") {
		if (!isSuperadminMfaConfigured()) {
			await supabase.auth.signOut();
			await recordLoginFailure(keyHash);
			return {
				success: false,
				error:
					"Super admin two-step sign-in is not configured. Set SUPERADMIN_TOTP_SECRET or SUPERADMIN_SECOND_PASSWORD.",
			};
		}
		const mfa = verifySuperadminSecondFactor(second);
		if (!mfa.ok) {
			await supabase.auth.signOut();
			await recordLoginFailure(keyHash);
			return { success: false, error: mfa.error };
		}
		await finalizeSuperAdminLogin(supabase, keyHash);
		return { success: true };
	}

	await finalizeNonSuperAdminLogin(supabase, keyHash, role);
	return { success: true };
}
