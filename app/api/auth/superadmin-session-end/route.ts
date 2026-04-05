import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SA_SESSION_COOKIE, SA_MFA_PENDING_COOKIE } from "@/lib/auth/superadmin-session-constants";

export async function GET(request: NextRequest) {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anon) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const cookieStore = await cookies();
	const supabase = createServerClient(url, anon, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				} catch {
					/* ignore */
				}
			},
		},
	});

	await supabase.auth.signOut();

	const login = new URL("/login", request.url);
	login.searchParams.set("reason", request.nextUrl.searchParams.get("reason") || "session");
	const res = NextResponse.redirect(login);
	res.cookies.set(SA_SESSION_COOKIE, "", { maxAge: 0, path: "/" });
	res.cookies.set(SA_MFA_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
	return res;
}
