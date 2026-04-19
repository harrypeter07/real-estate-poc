"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveBusinessIdForSettings(): Promise<
	| { ok: true; businessId: string }
	| { ok: false; error: string; debug?: Record<string, unknown> }
> {
	const bid = await getCurrentBusinessId();
	if (bid) {
		return { ok: true, businessId: bid };
	}

	// If JWT metadata is missing, RLS may prevent reading business_admins.
	// Use service-role client as a fallback for admin settings screens.
	const supabase = await createClient();
	const admin = createAdminClient();
	if (!supabase || !admin) {
		console.warn("[business-settings] Missing supabase/admin client");
		return {
			ok: false,
			error:
				"Business context missing and admin fallback is unavailable. Check SUPABASE_SERVICE_ROLE_KEY.",
		};
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user?.id) {
		console.warn("[business-settings] No authenticated user");
		return { ok: false, error: "Not authenticated." };
	}

	const { data, error } = await admin
		.from("business_admins")
		.select("business_id")
		.eq("auth_user_id", user.id)
		.maybeSingle();
	if (error) {
		console.warn("[business-settings] business_admins lookup failed", {
			message: error.message,
			code: (error as any).code,
			userId: user.id,
		});
		return {
			ok: false,
			error: `Failed to resolve business mapping (${error.message})`,
		};
	}
	const fromMap = String((data as any)?.business_id ?? "").trim();
	if (fromMap) return { ok: true, businessId: fromMap };
	console.warn("[business-settings] business_admins mapping missing", { userId: user.id });
	return {
		ok: false,
		error:
			"No business mapping found for this admin. Add a row in public.business_admins for your auth_user_id.",
		debug: { userId: user.id },
	};
}

export type BusinessProfile = {
	id: string;
	name: string;
	display_name: string | null;
	tagline: string | null;
	logo_path: string | null;
	address: string | null;
	phone: string | null;
	email: string | null;
	gst_number: string | null;
	pan_number: string | null;
	receipt_footer: string | null;
};

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
	const supabase = await createClient();
	if (!supabase) return null;
	const resolved = await resolveBusinessIdForSettings();
	if (!resolved.ok) return null;
	const bid = resolved.businessId;
	const { data, error } = await supabase
		.from("businesses")
		.select(
			"id, name, display_name, tagline, logo_path, address, phone, email, gst_number, pan_number, receipt_footer"
		)
		.eq("id", bid)
		.maybeSingle();
	if (error || !data) return null;
	return data as BusinessProfile;
}

export async function getBusinessProfileOrError(): Promise<{
	profile: BusinessProfile | null;
	error?: string;
	debug?: Record<string, unknown>;
}> {
	const supabase = await createClient();
	if (!supabase) return { profile: null, error: "Database connection failed" };
	const resolved = await resolveBusinessIdForSettings();
	if (!resolved.ok) return { profile: null, error: resolved.error, debug: resolved.debug };
	const bid = resolved.businessId;
	const { data, error } = await supabase
		.from("businesses")
		.select(
			"id, name, display_name, tagline, logo_path, address, phone, email, gst_number, pan_number, receipt_footer"
		)
		.eq("id", bid)
		.maybeSingle();
	if (error || !data) return { profile: null, error: error?.message || "Business not found" };
	return { profile: data as BusinessProfile };
}

export async function updateBusinessProfile(values: {
	display_name?: string | null;
	tagline?: string | null;
	logo_path?: string | null;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
	gst_number?: string | null;
	pan_number?: string | null;
	receipt_footer?: string | null;
}): Promise<{ success: boolean; error?: string; profile?: BusinessProfile }> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const resolved = await resolveBusinessIdForSettings();
	if (!resolved.ok) return { success: false, error: resolved.error };
	const bid = resolved.businessId;

	const updatePayload = {
		display_name: values.display_name ?? null,
		tagline: values.tagline ?? null,
		logo_path: values.logo_path ?? null,
		address: values.address ?? null,
		phone: values.phone ?? null,
		email: values.email ?? null,
		gst_number: values.gst_number ?? null,
		pan_number: values.pan_number ?? null,
		receipt_footer: values.receipt_footer ?? null,
		updated_at: new Date().toISOString(),
	};
	console.warn("[business-settings] Update attempt", {
		businessId: bid,
		updatePayload,
	});

	const { data, error } = await supabase
		.from("businesses")
		.update(updatePayload)
		.eq("id", bid)
		.select(
			"id, name, display_name, tagline, logo_path, address, phone, email, gst_number, pan_number, receipt_footer"
		)
		.maybeSingle();

	if (error) {
		console.warn("[business-settings] Update failed", {
			businessId: bid,
			message: error.message,
			code: (error as any).code,
		});
		return { success: false, error: error.message };
	}

	if (!data) {
		// Can happen if RLS blocks update (0 rows affected). Fall back to admin client.
		const admin = createAdminClient();
		if (!admin) {
			console.warn("[business-settings] Update affected 0 rows (no admin fallback)", {
				businessId: bid,
			});
			return {
				success: false,
				error:
					"Business update was blocked (0 rows affected). Check RLS policies for businesses table.",
			};
		}

		console.warn("[business-settings] Update affected 0 rows, trying admin fallback", {
			businessId: bid,
		});
		const { data: adminData, error: adminErr } = await admin
			.from("businesses")
			.update(updatePayload)
			.eq("id", bid)
			.select(
				"id, name, display_name, tagline, logo_path, address, phone, email, gst_number, pan_number, receipt_footer"
			)
			.maybeSingle();

		if (adminErr) {
			console.warn("[business-settings] Admin fallback update failed", {
				businessId: bid,
				message: adminErr.message,
				code: (adminErr as any).code,
			});
			return { success: false, error: adminErr.message };
		}
		if (!adminData) {
			console.warn("[business-settings] Admin fallback update returned no row", {
				businessId: bid,
			});
			return { success: false, error: "Business update failed (no row returned)." };
		}

		console.warn("[business-settings] Admin fallback update ok", {
			businessId: bid,
			display_name: (adminData as any).display_name ?? null,
			tagline: (adminData as any).tagline ?? null,
		});
		revalidatePath("/settings/business");
		return { success: true, profile: adminData as BusinessProfile };
	}

	console.warn("[business-settings] Updated business profile", {
		businessId: bid,
		display_name: (data as any).display_name ?? null,
		tagline: (data as any).tagline ?? null,
	});
	revalidatePath("/settings/business");
	return { success: true, profile: data as BusinessProfile };
}
