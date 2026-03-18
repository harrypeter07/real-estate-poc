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
        plots(plot_number, projects(name))
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
	meta?: { paid_date?: string; note?: string },
) {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: comm, error: getError } = await supabase
		.from("advisor_commissions")
		.select("amount_paid, total_commission_amount, notes")
		.eq("id", id)
		.single();

	if (getError) return { success: false, error: getError.message };

	const total = Number(comm.total_commission_amount ?? 0);
	const currentPaid = Number(comm.amount_paid ?? 0);
	const add = Number(amount ?? 0);
	if (!Number.isFinite(add) || add <= 0) {
		return { success: false, error: "Amount must be positive" };
	}
	if (total <= 0) {
		return { success: false, error: "Invalid commission total" };
	}

	const newAmountPaid = Math.min(total, currentPaid + add);
	const fullyPaid = newAmountPaid >= total;

	const note = meta?.note?.trim();
	const paidDate = meta?.paid_date?.trim();
	const nextPaidDate = fullyPaid
		? paidDate || new Date().toISOString().slice(0, 10)
		: null;

	const nextNotes =
		note && note.length > 0
			? [
					(comm.notes ?? "").trim(),
					`${new Date().toISOString().slice(0, 10)}: ${note}`,
				]
					.filter(Boolean)
					.join("\n")
			: (comm.notes ?? null);

	const { error: updateError } = await supabase
		.from("advisor_commissions")
		.update({
			amount_paid: newAmountPaid,
			paid_date: nextPaidDate,
			notes: nextNotes,
		})
		.eq("id", id);

	if (updateError) return { success: false, error: updateError.message };

	revalidatePath("/commissions");
	return { success: true };
}
