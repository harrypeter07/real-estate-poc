"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
	advisorSchema,
	type AdvisorFormValues,
} from "@/lib/validations/advisor";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

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

	const advisorEmail = parsed.data.email?.trim() || toAdvisorEmail(parsed.data.phone);
	const password =
		parsed.data.use_phone_as_password || !parsed.data.password?.trim()
			? parsed.data.phone.replace(/\D/g, "").slice(-10) || parsed.data.phone
			: parsed.data.password;

	const { data: advisor, error } = await supabase
		.from("advisors")
		.insert({
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
			return { success: false, error: "Advisor code already exists" };
		}
		return { success: false, error: error.message };
	}

	// Create Supabase Auth user for advisor login (requires SUPABASE_SERVICE_ROLE_KEY)
	const admin = createAdminClient();
	if (admin && advisor?.id) {
		const pw = password.length >= 6 ? password : String(password).padEnd(6, "0");
		const { data: authUser, error: authError } = await admin.auth.admin.createUser({
			email: advisorEmail,
			password: pw,
			email_confirm: true,
			user_metadata: { role: "advisor", advisor_id: advisor.id },
		});
		if (!authError && authUser?.user) {
			await supabase
				.from("advisors")
				.update({ auth_user_id: authUser.user.id, email: advisorEmail })
				.eq("id", advisor.id);
		}
	}

	revalidatePath("/advisors");
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

	const { error } = await supabase
		.from("advisors")
		.update({
			name: parsed.data.name,
			code: parsed.data.code,
			phone: parsed.data.phone,
			email: parsed.data.email?.trim() || null,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);

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
		return { success: false, error: error.message };
	}

	revalidatePath("/advisors");
	revalidatePath(`/advisors/${id}`);
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

export type AdvisorAnalytics = {
	advisor: NonNullable<Awaited<ReturnType<typeof getAdvisorById>>>;
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

	const { data: sales } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      sale_phase,
      token_date,
      plots(plot_number, projects(name)),
      customers(name)
    `
		)
		.eq("advisor_id", advisorId)
		.eq("is_cancelled", false)
		.order("created_at", { ascending: false });

	const { data: commissions } = await supabase
		.from("advisor_commissions")
		.select(
			`
      id,
      total_commission_amount,
      amount_paid,
      remaining_commission,
      plot_sales(plots(plot_number))
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

	const commList = (commissions ?? []).map((c: any) => ({
		id: c.id,
		plot_number: c.plot_sales?.plots?.plot_number ?? "—",
		total_commission_amount: Number(c.total_commission_amount ?? 0),
		amount_paid: Number(c.amount_paid ?? 0),
		remaining_commission: Number(c.remaining_commission ?? 0),
	}));

	const salesCount = salesList.length;
	const totalRevenue = salesList.reduce((s, x) => s + x.total_sale_amount, 0);
	const totalCommission = commList.reduce(
		(s, x) => s + x.total_commission_amount,
		0
	);
	const commissionPaid = commList.reduce((s, x) => s + x.amount_paid, 0);
	const commissionPending = commList.reduce(
		(s, x) => s + x.remaining_commission,
		0
	);

	return {
		advisor,
		salesCount,
		totalRevenue,
		totalCommission,
		commissionPaid,
		commissionPending,
		sales: salesList,
		commissions: commList,
	};
}
