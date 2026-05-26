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
		const riskFilter = url.searchParams.get("risk_level"); // upcoming, delayed, critical
		const overdueFilter = url.searchParams.get("overdue_count_filter"); // e.g. '1', '3+'
		const search = url.searchParams.get("search");

		// 1. Fetch active sales with details
		const { data: sales, error: salesErr } = await supabase
			.from("plot_sales")
			.select(`
				*,
				customers(id, name, phone),
				advisors(name),
				plots(plot_number, projects(name))
			`)
			.eq("business_id", businessId)
			.eq("is_cancelled", false);

		if (salesErr) {
			return NextResponse.json({ error: salesErr.message }, { status: 400 });
		}

		if (!sales || sales.length === 0) {
			return NextResponse.json([]);
		}

		const saleIds = sales.map((s) => s.id);

		// 2. Fetch all EMIs for these sales
		const { data: emis, error: emiErr } = await supabase
			.from("emi_schedule")
			.select("*")
			.in("sale_id", saleIds);

		if (emiErr) {
			return NextResponse.json({ error: emiErr.message }, { status: 400 });
		}

		// 3. Fetch due reminders to get last follow-up dates
		const { data: reminders } = await supabase
			.from("due_payment_reminders")
			.select("sale_id, last_reminder_sent, reminder_count, notes")
			.in("sale_id", saleIds)
			.eq("is_resolved", false);

		const reminderMap: Record<string, any> = {};
		for (const r of reminders || []) {
			reminderMap[r.sale_id] = r;
		}

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

		const dashboardData: any[] = [];

		for (const sale of sales) {
			const saleEmis = emiGroups[sale.id] || [];

			let overdueEmiCount = 0;
			let totalOverdueAmount = 0;
			let maxOverdueDays = 0;
			let nextDueDate: string | null = null;
			let hasEmiWithin7Days = false;

			for (const emi of saleEmis) {
				const isPending = emi.status === "pending" || emi.status === "partial" || emi.status === "overdue";
				const dueDate = new Date(emi.due_date);

				if (isPending) {
					// Check if due within 7 days
					if (emi.due_date <= sevenDaysLaterStr) {
						hasEmiWithin7Days = true;
					}

					// Overdue check
					if (emi.due_date < todayStr) {
						overdueEmiCount++;
						totalOverdueAmount += Number(emi.remaining_amount || 0);

						const overDays = Math.ceil((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
						if (overDays > maxOverdueDays) {
							maxOverdueDays = overDays;
						}
					} else {
						// Next upcoming
						if (!nextDueDate || emi.due_date < nextDueDate) {
							nextDueDate = emi.due_date;
						}
					}
				}
			}

			// If no overdue and no upcoming dues within 7 days, skip
			if (overdueEmiCount === 0 && !hasEmiWithin7Days) {
				continue;
			}

			// Risk level calculations
			let riskLevel = "upcoming"; // Yellow
			if (maxOverdueDays >= 90 || overdueEmiCount >= 3) {
				riskLevel = "critical"; // Red
			} else if (maxOverdueDays >= 30 || overdueEmiCount >= 1) {
				riskLevel = "delayed"; // Orange
			}

			const lastFollowUp = reminderMap[sale.id];

			const record = {
				customer_id: sale.customers?.id || null,
				customer_name: sale.customers?.name || "—",
				customer_phone: sale.customers?.phone || "—",
				sale_id: sale.id,
				plot_number: sale.plots?.plot_number || "—",
				project_name: sale.plots?.projects?.name || "—",
				overdue_emi_count: overdueEmiCount,
				total_overdue_amount: totalOverdueAmount,
				max_overdue_days: maxOverdueDays,
				risk_level: riskLevel,
				next_due_date: nextDueDate,
				total_sale_amount: sale.total_sale_amount,
				amount_paid: sale.amount_paid,
				total_remaining_balance: sale.remaining_amount,
				advisor_name: sale.advisors?.name || "—",
				last_follow_up_date: lastFollowUp?.last_reminder_sent || null,
				reminder_count: lastFollowUp?.reminder_count || 0,
			};

			// Filters
			if (riskFilter && riskFilter !== "all" && record.risk_level !== riskFilter) {
				continue;
			}

			if (overdueFilter) {
				if (overdueFilter === "1" && record.overdue_emi_count !== 1) continue;
				if (overdueFilter === "3+" && record.overdue_emi_count < 3) continue;
			}

			if (search) {
				const s = search.toLowerCase();
				const nameMatch = record.customer_name.toLowerCase().includes(s);
				const phoneMatch = record.customer_phone.toLowerCase().includes(s);
				const plotMatch = record.plot_number.toLowerCase().includes(s);
				if (!nameMatch && !phoneMatch && !plotMatch) {
					continue;
				}
			}

			dashboardData.push(record);
		}

		// Sort by overdue count desc, then total overdue amount desc
		dashboardData.sort((a, b) => {
			if (b.overdue_emi_count !== a.overdue_emi_count) {
				return b.overdue_emi_count - a.overdue_emi_count;
			}
			return b.total_overdue_amount - a.total_overdue_amount;
		});

		return NextResponse.json(dashboardData);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
