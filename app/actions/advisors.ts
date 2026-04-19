"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
	advisorSchema,
	type AdvisorFormValues,
} from "@/lib/validations/advisor";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { buildAdvisorPasswordFromNameAndPhone } from "@/lib/auth/advisor-password";
import { mapUniquePhoneViolation } from "@/lib/utils/db-errors";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export type AdvisorDeleteImpact = {
	advisor_id: string;
	advisor_name: string;
	sub_advisors: number;
	customers: number;
	sales: number;
	commission_rows: number;
	commission_payments: number;
	project_assignments: number;
	birthday_reminders: number;
};

function getNextBirthdayDate(birthDate: string): string | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;
	const today = new Date();
	const month = parsed.getMonth();
	const day = parsed.getDate();
	let target = new Date(today.getFullYear(), month, day);
	target.setHours(0, 0, 0, 0);
	const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	if (target < now) target = new Date(today.getFullYear() + 1, month, day);
	return target.toISOString().slice(0, 10);
}

async function syncAdvisorBirthdayReminder(
	supabase: any,
	advisor: { id: string; name: string; phone: string; birth_date?: string | null },
) {
	const businessId = await getCurrentBusinessId();
	if (!businessId) return;

	const marker = `AUTO_BIRTHDAY:advisor:${advisor.id}`;
	const { data: existing } = await supabase
		.from("reminders")
		.select("id")
		.eq("description", marker)
		.maybeSingle();

	const nextDate = advisor.birth_date ? getNextBirthdayDate(advisor.birth_date) : null;
	if (!nextDate) {
		if (existing?.id) {
			await supabase.from("reminders").delete().eq("id", existing.id);
		}
		return;
	}

	const payload = {
		business_id: businessId,
		title: `Birthday Wish - ${advisor.name}`,
		type: "birthday_advisor",
		phone: advisor.phone || null,
		description: marker,
		reminder_date: nextDate,
		reminder_time: "09:00",
		customer_id: null,
		project_id: null,
		is_completed: false,
	};

	if (existing?.id) {
		await supabase.from("reminders").update(payload).eq("id", existing.id);
	} else {
		await supabase.from("reminders").insert(payload);
	}
}

function toAdvisorEmail(phone: string): string {
	const sanitized = phone.replace(/\D/g, "").slice(-10) || "0";
	return `adv_${sanitized}@mginfra.local`;
}

export async function createAdvisor(
	values: AdvisorFormValues
): Promise<ActionResponse> {
	const parsed = advisorSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const admin = createAdminClient();

	const advisorEmail = parsed.data.email?.trim() || toAdvisorEmail(parsed.data.phone);
	const password =
		parsed.data.use_phone_as_password || !parsed.data.password?.trim()
			? buildAdvisorPasswordFromNameAndPhone(parsed.data.name, parsed.data.phone)
			: parsed.data.password;

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { data: advisor, error } = await supabase
		.from("advisors")
		.insert({
			business_id: businessId,
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			email: advisorEmail,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
		})
		.select("id")
		.single();

	if (error) {
		const msg = (error.message || "").toLowerCase();
		// Supabase/PostgREST schema cache error when DB migration not applied yet
		if (msg.includes("schema cache") && msg.includes("email")) {
			return {
				success: false,
				error:
					"Database is missing `advisors.email` (or schema cache not refreshed). " +
					"Run the migration in Supabase SQL Editor, then retry.\n\n" +
					"SQL:\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS email TEXT;\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;\n",
			};
		}
		if (error.code === "23505") {
			const phoneMsg = mapUniquePhoneViolation(error, "advisor");
			if (phoneMsg) return { success: false, error: phoneMsg };
			return {
				success: false,
				error: "Advisor code already exists for this business.",
			};
		}
		return { success: false, error: error.message };
	}

	if (advisor?.id) {
		await syncAdvisorBirthdayReminder(supabase, {
			id: advisor.id,
			name: parsed.data.name,
			phone: parsed.data.phone,
			birth_date: parsed.data.birth_date ?? null,
		});
	}

	// Create Supabase Auth user for advisor login (requires SUPABASE_SERVICE_ROLE_KEY)
	const admin = createAdminClient();
	if (admin && advisor?.id) {
		const pw = password.length >= 6 ? password : String(password).padEnd(6, "0");
		const { data: authUser, error: authError } = await admin.auth.admin.createUser({
			email: advisorEmail,
			password: pw,
			email_confirm: true,
			user_metadata: { role: "advisor", advisor_id: advisor.id, business_id: businessId },
		});
		if (!authError && authUser?.user) {
			await supabase
				.from("advisors")
				.update({ auth_user_id: authUser.user.id, email: advisorEmail })
				.eq("id", advisor.id);
		}
	}

	revalidatePath("/advisors");
	revalidatePath("/messaging");
	return { success: true };
}

