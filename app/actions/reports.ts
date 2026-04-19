"use server";

import { createClient } from "@/lib/supabase/server";
import { getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveBusinessIdForReports(): Promise<string | null> {
	const bid = await getCurrentBusinessId();
	if (bid) return bid;
	const supabase = await createClient();
	const admin = createAdminClient();
	if (!supabase || !admin) return null;
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user?.id) return null;
	const { data } = await admin
		.from("business_admins")
		.select("business_id")
		.eq("auth_user_id", user.id)
		.maybeSingle();
	return String((data as any)?.business_id ?? "").trim() || null;
}

export type ReportFilters = {
	startDate?: string; // ISO date YYYY-MM-DD
	endDate?: string;   // ISO date YYYY-MM-DD
};

function toDateOnly(iso: string): string {
	return iso.slice(0, 10);
}

function inRange(dateStr: string, start?: string, end?: string): boolean {
	if (!start && !end) return true;
	const d = toDateOnly(dateStr);
	if (start && d < start) return false;
	if (end && d > end) return false;
	return true;
}

function getTimestampBounds(start?: string, end?: string): {
	startTs?: string;
	endTs?: string;
} {
	return {
		startTs: start ? `${start}T00:00:00.000Z` : undefined,
		endTs: end ? `${end}T23:59:59.999Z` : undefined,
	};
}

