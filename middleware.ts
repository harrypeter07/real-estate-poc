import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SA_SESSION_COOKIE,
  SA_SESSION_MAX_MS,
  SA_MFA_PENDING_COOKIE,
} from "@/lib/auth/superadmin-session-constants";

function isFreshSuperAdminSession(saVal: string | undefined): boolean {
  const started = saVal ? parseInt(saVal, 10) : NaN;
  return Number.isFinite(started) && Date.now() - started <= SA_SESSION_MAX_MS;
}

function getModuleKeyForPath(pathname: string): string | null {
  if (
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/login")
  )
    return null;

  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/advisors") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/advisor/customers") ||
    pathname.startsWith("/advisor/projects")
  )
    return "projects";

  if (pathname.startsWith("/enquiries") || pathname.startsWith("/dashboard/enquiries")) return "enquiries";

  if (pathname.startsWith("/sales") || pathname.startsWith("/advisor/sales")) return "sales";

  if (pathname.startsWith("/payments") || pathname.startsWith("/advisor/payments")) return "payments";

  if (pathname.startsWith("/commissions") || pathname.startsWith("/advisor/commissions")) return "commissions";

  if (pathname.startsWith("/expenses")) return "expenses";

  if (pathname.startsWith("/messaging") || pathname.startsWith("/advisor/messaging")) return "messaging";

  if (pathname.startsWith("/hr")) return "hr";

  if (pathname.startsWith("/reports")) return "reports";

  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here') {
    return NextResponse.next();
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Super admin console (the protected app area) vs. the dedicated super admin
  // login flow. These share the "/superadmin" text prefix, so distinguish them
  // explicitly: the console is "/superadmin" or "/superadmin/...", while the
  // login lives at "/superadmin-login" and "/superadmin-login/verify".
  const isSaConsolePath =
    pathname === "/superadmin" || pathname.startsWith("/superadmin/");
  const isSaLoginPath =
    pathname === "/superadmin-login" || pathname.startsWith("/superadmin-login/");
  const isSaVerifyPath = pathname === "/superadmin-login/verify";

  // Pages that anyone (even logged-out) may load.
  const isPublicAuthPath = pathname === "/login" || isSaLoginPath;

  const isCriticalPath =
    isSaConsolePath ||
    isSaLoginPath ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/settings");

  let user = null;
  if (isCriticalPath) {
    const { data: { user: verifiedUser } } = await supabase.auth.getUser();
    user = verifiedUser;
  } else {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  // Not logged in: send to the correct login door.
  if (!user && !isPublicAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = isSaConsolePath ? "/superadmin-login" : "/login";
    return NextResponse.redirect(url);
  }

  const role =
    (user?.user_metadata as any)?.role ?? (user?.app_metadata as any)?.role;
  const roleLower = String(role || "").toLowerCase();

  const saCookie = request.cookies.get(SA_SESSION_COOKIE)?.value;
  const mfaPending = !!request.cookies.get(SA_MFA_PENDING_COOKIE)?.value;

  // A logged-in non-super-admin has no business on super admin pages
  // (neither the console nor the super admin login flow).
  if (user && roleLower !== "superadmin" && (isSaConsolePath || isSaLoginPath)) {
    const url = request.nextUrl.clone();
    url.pathname = roleLower === "advisor" ? "/advisor" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Super admin reaching the console: enforce the short, MFA-backed session.
  if (user && roleLower === "superadmin" && isSaConsolePath) {
    if (isFreshSuperAdminSession(saCookie)) {
      /* allow */
    } else if (mfaPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin-login/verify";
      return NextResponse.redirect(url);
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/superadmin-session-end";
      url.searchParams.set("reason", "timeout");
      return NextResponse.redirect(url);
    }
  }

  // Super admin moving through the dedicated login flow: keep the steps ordered.
  if (user && roleLower === "superadmin" && isSaLoginPath) {
    if (isFreshSuperAdminSession(saCookie)) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin";
      return NextResponse.redirect(url);
    }
    if (mfaPending && !isSaVerifyPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin-login/verify";
      return NextResponse.redirect(url);
    }
    if (!mfaPending && isSaVerifyPath) {
      // Reached the second step without finishing the first one.
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin-login";
      return NextResponse.redirect(url);
    }
  }

  // Confine super admins to their own surfaces.
  if (user && roleLower === "superadmin") {
    const allowed =
      isSaConsolePath ||
      isSaLoginPath ||
      pathname === "/login" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/auth/superadmin-session-end") ||
      pathname.startsWith("/api/auth/superadmin-signout");

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin";
      return NextResponse.redirect(url);
    }
  }

  if (user && roleLower === "advisor") {
    const allowed =
      pathname === "/advisor" ||
      pathname.startsWith("/advisor/") ||
      pathname === "/login" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/dashboard/enquiries");

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/advisor";
      return NextResponse.redirect(url);
    }
  }

  // Module check moved to page/layout level for better performance and to allow loading states to show.
  // The sidebar already filters these links, so this check in middleware was redundant and slow.

  // Authenticated users landing on the public login page get routed home.
  if (user && pathname === "/login") {
    if (roleLower === "superadmin") {
      // Super admins do not sign in here — push them to their own flow.
      if (isFreshSuperAdminSession(saCookie)) {
        const url = request.nextUrl.clone();
        url.pathname = "/superadmin";
        return NextResponse.redirect(url);
      }
      const url = request.nextUrl.clone();
      url.pathname = mfaPending ? "/superadmin-login/verify" : "/superadmin-login";
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname =
      roleLower === "advisor"
        ? "/advisor"
        : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
