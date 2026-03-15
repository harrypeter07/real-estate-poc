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

	const { error } = await supabase.from("payments").insert({
		sale_id: parsed.data.sale_id,
		customer_id: parsed.data.customer_id,
		amount: parsed.data.amount,
		payment_date: parsed.data.payment_date,
		payment_mode: parsed.data.payment_mode,
		slip_number: parsed.data.slip_number || null,
		is_confirmed: parsed.data.is_confirmed,
		notes: parsed.data.notes || null,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/payments");
	revalidatePath("/sales");
	revalidatePath(`/sales/${parsed.data.sale_id}`);
	return { success: true };
}

export async function getPayments() {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("payments")
		.select(
			`
      *,
      customers(name),
      plot_sales(
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

	const { error } = await supabase
		.from("payments")
		.update({ is_confirmed: true })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath("/payments");
	revalidatePath("/sales");
	return { success: true };
}
