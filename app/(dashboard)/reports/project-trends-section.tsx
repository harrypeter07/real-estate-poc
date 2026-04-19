import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getProjectPaymentsTrend } from "@/app/actions/reports";
import { SalesTrendLineChart } from "@/components/reports/sales-trend-line-chart";
import { formatCurrency } from "@/lib/utils/formatters";
import { IndianRupee, CalendarDays } from "lucide-react";

export default async function ProjectTrendsSection({
	projectId,
	from,
	to,
}: {
	projectId: string;
	from?: string;
	to?: string;
}) {
	const trend = await getProjectPaymentsTrend(projectId, {
		startDate: from ?? undefined,
		endDate: to ?? undefined,
	});

	return (
		<Card className="border-zinc-200">
			<CardHeader>
				<CardTitle className="text-sm font-bold flex items-center gap-2">
					<CalendarDays className="h-4 w-4" /> Collections Trend
				</CardTitle>
				<div className="mt-2 flex flex-wrap gap-3 text-sm">
					<div className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-2">
						<div className="text-[10px] font-semibold uppercase text-zinc-500">
							Collected
						</div>
						<div className="font-bold text-zinc-900 flex items-center gap-1">
							<IndianRupee className="h-4 w-4 text-green-700" />
							{formatCurrency(trend.summary.collected)}
						</div>
					</div>
					<div className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-2">
						<div className="text-[10px] font-semibold uppercase text-zinc-500">
							Payments
						</div>
						<div className="font-bold text-zinc-900">
							{trend.summary.paymentsCount}
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{trend.data.length === 0 ? (
					<p className="text-sm text-zinc-500">No confirmed payments in the selected range.</p>
				) : (
					<SalesTrendLineChart data={trend.data} />
				)}
			</CardContent>
		</Card>
	);
}

