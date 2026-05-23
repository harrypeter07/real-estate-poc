import {
	BarChart3,
	TrendingUp,
	TrendingDown,
	Users,
	Building2,
	IndianRupee,
	PieChart,
	Wallet,
	Target,
	FileText,
	Clock3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress, Badge } from "@/components/ui";
import { getReportStats } from "@/app/actions/reports";
import { formatCurrency } from "@/lib/utils/formatters";
import { SalesTrendLineChart } from "@/components/reports/sales-trend-line-chart";
import { SalesTrendControls } from "@/components/reports/sales-trend-controls";

export default async function DashboardContent({
	from,
	to,
	trend,
}: {
	from?: string;
	to?: string;
	trend?: "week" | "month";
}) {
	const stats = await getReportStats({
		startDate: from,
		endDate: to,
	});
	const trendMode: "week" | "month" = trend ?? "month";
	const trendData =
		trendMode === "week"
			? (stats.salesByWeek as any)
			: (stats.salesByMonth as any);

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="group bg-zinc-900 text-white border-zinc-800 shadow-sm transition-all duration-300 hover:-translate-y-1 select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_32px_-4px_rgba(255,255,255,0.03)]">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<IndianRupee className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate flex-1">
								Total Sales Value
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl font-extrabold tracking-tight leading-tight truncate">
								{formatCurrency(stats.summary.totalSalesValue)}
							</p>
							<p className="text-xs text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								{stats.summary.salesCount} sales
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 shadow-sm hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)]">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<TrendingUp className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Revenue Collected
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl font-extrabold tracking-tight leading-tight text-emerald-600 dark:text-emerald-400 truncate">
								{formatCurrency(stats.summary.totalRevenueCollected)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								{stats.summary.paymentsCount} payments
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-rose-50/[0.12] dark:from-zinc-950 dark:to-rose-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-rose-200 dark:hover:border-rose-900/30 shadow-sm hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.08)]">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 text-rose-600 dark:text-rose-400 border border-rose-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<TrendingDown className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Total Expenses
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl font-extrabold tracking-tight leading-tight text-red-600 dark:text-rose-400 truncate">
								{formatCurrency(stats.summary.totalExpenses)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 shadow-sm hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.08)]">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<Wallet className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Net Profit (Cash)
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl font-extrabold tracking-tight leading-tight text-blue-600 dark:text-blue-400 truncate">
								{formatCurrency(stats.summary.netProfit)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-amber-50/[0.12] dark:from-zinc-950 dark:to-amber-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-200 dark:hover:border-amber-900/30 shadow-sm hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.08)]">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<IndianRupee className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Extra Commission Paid
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl font-extrabold tracking-tight leading-tight text-amber-700 dark:text-amber-500 truncate">
								{formatCurrency((stats.summary as any).totalExtraCommissionPaid ?? 0)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Users className="h-4 w-4" /> Enquiry Conversions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Converted enquiries</div>
							<div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1.5">{stats.summary.enquiryConvertedCustomers}</div>
						</div>
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-emerald-200 dark:hover:border-emerald-900/30">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Converted customers who bought plots</div>
							<div className="text-2xl font-extrabold text-green-700 dark:text-emerald-400 mt-1.5">{stats.summary.enquiryConvertedCustomersBoughtPlots}</div>
						</div>
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-900/30">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Revenue from converted customers</div>
							<div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-1.5">{formatCurrency(stats.summary.enquiryConvertedRevenue)}</div>
						</div>
					</div>
					{stats.enquiryConversionTopCategories.length > 0 ? (
						<div className="mt-4">
							<div className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Top enquiry categories (upgrades)</div>
							<div className="space-y-2">
								{stats.enquiryConversionTopCategories.map((c) => (
									<div key={c.category} className="flex justify-between items-center">
										<span className="text-sm text-zinc-700 truncate pr-2">{c.category}</span>
										<span className="text-sm font-bold text-zinc-900">{c.count}</span>
									</div>
								))}
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Target className="h-4 w-4" /> Collections vs Outstanding
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-emerald-200 dark:hover:border-emerald-900/30">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Collected</div>
							<div className="text-2xl font-extrabold text-green-600 dark:text-emerald-400 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.collected)}</div>
						</div>
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-red-200 dark:hover:border-red-900/30">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Outstanding</div>
							<div className="text-2xl font-extrabold text-red-600 dark:text-rose-400 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.outstanding)}</div>
						</div>
						<div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-5 transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Sales</div>
							<div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.total)}</div>
						</div>
					</div>
					{stats.collectionsVsOutstanding.total > 0 && (
						<div className="mt-4">
							<div className="flex justify-between text-xs mb-1">
								<span>Collection %</span>
								<span>{Math.round((stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100)}%</span>
							</div>
							<Progress value={(stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100} className="h-2" />
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600">
							<Clock3 className="h-4 w-4" /> Upcoming Follow-ups
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{(stats as any).upcomingFollowUps?.length > 0 ? (
								(stats as any).upcomingFollowUps.map((f: any) => (
									<div
										key={f.id}
										className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 transition-colors hover:bg-zinc-50"
									>
										<div className="min-w-0">
											<p className="text-sm font-bold truncate text-zinc-900">{f.name}</p>
											<p className="text-[10px] text-zinc-500 font-medium">
												{f.phone} • <span className="text-zinc-400">{f.category}</span>
											</p>
										</div>
										<div className="text-right shrink-0">
											<Badge
												variant="outline"
												className="text-[10px] font-bold border-amber-200 bg-amber-50 text-amber-800"
											>
												{f.follow_up_date}
											</Badge>
										</div>
									</div>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Clock3 className="h-8 w-8 text-zinc-200 mb-2" />
									<p className="text-xs text-zinc-500">No upcoming follow-ups scheduled</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Building2 className="h-4 w-4" /> Project Inventory Status
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{stats.projectStats.map((project) => {
							const percentage = project.total > 0 ? (project.sold / project.total) * 100 : 0;
							return (
								<div key={project.name} className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="font-semibold">{project.name}</span>
										<span className="text-zinc-500">{project.sold} / {project.total} Plots Sold</span>
									</div>
									<Progress value={percentage} className="h-2" />
								</div>
							);
						})}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Users className="h-4 w-4" /> Top Advisors by Sales Value
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.topAdvisors.map((a, i) => (
								<div key={a.name} className="flex items-center gap-3">
									<span className="text-xs font-bold text-zinc-400 w-5">#{i + 1}</span>
									<span className="text-sm font-medium truncate flex-1">{a.name}</span>
									<span className="text-sm font-bold">{formatCurrency(a.value)}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Users className="h-4 w-4" /> Advisor Commission Summary
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4 max-h-64 overflow-y-auto">
							{stats.advisorPerformance.map((advisor) => (
								<div key={advisor.id ?? advisor.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
									<div className="min-w-0">
										<p className="text-sm font-bold truncate">{advisor.name}</p>
										<p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Paid: {formatCurrency(advisor.paidCommission)}</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-bold text-zinc-900">{formatCurrency(advisor.totalCommission)}</p>
										<p className="text-[10px] text-red-500 font-bold uppercase">Due: {formatCurrency(advisor.pending)}</p>
									</div>
								</div>
							))}
							{stats.advisorPerformance.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">No advisors found</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<BarChart3 className="h-4 w-4" /> Revenue by Project
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.revenueByProject.sort((a, b) => b.value - a.value).map((p) => (
								<div key={p.name} className="flex justify-between items-center">
									<span className="text-sm font-medium truncate pr-2">{p.name}</span>
									<span className="text-sm font-bold text-green-600 shrink-0">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByProject.length === 0 && <p className="text-sm text-zinc-400">No data</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<PieChart className="h-4 w-4" /> Revenue by Sale Phase
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.revenueByPhase.map((p) => (
								<div key={p.phase} className="flex justify-between items-center">
									<span className="text-sm font-medium capitalize">{p.phase.replace("_", " ")}</span>
									<span className="text-sm font-bold">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByPhase.length === 0 && <p className="text-sm text-zinc-400">No data</p>}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<FileText className="h-4 w-4" /> Expense by Category
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.expenseByCategory.map((e) => (
								<div key={e.category} className="flex justify-between items-center">
									<span className="text-sm font-medium capitalize">{e.category}</span>
									<span className="text-sm font-bold text-red-600">{formatCurrency(e.value)}</span>
								</div>
							))}
							{stats.expenseByCategory.length === 0 && <p className="text-sm text-zinc-400">No expenses</p>}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-bold flex items-center gap-2">
						<Users className="h-4 w-4" /> New Customers in Period
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.newCustomersInPeriod}</p>
				</CardContent>
			</Card>

			{trendData.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<BarChart3 className="h-4 w-4" /> Sales Trend by {trendMode === "week" ? "Week" : "Month"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="mb-3">
							<SalesTrendControls />
						</div>
						<SalesTrendLineChart data={trendData} granularity={trendMode} />
					</CardContent>
				</Card>
			)}
		</>
	);
}