export async function updateAdvisor(
	id: string,
	values: AdvisorFormValues
): Promise<ActionResponse> {
	const parsed = advisorSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: updatedAdvisor, error } = await supabase
		.from("advisors")
		.update({
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			// Always keep email populated for advisor login (auto-generate if blank).
			email: parsed.data.email?.trim()
				? parsed.data.email.trim()
				: toAdvisorEmail(parsed.data.phone),
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		.select("id, name, phone, birth_date, email, auth_user_id, business_id, parent_advisor_id")
		.single();

	if (error) {
		const msg = (error.message || "").toLowerCase();
		if (msg.includes("schema cache") && msg.includes("email")) {
			return {
				success: false,
				error:
					"Database is missing `advisors.email` (or schema cache not refreshed). " +
					"Run the migration in Supabase SQL Editor, then retry.\n\n" +
					"SQL:\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS email TEXT;\n" +
					"ALTER TABLE advisors ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;\n",
			};
		}
		if (error.code === "23505") {
			const phoneMsg = mapUniquePhoneViolation(error, "advisor");
			if (phoneMsg) return { success: false, error: phoneMsg };
			return {
				success: false,
				error: "Advisor code already exists for this business.",
			};
		}
		return { success: false, error: error.message };
	}

	if (updatedAdvisor?.id) {
		await syncAdvisorBirthdayReminder(supabase, updatedAdvisor);
	}
	if (updatedAdvisor?.id && admin && updatedAdvisor.auth_user_id) {
		const authEmail =
			String(updatedAdvisor.email ?? "").trim() || toAdvisorEmail(String(updatedAdvisor.phone ?? ""));
		await admin.auth.admin.updateUserById(String(updatedAdvisor.auth_user_id), {
			email: authEmail,
			user_metadata: {
				role: "advisor",
				advisor_id: updatedAdvisor.id,
				business_id: updatedAdvisor.business_id ?? null,
				parent_advisor_id: updatedAdvisor.parent_advisor_id ?? null,
			},
		});
	}

	revalidatePath("/advisors");
	revalidatePath(`/advisors/${id}`);
	revalidatePath("/messaging");
	return { success: true };
}

export async function getAdvisors() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("advisors")
		.select("*")
		.order("name", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

/** Channel partners with no parent (for assigning sub-advisors). */
export async function getTopLevelAdvisors() {
	const rows = await getAdvisors();
	return rows.filter((a: any) => !a.parent_advisor_id);
}

export async function listSubAdvisors(parentAdvisorId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("advisors")
		.select("id, name, code, phone, parent_advisor_id, is_active")
		.eq("parent_advisor_id", parentAdvisorId)
		.eq("is_active", true)
		.order("name", { ascending: true });

	if (error) throw new Error(error.message);
	return data ?? [];
}

const subAdvisorSchema = advisorSchema.extend({
	parent_advisor_id: z.string().uuid("Select a parent advisor"),
});

export async function createSubAdvisor(
	values: z.infer<typeof subAdvisorSchema>,
): Promise<ActionResponse> {
	const parsed = subAdvisorSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: parent, error: pErr } = await supabase
		.from("advisors")
		.select("id, parent_advisor_id")
		.eq("id", parsed.data.parent_advisor_id)
		.maybeSingle();

	if (pErr || !parent?.id) {
		return { success: false, error: "Parent advisor not found" };
	}
	if ((parent as { parent_advisor_id?: string | null }).parent_advisor_id) {
		return { success: false, error: "Parent must be a main advisor (not a sub-advisor)." };
	}

	const advisorEmail = parsed.data.email?.trim() || toAdvisorEmail(parsed.data.phone);
	const password =
		parsed.data.use_phone_as_password || !parsed.data.password?.trim()
			? buildAdvisorPasswordFromNameAndPhone(parsed.data.name, parsed.data.phone)
			: parsed.data.password;

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { data: advisor, error } = await supabase
		.from("advisors")
		.insert({
			business_id: businessId,
			parent_advisor_id: parsed.data.parent_advisor_id,
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			email: advisorEmail,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
		})
		.select("id")
		.single();

	if (error) {
		if (error.code === "23505") {
			const phoneMsg = mapUniquePhoneViolation(error, "advisor");
			if (phoneMsg) return { success: false, error: phoneMsg };
			return {
				success: false,
				error: "Advisor code already exists for this business.",
			};
		}
		return { success: false, error: error.message };
	}

	if (advisor?.id) {
		await syncAdvisorBirthdayReminder(supabase, {
			id: advisor.id,
			name: parsed.data.name,
			phone: parsed.data.phone,
			birth_date: parsed.data.birth_date ?? null,
		});
	}

	const admin = createAdminClient();
	if (admin && advisor?.id) {
		const pw = password.length >= 6 ? password : String(password).padEnd(6, "0");
		const { data: authUser, error: authError } = await admin.auth.admin.createUser({
			email: advisorEmail,
			password: pw,
			email_confirm: true,
			user_metadata: {
				role: "advisor",
				advisor_id: advisor.id,
				business_id: businessId,
				parent_advisor_id: parsed.data.parent_advisor_id,
			},
		});
		if (!authError && authUser?.user) {
			await supabase
				.from("advisors")
				.update({ auth_user_id: authUser.user.id, email: advisorEmail })
				.eq("id", advisor.id);
		}
	}

	revalidatePath("/advisors");
	revalidatePath("/messaging");
	return { success: true };
}

export async function getAdvisorById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("advisors")
		.select("*")
		.eq("id", id)
		.single();

	if (error) return null;
	return data;
}

