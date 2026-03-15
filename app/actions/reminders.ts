"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	reminderSchema,
	type ReminderFormValues,
} from "@/lib/validations/reminder";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createReminder(
	values: ReminderFormValues
): Promise<ActionResponse> {
	const parsed = reminderSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();

	const { error } = await supabase.from("reminders").insert({
		title: parsed.data.title,
		type: parsed.data.type,
		phone: parsed.data.phone || null,
		description: parsed.data.description || null,
		reminder_date: parsed.data.reminder_date,
		reminder_time: parsed.data.reminder_time || null,
		customer_id: parsed.data.customer_id || null,
		is_completed: parsed.data.is_completed,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/reminders");
	revalidatePath("/dashboard");
	return { success: true };
}

export async function updateReminder(
	id: string,
	values: ReminderFormValues
): Promise<ActionResponse> {
	const parsed = reminderSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();

	const { error } = await supabase
		.from("reminders")
		.update({
			title: parsed.data.title,
			type: parsed.data.type,
			phone: parsed.data.phone || null,
			description: parsed.data.description || null,
			reminder_date: parsed.data.reminder_date,
			reminder_time: parsed.data.reminder_time || null,
			customer_id: parsed.data.customer_id || null,
			is_completed: parsed.data.is_completed,
		})
		.eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/reminders");
	revalidatePath("/dashboard");
	return { success: true };
}

export async function deleteReminder(id: string): Promise<ActionResponse> {
	const supabase = await createClient();

	const { error } = await supabase.from("reminders").delete().eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/reminders");
	revalidatePath("/dashboard");
	return { success: true };
}

export async function getReminders() {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("reminders")
		.select(
			`
      *,
      customers(name, phone)
    `
		)
		.order("reminder_date", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function toggleReminder(id: string, isCompleted: boolean) {
	const supabase = await createClient();

	const { error } = await supabase
		.from("reminders")
		.update({ is_completed: isCompleted })
		.eq("id", id);

	if (error) return { success: false, error: error.message };

	revalidatePath("/reminders");
	revalidatePath("/dashboard");
	return { success: true };
}
