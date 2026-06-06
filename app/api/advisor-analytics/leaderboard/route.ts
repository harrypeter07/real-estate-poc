import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");
		const monthParam = searchParams.get("month"); // YYYY-MM
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

		// Calculate start and end strings based on parameters
		let startStr: string;
		let endStr: string;

		if (from && to) {
			startStr = from.includes("T") ? from : `${from}T00:00:00.000Z`;
			endStr = to.includes("T") ? to : `${to}T23:59:59.999Z`;
		} else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
			const [year, month] = monthParam.split("-").map(Number);
			const startDate = new Date(Date.UTC(year, month - 1, 1));
			const endDate = new Date(Date.UTC(year, month, 1));
			startStr = startDate.toISOString();
			endStr = endDate.toISOString();
		} else {
			const now = new Date();
			const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
			const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
			startStr = startDate.toISOString();
			endStr = endDate.toISOString();
		}

		// Parse advisor IDs (it could be a comma-separated list)
		const advisorIds = advisorId ? advisorId.split(",").filter(Boolean) : [];

		// 1. Fetch advisors
		let advisorsQuery = supabase
			.from("advisors")
			.select("id, name, code")
			.eq("business_id", businessId);

		if (advisorIds.length > 0) {
			advisorsQuery = advisorsQuery.in("id", advisorIds);
		}
		const { data: advisors, error: advErr } = await advisorsQuery;

		if (advErr) return NextResponse.json({ error: advErr.message }, { status: 400 });

		// 2. Fetch commissions in date range
		let commsQuery = supabase
			.from("advisor_commissions")
			.select("advisor_id, sale_id, total_commission_amount, amount_paid, plot_sales!inner(is_cancelled)")
			.eq("business_id", businessId)
			.eq("plot_sales.is_cancelled", false)
			.gte("created_at", startStr)
			.lte("created_at", endStr);

		if (advisorIds.length > 0) {
			commsQuery = commsQuery.in("advisor_id", advisorIds);
		}
		const { data: comms, error: commsErr } = await commsQuery;

		if (commsErr) return NextResponse.json({ error: commsErr.message }, { status: 400 });

		// 3. Aggregate commissions by advisor
		const aggMap = new Map<string, { bookings: Set<string>; revenue: number; paid: number }>();
		for (const c of comms || []) {
			const aid = c.advisor_id;
			if (!aggMap.has(aid)) {
				aggMap.set(aid, { bookings: new Set(), revenue: 0, paid: 0 });
			}
			const agg = aggMap.get(aid)!;
			if (c.sale_id) {
				agg.bookings.add(c.sale_id);
			}
			agg.revenue += Number(c.total_commission_amount || 0);
			agg.paid += Number(c.amount_paid || 0);
		}

		// 4. Map to advisors and sort
		const list = (advisors || []).map((a: any) => {
			const agg = aggMap.get(a.id) || { bookings: new Set(), revenue: 0, paid: 0 };
			return {
				id: a.id,
				name: a.name,
				code: a.code,
				bookings_count: agg.bookings.size,
				revenue_generated: agg.revenue,
				commission_paid: agg.paid,
			};
		});

		// Sort by bookings count (descending), then by revenue (descending)
		list.sort((x, y) => {
			if (y.bookings_count !== x.bookings_count) {
				return y.bookings_count - x.bookings_count;
			}
			return y.revenue_generated - x.revenue_generated;
		});

		// Apply rank
		let currentRank = 1;
		const rankedList = list.map((item, index) => {
			if (index > 0 && list[index - 1].bookings_count > item.bookings_count) {
				currentRank = index + 1;
			}
			return {
				...item,
				rank: currentRank,
			};
		});

		// Return top 10
		return NextResponse.json(rankedList.slice(0, 10));
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
