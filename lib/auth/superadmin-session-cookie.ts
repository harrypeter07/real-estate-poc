import { cookies } from "next/headers";
import { SA_SESSION_COOKIE, SA_SESSION_MAX_MS } from "@/lib/auth/superadmin-session-constants";

export { SA_SESSION_COOKIE, SA_SESSION_MAX_MS };

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
