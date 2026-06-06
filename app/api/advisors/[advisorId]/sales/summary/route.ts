import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Fetch commission sums
		const { data: comms, error: commsErr } = await supabase
			.from("advisor_commissions")
			.select("total_commission_amount, amount_paid, remaining_commission, plot_sales!inner(is_cancelled)")
			.eq("advisor_id", advisorId)
			.eq("plot_sales.is_cancelled", false);

		if (commsErr) {
			return NextResponse.json({ error: commsErr.message }, { status: 400 });
		}

		// 2. Fetch sales revenue details
		const { data: sales, error: salesErr } = await supabase
			.from("plot_sales")
			.select("total_sale_amount")
			.eq("advisor_id", advisorId)
			.eq("is_cancelled", false);

		if (salesErr) {
			return NextResponse.json({ error: salesErr.message }, { status: 400 });
		}

		// 3. Fetch active customers count
		const { count: activeCustomersCount, error: custErr } = await supabase
			.from("customers")
			.select("id", { count: "exact", head: true })
			.eq("advisor_id", advisorId)
			.eq("is_active", true);

		if (custErr) {
			return NextResponse.json({ error: custErr.message }, { status: 400 });
		}

		// 4. Aggregate totals
		let totalCommissionEarned = 0;
		let commissionPaid = 0;
		let commissionPending = 0;
		for (const item of comms || []) {
			totalCommissionEarned += Number(item.total_commission_amount || 0);
			commissionPaid += Number(item.amount_paid || 0);
			commissionPending += Number(item.remaining_commission || 0);
		}

		let totalSales = 0;
		let totalRevenueGenerated = 0;
		for (const item of sales || []) {
			totalSales += 1;
			totalRevenueGenerated += Number(item.total_sale_amount || 0);
		}

		return NextResponse.json({
			total_sales: totalSales,
			total_commission_earned: totalCommissionEarned,
			commission_paid: commissionPaid,
			commission_pending: commissionPending,
			total_revenue_generated: totalRevenueGenerated,
			active_customers: activeCustomersCount || 0,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
