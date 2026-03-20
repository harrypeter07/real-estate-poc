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

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { success: false, error: "Unauthorized" };
	}

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	const resolvedAdvisorId =
		role === "advisor" ? advisorId ?? null : parsed.data.advisor_id ?? null;

	if (role === "advisor" && !resolvedAdvisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	const { error } = await supabase.from("customers").insert({
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		address: parsed.data.address || null,
		birth_date: parsed.data.birth_date || null,
		advisor_id: resolvedAdvisorId,
		route: parsed.data.route || null,
		notes: parsed.data.notes || null,
		is_active: parsed.data.is_active,
	});

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
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

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { success: false, error: "Unauthorized" };
	}

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	if (role === "advisor" && !advisorId) {
		return { success: false, error: "Advisor context missing" };
	}

	const { error } = await supabase
		.from("customers")
		.update({
			name: parsed.data.name,
			phone: parsed.data.phone,
			alternate_phone: parsed.data.alternate_phone || null,
			address: parsed.data.address || null,
			birth_date: parsed.data.birth_date || null,
			advisor_id: role === "advisor" ? (advisorId ?? null) : (parsed.data.advisor_id || null),
			route: parsed.data.route || null,
			notes: parsed.data.notes || null,
			is_active: parsed.data.is_active,
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		// Advisors can only update their own customers
		.eq(role === "advisor" ? "advisor_id" : "id", role === "advisor" ? (advisorId ?? null) : id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
	revalidatePath(
		role === "advisor" ? `/advisor/customers/${id}` : `/customers/${id}`
	);
	return { success: true };
}

export async function getCustomers() {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr) return [];

	const role = (user?.user_metadata as any)?.role;
	const advisorId = (user?.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	let query = supabase
		.from("customers")
		.select(
			`
      *,
      advisors(name)
    `
		)
		.order("name", { ascending: true });

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;

	if (error) throw new Error(error.message);
	return data || [];
}

export async function getCustomerById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) return null;

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	let query = supabase
		.from("customers")
		.select("*")
		.eq("id", id);

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId).eq("is_active", true);
	}

	const { data, error } = await query.single();
	if (error) return null;
	return data;
}
