import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; id: string }> }
) {
	try {
		const { advisorId, id } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			recovered_amount,
			recovery_status,
			last_follow_up_date,
			next_follow_up_date,
			recovery_notes,
		} = body;

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Fetch current recovery record details
		const { data: recovery, error: fetchErr } = await supabase
			.from("advisor_recovery_tracking")
			.select("follow_up_count, total_due_amount, recovered_amount, recovery_status")
			.eq("id", id)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (fetchErr || !recovery) {
			return NextResponse.json({ error: "Recovery record not found" }, { status: 404 });
		}

		// 2. Compute updated values
		const newRecoveredAmount = recovered_amount !== undefined ? Number(recovered_amount) : Number(recovery.recovered_amount);
		const totalDue = Number(recovery.total_due_amount);

		// Auto-set status to 'recovered' if recovered_amount >= total_due_amount
		let finalStatus = recovery_status || recovery.recovery_status;
		if (newRecoveredAmount >= totalDue) {
			finalStatus = "recovered";
		} else if (recovered_amount !== undefined && newRecoveredAmount > 0 && finalStatus === "pending") {
			finalStatus = "in_progress";
		}

		// Auto-increment follow_up_count on update
		const newFollowUpCount = Number(recovery.follow_up_count || 0) + 1;

		const updatePayload: any = {
			recovered_amount: newRecoveredAmount,
			recovery_status: finalStatus,
			last_follow_up_date: last_follow_up_date || new Date().toISOString().slice(0, 10),
			next_follow_up_date: next_follow_up_date || null,
			recovery_notes: recovery_notes || null,
			follow_up_count: newFollowUpCount,
			updated_at: new Date().toISOString(),
		};

		// 3. Perform update
		const { data: updatedRecord, error: updateErr } = await supabase
			.from("advisor_recovery_tracking")
			.update(updatePayload)
			.eq("id", id)
			.eq("advisor_id", advisorId)
			.select("*, customers(name, phone)")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		const formatted = {
			...updatedRecord,
			customer_name: updatedRecord.customers?.name || "—",
			customer_phone: updatedRecord.customers?.phone || "—",
		};

		return NextResponse.json(formatted);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
