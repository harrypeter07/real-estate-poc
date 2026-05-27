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

		const { data: penalties, error } = await supabase
			.from("payment_penalties")
			.select("penalty_amount, is_paid, is_waived")
			.eq("business_id", businessId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		let totalRaised = 0;
		let totalWaived = 0;
		let totalCollected = 0;
		let totalPending = 0;

		for (const p of penalties || []) {
			const amt = Number(p.penalty_amount);
			totalRaised += amt;

			if (p.is_waived) {
				totalWaived += amt;
			} else if (p.is_paid) {
				totalCollected += amt;
			} else {
				totalPending += amt;
			}
		}

		return NextResponse.json({
			total_raised: totalRaised,
			total_waived: totalWaived,
			total_collected: totalCollected,
			total_pending: totalPending,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
