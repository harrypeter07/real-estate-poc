import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default async function RootPage() {
  const supabase = await createClient();
  
  if (!supabase) {
    redirect("/login");
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const md = (user.user_metadata ?? {}) as { role?: string };
    const ad = (user.app_metadata ?? {}) as { role?: string };
    const rr = String(md.role ?? ad.role ?? "").trim().toLowerCase();
    if (rr === "superadmin") {
      redirect("/superadmin");
    }
    if (rr === "advisor") {
      redirect("/advisor");
    }

    redirect("/dashboard");
  } catch (error) {
    // Next.js `redirect()` throws internally; don't log it as an auth error.
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Auth error in root page:", error);
    redirect("/login");
  }
}