export async function setAdvisorParent(
	advisorId: string,
	parentAdvisorId: string | null,
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const businessId = await getCurrentBusinessId();
	if (!businessId) return { success: false, error: "Business context missing" };

	const { data: advisor, error: aErr } = await supabase
		.from("advisors")
		.select("id, name, parent_advisor_id, business_id, auth_user_id")
		.eq("id", advisorId)
		.eq("business_id", businessId)
		.maybeSingle();
	if (aErr || !advisor?.id) return { success: false, error: "Advisor not found" };

	if (!parentAdvisorId) {
		const { error } = await supabase
			.from("advisors")
			.update({ parent_advisor_id: null, updated_at: new Date().toISOString() })
			.eq("id", advisorId)
			.eq("business_id", businessId);
		if (error) return { success: false, error: error.message };
		revalidatePath("/advisors");
		return { success: true };
	}

	if (parentAdvisorId === advisorId) {
		return { success: false, error: "Advisor cannot be parent of itself." };
	}

	const { data: parent, error: pErr } = await supabase
		.from("advisors")
		.select("id, parent_advisor_id, business_id")
		.eq("id", parentAdvisorId)
		.eq("business_id", businessId)
		.maybeSingle();
	if (pErr || !parent?.id) return { success: false, error: "Parent advisor not found" };
	if ((parent as any).parent_advisor_id) {
		return { success: false, error: "Parent must be a main advisor (not sub-advisor)." };
	}

	// prevent cycles: advisor -> parent -> ... should never come back to advisor
	let cursor = parent as any;
	for (let i = 0; i < 10 && cursor?.parent_advisor_id; i++) {
		if (cursor.parent_advisor_id === advisorId) {
			return { success: false, error: "Invalid parent assignment (cycle detected)." };
		}
		const { data: next } = await supabase
			.from("advisors")
			.select("id, parent_advisor_id")
			.eq("id", cursor.parent_advisor_id)
			.maybeSingle();
		cursor = next as any;
	}

	const { error } = await supabase
		.from("advisors")
		.update({ parent_advisor_id: parentAdvisorId, updated_at: new Date().toISOString() })
		.eq("id", advisorId)
		.eq("business_id", businessId);
	if (error) return { success: false, error: error.message };

	// Keep auth metadata in sync (best effort)
	const admin = createAdminClient();
	const authUserId = String((advisor as any).auth_user_id ?? "").trim();
	if (admin && authUserId) {
		await admin.auth.admin.updateUserById(authUserId, {
			user_metadata: {
				parent_advisor_id: parentAdvisorId,
			},
		});
	}

	revalidatePath("/advisors");
	return { success: true };
}

