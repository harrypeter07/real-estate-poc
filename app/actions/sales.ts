"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { calculateFinance } from "@/lib/utils/finance";

export type ActionResponse = {
	success: boolean;
	error?: string;
	saleId?: string;
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
	const soldByAdmin = parsed.data.sold_by_admin ?? false;

	let faceRate = minRate;
	if (!soldByAdmin) {
		// Advisor must be assigned to this project (project-wise commission)
		const { data: assignment } = await supabase
			.from("advisor_project_commissions")
			.select("*")
			.eq("project_id", plotRow.project_id)
			.eq("advisor_id", parsed.data.advisor_id ?? "")
			.maybeSingle();

		if (!assignment) {
			return {
				success: false,
				error:
					"Advisor is not assigned to this project. Assign advisor in the project dashboard first.",
			};
		}

		faceRate = Number(
			(assignment as any).commission_rate ??
				(assignment as any).commission_token ??
				0
		);
		if (minRate > 0 && faceRate > 0 && faceRate < minRate) {
			return {
				success: false,
				error: `Advisor rate (₹ ${faceRate.toLocaleString(
					"en-IN",
				)}/sqft) cannot be less than base rate (₹ ${minRate.toLocaleString(
					"en-IN",
				)}/sqft). Update the advisor assignment rates for this project.`,
			};
		}
	}

	const finance = calculateFinance({
		plotSizeSqft: plotSize,
		baseRatePerSqft: minRate,
		advisorRatePerSqft: faceRate,
		downPayment: Number(parsed.data.down_payment ?? 0),
		otherPayments: 0,
	});
	if (finance.sellingPrice <= 0) {
		return { success: false, error: "Invalid selling price. Check advisor rate and plot size." };
	}

	// 1. Create the sale record
	const { data: sale, error: saleError } = await supabase
		.from("plot_sales")
		.insert({
			plot_id: parsed.data.plot_id,
			customer_id: parsed.data.customer_id,
			advisor_id: soldByAdmin ? null : (parsed.data.advisor_id ?? null),
			sold_by_admin: soldByAdmin,
			sale_phase: parsed.data.sale_phase,
			token_date: parsed.data.token_date || null,
			agreement_date: parsed.data.agreement_date || null,
			total_sale_amount: finance.sellingPrice,
			down_payment: parsed.data.down_payment,
			monthly_emi: parsed.data.monthly_emi || null,
			emi_day: parsed.data.emi_day || null,
			followup_date: parsed.data.followup_date || null,
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

	// 3. If down payment is provided, record it as a confirmed payment
	const downPayment = Number(parsed.data.down_payment ?? 0);
	if (downPayment > 0) {
		const paymentDate =
			parsed.data.token_date ||
			parsed.data.agreement_date ||
			new Date().toISOString().slice(0, 10);

		const { error: dpError } = await supabase.from("payments").insert({
			sale_id: sale.id,
			customer_id: parsed.data.customer_id,
			slip_number: null,
			receipt_path: null,
			amount: downPayment,
			payment_date: paymentDate,
			payment_mode: "cash",
			is_confirmed: true,
			notes: "Down payment",
		});

		if (dpError) {
			return { success: false, error: dpError.message };
		}
	}

	// 3. Create commission record only when sold by advisor (not admin)
	if (!soldByAdmin && parsed.data.advisor_id) {
		const profitTotal = finance.profit;
		await supabase.from("advisor_commissions").insert({
			advisor_id: parsed.data.advisor_id,
			sale_id: sale.id,
			commission_percentage: 0,
			total_commission_amount: profitTotal,
			amount_paid: 0,
			notes: `Earning based on profit-share for plot ${plotRow.plot_number}`,
		});
	}

	// 4. Create follow-up reminder when followup_date is provided
	const followupDate = parsed.data.followup_date?.trim();
	if (followupDate) {
		const { data: custRow } = await supabase
			.from("customers")
			.select("name, phone")
			.eq("id", parsed.data.customer_id)
			.single();
		const custName = (custRow as any)?.name ?? "Customer";
		const custPhone = (custRow as any)?.phone ?? null;
		const projName = (plotRow as any).projects?.name ?? "";
		await supabase.from("reminders").insert({
			title: `Payment follow-up - ${custName} (${plotRow.plot_number}${projName ? `, ${projName}` : ""})`,
			type: "installment_due",
			phone: custPhone,
			description: `Follow-up for outstanding payment on plot ${plotRow.plot_number}. Remaining: ₹ ${(finance.sellingPrice - Number(parsed.data.down_payment ?? 0)).toLocaleString("en-IN")}`,
			reminder_date: followupDate,
			customer_id: parsed.data.customer_id,
			project_id: plotRow.project_id,
			sale_id: sale.id,
		});
	}

	revalidatePath("/sales");
	revalidatePath("/reminders");
	revalidatePath("/commissions");
	revalidatePath(`/projects`);
	return { success: true, saleId: sale.id };
}

export async function getSales() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(plot_number, projects(id, name)),
      customers(name, phone),
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

export async function getCustomerPlotSales(customerId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return [];

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	// Advisors should only see sales for their own customers.
	let query = supabase
		.from("plot_sales")
		.select(
			`
      id,
      sale_phase,
      token_date,
      agreement_date,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      created_at,
      plots(plot_number, projects(name))
    `
		)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;

	if (error) throw new Error(error.message);
	return data || [];
}
