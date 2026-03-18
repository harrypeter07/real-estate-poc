"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthResult = { success: boolean; error?: string };

export async function signInWithEmailOrPhone(
	identifier: string,
	password: string
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const id = (identifier || "").trim();
	let email = id;

	// If not an email, treat as phone and map advisor->email
	if (!id.includes("@")) {
		const sanitized = id.replace(/\D/g, "").slice(-10);
		const { data: advisors } = await supabase
			.from("advisors")
			.select("id, email, phone")
			.eq("is_active", true);

		const match = advisors?.find((a) => {
			const p = (a.phone || "").replace(/\D/g, "").slice(-10);
			return p === sanitized;
		});

		if (!match?.email) {
			return {
				success: false,
				error:
					"No advisor found for this phone (or advisor login not configured). Use email login or contact admin.",
			};
		}
		email = match.email;
	}

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		return { success: false, error: "Invalid credentials." };
	}

	redirect("/dashboard");
}
