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
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
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
			{/* Top 5 Majestic Stat Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="group bg-zinc-950 text-white border border-zinc-850 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-teal-500/40 select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_24px_rgba(20,184,166,0.18)] rounded-2xl">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-850 text-zinc-300 border border-zinc-700/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<IndianRupee className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate flex-1">
								Total Sales Value
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-lg min-[380px]:text-xl sm:text-2xl font-extrabold tracking-tight leading-tight break-words">
								{formatCurrency(stats.summary.totalSalesValue)}
							</p>
							<p className="text-xs text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								{stats.summary.salesCount} sales
							</p>
						</div>
					</CardContent>
				</Card>
 
				<Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-800/40 shadow-sm hover:-translate-y-1.5 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_24px_rgba(16,185,129,0.12)] rounded-2xl">
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
							<p className="text-lg min-[380px]:text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-emerald-600 dark:text-emerald-400 break-words">
								{formatCurrency(stats.summary.totalRevenueCollected)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								{stats.summary.paymentsCount} payments
							</p>
						</div>
					</CardContent>
				</Card>
 
				<Card className="group bg-gradient-to-br from-white to-rose-50/[0.12] dark:from-zinc-950 dark:to-rose-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-rose-500/40 dark:hover:border-rose-800/40 shadow-sm hover:-translate-y-1.5 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_24px_rgba(244,63,94,0.12)] rounded-2xl">
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
							<p className="text-lg min-[380px]:text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-red-600 dark:text-rose-400 break-words">
								{formatCurrency(stats.summary.totalExpenses)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>
 
				<Card className="group bg-gradient-to-br from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-500/40 dark:hover:border-blue-800/40 shadow-sm hover:-translate-y-1.5 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_24px_rgba(59,130,246,0.12)] rounded-2xl">
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
							<p className="text-lg min-[380px]:text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-blue-600 dark:text-blue-400 break-words">
								{formatCurrency(stats.summary.netProfit)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>
 
				<Card className="group bg-gradient-to-br from-white to-amber-50/[0.12] dark:from-zinc-950 dark:to-amber-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-500/40 dark:hover:border-amber-800/40 shadow-sm hover:-translate-y-1.5 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full hover:shadow-[0_12px_24px_rgba(245,158,11,0.12)] rounded-2xl">
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
							<p className="text-lg min-[380px]:text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-amber-700 dark:text-amber-505 break-words">
								{formatCurrency((stats.summary as any).totalExtraCommissionPaid ?? 0)}
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 flex items-center gap-1.5 truncate">
								&nbsp;
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Enquiry Conversions Card */}
			<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden">
				<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6 sm:px-8">
					<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
						<Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Enquiry Conversions
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 sm:p-8">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-teal-500/40 dark:hover:border-teal-500/30 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(20,184,166,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Converted enquiries</div>
							<div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1.5">{stats.summary.enquiryConvertedCustomers}</div>
						</div>
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Converted bought plots</div>
							<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{stats.summary.enquiryConvertedCustomersBoughtPlots}</div>
						</div>
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-500/40 dark:hover:border-blue-500/30 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(59,130,246,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Revenue from conversions</div>
							<div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{formatCurrency(stats.summary.enquiryConvertedRevenue)}</div>
						</div>
					</div>
					{stats.enquiryConversionTopCategories.length > 0 ? (
						<div className="mt-6 border-t border-zinc-100 dark:border-zinc-850 pt-4">
							<div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">Top enquiry categories (upgrades)</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{stats.enquiryConversionTopCategories.map((c) => (
									<div key={c.category} className="flex justify-between items-center p-3 rounded-xl bg-zinc-50/40 dark:bg-zinc-900/5 border border-zinc-100 dark:border-zinc-850 hover:border-teal-500/20 hover:shadow-xs transition-all duration-200 border-l-2 hover:border-l-teal-500">
										<span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate pr-2">{c.category}</span>
										<span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-50">{c.count}</span>
									</div>
								))}
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* Collections vs Outstanding Card */}
			<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden">
				<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6 sm:px-8">
					<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
						<Target className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Collections vs Outstanding
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 sm:p-8">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Collected</div>
							<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.collected)}</div>
						</div>
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-rose-500/40 dark:hover:border-rose-500/30 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(244,63,94,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Outstanding</div>
							<div className="text-2xl font-black text-rose-600 dark:text-rose-455 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.outstanding)}</div>
						</div>
						<div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-zinc-500/40 dark:hover:border-zinc-700/40 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-[0_8px_20px_rgba(20,20,20,0.06)]">
							<div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Total Sales</div>
							<div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1.5">{formatCurrency(stats.collectionsVsOutstanding.total)}</div>
						</div>
					</div>
					{stats.collectionsVsOutstanding.total > 0 && (
						<div className="mt-6 border-t border-zinc-100 dark:border-zinc-850 pt-5 space-y-2.5">
							<div className="flex justify-between text-xs sm:text-sm font-bold items-center">
								<span className="text-zinc-500">Collection progress ratio</span>
								<span className="text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-400/15 px-2.5 py-0.5 rounded-full text-xs font-black">
									{Math.round((stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100)}%
								</span>
							</div>
							<div className="w-full bg-zinc-100 dark:bg-zinc-900 h-3 rounded-full overflow-hidden">
								<div 
									className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(20,184,166,0.25)]" 
									style={{ width: `${(stats.collectionsVsOutstanding.collected / stats.collectionsVsOutstanding.total) * 100}%` }}
								/>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Multi-Column Grid of Actionable Dashboard Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Upcoming Follow-ups Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-2.5">
							<Clock3 className="h-4 w-4 text-amber-500 shrink-0" /> Upcoming Follow-ups
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3">
							{(stats as any).upcomingFollowUps?.length > 0 ? (
								(stats as any).upcomingFollowUps.map((f: any) => (
									<div
										key={f.id}
										className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-55/15 dark:bg-zinc-900/10 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500"
									>
										<div className="min-w-0">
											<p className="text-sm font-bold truncate text-zinc-800 dark:text-zinc-200">{f.name}</p>
											<p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
												{f.phone} • <span className="text-zinc-450 dark:text-zinc-550 font-bold">{f.category}</span>
											</p>
										</div>
										<div className="text-right shrink-0">
											<Badge
												variant="outline"
												className="text-[10px] font-black border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-955 text-amber-800 dark:text-amber-400 rounded-lg px-2.5 py-0.5"
											>
												{f.follow_up_date}
											</Badge>
										</div>
									</div>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<Clock3 className="h-10 w-10 text-zinc-350 dark:text-zinc-650 stroke-[1.5] animate-pulse" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">All caught up!</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No upcoming follow-ups scheduled for this period.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Project Inventory Status Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<Building2 className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Project Inventory Status
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1 space-y-5">
						{stats.projectStats.map((project) => {
							const percentage = project.total > 0 ? (project.sold / project.total) * 100 : 0;
							return (
								<div key={project.name} className="space-y-2 p-2.5 rounded-xl border border-transparent transition-all duration-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 border-l-2 hover:border-l-teal-500">
									<div className="flex justify-between text-sm items-center">
										<span className="font-bold text-zinc-800 dark:text-zinc-200">{project.name}</span>
										<span className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">{project.sold} / {project.total} Plots Sold</span>
									</div>
									<div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
										<div 
											className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(20,184,166,0.25)]" 
											style={{ width: `${percentage}%` }}
										/>
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>

				{/* Top Advisors by Sales Value Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Top Advisors by Sales Value
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3">
							{stats.topAdvisors.map((a, i) => (
								<div key={a.name} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-55/15 dark:bg-zinc-900/10 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500">
									<span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 w-6">#{i + 1}</span>
									<span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate flex-1">{a.name}</span>
									<span className="text-sm font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(a.value)}</span>
								</div>
							))}
							{stats.topAdvisors.length === 0 && (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<Users className="h-10 w-10 text-zinc-350 dark:text-zinc-655 stroke-[1.5]" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No advisors yet</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No active advisor sales found in this range.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Advisor Commission Summary Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Advisor Commission Summary
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
							{stats.advisorPerformance.map((advisor) => (
								<div key={advisor.id ?? advisor.name} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-55/15 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-850 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500">
									<div className="min-w-0 space-y-1">
										<p className="text-sm font-bold text-zinc-850 dark:text-zinc-200 truncate">{advisor.name}</p>
										<p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Paid: {formatCurrency(advisor.paidCommission)}</p>
									</div>
									<div className="text-right space-y-0.5 shrink-0">
										<p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{formatCurrency(advisor.totalCommission)}</p>
										<p className="text-[10px] text-rose-600 dark:text-rose-455 font-bold uppercase tracking-wide">Due: {formatCurrency(advisor.pending)}</p>
									</div>
								</div>
							))}
							{stats.advisorPerformance.length === 0 && (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<Users className="h-10 w-10 text-zinc-350 dark:text-zinc-650 stroke-[1.5]" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No advisors found</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No active advisor commission records found.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Revenue by Project Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<BarChart3 className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Revenue by Project
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3">
							{stats.revenueByProject.sort((a, b) => b.value - a.value).map((p) => (
								<div key={p.name} className="flex justify-between items-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-55/15 dark:bg-zinc-900/10 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500">
									<span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate pr-2">{p.name}</span>
									<span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByProject.length === 0 && (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<Building2 className="h-10 w-10 text-zinc-350 dark:text-zinc-650 stroke-[1.5]" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No project revenue</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No sales collections have been mapped yet.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Revenue by Sale Phase Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<PieChart className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Revenue by Sale Phase
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3">
							{stats.revenueByPhase.map((p) => (
								<div key={p.phase} className="flex justify-between items-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-55/15 dark:bg-zinc-900/10 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500">
									<span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 capitalize">{p.phase.replace("_", " ")}</span>
									<span className="text-sm font-black text-zinc-900 dark:text-zinc-50">{formatCurrency(p.value)}</span>
								</div>
							))}
							{stats.revenueByPhase.length === 0 && (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<PieChart className="h-10 w-10 text-zinc-350 dark:text-zinc-650 stroke-[1.5]" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No phase revenue</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No sales recorded under any phase groups yet.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Expense by Category Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Expense by Category
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 flex-1">
						<div className="space-y-3">
							{stats.expenseByCategory.map((e) => (
								<div key={e.category} className="flex justify-between items-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 bg-zinc-55/15 dark:bg-zinc-900/10 transition-all duration-300 hover:bg-white dark:hover:bg-zinc-950 hover:shadow-xs border-l-2 border-l-transparent hover:border-l-teal-500">
									<span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 capitalize">{e.category}</span>
									<span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(e.value)}</span>
								</div>
							))}
							{stats.expenseByCategory.length === 0 && (
								<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
									<FileText className="h-10 w-10 text-zinc-350 dark:text-zinc-650 stroke-[1.5]" />
									<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No expenses logged</p>
									<p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px]">No commercial business expenses logged yet.</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* New Customers in Period Card */}
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden flex flex-col justify-between">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-6">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> New Customers in Period
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 sm:p-8 flex-1 flex flex-col justify-center items-center">
						<div className="text-center space-y-2">
							<p className="text-5xl font-black text-teal-600 dark:text-teal-400 tracking-tight leading-none">
								{stats.newCustomersInPeriod}
							</p>
							<p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
								Newly registered clients
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Sales Trend Chart Section */}
			{trendData.length > 0 && (
				<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl transition-all duration-300 ease-out hover:border-teal-500/25 hover:shadow-[0_10px_20px_rgba(20,184,166,0.05)] overflow-hidden">
					<CardHeader className="pb-3.5 border-b border-zinc-100 dark:border-zinc-850/65 px-4 sm:px-8">
						<CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2.5">
							<BarChart3 className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" /> Sales Trend by {trendMode === "week" ? "Week" : "Month"}
						</CardTitle>
					</CardHeader>
					<CardContent className="p-3 sm:p-8 px-3.5 sm:px-8 space-y-4">
						<div className="mb-2">
							<SalesTrendControls />
						</div>
						<div className="rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/5 p-2 sm:p-4 transition-all duration-300 hover:border-zinc-200 dark:hover:border-zinc-800/80">
							<SalesTrendLineChart data={trendData} granularity={trendMode} />
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}
