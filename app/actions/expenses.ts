"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	expenseSchema,
	type ExpenseFormValues,
} from "@/lib/validations/expense";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createExpense(
	values: ExpenseFormValues
): Promise<ActionResponse> {
	const parsed = expenseSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { error } = await supabase.from("office_expenses").insert({
		description: parsed.data.description,
		amount: parsed.data.amount,
		expense_date: parsed.data.expense_date,
		category: parsed.data.category,
		receipt_note: parsed.data.receipt_note || null,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/expenses");
	return { success: true };
}

export async function getExpenses() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("office_expenses")
		.select("*")
		.order("expense_date", { ascending: false });

	if (error) throw new Error(error.message);
	return data || [];
}
