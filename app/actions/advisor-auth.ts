"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAdvisorPasswordFromNameAndPhone } from "@/lib/auth/advisor-password";

export type ActionResponse<T = void> = {
	success: boolean;
	error?: string;
	data?: T;
};

export async function getAdvisorDefaultCredential(advisorId: string): Promise<
	ActionResponse<{ email: string; phone: string; derivedPassword: string }>
> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: advisor, error } = await supabase
		.from("advisors")
		.select("id, name, phone, email")
		.eq("id", advisorId)
		.maybeSingle();

	if (error || !advisor?.id) return { success: false, error: "Advisor not found" };

	const phone = String(advisor.phone ?? "");
	const email = String(advisor.email ?? "").trim() || toAdvisorEmail(phone);
	const derivedPassword = buildAdvisorPasswordFromNameAndPhone(
		String((advisor as { name?: string }).name ?? ""),
		phone,
	);

	return { success: true, data: { email, phone, derivedPassword } };
}

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

async function ensureAdvisorAuthUser(advisorId: string) {
	const supabase = await createClient();
	const admin = createAdminClient();
	if (!supabase || !admin) return { success: false, error: "Admin auth not configured" } as const;

	const { data: advisor, error } = await supabase
		.from("advisors")
		.select("id, name, phone, email, auth_user_id, is_active, business_id, parent_advisor_id")
		.eq("id", advisorId)
		.single();

	if (error || !advisor) return { success: false, error: "Advisor not found" } as const;
	if (!advisor.is_active) return { success: false, error: "Advisor is inactive" } as const;
	if (!advisor.business_id) {
		return {
			success: false,
			error: "Advisor is missing business mapping (business_id).",
		} as const;
	}

	if (advisor.auth_user_id) {
		return { success: true, auth_user_id: advisor.auth_user_id, email: advisor.email ?? null, phone: advisor.phone } as const;
	}

	const email = advisor.email?.trim() || toAdvisorEmail(advisor.phone);
	const pw = buildAdvisorPasswordFromNameAndPhone(
		String((advisor as { name?: string }).name ?? ""),
		String(advisor.phone ?? ""),
	);
	const { data: created, error: createErr } = await admin.auth.admin.createUser({
		email,
		password: pw.length >= 6 ? pw : pw.padEnd(6, "0"),
		email_confirm: true,
		user_metadata: {
			role: "advisor",
			advisor_id: advisor.id,
			business_id: advisor.business_id,
			parent_advisor_id: (advisor as { parent_advisor_id?: string | null }).parent_advisor_id ?? null,
		},
	});

	if (createErr || !created?.user) {
		return { success: false, error: createErr?.message || "Failed to create advisor auth user" } as const;
	}

	await supabase
		.from("advisors")
		.update({ auth_user_id: created.user.id, email })
		.eq("id", advisor.id);

	return { success: true, auth_user_id: created.user.id, email, phone: advisor.phone } as const;
}

export async function resetAdvisorPassword(input: {
	advisorId: string;
	mode: "phone" | "custom";
	customPassword?: string;
}): Promise<ActionResponse<{ newPassword: string }>> {
	const admin = createAdminClient();
	if (!admin) return { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" };

	const ensured = await ensureAdvisorAuthUser(input.advisorId);
	if (!ensured.success) return { success: false, error: ensured.error };

	const supabase = await createClient();
	let advisorName = "";
	if (supabase) {
		const { data: row } = await supabase
			.from("advisors")
			.select("name")
			.eq("id", input.advisorId)
			.maybeSingle();
		advisorName = String((row as { name?: string } | null)?.name ?? "");
	}
	const newPassword =
		input.mode === "phone"
			? buildAdvisorPasswordFromNameAndPhone(advisorName, String(ensured.phone ?? ""))
			: (input.customPassword || "").trim();

	if (input.mode === "custom" && newPassword.length < 6) {
		return { success: false, error: "Password must be at least 6 characters" };
	}

	const { error } = await admin.auth.admin.updateUserById(ensured.auth_user_id, {
		password: newPassword,
	});

	if (error) return { success: false, error: error.message };

	return { success: true, data: { newPassword } };
}

