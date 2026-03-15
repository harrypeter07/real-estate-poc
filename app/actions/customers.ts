"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	customerSchema,
	type CustomerFormValues,
} from "@/lib/validations/customer";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export async function createCustomer(
	values: CustomerFormValues
): Promise<ActionResponse> {
	const parsed = customerSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase.from("customers").insert({
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		address: parsed.data.address || null,
		birth_date: parsed.data.birth_date || null,
		advisor_id: parsed.data.advisor_id || null,
		route: parsed.data.route || null,
		notes: parsed.data.notes || null,
		is_active: parsed.data.is_active,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/customers");
	return { success: true };
}

export async function updateCustomer(
	id: string,
	values: CustomerFormValues
): Promise<ActionResponse> {
	const parsed = customerSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("customers")
		.update({
			name: parsed.data.name,
			phone: parsed.data.phone,
			alternate_phone: parsed.data.alternate_phone || null,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			advisor_id: parsed.data.advisor_id || null,
			route: parsed.data.route || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/customers");
	revalidatePath(`/customers/${id}`);
	return { success: true };
}

export async function getCustomers() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("customers")
		.select(
			`
      *,
      advisors(name)
    `
		)
		.order("name", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getCustomerById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("customers")
		.select("*")
		.eq("id", id)
		.single();

	if (error) return null;
	return data;
}
