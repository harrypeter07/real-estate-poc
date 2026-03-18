"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createSale(
	values: SaleFormValues
): Promise<ActionResponse> {
	const parsed = saleSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	// Fetch plot + project min rate
	const { data: plotRow, error: plotFetchError } = await supabase
		.from("plots")
		.select("id, project_id, size_sqft, plot_number, projects(min_plot_rate)")
		.eq("id", parsed.data.plot_id)
		.single();

	if (plotFetchError || !plotRow) {
		return { success: false, error: "Plot not found" };
	}

	const minRate = Number((plotRow as any).projects?.min_plot_rate ?? 0);
	const plotSize = Number(plotRow.size_sqft ?? 0);
	const minTotal = plotSize * minRate;
	if (minTotal > 0 && Number(parsed.data.total_sale_amount) < minTotal) {
		return {
			success: false,
			error: `Total sale amount is below project minimum. Minimum allowed: ₹ ${minTotal.toLocaleString(
				"en-IN",
			)}`,
		};
	}

	// Advisor must be assigned to this project (project-wise commission)
	const { data: assignment } = await supabase
		.from("advisor_project_commissions")
		.select("*")
		.eq("project_id", plotRow.project_id)
		.eq("advisor_id", parsed.data.advisor_id)
		.maybeSingle();

	if (!assignment) {
		return {
			success: false,
			error:
				"Advisor is not assigned to this project. Assign advisor in the project dashboard first.",
		};
	}

	// 1. Create the sale record
	const { data: sale, error: saleError } = await supabase
		.from("plot_sales")
		.insert({
			plot_id: parsed.data.plot_id,
			customer_id: parsed.data.customer_id,
			advisor_id: parsed.data.advisor_id,
			sale_phase: parsed.data.sale_phase,
			token_date: parsed.data.token_date || null,
			agreement_date: parsed.data.agreement_date || null,
			total_sale_amount: parsed.data.total_sale_amount,
			down_payment: parsed.data.down_payment,
			monthly_emi: parsed.data.monthly_emi || null,
			emi_day: parsed.data.emi_day || null,
			notes: parsed.data.notes || null,
		})
		.select()
		.single();

	if (saleError) {
		if (saleError.code === "23505") {
			return { success: false, error: "This plot is already sold or booked." };
		}
		return { success: false, error: saleError.message };
	}

	// 2. Update the plot status
	const plotStatus =
		parsed.data.sale_phase === "token"
			? "token"
			: parsed.data.sale_phase === "agreement"
			? "agreement"
			: "sold";

	const { error: plotError } = await supabase
		.from("plots")
		.update({ status: plotStatus })
		.eq("id", parsed.data.plot_id);

	if (plotError) {
		return {
			success: false,
			error:
				"Sale created but failed to update plot status: " + plotError.message,
		};
	}

	// 3. Create commission record
	const commRatePerSqft =
		parsed.data.sale_phase === "token"
			? Number(assignment.commission_token ?? 0)
			: parsed.data.sale_phase === "agreement"
				? Number(assignment.commission_agreement ?? 0)
				: parsed.data.sale_phase === "registry"
					? Number(assignment.commission_registry ?? 0)
					: Number(assignment.commission_full_payment ?? 0);

	const commAmount = Number(plotSize ?? 0) * Number(commRatePerSqft ?? 0);

	await supabase.from("advisor_commissions").insert({
		advisor_id: parsed.data.advisor_id,
		sale_id: sale.id,
		commission_percentage: commRatePerSqft,
		total_commission_amount: commAmount,
		amount_paid: 0,
		notes: `Commission for sale of plot ${plotRow.plot_number}`,
	});

	revalidatePath("/sales");
	revalidatePath("/commissions");
	revalidatePath(`/projects`);
	return { success: true };
}

export async function getSales() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(plot_number, projects(name)),
      customers(name),
      advisors(name)
    `
		)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getSaleById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(*, projects(name)),
      customers(*),
      advisors(*)
    `
		)
		.eq("id", id)
		.single();

	if (error) return null;
	return data;
}
