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
	is_active: boolean;
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

export type EnquiryTempCustomerForModal = {
	id: string;
	name: string;
	phone: string;
	is_active: boolean;
	created_at: string;
	enquiry_temp_id: string | null;
	latest_enquiry_category: string | null;
	latest_enquiry_details: string | null;
	latest_enquiry_project_name: string | null;
};

export async function getTempCustomersByPhone(
	phone: string
): Promise<
	Array<{
		id: string;
		name: string;
		phone: string;
		alternate_phone: string | null;
		address: string | null;
		birth_date: string | null;
		enquiry_temp_id: string | null;
		created_at: string;
	}>
> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("customers")
		.select(
			"id,name,phone,alternate_phone,address,birth_date,enquiry_temp_id,created_at"
		)
		.eq("phone", phone)
		.eq("is_active", false)
		.not("enquiry_temp_id", "is", null)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as any;
}

export async function getEnquiryTempCustomersForModal(): Promise<EnquiryTempCustomerForModal[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: tempCustomers, error: custErr } = await supabase
		.from("customers")
		.select("id,name,phone,is_active,created_at,enquiry_temp_id")
		.eq("is_active", false)
		.not("enquiry_temp_id", "is", null)
		.order("created_at", { ascending: false });

	if (custErr) throw new Error(custErr.message);

	const customers = (tempCustomers ?? []) as Array<{
		id: string;
		name: string;
		phone: string;
		is_active: boolean;
		created_at: string;
		enquiry_temp_id: string | null;
	}>;

	const enquiryIds = customers
		.map((c) => c.enquiry_temp_id)
		.filter(Boolean) as string[];

	if (enquiryIds.length === 0) return [];

	const { data: enquiries, error: enqErr } = await supabase
		.from("enquiry_customers")
		.select("id,category,details,project_id,projects(name)")
		.in("id", enquiryIds);

	if (enqErr) throw new Error(enqErr.message);

	const enqById = new Map<string, any>();
	for (const e of enquiries ?? []) {
		enqById.set(e.id, e);
	}

	return customers.map((c) => {
		const e = c.enquiry_temp_id ? enqById.get(c.enquiry_temp_id) : null;
		return {
			id: c.id,
			name: c.name,
			phone: c.phone,
			is_active: c.is_active,
			created_at: c.created_at,
			enquiry_temp_id: c.enquiry_temp_id,
			latest_enquiry_category: e?.category ?? null,
			latest_enquiry_details: e?.details ?? null,
			latest_enquiry_project_name: e?.projects?.name ?? null,
		};
	});
}

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
		is_active: !!e.is_active,
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

	// Insert enquiry record always (same phone can have multiple enquiries).
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

	const enquiryId = enquiry.id;

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
		// If this is still a temporary customer, always link it to the latest enquiry
		// for that phone. Permanent customers keep their existing linkage (if any).
		const shouldSetTempLink = existingCustomer.is_active === false;

		const customerUpdates: any = {
			enquiry_temp_id: shouldSetTempLink ? enquiryId : existingCustomer.enquiry_temp_id,
			// keep regular customer active state as-is; do not overwrite if it already has notes
			notes:
				existingCustomer.notes && String(existingCustomer.notes).trim()
					? existingCustomer.notes
					: parsed.data.details || null,
		};

		// For temporary customers, keep user-related fields in sync as user types / selects.
		if (shouldSetTempLink) {
			customerUpdates.name = parsed.data.name;
			if (parsed.data.alternate_phone && parsed.data.alternate_phone.trim()) {
				customerUpdates.alternate_phone = parsed.data.alternate_phone.trim();
			}
			if (parsed.data.address && parsed.data.address.trim()) {
				customerUpdates.address = parsed.data.address.trim();
			}
			if (parsed.data.birth_date) {
				customerUpdates.birth_date = parsed.data.birth_date;
			}
		}

		const { error: custUpdErr } = await supabase
			.from("customers")
			.update(customerUpdates)
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

	return { success: true, enquiryId, customerId };
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
		.select("phone,category,details")
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
	await supabase
		.from("enquiry_customers")
		.update({
			is_active: false,
			upgraded_customer_id: customerId,
			upgraded_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("phone", enquiry.phone)
		.eq("is_active", true);

	revalidatePath("/enquiries");
	revalidatePath("/customers");
	revalidatePath("/reports");

	return { success: true };
}

export async function upgradeTempCustomerToCustomer(opts: {
	customerId: string;
}): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) {
		return { success: false, error: "Database connection failed" };
	}

	const { data: customer, error: custErr } = await supabase
		.from("customers")
		.select("id,phone,enquiry_temp_id")
		.eq("id", opts.customerId)
		.single();

	if (custErr || !customer) {
		return { success: false, error: custErr?.message || "Customer not found" };
	}

	// Prefer the stored temp enquiry link.
	let enquiryId: string | null = customer.enquiry_temp_id ?? null;

	if (!enquiryId) {
		const { data: latestEnq, error: enqErr } = await supabase
			.from("enquiry_customers")
			.select("id")
			.eq("phone", customer.phone)
			.eq("is_active", true)
			.order("created_at", { ascending: false })
			.limit(1)
			.maybeSingle();

		if (enqErr) return { success: false, error: enqErr.message };
		enquiryId = latestEnq?.id ?? null;
	}

	if (!enquiryId) {
		return { success: false, error: "No active enquiry found to upgrade from" };
	}

	return upgradeEnquiryToCustomer({ enquiryId, customerId: customer.id });
}

export type ActionResponse = {
	success: boolean;
	error?: string;
};

