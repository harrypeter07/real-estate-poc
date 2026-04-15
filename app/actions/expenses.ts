"use server";

import { getCurrentBusinessId } from "@/lib/auth/current-business";
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

export type ExpenseActionResponse = ActionResponse & {
	expense?: any;
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

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { error } = await supabase.from("office_expenses").insert({
		business_id: businessId,
		description: parsed.data.description,
		amount: parsed.data.amount,
		paid_amount: parsed.data.paid_amount,
		expense_date: parsed.data.expense_date,
		payment_type: parsed.data.payment_type,
		category: parsed.data.category,
		project_id: parsed.data.project_id || null,
		receipt_note: parsed.data.receipt_note || null,
		receipt_path: parsed.data.receipt_path || null,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/expenses");
	return { success: true };
}

export async function getExpenseById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const businessId = await getCurrentBusinessId();
	if (!businessId) return null;

	const { data, error } = await supabase
		.from("office_expenses")
		.select("*")
		.eq("id", id)
		.eq("business_id", businessId)
		.maybeSingle();

	if (error || !data) return null;
	return data;
}

export async function updateExpense(
	id: string,
	values: ExpenseFormValues
): Promise<ExpenseActionResponse> {
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

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { data, error } = await supabase
		.from("office_expenses")
		.update({
			description: parsed.data.description,
			amount: parsed.data.amount,
			paid_amount: parsed.data.paid_amount,
			expense_date: parsed.data.expense_date,
			payment_type: parsed.data.payment_type,
			category: parsed.data.category,
			project_id: parsed.data.project_id || null,
			receipt_note: parsed.data.receipt_note || null,
			receipt_path: parsed.data.receipt_path || null,
		})
		.eq("id", id)
		.eq("business_id", businessId)
		.select("*")
		.maybeSingle();

	if (error) {
		return { success: false, error: error.message };
	}
	if (!data) {
		return { success: false, error: "Expense not found or not allowed." };
	}

	revalidatePath("/expenses");
	revalidatePath(`/expenses/${id}/edit`);
	return { success: true, expense: data };
}

export async function deleteExpense(id: string): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { error } = await supabase
		.from("office_expenses")
		.delete()
		.eq("id", id)
		.eq("business_id", businessId);

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
		.select("*, projects(id, name)")
		.order("expense_date", { ascending: false });

	if (error) throw new Error(error.message);
	return data || [];
}
