import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSuperClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function GET() {
  const logFile = path.join(process.cwd(), "debug_dues.log");
  try {
    const serverClient = await createServerClient();
    const superClient = createSuperClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. Check with service role (admin)
    const { count: superSales, error: errSales1 } = await superClient
      .from("plot_sales")
      .select("*", { count: "exact", head: true });

    const { count: superEmis, error: errEmis1 } = await superClient
      .from("emi_schedule")
      .select("*", { count: "exact", head: true });

    // 2. Check with user client (RLS active)
    let userSalesCount = -1;
    let userEmisCount = -1;
    let userEmail = "none";
    let businessId = "none";

    if (serverClient) {
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        userEmail = user.email || "";
        const { data: profile } = await serverClient
          .from("business_profiles")
          .select("id")
          .limit(1)
          .maybeSingle();
        businessId = profile?.id || "";

        const { count: uSales } = await serverClient
          .from("plot_sales")
          .select("*", { count: "exact", head: true });
        userSalesCount = uSales ?? 0;

        const { count: uEmis } = await serverClient
          .from("emi_schedule")
          .select("*", { count: "exact", head: true });
        userEmisCount = uEmis ?? 0;
      }
    }

    const logMsg = `[${new Date().toISOString()}] DIAGNOSTIC RESULTS:
- Supabase Admin Client:
  * plot_sales count: ${superSales ?? 0} (Err: ${errSales1?.message || "none"})
  * emi_schedule count: ${superEmis ?? 0} (Err: ${errEmis1?.message || "none"})
- Logged-in User Client (${userEmail}, Business: ${businessId}):
  * plot_sales count: ${userSalesCount}
  * emi_schedule count: ${userEmisCount}
----------------------------------------\n`;

    fs.appendFileSync(logFile, logMsg);

    return NextResponse.json({
      success: true,
      diagnostic: {
        admin: { sales: superSales, emis: superEmis },
        user: { email: userEmail, businessId, sales: userSalesCount, emis: userEmisCount }
      }
    });
  } catch (err: any) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Diagnostic error: ${err.message}\n`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
