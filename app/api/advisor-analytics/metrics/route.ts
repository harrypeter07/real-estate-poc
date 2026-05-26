import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const advisorId = searchParams.get("advisor_id"); // Can be multi-value or single

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Handle default date range: last 12 months
		const now = new Date();
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

		const startDate = from || twelveMonthsAgo.toISOString();
		const endDate = to || now.toISOString();

		// Parse advisor IDs (it could be a comma-separated list)
		const advisorIds = advisorId ? advisorId.split(",").filter(Boolean) : [];

		// 1. Fetch sales/bookings & revenue generated
		let salesQuery = supabase
			.from("plot_sales")
			.select("id, total_sale_amount")
			.eq("business_id", businessId)
			.eq("is_cancelled", false)
			.gte("created_at", startDate)
			.lte("created_at", endDate);

		if (advisorIds.length > 0) {
			salesQuery = salesQuery.in("advisor_id", advisorIds);
		}
		const { data: sales, error: salesErr } = await salesQuery;
		if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 400 });

		// 2. Fetch customers count (leads handled)
		let leadsQuery = supabase
			.from("customers")
			.select("id")
			.eq("business_id", businessId)
			.gte("created_at", startDate)
			.lte("created_at", endDate);

		if (advisorIds.length > 0) {
			leadsQuery = leadsQuery.in("advisor_id", advisorIds);
		}
		const { data: leads, error: leadsErr } = await leadsQuery;
		if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 400 });

		// 3. Fetch recovery tracking data for efficiency
		let recoveryQuery = supabase
			.from("advisor_recovery_tracking")
			.select("total_due_amount, recovered_amount")
			.eq("business_id", businessId)
			.gte("created_at", startDate)
			.lte("created_at", endDate);

		if (advisorIds.length > 0) {
			recoveryQuery = recoveryQuery.in("advisor_id", advisorIds);
		}
		const { data: recovery, error: recErr } = await recoveryQuery;
		if (recErr) return NextResponse.json({ error: recErr.message }, { status: 400 });

		// 4. Fetch commission payments
		let commissionQuery = supabase
			.from("advisor_commissions")
			.select("amount_paid")
			.eq("business_id", businessId)
			.gte("created_at", startDate)
			.lte("created_at", endDate);

		if (advisorIds.length > 0) {
			commissionQuery = commissionQuery.in("advisor_id", advisorIds);
		}
		const { data: commissions, error: commsErr } = await commissionQuery;
		if (commsErr) return NextResponse.json({ error: commsErr.message }, { status: 400 });

		// Aggregations
		const totalBookings = sales?.length || 0;
		const leadsHandled = leads?.length || 0;

		let revenueGenerated = 0;
		for (const s of sales || []) {
			revenueGenerated += Number(s.total_sale_amount || 0);
		}

		let commissionPaid = 0;
		for (const c of commissions || []) {
			commissionPaid += Number(c.amount_paid || 0);
		}

		let totalDue = 0;
		let totalRecovered = 0;
		for (const r of recovery || []) {
			totalDue += Number(r.total_due_amount || 0);
			totalRecovered += Number(r.recovered_amount || 0);
		}

		// Calculate rates
		const conversionRate = leadsHandled > 0 ? Number(((totalBookings / leadsHandled) * 100).toFixed(2)) : 0;
		const collectionEfficiency = totalDue > 0 ? Number(((totalRecovered / totalDue) * 100).toFixed(2)) : 0;

		return NextResponse.json({
			total_bookings: totalBookings,
			conversion_rate: conversionRate,
			leads_handled: leadsHandled,
			collection_efficiency: collectionEfficiency,
			revenue_generated: revenueGenerated,
			commission_paid: commissionPaid,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
