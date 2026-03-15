import { notFound } from "next/navigation";
import Link from "next/link";
import {
	LayoutGrid,
	CheckCircle,
	Clock,
	FileText,
	ShieldCheck,
	IndianRupee,
	Pencil,
	ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getProjectWithStats } from "@/app/actions/project-actions";
import { ProjectEditWrapper } from "@/components/projects/project-edit-wrapper";

interface Props {
	params: { id: string };
	searchParams: { edit?: string };
}

export default async function ProjectDetailPage({
	params,
	searchParams,
}: Props) {
	const { id } = await params;
	const { edit } = await searchParams;
	const data = await getProjectWithStats(id);

	if (!data) {
		notFound();
	}

	const { project, plotCounts, totalRevenue, recentSales } = data;

	// If ?edit=true, show the edit form
	if (edit === "true") {
		return (
			<div>
				<PageHeader
					title="Edit Project"
					subtitle={`Editing: ${project.name}`}
				/>
				<ProjectEditWrapper project={project} />
			</div>
		);
	}

	return (
		<div>
			<PageHeader
				title={project.name}
				subtitle={project.location ?? "No location set"}
				showBackButton
				action={
					<div className="flex gap-2">
						<Link href={`/projects/${project.id}?edit=true`}>
							<Button variant="outline" size="sm">
								<Pencil className="h-4 w-4 mr-2" />
								Edit
							</Button>
						</Link>
						<Link href={`/projects/${project.id}/plots`}>
							<Button size="sm">
								<LayoutGrid className="h-4 w-4 mr-2" />
								Manage Plots
							</Button>
						</Link>
					</div>
				}
			/>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
				<StatCard
					title="Token"
					value={plotCounts.token}
					icon={Clock}
					color="orange"
				/>
				<StatCard
					title="Agreement"
					value={plotCounts.agreement}
					icon={FileText}
					color="blue"
				/>
				<StatCard
					title="Sold"
					value={plotCounts.sold}
					icon={ShieldCheck}
					color="red"
				/>
			</div>

			{/* Revenue + Info */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Total Revenue
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
						<p className="text-xs text-zinc-400 mt-1">
							From {recentSales.length} sale(s)
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Layout Expense
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">
							{formatCurrency(Number(project.layout_expense ?? 0))}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Plot Capacity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">
							{plotCounts.total}{" "}
							<span className="text-base font-normal text-zinc-400">
								/ {project.total_plots_count} planned
							</span>
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Description */}
			{project.description && (
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
			)}

			{/* Recent Sales */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recent Sales</CardTitle>
				</CardHeader>
				<CardContent>
					{recentSales.length === 0 ? (
						<p className="text-sm text-zinc-400 py-4 text-center">
							No sales yet for this project
						</p>
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
											<td className="py-2.5 pr-4 font-medium">
												{sale.plot_number}
											</td>
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
