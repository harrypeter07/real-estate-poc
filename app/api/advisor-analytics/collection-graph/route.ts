import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

		const startDate = from 
			? (from.includes("T") ? from : `${from}T00:00:00.000Z`) 
			: twelveMonthsAgo.toISOString();
		const endDate = to 
			? (to.includes("T") ? to : `${to}T23:59:59.999Z`) 
			: now.toISOString();

		// Parse advisor IDs
		const advisorIds = advisorId ? advisorId.split(",").filter(Boolean) : [];

		let query = supabase
			.from("advisor_recovery_tracking")
			.select(
				`
				total_due_amount,
				recovered_amount,
				pending_amount,
				updated_at,
				advisors!inner(id, name)
				`
			)
			.eq("business_id", businessId)
			.gte("updated_at", startDate)
			.lte("updated_at", endDate);

		if (advisorIds.length > 0) {
			query = query.in("advisor_id", advisorIds);
		}

		const { data, error } = await query;
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });

		// Aggregate in JS by month (YYYY-MM) and advisor
		const aggMap = new Map<string, { month: string; advisor_id: string; advisor_name: string; total_due: number; recovered: number; pending: number }>();

		for (const r of data || []) {
			const updatedAtStr = r.updated_at;
			if (!updatedAtStr) continue;

			const date = new Date(updatedAtStr);
			const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
			const adv = r.advisors as any;
			if (!adv) continue;

			const key = `${monthStr}_${adv.id}`;
			if (!aggMap.has(key)) {
				aggMap.set(key, {
					month: monthStr,
					advisor_id: adv.id,
					advisor_name: adv.name,
					total_due: 0,
					recovered: 0,
					pending: 0,
				});
			}

			const agg = aggMap.get(key)!;
			agg.total_due += Number(r.total_due_amount || 0);
			agg.recovered += Number(r.recovered_amount || 0);
			agg.pending += Number(r.pending_amount || 0);
		}

		// Convert Map to array and calculate efficiency%
		const result = Array.from(aggMap.values()).map((item) => {
			const efficiencyPct = item.total_due > 0 ? Number(((item.recovered / item.total_due) * 100).toFixed(2)) : 0;
			return {
				month: item.month,
				advisor_id: item.advisor_id,
				advisor_name: item.advisor_name,
				total_due: item.total_due,
				recovered: item.recovered,
				pending: item.pending,
				efficiency_pct: efficiencyPct,
			};
		});

		// Sort by month ascending
		result.sort((x, y) => x.month.localeCompare(y.month));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
