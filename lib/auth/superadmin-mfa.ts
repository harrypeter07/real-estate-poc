import { verifySync } from "otplib";
import { safeEqualString } from "@/lib/auth/login-throttle";

export function isSuperadminMfaConfigured(): boolean {
	const totp = (process.env.SUPERADMIN_TOTP_SECRET || "").trim();
	const second = (process.env.SUPERADMIN_SECOND_PASSWORD || "").trim();
	return totp.length > 0 || second.length > 0;
}

/**
 * Second step for super admin: TOTP (if SUPERADMIN_TOTP_SECRET) else static passphrase
 * (SUPERADMIN_SECOND_PASSWORD). At least one must be set in production use.
 */
export function verifySuperadminSecondFactor(code: string): { ok: true } | { ok: false; error: string } {
	const trimmed = (code || "").trim().replace(/\s+/g, "");
	const totpSecret = (process.env.SUPERADMIN_TOTP_SECRET || "").trim();
	const staticPw = (process.env.SUPERADMIN_SECOND_PASSWORD || "").trim();

	if (!isSuperadminMfaConfigured()) {
		return {
			ok: false,
			error:
				"Super admin two-step sign-in is not configured. Set SUPERADMIN_TOTP_SECRET (authenticator app) or SUPERADMIN_SECOND_PASSWORD.",
		};
	}

	if (totpSecret.length > 0) {
		try {
			const result = verifySync({
				secret: totpSecret,
				token: trimmed,
				epochTolerance: 30,
			});
			return result.valid
				? { ok: true }
				: { ok: false, error: "Invalid authenticator code." };
		} catch {
			return { ok: false, error: "Invalid authenticator code." };
		}
	}

	if (!trimmed) {
		return { ok: false, error: "Enter your super admin security code (second step)." };
	}

	if (safeEqualString(trimmed, staticPw)) return { ok: true };
	return { ok: false, error: "Invalid security code." };
}