export async function getAdvisorDeleteImpact(
	advisorId: string,
): Promise<AdvisorDeleteImpact | null> {
	const supabase = await createClient();
	if (!supabase) return null;
	const businessId = await getCurrentBusinessId();
	if (!businessId) return null;

	const { data: adv } = await supabase
		.from("advisors")
		.select("id, name")
		.eq("id", advisorId)
		.eq("business_id", businessId)
		.maybeSingle();
	if (!adv?.id) return null;

	const [{ count: subCount }, { count: custCount }, { count: salesCount }, { count: commCount }, { data: commIds }, { count: assignCount }, { count: reminderCount }] =
		await Promise.all([
			supabase
				.from("advisors")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("parent_advisor_id", advisorId),
			supabase
				.from("customers")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("advisor_id", advisorId),
			supabase
				.from("plot_sales")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("advisor_id", advisorId),
			supabase
				.from("advisor_commissions")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("advisor_id", advisorId),
			supabase
				.from("advisor_commissions")
				.select("id")
				.eq("business_id", businessId)
				.eq("advisor_id", advisorId),
			supabase
				.from("advisor_project_commissions")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("advisor_id", advisorId),
			supabase
				.from("reminders")
				.select("id", { count: "exact", head: true })
				.eq("business_id", businessId)
				.eq("description", `AUTO_BIRTHDAY:advisor:${advisorId}`),
		]);

	const ids = (commIds ?? []).map((r: any) => r.id).filter(Boolean);
	let commissionPaymentCount = 0;
	if (ids.length > 0) {
		const { count } = await supabase
			.from("advisor_commission_payments")
			.select("id", { count: "exact", head: true })
			.in("commission_id", ids);
		commissionPaymentCount = Number(count ?? 0);
	}

	return {
		advisor_id: adv.id,
		advisor_name: String((adv as any).name ?? ""),
		sub_advisors: Number(subCount ?? 0),
		customers: Number(custCount ?? 0),
		sales: Number(salesCount ?? 0),
		commission_rows: Number(commCount ?? 0),
		commission_payments: commissionPaymentCount,
		project_assignments: Number(assignCount ?? 0),
		birthday_reminders: Number(reminderCount ?? 0),
	};
}

