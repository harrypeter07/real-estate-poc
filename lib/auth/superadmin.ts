"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export function isSuperAdmin(user: User | null): boolean {
	if (!user) return false;
	const md = (user.user_metadata ?? {}) as Record<string, unknown>;
	const role = String(md.role ?? "").trim().toLowerCase();
	return role === "superadmin";
}

export async function requireSuperAdmin() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!isSuperAdmin(user)) redirect("/login");
	return { supabase, user: user! };
}

