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

		// 1. Fetch active sales
		const { data: sales } = await supabase
			.from("plot_sales")
			.select("id")
			.eq("business_id", businessId)
			.eq("is_cancelled", false);

		if (!sales || sales.length === 0) {
			return NextResponse.json({
				total_overdue_customers: 0,
				total_overdue_amount: 0,
				critical_count: 0,
				delayed_count: 0,
				upcoming_count: 0,
				emis_due_today: 0,
				emis_due_this_week: 0,
				total_penalty_pending: 0,
			});
		}

		const saleIds = sales.map((s) => s.id);

		// 2. Fetch EMIs
		const { data: emis } = await supabase
			.from("emi_schedule")
			.select("sale_id, status, due_date, remaining_amount")
			.in("sale_id", saleIds);

		// 3. Fetch unpaid penalties
		const { data: penalties } = await supabase
			.from("payment_penalties")
			.select("penalty_amount")
			.eq("business_id", businessId)
			.eq("is_paid", false)
			.eq("is_waived", false);

		const today = new Date();
		const todayStr = today.toISOString().split("T")[0];
		const sevenDaysLater = new Date();
		sevenDaysLater.setDate(today.getDate() + 7);
		const sevenDaysLaterStr = sevenDaysLater.toISOString().split("T")[0];

		const emiGroups: Record<string, any[]> = {};
		for (const emi of emis || []) {
			if (!emiGroups[emi.sale_id]) {
				emiGroups[emi.sale_id] = [];
			}
			emiGroups[emi.sale_id].push(emi);
		}

		let totalOverdueCustomers = 0;
		let totalOverdueAmount = 0;
		let criticalCount = 0;
		let delayedCount = 0;
		let upcomingCount = 0;
		let emisDueToday = 0;
		let emisDueThisWeek = 0;

		for (const sale of sales) {
			const saleEmis = emiGroups[sale.id] || [];

			let overdueEmiCount = 0;
			let saleOverdueAmount = 0;
			let maxOverdueDays = 0;
			let hasEmiDueToday = false;
			let hasEmiDueThisWeek = false;

			for (const emi of saleEmis) {
				const isPending = emi.status === "pending" || emi.status === "partial" || emi.status === "overdue";
				const dueDate = new Date(emi.due_date);

				if (isPending) {
					if (emi.due_date === todayStr) {
						emisDueToday++;
						hasEmiDueToday = true;
					}
					if (emi.due_date >= todayStr && emi.due_date <= sevenDaysLaterStr) {
						emisDueThisWeek++;
						hasEmiDueThisWeek = true;
					}

					if (emi.due_date < todayStr) {
						overdueEmiCount++;
						saleOverdueAmount += Number(emi.remaining_amount || 0);

						const overDays = Math.ceil((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
						if (overDays > maxOverdueDays) {
							maxOverdueDays = overDays;
						}
					}
				}
			}

			if (overdueEmiCount > 0) {
				totalOverdueCustomers++;
				totalOverdueAmount += saleOverdueAmount;

				// Risk level
				if (maxOverdueDays >= 90 || overdueEmiCount >= 3) {
					criticalCount++;
				} else if (maxOverdueDays >= 30 || overdueEmiCount >= 1) {
					delayedCount++;
				} else {
					upcomingCount++;
				}
			} else if (hasEmiDueThisWeek || hasEmiDueToday) {
				upcomingCount++;
			}
		}

		const totalPenaltyPending = (penalties || []).reduce((sum, p) => sum + Number(p.penalty_amount), 0);

		return NextResponse.json({
			total_overdue_customers: totalOverdueCustomers,
			total_overdue_amount: totalOverdueAmount,
			critical_count: criticalCount,
			delayed_count: delayedCount,
			upcoming_count: upcomingCount,
			emis_due_today: emisDueToday,
			emis_due_this_week: emisDueThisWeek,
			total_penalty_pending: totalPenaltyPending,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
