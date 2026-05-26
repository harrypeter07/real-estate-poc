import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const advisorId = searchParams.get("advisor_id");

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Default date range: last 12 months
		const now = new Date();
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

		const startDate = from || twelveMonthsAgo.toISOString();
		const endDate = to || now.toISOString();

		// Parse advisor IDs (it could be a comma-separated list)
		const advisorIds = advisorId ? advisorId.split(",").filter(Boolean) : [];

		let query = supabase
			.from("advisor_commissions")
			.select(
				`
				created_at,
				sale_id,
				total_commission_amount,
				advisors!inner(id, name)
				`
			)
			.eq("business_id", businessId)
			.gte("created_at", startDate)
			.lte("created_at", endDate);

		if (advisorIds.length > 0) {
			query = query.in("advisor_id", advisorIds);
		}

		const { data, error } = await query;
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });

		// Aggregate in JS by YYYY-MM and Advisor
		const aggMap = new Map<string, { month: string; advisor_id: string; advisor_name: string; bookings: Set<string>; revenue: number }>();

		for (const c of data || []) {
			const date = new Date(c.created_at);
			const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
			const adv = c.advisors as any;
			if (!adv) continue;

			const key = `${monthStr}_${adv.id}`;
			if (!aggMap.has(key)) {
				aggMap.set(key, {
					month: monthStr,
					advisor_id: adv.id,
					advisor_name: adv.name,
					bookings: new Set(),
					revenue: 0,
				});
			}

			const agg = aggMap.get(key)!;
			if (c.sale_id) {
				agg.bookings.add(c.sale_id);
			}
			agg.revenue += Number(c.total_commission_amount || 0);
		}

		// Convert Map to sorted array
		const result = Array.from(aggMap.values()).map((item) => ({
			month: item.month,
			advisor_id: item.advisor_id,
			advisor_name: item.advisor_name,
			bookings: item.bookings.size,
			revenue: item.revenue,
		}));

		// Sort by month ascending
		result.sort((x, y) => x.month.localeCompare(y.month));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
