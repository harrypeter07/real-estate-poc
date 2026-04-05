import { cookies } from "next/headers";
import {
	SA_SESSION_COOKIE,
	SA_SESSION_MAX_MS,
	SA_MFA_PENDING_COOKIE,
	SA_MFA_PENDING_MAX_AGE_SEC,
} from "@/lib/auth/superadmin-session-constants";

export {
	SA_SESSION_COOKIE,
	SA_SESSION_MAX_MS,
	SA_MFA_PENDING_COOKIE,
	SA_MFA_PENDING_MAX_AGE_SEC,
};

export async function setSuperAdminSessionCookie(): Promise<void> {
	const jar = await cookies();
	jar.set(SA_SESSION_COOKIE, String(Date.now()), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: Math.floor(SA_SESSION_MAX_MS / 1000),
		path: "/",
	});
}

export async function clearSuperAdminSessionCookie(): Promise<void> {
	const jar = await cookies();
	jar.set(SA_SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function setSuperAdminMfaPendingCookie(): Promise<void> {
	const jar = await cookies();
	jar.set(SA_MFA_PENDING_COOKIE, "1", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SA_MFA_PENDING_MAX_AGE_SEC,
		path: "/",
	});
}

export async function clearSuperAdminMfaPendingCookie(): Promise<void> {
	const jar = await cookies();
	jar.set(SA_MFA_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
}
