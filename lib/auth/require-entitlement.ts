"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ModuleKey =
	| "projects"
	| "sales"
	| "payments"
	| "commissions"
	| "expenses"
	| "messaging"
	| "enquiries"
	| "hr"
	| "reports";

function roleOf(user: any): string {
	return String(user?.user_metadata?.role ?? "").trim().toLowerCase();
}

export async function requireEntitlement(moduleKey: ModuleKey) {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = roleOf(user);
	if (role === "superadmin") return { supabase, user, moduleKey };

	// If not superadmin, check business_modules for this tenant.
	const { data: row, error } = await supabase
		.from("business_modules")
		.select("enabled")
		.eq("module_key", moduleKey)
		.maybeSingle();

	// If business scoping is not set up yet for this tenant, keep old behavior (do not hard-block).
	if (error) return { supabase, user, moduleKey };

	if (!row?.enabled) {
		// Use a consistent forbidden UX.
		redirect("/dashboard?forbidden=module");
	}

	return { supabase, user, moduleKey };
}

