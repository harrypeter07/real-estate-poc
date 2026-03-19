"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export type AuthResult = { success: boolean; error?: string };

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

export async function signInWithEmailOrPhone(
	identifier: string,
	password: string
): Promise<AuthResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const id = (identifier || "").trim();
	if (!id) return { success: false, error: "Enter email or phone" };
	let email = id;
	const rawPassword = (password || "").trim();

	// If not an email, treat as phone and map advisor->email
	if (!id.includes("@")) {
		const sanitized = id.replace(/\D/g, "").slice(-10);
		if (!sanitized || sanitized.length < 10) {
			return { success: false, error: "Enter a valid 10-digit phone number" };
		}

		const effectivePassword = rawPassword.length ? rawPassword : sanitized;
		const { data: advisors } = await supabase
			.from("advisors")
			.select("id, email, phone, auth_user_id, is_active")
			.eq("is_active", true);

		const match = advisors?.find((a) => {
			const p = (a.phone || "").replace(/\D/g, "").slice(-10);
			return p === sanitized;
		});

		if (!match?.id) {
			return {
				success: false,
				error: "No advisor found for this phone."
			};
		}

		// Ensure we have an email for auth.
		email = (match.email || "").trim() || toAdvisorEmail(match.phone || sanitized);
		if (!match.email) {
			await supabase.from("advisors").update({ email }).eq("id", match.id);
		}

		// If advisor auth user doesn't exist yet, create it (service role required).
		if (!match.auth_user_id) {
			const admin = createAdminClient();
			if (!admin) {
				return {
					success: false,
					error:
						"Advisor login not configured on server. Ask admin to ensure SUPABASE_SERVICE_ROLE_KEY is set.",
				};
			}

			const defaultPassword = sanitized; // keep consistent with "default password = phone"
			const pw = defaultPassword.length >= 6 ? defaultPassword : defaultPassword.padEnd(6, "0");
			const { data: authUser, error: authError } = await admin.auth.admin.createUser({
				email,
				password: pw,
				email_confirm: true,
				user_metadata: { role: "advisor", advisor_id: match.id },
			});

			// Even if it fails (duplicate user), we'll still try sign-in.
			if (!authError && authUser?.user?.id) {
				await supabase
					.from("advisors")
					.update({ auth_user_id: authUser.user.id, email })
					.eq("id", match.id);
			}
		}

		password = effectivePassword;
	}

	const { error } = await supabase.auth.signInWithPassword({
		email,
		password: (password || "").trim(),
	});

	if (error) {
		return { success: false, error: "Invalid credentials." };
	}

	redirect("/dashboard");
}
