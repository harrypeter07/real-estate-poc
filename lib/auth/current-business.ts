import { createClient } from "@/lib/supabase/server";

export async function getCurrentBusinessId(): Promise<string | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const md = (user?.user_metadata ?? {}) as any;
	const fromMeta = String(md.business_id ?? "").trim();
	if (fromMeta) return fromMeta;

	// Admin fallback: resolve business from mapping table.
	// This handles older users where business_id was not persisted in JWT metadata.
	if (user?.id) {
		const { data: adminMap } = await supabase
			.from("business_admins")
			.select("business_id")
			.eq("auth_user_id", user.id)
			.maybeSingle();
		const fromAdminMap = String((adminMap as any)?.business_id ?? "").trim();
		if (fromAdminMap) return fromAdminMap;

		// Advisor fallback: resolve business directly by auth user mapping.
		const { data: advisorMap } = await supabase
			.from("advisors")
			.select("business_id")
			.eq("auth_user_id", user.id)
			.maybeSingle();
		const fromAdvisorMap = String((advisorMap as any)?.business_id ?? "").trim();
		if (fromAdvisorMap) return fromAdvisorMap;
	}

	const { data } = await supabase
		.from("_app_kv")
		.select("value")
		.eq("key", "default_business_id")
		.maybeSingle();

	const fromKv = String(data?.value ?? "").trim();
	return fromKv || null;
}

