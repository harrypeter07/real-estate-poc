import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Fetch all recovery tracking records for this advisor and business
		const { data, error } = await supabase
			.from("advisor_recovery_tracking")
			.select("total_due_amount, recovered_amount, pending_amount, recovery_status, follow_up_count")
			.eq("advisor_id", advisorId)
			.eq("business_id", businessId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		let totalDue = 0;
		let totalRecovered = 0;
		let totalPending = 0;
		let totalFollowUps = 0;

		const byStatus: Record<string, number> = {
			pending: 0,
			in_progress: 0,
			recovered: 0,
			failed: 0,
		};

		for (const item of data || []) {
			totalDue += Number(item.total_due_amount || 0);
			totalRecovered += Number(item.recovered_amount || 0);
			totalPending += Number(item.pending_amount || 0);
			totalFollowUps += Number(item.follow_up_count || 0);

			const status = item.recovery_status || "pending";
			byStatus[status] = (byStatus[status] || 0) + 1;
		}

		const recoveryRatePct = totalDue > 0 ? Number(((totalRecovered / totalDue) * 100).toFixed(2)) : 0;

		return NextResponse.json({
			total_due: totalDue,
			total_recovered: totalRecovered,
			total_pending: totalPending,
			recovery_rate_pct: recoveryRatePct,
			follow_up_count: totalFollowUps,
			by_status: byStatus,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
