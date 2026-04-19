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
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/login")) return null;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role =
    (user?.user_metadata as any)?.role ?? (user?.app_metadata as any)?.role;
  const roleLower = String(role || "").toLowerCase();

  if (user && roleLower !== "superadmin" && pathname.startsWith("/superadmin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const saCookie = request.cookies.get(SA_SESSION_COOKIE)?.value;
  const mfaPending = !!request.cookies.get(SA_MFA_PENDING_COOKIE)?.value;

  if (
    user &&
    roleLower === "superadmin" &&
    pathname.startsWith("/superadmin") &&
    !pathname.startsWith("/api/auth/superadmin-session-end") &&
    !pathname.startsWith("/api/auth/superadmin-signout")
  ) {
    if (isFreshSuperAdminSession(saCookie)) {
      /* allow */
    } else if (mfaPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/login/superadmin-mfa";
      return NextResponse.redirect(url);
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/superadmin-session-end";
      url.searchParams.set("reason", "timeout");
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname.startsWith("/login/superadmin-mfa")) {
    if (roleLower !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (!mfaPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (user && roleLower === "superadmin") {
    const allowed =
      pathname === "/login" ||
      pathname.startsWith("/login/superadmin-mfa") ||
      pathname === "/superadmin" ||
      pathname.startsWith("/superadmin/") ||
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

  if (user) {
    const moduleKey = getModuleKeyForPath(pathname);

    if (moduleKey && roleLower !== "superadmin") {
      const { data: modRow } = await supabase
        .from("business_modules")
        .select("enabled")
        .eq("module_key", moduleKey)
        .maybeSingle();

      if (modRow && modRow.enabled === false) {
        const url = request.nextUrl.clone();
        url.pathname = roleLower === "advisor" ? "/advisor" : "/dashboard";
        url.searchParams.set("forbidden", "module");
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && pathname === "/login") {
    if (roleLower === "superadmin") {
      if (isFreshSuperAdminSession(saCookie)) {
        const url = request.nextUrl.clone();
        url.pathname = "/superadmin";
        return NextResponse.redirect(url);
      }
      if (mfaPending) {
        const url = request.nextUrl.clone();
        url.pathname = "/login/superadmin-mfa";
        return NextResponse.redirect(url);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/superadmin-session-end";
      url.searchParams.set("reason", "stale");
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
