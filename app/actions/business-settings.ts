"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { revalidatePath } from "next/cache";

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
	const bid = await getCurrentBusinessId();
	if (!bid) return null;
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
}): Promise<{ success: boolean; error?: string }> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const bid = await getCurrentBusinessId();
	if (!bid) return { success: false, error: "Business context missing" };

	const { error } = await supabase
		.from("businesses")
		.update({
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
		})
		.eq("id", bid);

	if (error) return { success: false, error: error.message };
	revalidatePath("/settings/business");
	return { success: true };
}
