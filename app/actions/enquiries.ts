"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	enquiryCustomerSchema,
	type EnquiryCustomerFormValues,
} from "@/lib/validations/enquiry";

export type EnquiryRow = {
	id: string;
	name: string;
	phone: string;
	alternate_phone: string | null;
	address: string | null;
	birth_date: string | null;
	category: string;
	details: string | null;
	project_id: string | null;
	project_name: string | null;
	created_at: string;
};

export type EnquiryCustomerRow = {
	id: string;
	name: string;
	phone: string;
	is_active: boolean;
	created_at: string;
	enquiry_temp_id: string | null;
	upgraded_from_enquiry_id: string | null;
	upgraded_from_enquiry_at: string | null;
};

export async function getEnquiryCustomers(): Promise<EnquiryRow[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("enquiry_customers")
		.select(
			`
      *,
      projects(name)
    `
		)
		.eq("is_active", true)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);

	return (data ?? []).map((e: any) => ({
		id: e.id,
		name: e.name,
		phone: e.phone,
		alternate_phone: e.alternate_phone,
		address: e.address,
		birth_date: e.birth_date,
		category: e.category,
		details: e.details,
		project_id: e.project_id,
		project_name: e.projects?.name ?? null,
		created_at: e.created_at,
	})) as EnquiryRow[];
}

export async function createEnquiryCustomer(
	values: EnquiryCustomerFormValues
): Promise<
	| { success: true; enquiryId: string; customerId: string; reusedEnquiry?: boolean }
	| { success: false; error: string }
> {
	const parsed = enquiryCustomerSchema.safeParse(values);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	// Dedup enquiry by phone (simple rule: if phone already exists, reuse).
	const { data: existingEnquiry, error: enquiryFindErr } = await supabase
		.from("enquiry_customers")
		.select("id")
		.eq("phone", parsed.data.phone)
		.maybeSingle();

	let enquiryId: string;
	let reusedEnquiry = false;

	if (enquiryFindErr) {
		return { success: false, error: enquiryFindErr.message };
	}

	if (existingEnquiry?.id) {
		reusedEnquiry = true;
		enquiryId = existingEnquiry.id;
		const { error: enquiryUpdErr } = await supabase
			.from("enquiry_customers")
			.update({
				name: parsed.data.name,
				alternate_phone: parsed.data.alternate_phone || null,
				address: parsed.data.address || null,
				birth_date: parsed.data.birth_date || null,
				project_id: parsed.data.project_id || null,
				category: parsed.data.category,
				details: parsed.data.details || null,
				is_active: parsed.data.is_active,
				updated_at: new Date().toISOString(),
			})
			.eq("id", existingEnquiry.id);

		if (enquiryUpdErr) {
			return { success: false, error: enquiryUpdErr.message };
		}
	} else {
		const { data: enquiry, error: enquiryErr } = await supabase
			.from("enquiry_customers")
			.insert({
				name: parsed.data.name,
				phone: parsed.data.phone,
				alternate_phone: parsed.data.alternate_phone || null,
				address: parsed.data.address || null,
				birth_date: parsed.data.birth_date || null,
				project_id: parsed.data.project_id || null,
				category: parsed.data.category,
				details: parsed.data.details || null,
				is_active: parsed.data.is_active,
			})
			.select("id")
			.single();

		if (enquiryErr || !enquiry) {
			return { success: false, error: enquiryErr?.message || "Failed to create enquiry" };
		}

		enquiryId = enquiry.id;
	}

	// If a customer with same phone exists, reuse it; otherwise create a temp customer.
	const { data: existingCustomer, error: custFindErr } = await supabase
		.from("customers")
		.select("id,is_active,enquiry_temp_id,upgraded_from_enquiry_id,notes")
		.eq("phone", parsed.data.phone)
		.maybeSingle();

	if (custFindErr) {
		return { success: false, error: custFindErr.message };
	}

	let customerId: string;
	if (existingCustomer?.id) {
		customerId = existingCustomer.id;
		const shouldSetTempLink = !existingCustomer.enquiry_temp_id;
		const { error: custUpdErr } = await supabase
			.from("customers")
			.update({
				enquiry_temp_id: shouldSetTempLink ? enquiryId : existingCustomer.enquiry_temp_id,
				// keep regular customer active state as-is; do not overwrite if it already has notes
				notes:
					existingCustomer.notes && String(existingCustomer.notes).trim()
						? existingCustomer.notes
						: parsed.data.details || null,
			})
			.eq("id", existingCustomer.id);

		if (custUpdErr) {
			return { success: false, error: custUpdErr.message };
		}
	} else {
		const { data: newCustomer, error: custInsertErr } = await supabase
			.from("customers")
			.insert({
				name: parsed.data.name,
				phone: parsed.data.phone,
				alternate_phone: parsed.data.alternate_phone || null,
				address: parsed.data.address || null,
				birth_date: parsed.data.birth_date || null,
				advisor_id: null,
				route: null,
				notes: parsed.data.details || null,
				is_active: false, // temporary until upgraded
				enquiry_temp_id: enquiryId,
			})
			.select("id")
			.single();

		if (custInsertErr || !newCustomer) {
			return { success: false, error: custInsertErr?.message || "Failed to create temp customer" };
		}

		customerId = newCustomer.id;
	}

	revalidatePath("/enquiries");
	revalidatePath("/customers");

	return { success: true, enquiryId, customerId, reusedEnquiry };
}

export async function getEnquiryLinkedCustomers(
	enquiryId: string
): Promise<EnquiryCustomerRow[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: enquiry, error: enquiryErr } = await supabase
		.from("enquiry_customers")
		.select("phone")
		.eq("id", enquiryId)
		.single();

	if (enquiryErr || !enquiry) return [];

	const { data, error } = await supabase
		.from("customers")
		.select(
			`
      id,
      name,
      phone,
      is_active,
      created_at,
      enquiry_temp_id,
      upgraded_from_enquiry_id,
      upgraded_from_enquiry_at
    `
		)
		.eq("phone", enquiry.phone)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as EnquiryCustomerRow[];
}

export async function upgradeEnquiryToCustomer(opts: {
	enquiryId: string;
	customerId: string;
}): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { enquiryId, customerId } = opts;

	const { data: enquiry, error: enquiryErr } = await supabase
		.from("enquiry_customers")
		.select("category,details")
		.eq("id", enquiryId)
		.single();

	if (enquiryErr || !enquiry) {
		return { success: false, error: enquiryErr?.message || "Enquiry not found" };
	}

	const { error } = await supabase
		.from("customers")
		.update({
			is_active: true,
			upgraded_from_enquiry_id: enquiryId,
			upgraded_from_enquiry_category: enquiry.category,
			upgraded_from_enquiry_details: enquiry.details,
			upgraded_from_enquiry_at: new Date().toISOString(),
		})
		.eq("id", customerId);

	if (error) return { success: false, error: error.message };

	// Mark enquiry as upgraded
	await supabase.from("enquiry_customers").update({
		is_active: false,
		upgraded_customer_id: customerId,
		upgraded_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}).eq("id", enquiryId);

	revalidatePath("/enquiries");
	revalidatePath("/customers");
	revalidatePath("/reports");

	return { success: true };
}

export type ActionResponse = {
	success: boolean;
	error?: string;
};

