import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { waived_by, waiver_reason } = body;

		if (!waiver_reason) {
			return NextResponse.json({ error: "waiver_reason is required" }, { status: 400 });
		}

		// Fetch penalty details to get linked EMI info
		const { data: penalty, error: fetchErr } = await supabase
			.from("payment_penalties")
			.select("emi_id, penalty_amount")
			.eq("id", id)
			.single();

		if (fetchErr || !penalty) {
			return NextResponse.json({ error: "Penalty record not found" }, { status: 404 });
		}

		// Mark penalty as waived
		const { data: waivedPenalty, error: waiveErr } = await supabase
			.from("payment_penalties")
			.update({
				is_waived: true,
				waived_by: waived_by || null,
				waived_at: new Date().toISOString(),
				waiver_reason,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select("*")
			.single();

		if (waiveErr) {
			return NextResponse.json({ error: waiveErr.message }, { status: 400 });
		}

		// Update linked EMI schedule to note waiver
		if (penalty.emi_id) {
			const { data: emi } = await supabase
				.from("emi_schedule")
				.select("waiver_amount, penalty_amount")
				.eq("id", penalty.emi_id)
				.single();

			if (emi) {
				const currentWaiver = Number(emi.waiver_amount || 0) + Number(penalty.penalty_amount);
				const currentPenalty = Math.max(0, Number(emi.penalty_amount || 0) - Number(penalty.penalty_amount));

				await supabase
					.from("emi_schedule")
					.update({
						waiver_amount: currentWaiver,
						penalty_amount: currentPenalty,
						waiver_reason: waiver_reason,
						updated_at: new Date().toISOString(),
					})
					.eq("id", penalty.emi_id);
			}
		}

		return NextResponse.json(waivedPenalty);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
