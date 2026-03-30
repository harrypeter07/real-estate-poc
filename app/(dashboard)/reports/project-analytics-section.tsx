import {
	Building2,
	CreditCard,
	Handshake,
	Home,
	UserCheck,
	BarChart3,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency } from "@/lib/utils/formatters";
import { getProjectAnalytics } from "@/app/actions/reports";
import { LeftPlotsCard } from "@/components/reports/left-plots-card";

export default async function ProjectAnalyticsSection({
	projectId,
}: {
	projectId: string;
}) {
	const projectAnalytics = await getProjectAnalytics(projectId);
	if (!projectAnalytics) return null;

	const statusBadgeClass: Record<string, string> = {
		token: "bg-yellow-100 text-yellow-800 border-yellow-200",
		agreement: "bg-orange-100 text-orange-800 border-orange-200",
		sold: "bg-purple-100 text-purple-800 border-purple-200",
	};

	return (
		<>
			{/* Project-specific analytics */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<StatCard
					title="Plots Total"
					value={String(projectAnalytics.plots.total)}
					icon={Home}
					color="blue"
				/>
				<StatCard
					title="Plots Sold"
					value={String(projectAnalytics.plots.sold)}
					icon={Handshake}
					color="green"
				/>
				<StatCard
					title="Plots Available"
					value={String(projectAnalytics.plots.available)}
					icon={Building2}
					color="zinc"
				/>
				<StatCard
					title="Est. Revenue (Left Plots)"
					value={formatCurrency(projectAnalytics.estimatedRevenueLeft)}
					icon={TrendingUp}
					color="green"
				/>
				<StatCard
					title="Revenue Collected"
					value={formatCurrency(projectAnalytics.revenue.total)}
					icon={CreditCard}
					color="orange"
				/>
				<StatCard
					title="Extra Commission Paid"
					value={formatCurrency(
						(projectAnalytics as any).extraCommissionPaid ?? 0
					)}
					icon={CreditCard}
					color="zinc"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<BarChart3 className="h-4 w-4" /> Revenue Summary
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex justify-between">
							<span className="text-zinc-600">Total Sales Value</span>
							<span className="font-bold">
								{formatCurrency(projectAnalytics.revenue.salesValue)}
							</span>
						</div>
						<div className="flex justify-between text-green-600">
							<span>Collected</span>
							<span className="font-bold">
								{formatCurrency(projectAnalytics.revenue.total)}
							</span>
						</div>
						<div className="flex justify-between text-red-600">
							<span>Outstanding</span>
							<span className="font-bold">
								{formatCurrency(projectAnalytics.revenue.outstanding)}
							</span>
						</div>
						{projectAnalytics.layoutExpense > 0 && (
							<div className="flex justify-between text-zinc-600 pt-2 border-t">
								<span>Layout Expense</span>
								<span className="font-bold">
									{formatCurrency(projectAnalytics.layoutExpense)}
								</span>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<UserCheck className="h-4 w-4" /> Sold By (Advisors / Admin)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{projectAnalytics.advisors.map((a: any) => (
								<div
									key={a.name}
									className="flex justify-between items-center"
								>
									<span className="text-sm font-medium truncate pr-2">
										{a.name}
									</span>
									<span className="text-sm font-bold">
										{formatCurrency(a.value)}
									</span>
								</div>
							))}
							{projectAnalytics.advisors.length === 0 && (
								<p className="text-sm text-zinc-400">No sales yet</p>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Home className="h-4 w-4" /> Top Plots by Value
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{projectAnalytics.topPlots.map((p: any, i: number) => (
								<div
									key={i}
									className="flex justify-between items-center text-sm"
								>
									<span className="font-medium">{p.plot_number}</span>
									<span
										className={[
											"px-2 py-0.5 rounded-full border text-xs capitalize",
											statusBadgeClass[p.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200",
										].join(" ")}
									>
										{p.status}
									</span>
									<span className="font-bold">
										{formatCurrency(p.value)}
									</span>
								</div>
							))}
							{projectAnalytics.topPlots.length === 0 && (
								<p className="text-sm text-zinc-400">No sold plots</p>
							)}
						</div>
					</CardContent>
				</Card>

				<div className="lg:col-span-2">
					<LeftPlotsCard plots={projectAnalytics.leftPlots} />
				</div>
			</div>
		</>
	);
}

