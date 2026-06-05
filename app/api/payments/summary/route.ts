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

		const { data: payments, error } = await supabase
			.from("payments")
			.select("amount, payment_mode, payment_date, plot_sales!inner(is_cancelled)")
			.eq("business_id", businessId)
			.eq("is_confirmed", true)
			.eq("plot_sales.is_cancelled", false)
			.gte("payment_date", fromDate)
			.lte("payment_date", toDate);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		let totalCollected = 0;
		const breakdown: Record<string, number> = {
			cash: 0,
			online: 0, // upi/bank_transfer maps to online
			cheque: 0,
		};

		const trendMap: Record<string, number> = {};

		for (const p of payments || []) {
			const amt = Number(p.amount);
			totalCollected += amt;

			// Handle custom/legacy payment mode mapping safely
			const mode = String(p.payment_mode || "cash").toLowerCase();
			if (mode.includes("cash")) {
				breakdown.cash += amt;
			} else if (mode.includes("cheque")) {
				breakdown.cheque += amt;
			} else {
				breakdown.online += amt;
			}

			const date = p.payment_date;
			trendMap[date] = (trendMap[date] || 0) + amt;
		}

		const dailyTrend = Object.keys(trendMap)
			.sort()
			.map((date) => ({
				date,
				amount: trendMap[date],
			}));

		return NextResponse.json({
			total_collected: totalCollected,
			breakdown,
			daily_trend: dailyTrend,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
