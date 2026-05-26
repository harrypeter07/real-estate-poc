import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
	try {
		const admin = createAdminClient();
		if (!admin) {
			return NextResponse.json({ error: "Admin database connection failed" }, { status: 500 });
		}

		const todayStr = new Date().toISOString().split("T")[0];

		// Query 9l logic: Find overdue EMIs that do not have active due_payment_reminders
		const { data: overdueEmis, error: fetchErr } = await admin
			.from("emi_schedule")
			.select("id, sale_id, customer_id, business_id, remaining_amount, overdue_days")
			.in("status", ["pending", "partial", "overdue"])
			.lte("due_date", todayStr);

		if (fetchErr) {
			return NextResponse.json({ error: fetchErr.message }, { status: 400 });
		}

		if (!overdueEmis || overdueEmis.length === 0) {
			return NextResponse.json({ success: true, inserted_count: 0 });
		}

		// Group by sale_id to compute total_overdue_amount and overdue_emis_count
		const saleGroups: Record<string, { count: number; sum: number; business_id: string; customer_id: string }> = {};
		for (const emi of overdueEmis) {
			if (!saleGroups[emi.sale_id]) {
				saleGroups[emi.sale_id] = { count: 0, sum: 0, business_id: emi.business_id, customer_id: emi.customer_id };
			}
			saleGroups[emi.sale_id].count++;
			saleGroups[emi.sale_id].sum += Number(emi.remaining_amount || 0);
		}

		let insertedCount = 0;

		for (const emi of overdueEmis) {
			// Check if unresolved reminder already exists for this emi
			const { data: existing } = await admin
				.from("due_payment_reminders")
				.select("id")
				.eq("emi_id", emi.id)
				.eq("is_resolved", false)
				.maybeSingle();

			if (!existing) {
				const group = saleGroups[emi.sale_id];
				const overDays = Number(emi.overdue_days || 0);
				let riskLevel = "upcoming";
				if (overDays >= 90 || group.count >= 3) {
					riskLevel = "critical";
				} else if (overDays >= 30 || group.count >= 1) {
					riskLevel = "delayed";
				}

				const { error: insertErr } = await admin
					.from("due_payment_reminders")
					.insert({
						sale_id: emi.sale_id,
						customer_id: emi.customer_id,
						business_id: emi.business_id,
						emi_id: emi.id,
						risk_level: riskLevel,
						overdue_emis_count: group.count,
						total_overdue_amount: group.sum,
						reminder_count: 0,
					});

				if (!insertErr) {
					insertedCount++;
				}
			}
		}

		return NextResponse.json({
			success: true,
			inserted_count: insertedCount,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// Support POST as well
export async function POST() {
	return GET();
}
