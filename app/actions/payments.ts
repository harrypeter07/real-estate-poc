"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	paymentSchema,
	type PaymentFormValues,
} from "@/lib/validations/payment";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createPayment(
	values: PaymentFormValues
): Promise<ActionResponse> {
	const parsed = paymentSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	// Guard: confirmed customer payments should never exceed sale total.
	const { data: saleRow, error: saleErr } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount")
		.eq("id", parsed.data.sale_id)
		.single();
	if (saleErr || !saleRow) {
		return { success: false, error: "Sale not found" };
	}

	const { data: paidRows, error: paidErr } = await supabase
		.from("payments")
		.select("amount")
		.eq("sale_id", parsed.data.sale_id)
		.eq("is_confirmed", true);
	if (paidErr) return { success: false, error: paidErr.message };

	const alreadyConfirmed = (paidRows ?? []).reduce(
		(sum, p: any) => sum + Number(p.amount ?? 0),
		0
	);
	const nextConfirmed =
		alreadyConfirmed +
		(parsed.data.is_confirmed ? Number(parsed.data.amount ?? 0) : 0);
	const saleTotal = Number(saleRow.total_sale_amount ?? 0);
	if (nextConfirmed > saleTotal + 0.0001) {
		const remaining = Math.max(0, saleTotal - alreadyConfirmed);
		return {
			success: false,
			error: `Payment exceeds sale amount. Remaining allowed: ₹ ${remaining.toLocaleString(
				"en-IN"
			)}`,
		};
	}

	const { error } = await supabase.from("payments").insert({
		sale_id: parsed.data.sale_id,
		customer_id: parsed.data.customer_id,
		amount: parsed.data.amount,
		payment_date: parsed.data.payment_date,
		payment_mode: parsed.data.payment_mode,
		slip_number: parsed.data.slip_number || null,
		receipt_path: parsed.data.receipt_path || null,
		is_confirmed: parsed.data.is_confirmed,
		notes: parsed.data.notes || null,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/payments");
	revalidatePath("/sales");
	return { success: true };
}

export async function getPayments() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("payments")
		.select(
			`
      *,
      customers(name, phone),
      plot_sales(
        receipt_path,
        plots(plot_number, projects(name))
      )
    `
		)
		.order("payment_date", { ascending: false });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function confirmPayment(id: string) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: payment, error: payErr } = await supabase
		.from("payments")
		.select("id, sale_id, amount, is_confirmed")
		.eq("id", id)
		.single();
	if (payErr || !payment) return { success: false, error: "Payment not found" };
	if (payment.is_confirmed) return { success: true };

	const { data: saleRow, error: saleErr } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount")
		.eq("id", payment.sale_id)
		.single();
	if (saleErr || !saleRow) return { success: false, error: "Sale not found" };

	const { data: paidRows, error: paidErr } = await supabase
		.from("payments")
		.select("amount")
		.eq("sale_id", payment.sale_id)
		.eq("is_confirmed", true);
	if (paidErr) return { success: false, error: paidErr.message };

	const alreadyConfirmed = (paidRows ?? []).reduce(
		(sum, p: any) => sum + Number(p.amount ?? 0),
		0
	);
	const nextConfirmed = alreadyConfirmed + Number(payment.amount ?? 0);
	const saleTotal = Number(saleRow.total_sale_amount ?? 0);
	if (nextConfirmed > saleTotal + 0.0001) {
		const remaining = Math.max(0, saleTotal - alreadyConfirmed);
		return {
			success: false,
			error: `Cannot confirm. Remaining allowed: ₹ ${remaining.toLocaleString(
				"en-IN"
			)}`,
		};
	}

	const { error } = await supabase
		.from("payments")
		.update({ is_confirmed: true })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath("/payments");
	revalidatePath("/sales");
	return { success: true };
}
