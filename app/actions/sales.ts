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
	const { data: advisor } = await supabase
		.from("advisors")
		.select("*")
		.eq("id", parsed.data.advisor_id)
		.single();

	if (advisor) {
		// Determine commission percentage based on project phase (simplified to Face 1 for now)
		const commPercent = advisor.commission_face1 || 0;
		const commAmount = (parsed.data.total_sale_amount * commPercent) / 100;

		await supabase.from("advisor_commissions").insert({
			advisor_id: parsed.data.advisor_id,
			sale_id: sale.id,
			commission_percentage: commPercent,
			total_commission_amount: commAmount,
			amount_paid: 0,
			notes: `Commission for sale of plot ${parsed.data.plot_id}`,
		});
	}

	revalidatePath("/sales");
	revalidatePath("/commissions");
	revalidatePath(`/projects`);
	return { success: true };
}

export async function getSales() {
	const supabase = await createClient();

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
