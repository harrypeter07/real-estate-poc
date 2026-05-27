import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");
		const monthParam = searchParams.get("month"); // YYYY-MM

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Calculate start and end of the target month
		let startStr: string;
		let endStr: string;

		if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
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

		// 1. Fetch all advisors
		const { data: advisors, error: advErr } = await supabase
			.from("advisors")
			.select("id, name, code")
			.eq("business_id", businessId);

		if (advErr) return NextResponse.json({ error: advErr.message }, { status: 400 });

		// 2. Fetch commissions in that month
		const { data: comms, error: commsErr } = await supabase
			.from("advisor_commissions")
			.select("advisor_id, sale_id, total_commission_amount, amount_paid")
			.eq("business_id", businessId)
			.gte("created_at", startStr)
			.lt("created_at", endStr);

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
