"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCommissions() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("advisor_commissions")
		.select(
			`
      *,
      advisors(name, code),
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(plot_number, size_sqft, projects(name, min_plot_rate))
      ),
      advisor_commission_payments(
        id,
        amount,
        paid_date,
        payment_mode,
        reference_number,
        receipt_path,
        note,
        created_at
      )
    `
		)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function recordCommissionPayment(
	id: string,
	amount: number,
	meta?: {
		paid_date?: string;
		note?: string;
		payment_mode?: "cash" | "online" | "cheque";
		reference_number?: string;
		receipt_path?: string;
	},
) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: comm, error: getError } = await supabase
		.from("advisor_commissions")
		.select(
			`
      amount_paid,
      plot_sales(
        total_sale_amount,
        amount_paid,
        plots(size_sqft, projects(min_plot_rate))
      )
    `,
		)
		.eq("id", id)
		.single();

	if (getError) return { success: false, error: getError.message };

	const alreadyPaidToAdvisor = Number(comm.amount_paid ?? 0);
	const saleTotal = Number((comm as any).plot_sales?.total_sale_amount ?? 0);
	const saleReceived = Number((comm as any).plot_sales?.amount_paid ?? 0); // confirmed receipts only
	const plotSize = Number((comm as any).plot_sales?.plots?.size_sqft ?? 0);
	const minRate = Number((comm as any).plot_sales?.plots?.projects?.min_plot_rate ?? 0);
	const baseTotal = plotSize * minRate;
	const profitMax = Math.max(0, saleTotal - baseTotal);
	const add = Number(amount ?? 0);
	if (!Number.isFinite(add) || add <= 0) {
		return { success: false, error: "Amount must be positive" };
	}
	if (saleTotal <= 0) {
		return { success: false, error: "Invalid sale total amount" };
	}

	// Advisor can only be paid proportional to confirmed money received.
	// eligible = profitMax * min(1, saleReceived / saleTotal)
	const ratio = Math.min(1, Math.max(0, saleReceived / saleTotal));
	const eligible = profitMax * ratio;
	const availableToPay = Math.max(0, eligible - alreadyPaidToAdvisor);
	if (add > availableToPay + 0.0001) {
		return {
			success: false,
			error: `Payment exceeds eligible commission. Eligible now: ₹ ${eligible.toLocaleString(
				"en-IN",
			)} (available: ₹ ${availableToPay.toLocaleString("en-IN")})`,
		};
	}

	// New flow: store payment row (history). Totals are kept in sync by DB trigger.
	const note = meta?.note?.trim() || null;
	const paidDate = meta?.paid_date?.trim() || new Date().toISOString().slice(0, 10);
	const paymentMode = meta?.payment_mode || "cash";
	const referenceNumber = meta?.reference_number?.trim() || null;
	const receiptPath = meta?.receipt_path?.trim() || null;

	const { error: payErr } = await supabase.from("advisor_commission_payments").insert({
		commission_id: id,
		amount: add,
		paid_date: paidDate,
		payment_mode: paymentMode,
		reference_number: referenceNumber,
		receipt_path: receiptPath,
		note,
	});
	if (payErr) return { success: false, error: payErr.message };

	revalidatePath("/commissions");
	return { success: true };
}