export async function getReportStats(filters?: ReportFilters) {
	const supabase = await createClient();
	if (!supabase) {
		return getEmptyReport();
	}
	const businessId = await resolveBusinessIdForReports();
	if (!businessId) return getEmptyReport();

	const start = filters?.startDate ? toDateOnly(filters.startDate) : undefined;
	const end = filters?.endDate ? toDateOnly(filters.endDate) : undefined;
	const { startTs, endTs } = getTimestampBounds(start, end);

	// 1. Sales
	let salesQuery = supabase
		.from("plot_sales")
		.select("id, customer_id, total_sale_amount, amount_paid, remaining_amount, created_at, plots(project_id, projects(id, name)), sale_phase")
		.eq("business_id", businessId)
		.eq("is_cancelled", false);
	if (startTs) salesQuery = salesQuery.gte("created_at", startTs);
	if (endTs) salesQuery = salesQuery.lte("created_at", endTs);
	const { data: sales } = await salesQuery;

	const filteredSales = sales ?? [];

	const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_sale_amount ?? 0), 0);
	const totalCustomerOutstanding = filteredSales.reduce(
		(sum, s) => sum + Number(s.remaining_amount ?? 0),
		0,
	);

	// 2. Payments (for collections timeline; includes payments on revoked sales)
	let paymentsQuery = supabase
		.from("payments")
		.select("amount, payment_date, is_confirmed")
		.eq("business_id", businessId)
		.eq("is_confirmed", true);
	if (start) paymentsQuery = paymentsQuery.gte("payment_date", start);
	if (end) paymentsQuery = paymentsQuery.lte("payment_date", end);
	const { data: payments } = await paymentsQuery;

	const filteredPayments = payments ?? [];
	const totalPaymentsCollected = filteredPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
	const totalRevenueCollected = totalPaymentsCollected;

	// 3. Expenses
	let expensesQuery = supabase
		.from("office_expenses")
		.select("amount, expense_date, category");
	expensesQuery = expensesQuery.eq("business_id", businessId);
	if (start) expensesQuery = expensesQuery.gte("expense_date", start);
	if (end) expensesQuery = expensesQuery.lte("expense_date", end);
	const { data: expenses } = await expensesQuery;

	const filteredExpenses = expenses ?? [];
	const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

	// 4. Advisor commissions
	const { data: advisors } = await supabase
		.from("advisors")
		.select("id, name, advisor_commissions(total_commission_amount, amount_paid)")
		.eq("business_id", businessId);

	const { data: commissionPayments, error: commissionPaymentsErr } = await supabase
		.from("advisor_commission_payments")
		.select("extra_paid_amount, paid_date")
		.eq("business_id", businessId);
	const safeCommissionPayments =
		commissionPaymentsErr &&
		(commissionPaymentsErr.message || "").toLowerCase().includes("extra_paid_amount")
			? []
			: commissionPayments ?? [];

	const filteredCommissionPayments = safeCommissionPayments.filter((p: any) =>
		inRange(p.paid_date ?? "", start, end)
	);
	const totalExtraCommissionPaid = filteredCommissionPayments.reduce(
		(sum, p: any) => sum + Number(p.extra_paid_amount ?? 0),
		0
	);

	const advisorPerformance = (advisors ?? []).map((a: any) => {
		const comms = (a.advisor_commissions as any[]) || [];
		const total = comms.reduce((s, c) => s + Number(c.total_commission_amount ?? 0), 0);
		const paid = comms.reduce((s, c) => s + Number(c.amount_paid ?? 0), 0);
		return {
			id: a.id,
			name: a.name,
			totalCommission: total,
			paidCommission: paid,
			pending: total - paid,
		};
	});

	// 5. Project stats
	const { data: projects } = await supabase
		.from("projects")
		.select("id, name, plots(id, status)")
		.eq("business_id", businessId);

	const projectStats = (projects ?? []).map((p: any) => {
		const plots = (p.plots as any[]) || [];
		const total = plots.length;
		const sold = plots.filter(
			(pl: any) =>
				pl.status === "sold" ||
				pl.status === "agreement" ||
				pl.status === "token" ||
				pl.status === "sold_without_data",
		).length;
		const available = plots.filter((pl: any) => pl.status === "available").length;
		const soldInPeriod = filteredSales.filter((s: any) =>
			(s as any).plots?.project_id === p.id || (s as any).plots?.projects?.id === p.id
		).length;
		return {
			name: p.name,
			total,
			sold,
			soldInPeriod,
			available,
		};
	});

	// 6. Revenue by project (in period)
	const revenueByProject: Record<string, number> = {};
	for (const s of filteredSales) {
		const proj = (s as any).plots?.projects?.name ?? "Unknown";
		revenueByProject[proj] = (revenueByProject[proj] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	// 7. Revenue by sale phase
	const revenueByPhase: Record<string, number> = {};
	for (const s of filteredSales) {
		const phase = (s as any).sale_phase ?? "other";
		revenueByPhase[phase] = (revenueByPhase[phase] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	// 8. Top advisors by sales value (includes "Admin (Direct)" for sold_by_admin)
	const advisorSales: Record<string, number> = {};
	let salesWithAdvisorQuery = supabase
		.from("plot_sales")
		.select("advisor_id, sold_by_admin, total_sale_amount, created_at, advisors(name)")
		.eq("is_cancelled", false);
	if (startTs) salesWithAdvisorQuery = salesWithAdvisorQuery.gte("created_at", startTs);
	if (endTs) salesWithAdvisorQuery = salesWithAdvisorQuery.lte("created_at", endTs);
	const { data: salesWithAdvisor } = await salesWithAdvisorQuery;

	const filteredWithAdvisor = salesWithAdvisor ?? [];
	for (const s of filteredWithAdvisor) {
		const name =
			(s as any).sold_by_admin
				? "Admin (Direct)"
				: (s as any).advisors?.name ?? (s as any).advisor_id ?? "Unknown";
		advisorSales[name] = (advisorSales[name] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}

	const topAdvisors = Object.entries(advisorSales)
		.map(([name, val]) => ({ name, value: val }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 10);

	// 9. Expense by category
	const expenseByCategory: Record<string, number> = {};
	for (const e of filteredExpenses) {
		const cat = (e as any).category ?? "misc";
		expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number((e as any).amount ?? 0);
	}

	// 10. Collections vs outstanding (customer dues on active sales)
	const collectionsVsOutstanding = {
		collected: totalRevenueCollected,
		outstanding: totalCustomerOutstanding,
		total: totalSalesValue,
	};

	// 11. Customer count (new in period)
	let customersQuery = supabase
		.from("customers")
		.select("created_at");
	if (startTs) customersQuery = customersQuery.gte("created_at", startTs);
	if (endTs) customersQuery = customersQuery.lte("created_at", endTs);
	const { data: customers } = await customersQuery;
	const newCustomersInPeriod = (customers ?? []).length;

	// 12. Enquiry conversions (temporary -> regular)
	let enquiryUpgradedCustomersQuery = supabase
		.from("customers")
		.select("id, upgraded_from_enquiry_id, upgraded_from_enquiry_at")
		.not("upgraded_from_enquiry_id", "is", null);
	if (startTs) enquiryUpgradedCustomersQuery = enquiryUpgradedCustomersQuery.gte("upgraded_from_enquiry_at", startTs);
	if (endTs) enquiryUpgradedCustomersQuery = enquiryUpgradedCustomersQuery.lte("upgraded_from_enquiry_at", endTs);
	const { data: enquiryUpgradedCustomers } = await enquiryUpgradedCustomersQuery;

	const upgradedInPeriod = enquiryUpgradedCustomers ?? [];

	const upgradedCustomerIds = new Set(upgradedInPeriod.map((c: any) => c.id));
	const convertedSales = filteredSales.filter(
		(s: any) => !!s.customer_id && upgradedCustomerIds.has(s.customer_id)
	);
	const boughtUpgradedCustomerIds = new Set(
		convertedSales.map((s: any) => s.customer_id)
	);

	// 12b. Enquiry category breakdown (from upgraded customers)
	const enquiryIds = upgradedInPeriod
		.map((c: any) => c.upgraded_from_enquiry_id)
		.filter(Boolean);
	const categoryCounts: Record<string, number> = {};
	if (enquiryIds.length > 0) {
		const { data: upgradedEnquiries } = await supabase
			.from("enquiry_customers")
			.select("id, category")
			.in("id", enquiryIds);

		for (const e of upgradedEnquiries ?? []) {
			const cat = (e as any).category ?? "other";
			categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
		}
	}

	const enquiryConvertedRevenue = convertedSales.reduce(
		(sum, s: any) => sum + Number(s.total_sale_amount ?? 0),
		0
	);

	// 13. Sale count by month (for trend)
	const salesByMonth: Record<string, { count: number; value: number }> = {};
	for (const s of filteredSales) {
		const dt = (s as any).created_at ?? "";
		const month = dt.slice(0, 7);
		const prev = salesByMonth[month] ?? { count: 0, value: 0 };
		prev.count += 1;
		prev.value += Number((s as any).total_sale_amount ?? 0);
		salesByMonth[month] = prev;
	}

	// 13b. Sale count by ISO week (for trend)
	const salesByWeek: Record<string, { count: number; value: number; sortKey: string }> = {};
	for (const s of filteredSales) {
		const createdAt = (s as any).created_at ?? "";
		const d = createdAt ? new Date(createdAt) : null;
		if (!d || Number.isNaN(d.getTime())) continue;

		const isoYear = getISOWeekYear(d);
		const isoWeek = getISOWeek(d);
		const label = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
		const weekStart = startOfISOWeek(d);
		const sortKey = weekStart.toISOString().slice(0, 10);

		const prev = salesByWeek[label] ?? { count: 0, value: 0, sortKey };
		prev.count += 1;
		prev.value += Number((s as any).total_sale_amount ?? 0);
		prev.sortKey = sortKey;
		salesByWeek[label] = prev;
	}

	return {
		summary: {
			totalSalesValue,
			totalRevenueCollected,
			totalOutstanding: totalCustomerOutstanding,
			totalExpenses,
			netProfit: totalRevenueCollected - totalExpenses,
			salesCount: filteredSales.length,
			paymentsCount: filteredPayments.length,
			enquiryConvertedCustomers: upgradedInPeriod.length,
			enquiryConvertedCustomersBoughtPlots: boughtUpgradedCustomerIds.size,
			enquiryConvertedRevenue,
			totalExtraCommissionPaid,
		},
		enquiryConversionTopCategories: Object.entries(categoryCounts)
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5),
		advisorPerformance,
		projectStats,
		revenueByProject: Object.entries(revenueByProject).map(([name, v]) => ({ name, value: v })),
		revenueByPhase: Object.entries(revenueByPhase).map(([phase, v]) => ({ phase, value: v })),
		topAdvisors,
		expenseByCategory: Object.entries(expenseByCategory).map(([cat, v]) => ({ category: cat, value: v })),
		collectionsVsOutstanding,
		newCustomersInPeriod,
		salesByMonth: Object.entries(salesByMonth)
			.map(([month, v]) => ({ month, ...v }))
			.sort((a, b) => a.month.localeCompare(b.month)),
		salesByWeek: Object.entries(salesByWeek)
			.map(([weekLabel, v]) => ({ month: weekLabel, count: v.count, value: v.value, sortKey: v.sortKey }))
			.sort((a: any, b: any) => (a.sortKey ?? "").localeCompare(b.sortKey ?? ""))
			.map((p: any) => ({ month: p.month, count: p.count, value: p.value })),
	};
}

export async function getProjectAnalytics(projectId: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: project, error: projErr } = await supabase
		.from("projects")
		.select("id, name, location, layout_expense")
		.eq("id", projectId)
		.single();

	if (projErr || !project) return null;

	const { data: plots } = await supabase
		.from("plots")
		.select("id, plot_number, status, size_sqft, rate_per_sqft")
		.eq("project_id", projectId);

	const plotIds = (plots ?? []).map((p: any) => p.id);
	const total = plots?.length ?? 0;
	const sold = (plots ?? []).filter(
		(p: any) =>
			p.status === "sold" ||
			p.status === "agreement" ||
			p.status === "token" ||
			p.status === "sold_without_data"
	).length;
	const available = (plots ?? []).filter((p: any) => p.status === "available").length;

	// Estimated revenue from "left" plots = sum of (size_sqft * rate_per_sqft) for available plots.
	const leftPlots = (plots ?? [])
		.filter((p: any) => p.status === "available")
		.map((p: any) => ({
			plot_number: p.plot_number,
			status: p.status,
			value: Number(p.size_sqft ?? 0) * Number(p.rate_per_sqft ?? 0),
			size_sqft: Number(p.size_sqft ?? 0),
			rate_per_sqft: Number(p.rate_per_sqft ?? 0),
			facing: p.facing ?? null,
		}))
		.sort((a: any, b: any) => b.value - a.value);
	const estimatedRevenueLeft = leftPlots.reduce((sum: number, p: any) => sum + Number(p.value ?? 0), 0);
	const leftPlotsTop = leftPlots.slice(0, 8);

	const { data: sales } = await supabase
		.from("plot_sales")
		.select("id, total_sale_amount, amount_paid, remaining_amount, sold_by_admin, advisors(name)")
		.in("plot_id", plotIds)
		.eq("is_cancelled", false);

	const totalSalesValue = (sales ?? []).reduce((sum: number, s: any) => sum + Number(s.total_sale_amount ?? 0), 0);
	const customerOutstanding = (sales ?? []).reduce(
		(sum: number, s: any) => sum + Number(s.remaining_amount ?? 0),
		0,
	);

	const layoutExpense = Number((project as any).layout_expense ?? 0);
	const layoutRemaining = Math.max(0, layoutExpense - totalSalesValue);

	const { data: allProjectSales } = await supabase
		.from("plot_sales")
		.select("id")
		.in("plot_id", plotIds);

	const allSaleIds = (allProjectSales ?? []).map((r: { id: string }) => r.id);
	let collectedPayments = 0;
	if (allSaleIds.length > 0) {
		const { data: projectPayments } = await supabase
			.from("payments")
			.select("amount")
			.eq("is_confirmed", true)
			.in("sale_id", allSaleIds);
		collectedPayments = (projectPayments ?? []).reduce(
			(sum: number, p: any) => sum + Number(p.amount ?? 0),
			0,
		);
	}

	const advisorSales: Record<string, number> = {};
	for (const s of sales ?? []) {
		const name = (s as any).sold_by_admin ? "Admin (Direct)" : (s as any).advisors?.name ?? "Unknown";
		advisorSales[name] = (advisorSales[name] ?? 0) + Number((s as any).total_sale_amount ?? 0);
	}
	const advisorsInProject = Object.entries(advisorSales)
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	const topPlots = (plots ?? [])
		.filter((p: any) => p.status !== "available")
		.map((p: any) => ({
			plot_number: p.plot_number,
			status: p.status,
			value: Number(p.size_sqft ?? 0) * Number(p.rate_per_sqft ?? 0),
		}))
		.sort((a: any, b: any) => b.value - a.value)
		.slice(0, 10);

	let comms: { id: string; sale_id: string }[] = [];
	if (allSaleIds.length > 0) {
		const { data: commRows } = await supabase
			.from("advisor_commissions")
			.select("id, sale_id")
			.in("sale_id", allSaleIds);
		comms = (commRows ?? []) as { id: string; sale_id: string }[];
	}
	const commissionIds = comms.map((c) => c.id);

	let extraCommissionPaid = 0;
	if (commissionIds.length > 0) {
		const { data: commPayments, error: commPaymentsErr } = await supabase
			.from("advisor_commission_payments")
			.select("extra_paid_amount")
			.in("commission_id", commissionIds);
		const safeCommPayments =
			commPaymentsErr &&
			(commPaymentsErr.message || "").toLowerCase().includes("extra_paid_amount")
				? []
				: commPayments ?? [];
		extraCommissionPaid = safeCommPayments.reduce(
			(sum: number, p: any) => sum + Number(p.extra_paid_amount ?? 0),
			0
		);
	}

	return {
		project: project as any,
		plots: { total, sold, available },
		estimatedRevenueLeft,
		leftPlots: leftPlotsTop,
		revenue: {
			collected: collectedPayments,
			salesValue: totalSalesValue,
			layoutRemaining,
			customerOutstanding,
		},
		layoutExpense,
		extraCommissionPaid,
		advisors: advisorsInProject,
		topPlots,
	};
}

export type SalesTrendPoint = { month: string; count: number; value: number };

// Collections trend for a project (by confirmed payments month).
export async function getProjectPaymentsTrend(
	projectId: string,
	filters?: ReportFilters
): Promise<{
	data: SalesTrendPoint[];
	summary: { collected: number; paymentsCount: number };
}> {
	const supabase = await createClient();
	if (!supabase) {
		return { data: [], summary: { collected: 0, paymentsCount: 0 } };
	}

	const start = filters?.startDate ? toDateOnly(filters.startDate) : undefined;
	const end = filters?.endDate ? toDateOnly(filters.endDate) : undefined;

	// Single query using joins (fewer round trips).
	let q = supabase
		.from("payments")
		.select(
			`
      amount,
      payment_date,
      plot_sales!inner(
        is_cancelled,
        plots!inner(project_id)
      )
    `
		)
		.eq("is_confirmed", true)
		.eq("plot_sales.plots.project_id", projectId);

	if (start) q = q.gte("payment_date", start);
	if (end) q = q.lte("payment_date", end);

	const { data: payments, error } = await q.order("payment_date", { ascending: true });
	if (error) throw new Error(error.message);

	const byMonth = new Map<string, SalesTrendPoint>();
	for (const p of payments ?? []) {
		const dt = (p.payment_date ?? "") as string;
		const month = dt.slice(0, 7); // YYYY-MM
		if (!month) continue;
		const cur = byMonth.get(month) ?? { month, count: 0, value: 0 };
		cur.count += 1;
		cur.value += Number(p.amount ?? 0);
		byMonth.set(month, cur);
	}

	const data = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
	const collected = data.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
	const paymentsCount = data.reduce((sum, d) => sum + Number(d.count ?? 0), 0);

	return { data, summary: { collected, paymentsCount } };
}

function getEmptyReport() {
	return {
		summary: {
			totalSalesValue: 0,
			totalRevenueCollected: 0,
			totalOutstanding: 0,
			totalExpenses: 0,
			netProfit: 0,
			salesCount: 0,
			paymentsCount: 0,
			enquiryConvertedCustomers: 0,
			enquiryConvertedCustomersBoughtPlots: 0,
			enquiryConvertedRevenue: 0,
			totalExtraCommissionPaid: 0,
		},
		enquiryConversionTopCategories: [] as { category: string; count: number }[],
		advisorPerformance: [] as { id: string; name: string; totalCommission: number; paidCommission: number; pending: number }[],
		projectStats: [] as { name: string; total: number; sold: number; soldInPeriod: number; available: number }[],
		revenueByProject: [] as { name: string; value: number }[],
		revenueByPhase: [] as { phase: string; value: number }[],
		topAdvisors: [] as { name: string; value: number }[],
		expenseByCategory: [] as { category: string; value: number }[],
		collectionsVsOutstanding: { collected: 0, outstanding: 0, total: 0 },
		newCustomersInPeriod: 0,
		salesByMonth: [] as { month: string; count: number; value: number }[],
		salesByWeek: [] as { month: string; count: number; value: number }[],
	};
}
