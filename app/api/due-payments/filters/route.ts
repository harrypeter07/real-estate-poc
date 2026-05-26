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
		const filterType = url.searchParams.get("filter_type"); // '1_emi_overdue', '3_emi_overdue', 'high_risk', 'due_this_week', 'due_today'

		if (!filterType) {
			return NextResponse.json({ error: "filter_type query parameter is required" }, { status: 400 });
		}

		// Fetch active sales
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

		// Fetch EMIs
		const { data: emis, error: emiErr } = await supabase
			.from("emi_schedule")
			.select("*")
			.in("sale_id", saleIds);

		if (emiErr) {
			return NextResponse.json({ error: emiErr.message }, { status: 400 });
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

		const filteredData: any[] = [];

		for (const sale of sales) {
			const saleEmis = emiGroups[sale.id] || [];

			let overdueEmiCount = 0;
			let totalOverdueAmount = 0;
			let maxOverdueDays = 0;
			let nextDueDate: string | null = null;
			let hasEmiDueToday = false;
			let hasEmiDueThisWeek = false;

			for (const emi of saleEmis) {
				const isPending = emi.status === "pending" || emi.status === "partial" || emi.status === "overdue";
				const dueDate = new Date(emi.due_date);

				if (isPending) {
					if (emi.due_date === todayStr) {
						hasEmiDueToday = true;
					}
					if (emi.due_date >= todayStr && emi.due_date <= sevenDaysLaterStr) {
						hasEmiDueThisWeek = true;
					}

					if (emi.due_date < todayStr) {
						overdueEmiCount++;
						totalOverdueAmount += Number(emi.remaining_amount || 0);

						const overDays = Math.ceil((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
						if (overDays > maxOverdueDays) {
							maxOverdueDays = overDays;
						}
					} else {
						if (!nextDueDate || emi.due_date < nextDueDate) {
							nextDueDate = emi.due_date;
						}
					}
				}
			}

			// Risk level
			let riskLevel = "upcoming";
			if (maxOverdueDays >= 90 || overdueEmiCount >= 3) {
				riskLevel = "critical";
			} else if (maxOverdueDays >= 30 || overdueEmiCount >= 1) {
				riskLevel = "delayed";
			}

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
			};

			// Apply filter type logic
			let matches = false;
			if (filterType === "1_emi_overdue" && record.overdue_emi_count === 1) {
				matches = true;
			} else if (filterType === "3_emi_overdue" && record.overdue_emi_count >= 3) {
				matches = true;
			} else if (filterType === "high_risk" && record.risk_level === "critical") {
				matches = true;
			} else if (filterType === "due_this_week" && (hasEmiDueThisWeek || hasEmiDueToday)) {
				matches = true;
			} else if (filterType === "due_today" && hasEmiDueToday) {
				matches = true;
			}

			if (matches) {
				filteredData.push(record);
			}
		}

		return NextResponse.json(filteredData);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
