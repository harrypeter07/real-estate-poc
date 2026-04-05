import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { advisorHasProjectAccess } from "@/app/actions/advisor-projects";
import { getProjectWithStats } from "@/app/actions/project-actions";
import { getPlotsByProject } from "@/app/actions/plots";
import { PlotLayoutGrid } from "@/components/projects/plot-layout-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
	LayoutGrid,
	CheckCircle,
	Clock,
	ShieldCheck,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ plotId?: string }>;
}

export default async function AdvisorProjectDetailPage({ params, searchParams }: Props) {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { id } = await params;
	const { plotId } = await searchParams;

	const allowed = await advisorHasProjectAccess(advisorId, id);
	if (!allowed) notFound();

	const data = await getProjectWithStats(id, { advisorId });
	const plots = await getPlotsByProject(id);

	if (!data) notFound();

	const { project, plotCounts, totalRevenue, recentSales } = data;

	const plannedCount = Number(project.total_plots_count ?? 0);
	const plotByNumber = new Map(plots.map((p) => [p.plot_number, p]));
	const layoutPlots =
		plannedCount > 0
			? Array.from({ length: plannedCount }, (_, idx) => {
					const plotNumber = String(idx + 1);
					return (
						plotByNumber.get(plotNumber) ?? {
							id: `planned-${plotNumber}`,
							project_id: project.id,
							plot_number: plotNumber,
							size_sqft: 0,
							rate_per_sqft: 0,
							total_amount: 0,
							status: "available" as const,
							facing: null,
							notes: null,
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
							sale: null,
							payments: [],
						}
					);
				})
			: plots;

	return (
		<div>
			<PageHeader
				title={project.name}
				subtitle={
					(project.location ?? "No location set") +
					" — read-only view"
				}
				showBackButton
			/>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="sm:col-span-2 lg:col-span-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-zinc-500">
								Revenue collected (this project)
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
							<p className="text-xs text-zinc-500 mt-1">
								Sum of confirmed customer payments on this project.
							</p>
						</CardContent>
					</Card>
				</div>
				<StatCard
					title="Total Plots"
					value={plotCounts.total}
					icon={LayoutGrid}
					color="zinc"
				/>
				<StatCard
					title="Available"
					value={plotCounts.available}
					icon={CheckCircle}
					color="green"
				/>
				<StatCard title="Token" value={plotCounts.token} icon={Clock} color="orange" />
				<StatCard
					title="Sold"
					value={plotCounts.sold}
					icon={ShieldCheck}
					color="red"
				/>
			</div>

			{layoutPlots.length > 0 && (
				<Card className="mb-6">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Plot layout
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PlotLayoutGrid
							readOnly
							plots={layoutPlots}
							projectName={project.name}
							projectId={project.id}
							initialPlotId={plotId}
						/>
					</CardContent>
				</Card>
			)}

			{project.description ? (
				<Card className="mb-6">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Description
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-700 whitespace-pre-wrap">
							{project.description}
						</p>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Your recent sales on this project</CardTitle>
					<p className="text-xs text-zinc-500 font-normal mt-1">
						Shows sales where you are the main advisor or have a commission row.
					</p>
				</CardHeader>
				<CardContent>
					{recentSales.length === 0 ? (
						<p className="text-sm text-zinc-400 py-4 text-center">No sales yet</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-zinc-500">
										<th className="pb-2 pr-4 font-medium">Plot</th>
										<th className="pb-2 pr-4 font-medium">Customer</th>
										<th className="pb-2 pr-4 font-medium">Advisor</th>
										<th className="pb-2 pr-4 font-medium">Amount</th>
										<th className="pb-2 pr-4 font-medium">Phase</th>
										<th className="pb-2 font-medium">Date</th>
									</tr>
								</thead>
								<tbody>
									{recentSales.map((sale) => (
										<tr key={sale.id} className="border-b last:border-0">
											<td className="py-2.5 pr-4 font-medium">{sale.plot_number}</td>
											<td className="py-2.5 pr-4">{sale.customer_name}</td>
											<td className="py-2.5 pr-4">{sale.advisor_name}</td>
											<td className="py-2.5 pr-4">
												{formatCurrency(sale.total_sale_amount)}
											</td>
											<td className="py-2.5 pr-4">
												<Badge variant="secondary">{sale.sale_phase}</Badge>
											</td>
											<td className="py-2.5">
												{sale.token_date ? formatDate(sale.token_date) : "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
