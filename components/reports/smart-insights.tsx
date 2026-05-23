import {
	Flame,
	TrendingUp,
	AlertTriangle,
	UserCheck,
	Coins,
	Award,
	Sparkles,
	Lightbulb,
	Home,
	CheckCircle2,
	TrendingDown,
} from "lucide-react";
import { getReportStats, getProjectAnalytics } from "@/app/actions/reports";
import { formatCurrency } from "@/lib/utils/formatters";

interface SmartInsightsProps {
	projectId?: string;
	from?: string;
	to?: string;
}

export async function SmartInsights({ projectId, from, to }: SmartInsightsProps) {
	let insights: Array<{
		icon: any;
		text: string;
		gradient: string;
		textColor: string;
		borderColor: string;
		iconColor: string;
	}> = [];

	if (projectId) {
		const projectAnalytics = await getProjectAnalytics(projectId);
		if (projectAnalytics) {
			const { plots, revenue, estimatedRevenueLeft, advisors } = projectAnalytics;

			// 1. Plots sold percentage
			if (plots.total > 0 && plots.sold > 0) {
				const percent = Math.round((plots.sold / plots.total) * 100);
				insights.push({
					icon: TrendingUp,
					text: `${plots.sold} of ${plots.total} plots sold (${percent}%)`,
					gradient: "from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/20 dark:to-purple-950/20",
					textColor: "text-indigo-900 dark:text-indigo-200",
					borderColor: "border-indigo-100 dark:border-indigo-900/30",
					iconColor: "text-indigo-600 dark:text-indigo-400",
				});
			}

			// 2. Available Plots
			if (plots.available > 0) {
				insights.push({
					icon: Home,
					text: `${plots.available} plots available for booking`,
					gradient: "from-teal-50/90 to-emerald-50/90 dark:from-teal-950/20 dark:to-emerald-950/20",
					textColor: "text-teal-900 dark:text-teal-200",
					borderColor: "border-teal-100 dark:border-teal-900/30",
					iconColor: "text-teal-600 dark:text-teal-400",
				});
			}

			// 3. Outstanding Customer balance
			if (revenue.customerOutstanding > 0) {
				insights.push({
					icon: AlertTriangle,
					text: `Customer outstanding: ${formatCurrency(revenue.customerOutstanding)}`,
					gradient: "from-amber-50/90 to-orange-50/90 dark:from-amber-950/20 dark:to-orange-950/20",
					textColor: "text-amber-900 dark:text-amber-200",
					borderColor: "border-amber-100 dark:border-amber-900/30",
					iconColor: "text-amber-600 dark:text-amber-400",
				});
			}

			// 4. Est revenue left
			if (estimatedRevenueLeft > 0) {
				insights.push({
					icon: Coins,
					text: `Est. revenue from left plots: ${formatCurrency(estimatedRevenueLeft)}`,
					gradient: "from-emerald-50/90 to-green-50/90 dark:from-emerald-950/20 dark:to-green-950/20",
					textColor: "text-emerald-900 dark:text-teal-200",
					borderColor: "border-emerald-100 dark:border-emerald-900/30",
					iconColor: "text-emerald-600 dark:text-emerald-400",
				});
			}

			// 5. Top advisor
			if (advisors && advisors.length > 0 && advisors[0].value > 0) {
				insights.push({
					icon: UserCheck,
					text: `Top Advisor: ${advisors[0].name} (${formatCurrency(advisors[0].value)})`,
					gradient: "from-violet-50/90 to-indigo-50/90 dark:from-violet-950/20 dark:to-indigo-950/20",
					textColor: "text-violet-900 dark:text-violet-200",
					borderColor: "border-violet-100 dark:border-violet-900/30",
					iconColor: "text-violet-600 dark:text-violet-400",
				});
			}

			// Fallback: If no activity in this project yet
			if (insights.length === 0) {
				insights.push(
					{
						icon: Sparkles,
						text: `Project ready: ${plots.available} available plots are open for bookings`,
						gradient: "from-purple-50/90 to-violet-50/90 dark:from-purple-950/20 dark:to-violet-950/20",
						textColor: "text-purple-900 dark:text-purple-200",
						borderColor: "border-purple-100 dark:border-purple-900/30",
						iconColor: "text-purple-600 dark:text-purple-400",
					},
					{
						icon: Lightbulb,
						text: "Tip: Record new bookings or installment payments to generate visual trends.",
						gradient: "from-sky-50/90 to-blue-50/90 dark:from-sky-950/20 dark:to-blue-950/20",
						textColor: "text-sky-900 dark:text-sky-200",
						borderColor: "border-sky-100 dark:border-sky-900/30",
						iconColor: "text-sky-600 dark:text-sky-400",
					}
				);
			}
		}
	} else {
		// Global Overview Insights
		const reportStats = await getReportStats({ startDate: from, endDate: to });
		if (reportStats) {
			const { summary, topAdvisors, revenueByProject } = reportStats;

			// 1. Top Performing Advisor
			if (topAdvisors && topAdvisors.length > 0 && topAdvisors[0].value > 0) {
				insights.push({
					icon: Award,
					text: `Best performing advisor: ${topAdvisors[0].name} (${formatCurrency(topAdvisors[0].value)})`,
					gradient: "from-violet-50/90 to-indigo-50/90 dark:from-violet-950/20 dark:to-indigo-950/20",
					textColor: "text-violet-900 dark:text-violet-200",
					borderColor: "border-violet-100 dark:border-violet-900/30",
					iconColor: "text-violet-600 dark:text-violet-400",
				});
			}

			// 2. Highest Revenue Project
			if (revenueByProject && revenueByProject.length > 0) {
				const sortedProjects = [...revenueByProject].sort((a, b) => b.value - a.value);
				if (sortedProjects[0].value > 0) {
					insights.push({
						icon: Flame,
						text: `${sortedProjects[0].name} generated highest revenue: ${formatCurrency(sortedProjects[0].value)}`,
						gradient: "from-rose-50/90 to-pink-50/90 dark:from-rose-950/20 dark:to-pink-950/20",
						textColor: "text-rose-900 dark:text-rose-200",
						borderColor: "border-rose-100 dark:border-rose-900/30",
						iconColor: "text-rose-600 dark:text-rose-400",
					});
				}
			}

			// 3. Sales Bookings Count
			if (summary.salesCount > 0) {
				insights.push({
					icon: TrendingUp,
					text: `Sales closed: ${summary.salesCount} bookings registered in this period`,
					gradient: "from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/20 dark:to-emerald-950/20",
					textColor: "text-emerald-900 dark:text-emerald-200",
					borderColor: "border-emerald-100 dark:border-emerald-900/30",
					iconColor: "text-emerald-600 dark:text-emerald-400",
				});
			}

			// 4. Customer Outstanding
			if (summary.totalOutstanding > 0) {
				insights.push({
					icon: AlertTriangle,
					text: `Customer outstanding: ${formatCurrency(summary.totalOutstanding)}`,
					gradient: "from-amber-50/90 to-orange-50/90 dark:from-amber-950/20 dark:to-orange-950/20",
					textColor: "text-amber-900 dark:text-amber-200",
					borderColor: "border-amber-100 dark:border-amber-900/30",
					iconColor: "text-amber-600 dark:text-amber-400",
				});
			}

			// 5. Revenue Collected
			if (summary.totalRevenueCollected > 0) {
				insights.push({
					icon: CheckCircle2,
					text: `Revenue collected: ${formatCurrency(summary.totalRevenueCollected)}`,
					gradient: "from-teal-50/90 to-green-50/90 dark:from-teal-950/20 dark:to-green-950/20",
					textColor: "text-teal-900 dark:text-teal-200",
					borderColor: "border-teal-100 dark:border-teal-900/30",
					iconColor: "text-teal-600 dark:text-teal-400",
				});
			}

			// 6. Enquiry conversion
			if (summary.enquiryConvertedCustomers > 0) {
				insights.push({
					icon: UserCheck,
					text: `Leads converted: ${summary.enquiryConvertedCustomers} enquiries upgraded to customers`,
					gradient: "from-blue-50/90 to-sky-50/90 dark:from-blue-950/20 dark:to-sky-950/20",
					textColor: "text-blue-900 dark:text-blue-200",
					borderColor: "border-blue-100 dark:border-blue-900/30",
					iconColor: "text-blue-600 dark:text-blue-400",
				});
			}

			// Fallback: If no activity in CRM yet
			if (insights.length === 0) {
				insights.push(
					{
						icon: Sparkles,
						text: "Welcome to premium reports: Select a project to view specific insights.",
						gradient: "from-purple-50/90 to-violet-50/90 dark:from-purple-950/20 dark:to-violet-950/20",
						textColor: "text-purple-900 dark:text-purple-200",
						borderColor: "border-purple-100 dark:border-purple-900/30",
						iconColor: "text-purple-600 dark:text-purple-400",
					},
					{
						icon: Lightbulb,
						text: "Tip: Use the Quick Actions panel below to record sales or payments.",
						gradient: "from-sky-50/90 to-blue-50/90 dark:from-sky-950/20 dark:to-blue-950/20",
						textColor: "text-sky-900 dark:text-sky-200",
						borderColor: "border-sky-100 dark:border-sky-900/30",
						iconColor: "text-sky-600 dark:text-sky-400",
					},
					{
						icon: Home,
						text: "Dynamic insights will appear here automatically once transactions are logged.",
						gradient: "from-zinc-50/90 to-slate-50/90 dark:from-zinc-950/20 dark:to-slate-950/20",
						textColor: "text-zinc-900 dark:text-zinc-200",
						borderColor: "border-zinc-100 dark:border-zinc-900/30",
						iconColor: "text-zinc-600 dark:text-zinc-400",
					}
				);
			}
		}
	}

	return (
		<div className="w-full bg-white dark:bg-zinc-950/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-top-3 duration-500">
			<div className="flex items-center gap-2 mb-3">
				<div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50">
					<Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400 animate-pulse" />
				</div>
				<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
					Smart Insights
				</h3>
			</div>

			<div className="w-full overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1">
				<div className="flex gap-3 min-w-max px-1">
					{insights.map((item, idx) => {
						const Icon = item.icon;
						return (
							<div
								key={idx}
								className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-gradient-to-r ${item.gradient} ${item.borderColor} shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 active:scale-98 transition-all duration-300 group`}
							>
								<div className="flex items-center justify-center p-1 rounded-lg bg-white/70 dark:bg-zinc-900/60 shadow-sm border border-black/[0.03] group-hover:scale-105 transition-transform duration-300">
									<Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
								</div>
								<span className={`text-xs font-semibold ${item.textColor}`}>
									{item.text}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
