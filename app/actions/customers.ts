"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	customerSchema,
	type CustomerFormValues,
} from "@/lib/validations/customer";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { mapUniquePhoneViolation } from "@/lib/utils/db-errors";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

function mapCustomerDbError(error: {
	code?: string;
	message: string;
	details?: string;
}): string {
	const phoneMsg = mapUniquePhoneViolation(error, "customer");
	if (phoneMsg) return phoneMsg;
	return error.message;
}

function getNextBirthdayDate(birthDate: string): string | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;
	const today = new Date();
	const month = parsed.getMonth();
	const day = parsed.getDate();
	let target = new Date(today.getFullYear(), month, day);
	target.setHours(0, 0, 0, 0);
	const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	if (target < now) target = new Date(today.getFullYear() + 1, month, day);
	return target.toISOString().slice(0, 10);
}

async function syncCustomerBirthdayReminder(
	supabase: any,
	customer: { id: string; name: string; phone: string; birth_date?: string | null },
) {
	const businessId = await getCurrentBusinessId();
	if (!businessId) return;

	const marker = `AUTO_BIRTHDAY:customer:${customer.id}`;
	const { data: existing } = await supabase
		.from("reminders")
		.select("id")
		.eq("description", marker)
		.maybeSingle();

	const nextDate = customer.birth_date ? getNextBirthdayDate(customer.birth_date) : null;
	if (!nextDate) {
		if (existing?.id) {
			await supabase.from("reminders").delete().eq("id", existing.id);
		}
		return;
	}

	const payload = {
		business_id: businessId,
		title: `Birthday Wish - ${customer.name}`,
		type: "birthday_customer",
		phone: customer.phone || null,
		description: marker,
		reminder_date: nextDate,
		reminder_time: "09:00",
		customer_id: customer.id,
		project_id: null,
		is_completed: false,
	};

	if (existing?.id) {
		await supabase.from("reminders").update(payload).eq("id", existing.id);
	} else {
		await supabase.from("reminders").insert(payload);
	}
}

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

	if (parsed.data.kyc_status === "verified") {
		if (!parsed.data.aadhaar_url || !parsed.data.pan_url || !parsed.data.photo_url) {
			return {
				success: false,
				error: "Cannot set KYC status to verified. Aadhaar Card, PAN Card, and Customer Photo must be uploaded.",
			};
		}
	}

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	const { data: insertedCustomer, error } = await supabase
		.from("customers")
		.insert({
		id: parsed.data.id || undefined,
		business_id: businessId,
		name: parsed.data.name,
		phone: parsed.data.phone,
		alternate_phone: parsed.data.alternate_phone || null,
		address: parsed.data.address || null,
		birth_date: parsed.data.birth_date || null,
		advisor_id: resolvedAdvisorId,
		route: parsed.data.route || null,
		notes: parsed.data.notes || null,
		is_active: parsed.data.is_active,
		aadhaar_url: parsed.data.aadhaar_url || null,
		pan_url: parsed.data.pan_url || null,
		photo_url: parsed.data.photo_url || null,
		aadhaar_number: parsed.data.aadhaar_number || null,
		pan_number: parsed.data.pan_number || null,
		kyc_status: parsed.data.kyc_status || 'pending',
	})
		.select("id, name, phone, birth_date")
		.single();

	if (error) {
		return { success: false, error: mapCustomerDbError(error) };
	}

	if (insertedCustomer?.id) {
		await syncCustomerBirthdayReminder(supabase, insertedCustomer);
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
	revalidatePath("/messaging");
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

	if (parsed.data.kyc_status === "verified") {
		if (!parsed.data.aadhaar_url || !parsed.data.pan_url || !parsed.data.photo_url) {
			return {
				success: false,
				error: "Cannot set KYC status to verified. Aadhaar Card, PAN Card, and Customer Photo must be uploaded.",
			};
		}
	}

	const { data: updatedCustomer, error } = await supabase
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
			aadhaar_url: parsed.data.aadhaar_url || null,
			pan_url: parsed.data.pan_url || null,
			photo_url: parsed.data.photo_url || null,
			aadhaar_number: parsed.data.aadhaar_number || null,
			pan_number: parsed.data.pan_number || null,
			kyc_status: parsed.data.kyc_status || 'pending',
			updated_at: new Date().toISOString(),
		})
		.eq("id", id)
		// Advisors can only update their own customers
		.eq(role === "advisor" ? "advisor_id" : "id", role === "advisor" ? (advisorId ?? null) : id)
		.select("id, name, phone, birth_date")
		.single();

	if (error) {
		return { success: false, error: mapCustomerDbError(error) };
	}

	if (updatedCustomer?.id) {
		await syncCustomerBirthdayReminder(supabase, updatedCustomer);
	}

	revalidatePath(role === "advisor" ? "/advisor/customers" : "/customers");
	revalidatePath(
		role === "advisor" ? `/advisor/customers/${id}` : `/customers/${id}`
	);
	revalidatePath("/messaging");
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

export async function updateCustomerKycUrl(
	customerId: string,
	field: "aadhaar_url" | "pan_url" | "photo_url",
	url: string | null
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return { success: false, error: "Unauthorized" };

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;

	let query = supabase
		.from("customers")
		.update({
			[field]: url,
			updated_at: new Date().toISOString(),
		})
		.eq("id", customerId);

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { error } = await query;
	if (error) return { success: false, error: error.message };

	revalidatePath(role === "advisor" ? `/advisor/customers/${customerId}` : `/customers/${customerId}`);
	return { success: true };
}

export async function updateCustomerKycStatus(
	customerId: string,
	kycStatus: string
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return { success: false, error: "Unauthorized" };

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;

	if (kycStatus === "verified") {
		// Fetch customer document details first to check if they are all uploaded
		const { data: cust, error: fetchErr } = await supabase
			.from("customers")
			.select("aadhaar_url, pan_url, photo_url")
			.eq("id", customerId)
			.single();

		if (fetchErr || !cust) {
			return { success: false, error: fetchErr?.message || "Customer not found" };
		}

		if (!cust.aadhaar_url || !cust.pan_url || !cust.photo_url) {
			return {
				success: false,
				error: "Please upload Aadhaar Card, PAN Card, and Customer Photo before verifying.",
			};
		}
	}

	let query = supabase
		.from("customers")
		.update({
			kyc_status: kycStatus,
			updated_at: new Date().toISOString(),
		})
		.eq("id", customerId);

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { error } = await query;
	if (error) return { success: false, error: error.message };

	revalidatePath(role === "advisor" ? `/advisor/customers/${customerId}` : `/customers/${customerId}`);
	return { success: true };
}

