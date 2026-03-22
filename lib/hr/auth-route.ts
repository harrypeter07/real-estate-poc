import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAdmin() {
	const supabase = await createClient();
	if (!supabase) {
		return { error: NextResponse.json({ error: "Database unavailable" }, { status: 500 }) };
	}
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
	}
	if ((user.user_metadata as { role?: string })?.role !== "admin") {
		return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
	}
	return { supabase, user };
}
