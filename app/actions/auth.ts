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
import {
	setSuperAdminSessionCookie,
	setSuperAdminMfaPendingCookie,
	clearSuperAdminMfaPendingCookie,
} from "@/lib/auth/superadmin-session-cookie";
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

function throttleKeyForUser(user: { email?: string | null } | null): string | null {
	const e = (user?.email || "").trim().toLowerCase();
	return e ? hashLoginThrottleKey(`email:${e}`) : null;
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

/**
 * Public admin / advisor login (email or phone + password).
 * Super admin accounts are rejected here and must use signInSuperAdmin
 * via the dedicated /superadmin-login entry point.
 */
export async function signInWithEmailOrPhone(
	identifier: string,
	password: string,
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const idRaw = sanitizeLoginIdentifier(identifier);
	if (!idRaw || idRaw.length < 3) {
		return { success: false, error: "Enter email or phone" };
	}

	const rawPassword = typeof password === "string" ? password.trim() : "";

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
		if (!match.business_id) {
			await recordLoginFailure(keyHash);
			return {
				success: false,
				error:
					"Advisor is missing business mapping. Ask admin to assign business_id in advisors table.",
			};
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
		const defaultPasswordNormalized = defaultPw.length >= 6 ? defaultPw : defaultPw.padEnd(6, "0");
		const advisorMetadata = {
			role: "advisor",
			advisor_id: match.id,
			business_id: match.business_id,
			parent_advisor_id: match.parent_advisor_id ?? null,
		};

		if (!match.auth_user_id) {
			const { data: authUser, error: authError } = await admin.auth.admin.createUser({
				email: resolvedEmail,
				password: effectivePassword,
				email_confirm: true,
				user_metadata: advisorMetadata,
			});

			if (!authError && authUser?.user?.id) {
				await admin
					.from("advisors")
					.update({ auth_user_id: authUser.user.id, email: resolvedEmail })
					.eq("id", match.id);
			}
		} else {
			// Keep advisor auth profile aligned after phone/email/parent updates.
			await admin.auth.admin.updateUserById(String(match.auth_user_id), {
				email: resolvedEmail,
				user_metadata: advisorMetadata,
			});
			await admin.from("advisors").update({ email: resolvedEmail }).eq("id", match.id);
		}

		let { error: finalErr } = await supabase.auth.signInWithPassword({
			email: resolvedEmail,
			password: effectivePassword,
		});
		if (finalErr && match.auth_user_id) {
			const isUsingDefaultPassword =
				rawPassword.length === 0 ||
				rawPassword === defaultPw ||
				rawPassword === defaultPasswordNormalized;
			if (isUsingDefaultPassword) {
				await admin.auth.admin.updateUserById(String(match.auth_user_id), {
					email: resolvedEmail,
					password: defaultPasswordNormalized,
					user_metadata: advisorMetadata,
				});
				await admin.from("advisors").update({ email: resolvedEmail }).eq("id", match.id);
				const retry = await supabase.auth.signInWithPassword({
					email: resolvedEmail,
					password: defaultPasswordNormalized,
				});
				finalErr = retry.error;
			}
		}

		if (finalErr) {
			await recordLoginFailure(keyHash);
			return { success: false, error: "Invalid credentials." };
		}

		const { data: roleUser } = await supabase.auth.getUser();
		const role = readRole(roleUser.user);
		if (role === "superadmin") {
			// Super admins are not allowed through the public admin login.
			// They must use the dedicated /superadmin-login entry point.
			await supabase.auth.signOut();
			await recordLoginFailure(keyHash);
			return {
				success: false,
				error: "Super admins must sign in from the super admin console login page.",
			};
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
		// Super admins are not allowed through the public admin login.
		// They must use the dedicated /superadmin-login entry point.
		await supabase.auth.signOut();
		await recordLoginFailure(keyHash);
		return {
			success: false,
			error: "Super admins must sign in from the super admin console login page.",
		};
	}

	if (roleUser.user) {
		const adminClient = createAdminClient();
		if (adminClient) {
			if (role === "admin") {
				const { data: adminCheck } = await adminClient
					.from("business_admins")
					.select("is_active")
					.eq("auth_user_id", roleUser.user.id)
					.maybeSingle();
				if (!adminCheck || !adminCheck.is_active) {
					await supabase.auth.signOut();
					await recordLoginFailure(keyHash);
					return {
						success: false,
						error: "Your admin account is disabled. Please contact the superadmin.",
					};
				}
			} else if (role === "advisor") {
				const { data: advisorCheck } = await adminClient
					.from("advisors")
					.select("is_active")
					.eq("auth_user_id", roleUser.user.id)
					.maybeSingle();
				if (!advisorCheck || !advisorCheck.is_active) {
					await supabase.auth.signOut();
					await recordLoginFailure(keyHash);
					return {
						success: false,
						error: "Your advisor account has been disabled. Please contact support.",
					};
				}
			}
		}
	}

	await finalizeNonSuperAdminLogin(supabase, keyHash, role);
	return { success: true };
}

/**
 * Super admin step 1: email + password from the dedicated /superadmin-login page.
 * Only super admin accounts are accepted; any other role is rejected and signed out.
 * On success the second step continues at /superadmin-login/verify.
 */
export async function signInSuperAdmin(
	identifier: string,
	password: string,
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const idRaw = sanitizeLoginIdentifier(identifier);
	if (!idRaw || idRaw.length < 3) {
		return { success: false, error: "Enter email or phone" };
	}

	// Super admin accounts authenticate by email. Phone-based (advisor) login is not allowed here.
	if (!idRaw.includes("@")) {
		return {
			success: false,
			error: "Super admins must sign in with their email address.",
		};
	}

	const rawPassword = typeof password === "string" ? password.trim() : "";
	if (rawPassword.length > 500) {
		return { success: false, error: "Invalid credentials." };
	}

	const email = idRaw.toLowerCase();
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

	if (role !== "superadmin") {
		// Not a super admin — do not establish a session through this door.
		await supabase.auth.signOut();
		await recordLoginFailure(keyHash);
		return {
			success: false,
			error: "This login is for super admin accounts only. Please use the main login page.",
		};
	}

	if (!isSuperadminMfaConfigured()) {
		await supabase.auth.signOut();
		await recordLoginFailure(keyHash);
		return {
			success: false,
			error:
				"Super admin two-step sign-in is not configured. Set SUPERADMIN_TOTP_SECRET or SUPERADMIN_SECOND_PASSWORD.",
		};
	}

	await clearLoginThrottle(keyHash);
	await setSuperAdminMfaPendingCookie();
	redirect("/superadmin-login/verify");
}

/** Step 2: only after password sign-in + sa_mfa_pending cookie */
export async function completeSuperAdminMfa(code: string): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: authData } = await supabase.auth.getUser();
	const user = authData.user;
	if (!user) {
		return { success: false, error: "Session expired. Sign in again." };
	}

	if (readRole(user) !== "superadmin") {
		return { success: false, error: "This step is only for super admin accounts." };
	}

	const keyHash = throttleKeyForUser(user);
	const trimmed = typeof code === "string" ? code.trim() : "";
	const mfa = verifySuperadminSecondFactor(trimmed);
	if (!mfa.ok) {
		if (keyHash) await recordLoginFailure(keyHash);
		return { success: false, error: mfa.error };
	}

	if (keyHash) await clearLoginThrottle(keyHash);
	await clearSuperAdminMfaPendingCookie();
	await setSuperAdminSessionCookie();
	redirect("/superadmin");
	return { success: true };
}
