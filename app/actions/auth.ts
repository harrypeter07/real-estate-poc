"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthResult = { success: boolean; error?: string };

export async function signInAdvisor(phone: string, password: string): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const sanitized = phone.replace(/\D/g, "").slice(-10);
	const { data: advisors } = await supabase
		.from("advisors")
		.select("id, email, phone")
		.eq("is_active", true);

	const match = advisors?.find((a) => {
		const p = (a.phone || "").replace(/\D/g, "").slice(-10);
		return p === sanitized;
	});

	if (!match?.email) {
		return { success: false, error: "Advisor not found or not active. Contact admin." };
	}

	const { error } = await supabase.auth.signInWithPassword({
		email: match.email,
		password,
	});

	if (error) {
		return { success: false, error: "Invalid phone or password." };
	}

	redirect("/dashboard");
}
