import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ saleId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { saleId } = await params;

		const { data: emis, error } = await supabase
			.from("emi_schedule")
			.select(`
				*,
				payments(id, amount, payment_date, payment_mode)
			`)
			.eq("sale_id", saleId)
			.order("emi_number", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		let totalEmis = emis?.length || 0;
		let paidEmis = 0;
		let overdueEmis = 0;
		let pendingEmis = 0;
		let partialEmis = 0;

		let totalEmiAmount = 0;
		let totalPaid = 0;
		let totalRemaining = 0;
		let totalPenalty = 0;
		let maxOverdueDays = 0;

		const today = new Date();

		const result = (emis || []).map((e: any) => {
			totalEmiAmount += Number(e.emi_amount || 0);
			totalPaid += Number(e.paid_amount || 0);
			totalRemaining += Number(e.remaining_amount || 0);
			totalPenalty += Number(e.penalty_amount || 0);

			let displayStatus = e.status;
			const dueDate = new Date(e.due_date);

			if (e.status === "paid") {
				paidEmis++;
			} else if (e.status === "partial") {
				partialEmis++;
			} else if (e.status === "pending" || e.status === "overdue") {
				if (dueDate < today) {
					displayStatus = "overdue";
					overdueEmis++;
					const overDays = Math.ceil((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
					if (overDays > maxOverdueDays) {
						maxOverdueDays = overDays;
					}
				} else {
					displayStatus = "pending";
					pendingEmis++;
				}
			}

			return {
				...e,
				display_status: displayStatus,
				payment_amount: e.payments?.amount || null,
				payment_date: e.payments?.payment_date || null,
				payment_mode: e.payments?.payment_mode || null,
			};
		});

		return NextResponse.json({
			schedule: result,
			summary: {
				total_emis: totalEmis,
				paid_emis: paidEmis,
				overdue_emis: overdueEmis,
				pending_emis: pendingEmis,
				partial_emis: partialEmis,
				total_emi_amount: totalEmiAmount,
				total_paid: totalPaid,
				total_remaining: totalRemaining,
				total_penalty: totalPenalty,
				max_overdue_days: maxOverdueDays,
			},
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
