import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export async function GET(req: Request) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const businessId = await getCurrentBusinessId();
		if (!businessId) {
			return NextResponse.json({ error: "Business ID not found" }, { status: 400 });
		}

		const url = new URL(req.url);
		const dateParam = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
		const status = url.searchParams.get("status") || "scheduled";

		const { data: visits, error } = await supabase
			.from("enquiry_site_visits")
			.select(`
				*,
				enquiry_customers(name, phone),
				projects(name),
				business_admins(name)
			`)
			.eq("business_id", businessId)
			.eq("scheduled_date", dateParam)
			.eq("status", status)
			.order("scheduled_time", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = (visits || []).map((v: any) => ({
			id: v.id,
			scheduled_date: v.scheduled_date,
			scheduled_time: v.scheduled_time,
			status: v.status,
			interest_level: v.interest_level,
			customer_name: v.enquiry_customers?.name || "—",
			customer_phone: v.enquiry_customers?.phone || "—",
			project_name: v.projects?.name || "—",
			conducted_by_name: v.business_admins?.name || "—",
		}));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