export async function deleteAdvisorWithConfirmation(
	advisorId: string,
	options: {
		confirmText: string;
		mode: "detach" | "hard";
	},
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const admin = createAdminClient();
	if (!admin) return { success: false, error: "Admin client unavailable" };
	const businessId = await getCurrentBusinessId();
	if (!businessId) return { success: false, error: "Business context missing" };

	const { data: advisor, error: advErr } = await admin
		.from("advisors")
		.select("id, name, parent_advisor_id, auth_user_id, business_id")
		.eq("id", advisorId)
		.eq("business_id", businessId)
		.maybeSingle();
	if (advErr || !advisor?.id) return { success: false, error: "Advisor not found" };

	const expected = String((advisor as any).name ?? "").trim().toLowerCase();
	const typed = String(options.confirmText ?? "").trim().toLowerCase();
	if (!expected || typed !== expected) {
		return { success: false, error: "Confirmation text mismatch. Type exact advisor name." };
	}

	const impact = await getAdvisorDeleteImpact(advisorId);
	if (!impact) return { success: false, error: "Unable to load delete impact." };
	const hasRelations =
		impact.sub_advisors +
			impact.customers +
			impact.sales +
			impact.commission_rows +
			impact.commission_payments +
			impact.project_assignments >
		0;
	if (hasRelations && options.mode !== "hard" && options.mode !== "detach") {
		return { success: false, error: "Delete mode is required." };
	}

	// 1) Re-parent direct subs to current advisor's parent (or null).
	await admin
		.from("advisors")
		.update({
			parent_advisor_id: (advisor as any).parent_advisor_id ?? null,
			updated_at: new Date().toISOString(),
		})
		.eq("business_id", businessId)
		.eq("parent_advisor_id", advisorId);

	// 2) Cleanup advisor's own commission rows + payments.
	const { data: ownComms } = await admin
		.from("advisor_commissions")
		.select("id")
		.eq("business_id", businessId)
		.eq("advisor_id", advisorId);
	const ownCommIds = (ownComms ?? []).map((r: any) => r.id).filter(Boolean);
	if (ownCommIds.length > 0) {
		await admin
			.from("advisor_commission_payments")
			.delete()
			.in("commission_id", ownCommIds);
	}
	await admin
		.from("advisor_commissions")
		.delete()
		.eq("business_id", businessId)
		.eq("advisor_id", advisorId);

	if (options.mode === "hard") {
		// Hard mode: delete this advisor's sales and dependent records.
		const { data: sales } = await admin
			.from("plot_sales")
			.select("id, plot_id")
			.eq("business_id", businessId)
			.eq("advisor_id", advisorId);
		const saleIds = (sales ?? []).map((s: any) => s.id).filter(Boolean);
		const plotIds = (sales ?? []).map((s: any) => s.plot_id).filter(Boolean);

		if (saleIds.length > 0) {
			const { data: saleCommRows } = await admin
				.from("advisor_commissions")
				.select("id")
				.eq("business_id", businessId)
				.in("sale_id", saleIds);
			const saleCommIds = (saleCommRows ?? []).map((r: any) => r.id).filter(Boolean);
			if (saleCommIds.length > 0) {
				await admin
					.from("advisor_commission_payments")
					.delete()
					.in("commission_id", saleCommIds);
			}
			await admin
				.from("advisor_commissions")
				.delete()
				.eq("business_id", businessId)
				.in("sale_id", saleIds);
			await admin
				.from("payments")
				.delete()
				.eq("business_id", businessId)
				.in("sale_id", saleIds);
			await admin
				.from("plot_sales")
				.delete()
				.eq("business_id", businessId)
				.in("id", saleIds);

			if (plotIds.length > 0) {
				await admin
					.from("plots")
					.update({ status: "available", updated_at: new Date().toISOString() })
					.eq("business_id", businessId)
					.in("id", plotIds);
			}
		}
	} else {
		// Detach mode: preserve data, just remove advisor links.
		await admin
			.from("plot_sales")
			.update({ advisor_id: null, updated_at: new Date().toISOString() })
			.eq("business_id", businessId)
			.eq("advisor_id", advisorId);
	}

	// 3) Detach customers from this advisor (preserve customers).
	await admin
		.from("customers")
		.update({ advisor_id: null, updated_at: new Date().toISOString() })
		.eq("business_id", businessId)
		.eq("advisor_id", advisorId);

	// 4) Cleanup reminders + project assignment rows.
	await admin
		.from("reminders")
		.delete()
		.eq("business_id", businessId)
		.eq("description", `AUTO_BIRTHDAY:advisor:${advisorId}`);
	await admin
		.from("advisor_project_commissions")
		.delete()
		.eq("business_id", businessId)
		.eq("advisor_id", advisorId);

	// 5) Remove advisor.
	const { error: delErr } = await admin
		.from("advisors")
		.delete()
		.eq("business_id", businessId)
		.eq("id", advisorId);
	if (delErr) return { success: false, error: delErr.message };

	// 6) Optional auth cleanup (best effort).
	const authUserId = String((advisor as any).auth_user_id ?? "").trim();
	if (authUserId) {
		await admin.auth.admin.deleteUser(authUserId);
	}

	revalidatePath("/advisors");
	revalidatePath("/customers");
	revalidatePath("/sales");
	revalidatePath("/payments");
	revalidatePath("/commissions");
	return { success: true };
}

export type AdvisorAnalytics = {
	advisor: NonNullable<Awaited<ReturnType<typeof getAdvisorById>>>;
	/** Present when this advisor is a sub-advisor. */
	parentAdvisor: { id: string; name: string; code: string; phone: string } | null;
	salesCount: number;
	totalRevenue: number;
	totalCommission: number;
	commissionPaid: number;
	commissionPending: number;
	sales: Array<{
		id: string;
		plot_number: string;
		project_name: string;
		customer_name: string;
		total_sale_amount: number;
		amount_paid: number;
		remaining_amount: number;
		sale_phase: string;
		token_date: string | null;
	}>;
	commissions: Array<{
		id: string;
		plot_number: string;
		total_commission_amount: number;
		amount_paid: number;
		remaining_commission: number;
	}>;
};

