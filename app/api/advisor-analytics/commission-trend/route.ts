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

		const startDate = from || twelveMonthsAgo.toISOString().slice(0, 10);
		const endDate = to || now.toISOString().slice(0, 10);

		// Parse advisor IDs
		const advisorIds = advisorId ? advisorId.split(",").filter(Boolean) : [];

		let query = supabase
			.from("advisor_commission_payments")
			.select(
				`
				amount,
				extra_paid_amount,
				paid_date,
				advisor_commissions!inner(
					advisor_id,
					business_id,
					advisors:advisors!advisor_id(name)
				)
				`
			)
			.eq("advisor_commissions.business_id", businessId)
			.gte("paid_date", startDate)
			.lte("paid_date", endDate);

		if (advisorIds.length > 0) {
			query = query.in("advisor_commissions.advisor_id", advisorIds);
		}

		const { data, error } = await query;
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });

		// Aggregate in JS by month (YYYY-MM) and advisor
		const aggMap = new Map<string, { month: string; advisor_id: string; advisor_name: string; commission_paid: number; extra_paid: number; total_paid: number }>();

		for (const p of data || []) {
			const paidDateStr = p.paid_date;
			if (!paidDateStr) continue;

			const monthStr = paidDateStr.slice(0, 7); // YYYY-MM
			const comm = p.advisor_commissions as any;
			const adv = comm?.advisors;
			if (!comm || !adv) continue;

			const key = `${monthStr}_${comm.advisor_id}`;
			if (!aggMap.has(key)) {
				aggMap.set(key, {
					month: monthStr,
					advisor_id: comm.advisor_id,
					advisor_name: adv.name,
					commission_paid: 0,
					extra_paid: 0,
					total_paid: 0,
				});
			}

			const agg = aggMap.get(key)!;
			const amount = Number(p.amount || 0);
			const extra = Number(p.extra_paid_amount || 0);

			agg.commission_paid += amount;
			agg.extra_paid += extra;
			agg.total_paid += (amount + extra);
		}

		// Convert Map to sorted array
		const result = Array.from(aggMap.values());
		result.sort((x, y) => x.month.localeCompare(y.month));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
