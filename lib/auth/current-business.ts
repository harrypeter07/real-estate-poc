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

	const { data } = await supabase
		.from("_app_kv")
		.select("value")
		.eq("key", "default_business_id")
		.maybeSingle();

	const fromKv = String(data?.value ?? "").trim();
	return fromKv || null;
}

