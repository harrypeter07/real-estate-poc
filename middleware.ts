import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getModuleKeyForPath(pathname: string): string | null {
  // Super admin /auth excluded from gating.
  if (pathname.startsWith("/superadmin") || pathname === "/login") return null;

  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/advisors") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/advisor/customers")
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

  // If user is NOT logged in and trying to access dashboard routes
  if (!user && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = (user?.user_metadata as any)?.role;

  // If superadmin is logged in, keep them inside /superadmin routes (and allow /dashboard if needed)
  if (user && String(role || "").toLowerCase() === "superadmin") {
    const allowed =
      pathname === "/superadmin" ||
      pathname.startsWith("/superadmin/") ||
      pathname === "/login" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/dashboard");

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin";
      return NextResponse.redirect(url);
    }
  }

  // If advisor is logged in, keep them inside /advisor routes or allow dashboard/enquiries
  if (user && role === "advisor") {
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

  // Module entitlement gating (real-time via business_modules)
  if (user) {
    const moduleKey = getModuleKeyForPath(pathname);
    const roleLower = String(role || "").toLowerCase();

    if (moduleKey && roleLower !== "superadmin") {
      // If entitlement row doesn't exist yet for this tenant, treat it as enabled for backward compatibility.
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

  // If user IS logged in and on /login, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    const rr = String(role || "").toLowerCase();
    url.pathname = rr === "advisor" ? "/advisor" : rr === "superadmin" ? "/superadmin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};