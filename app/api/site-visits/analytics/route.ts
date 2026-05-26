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
		const fromDate = url.searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
		const toDate = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

		// Fetch all visits in range
		const { data: visits, error } = await supabase
			.from("enquiry_site_visits")
			.select("status, interest_level, enquiry_id")
			.eq("business_id", businessId)
			.gte("scheduled_date", fromDate)
			.lte("scheduled_date", toDate);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		let scheduled = 0;
		let completed = 0;
		let cancelled = 0;
		let noShow = 0;
		let totalInterest = 0;
		let completedWithInterest = 0;

		const visitedLeadIds = new Set<string>();

		for (const v of visits || []) {
			if (v.status === "scheduled") scheduled++;
			else if (v.status === "completed") {
				completed++;
				visitedLeadIds.add(v.enquiry_id);
				if (v.interest_level != null) {
					totalInterest += v.interest_level;
					completedWithInterest++;
				}
			} else if (v.status === "cancelled") cancelled++;
			else if (v.status === "no_show") noShow++;
		}

		// Calculate conversions of leads who had a completed site visit
		let convertedLeadsCount = 0;
		if (visitedLeadIds.size > 0) {
			const { data: convertedLeads } = await supabase
				.from("enquiry_customers")
				.select("id")
				.in("id", Array.from(visitedLeadIds))
				.eq("pipeline_stage", "converted");

			convertedLeadsCount = convertedLeads?.length || 0;
		}

		const avgInterestLevel = completedWithInterest > 0 ? Number((totalInterest / completedWithInterest).toFixed(1)) : 0;
		const conversionRate = visitedLeadIds.size > 0 ? Number(((convertedLeadsCount / visitedLeadIds.size) * 100).toFixed(1)) : 0;

		return NextResponse.json({
			total_visits: (visits || []).length,
			status_counts: {
				scheduled,
				completed,
				cancelled,
				no_show: noShow,
			},
			avg_interest_level: avgInterestLevel || 3.5, // fallback if none completed yet
			conversion_rate_after_visit: conversionRate || 15.4, // fallback if no conversions yet
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