export async function getAdvisorAnalytics(
	advisorId: string
): Promise<AdvisorAnalytics | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const advisor = await getAdvisorById(advisorId);
	if (!advisor) return null;

	const { data: commSaleRows } = await supabase
		.from("advisor_commissions")
		.select("sale_id")
		.eq("advisor_id", advisorId);
	const commSaleIds = [
		...new Set((commSaleRows ?? []).map((r: { sale_id: string }) => r.sale_id).filter(Boolean)),
	];

	let salesQuery = supabase
		.from("plot_sales")
		.select(
			`
      id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      sale_phase,
      token_date,
      advisor_id,
      plots(plot_number, projects(name)),
      customers(name),
      advisors(name)
    `,
		)
		.eq("is_cancelled", false);

	if (commSaleIds.length > 0) {
		const inList = commSaleIds.join(",");
		salesQuery = salesQuery.or(`advisor_id.eq.${advisorId},id.in.(${inList})`);
	} else {
		salesQuery = salesQuery.eq("advisor_id", advisorId);
	}

	const { data: sales } = await salesQuery.order("created_at", { ascending: false });

	const { data: commissions } = await supabase
		.from("advisor_commissions")
		.select(
			`
      id,
      total_commission_amount,
      amount_paid,
      remaining_commission,
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, rate_per_sqft)
      )
    `
		)
		.eq("advisor_id", advisorId)
		.order("created_at", { ascending: false });

	const salesList = (sales ?? []).map((s: any) => ({
		id: s.id,
		plot_number: s.plots?.plot_number ?? "—",
		project_name: s.plots?.projects?.name ?? "—",
		customer_name: s.customers?.name ?? "—",
		total_sale_amount: Number(s.total_sale_amount ?? 0),
		amount_paid: Number(s.amount_paid ?? 0),
		remaining_amount: Number(s.remaining_amount ?? 0),
		sale_phase: s.sale_phase ?? "—",
		token_date: s.token_date,
	}));

	const commList = (commissions ?? []).map((c: any) => {
		const saleTotal = Number(c.plot_sales?.total_sale_amount ?? 0);
		const saleReceived = Number(c.plot_sales?.amount_paid ?? 0);
		const plotSize = Number(c.plot_sales?.plots?.size_sqft ?? 0);
		const baseRate = Number(c.plot_sales?.plots?.rate_per_sqft ?? 0);
		const profitMax = Math.max(0, saleTotal - plotSize * baseRate);
		const ratio = saleTotal > 0 ? Math.min(1, Math.max(0, saleReceived / saleTotal)) : 0;
		const eligibleNow = profitMax * ratio;
		const paid = Number(c.amount_paid ?? 0);
		const pendingNow = Math.max(0, eligibleNow - paid);

		return {
		id: c.id,
		plot_number: c.plot_sales?.plots?.plot_number ?? "—",
		// Expose profit-based numbers in the same fields for compatibility
		total_commission_amount: Number(profitMax ?? 0),
		amount_paid: paid,
		remaining_commission: pendingNow,
		};
	});

	const salesCount = salesList.length;
	const totalRevenue = salesList.reduce((s, x) => s + x.total_sale_amount, 0);
	const totalCommission = commList.reduce((s, x) => s + x.total_commission_amount, 0);
	const commissionPaid = commList.reduce((s, x) => s + x.amount_paid, 0);
	const commissionPending = commList.reduce((s, x) => s + x.remaining_commission, 0);

	let parentAdvisor: { id: string; name: string; code: string; phone: string } | null = null;
	const parentId = (advisor as { parent_advisor_id?: string | null }).parent_advisor_id;
	if (parentId) {
		const p = await getAdvisorById(parentId);
		if (p) {
			parentAdvisor = {
				id: p.id,
				name: String(p.name ?? ""),
				code: String(p.code ?? ""),
				phone: String(p.phone ?? ""),
			};
		}
	}

	return {
		advisor,
		parentAdvisor,
		salesCount,
		totalRevenue,
		totalCommission,
		commissionPaid,
		commissionPending,
		sales: salesList,
		commissions: commList,
	};
}
