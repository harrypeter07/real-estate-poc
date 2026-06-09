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
import { getPlotsByProject } from "@/app/actions/plots";
import { PlotLayoutGrid } from "@/components/projects/plot-layout-grid";
import { getAdvisors } from "@/app/actions/advisors";
import { getAdvisorAssignmentsByProject } from "@/app/actions/advisor-projects";
import { ProjectAdvisorAssignmentsModal } from "@/components/projects/project-advisor-assignments-modal";
import { PlotForm } from "@/components/projects/plot-form";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectDocumentsModal } from "@/components/projects/project-documents-modal";
import { getProjectDocuments } from "@/app/actions/project-documents";
import { RecentSalesList } from "@/components/projects/recent-sales-list";
import { getBusinessProfile } from "@/app/actions/business-settings";
import { ProjectPdfButton } from "@/components/projects/project-pdf-button";


interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ edit?: string; plotId?: string }>;
}

export default async function ProjectDetailPage({
	params,
	searchParams,
}: Props) {
	const { id } = await params;
	const { edit, plotId } = await searchParams;
	const data = await getProjectWithStats(id);
	const plots = await getPlotsByProject(id);
	const advisors = await getAdvisors();
	const advisorAssignments = await getAdvisorAssignmentsByProject(id);
	const projectDocs = await getProjectDocuments(id);
	const businessProfile = await getBusinessProfile();

	if (!data) {
		notFound();
	}

	const { project, plotCounts, totalRevenue, recentSales } = data;

	const getUnitLabels = (type?: string | null) => {
		const t = (type || "Plot").toLowerCase().trim();
		if (t === "flat") return { singular: "Flat", plural: "Flats" };
		if (t === "row house" || t === "row_house") return { singular: "Row House", plural: "Row Houses" };
		if (t === "farm house" || t === "farmhouse" || t === "farm_house") return { singular: "Farm House", plural: "Farm Houses" };
		if (t === "commercial") return { singular: "Commercial Unit", plural: "Commercial Units" };
		if (t === "mixed") return { singular: "Mixed Property", plural: "Mixed Properties" };
		return { singular: "Plot", plural: "Plots" };
	};

	const { singular, plural } = getUnitLabels(project.project_type);

	/** Lowest admin-set plot rate in this project (for advisor-share preview in assignments). */
	const projectMinPlotRatePerSqft = plots.reduce<number>((acc, p: { rate_per_sqft?: number }) => {
		const r = Number(p.rate_per_sqft ?? 0);
		if (r <= 0) return acc;
		if (acc <= 0 || r < acc) return r;
		return acc;
	}, 0);

	const plannedCount = Number(project.total_plots_count ?? 0);
	const startPlotNumber = Number(project.starting_plot_number ?? 1);
	const numericPlotRows = plots.filter((p) => /^\d+$/.test(String(p.plot_number ?? "").trim()));
	const canRenderPlannedSlots =
		plannedCount > 0 && (plots.length === 0 || numericPlotRows.length === plots.length);
	const plotByNumericNumber = new Map(
		numericPlotRows.map((p) => [Number.parseInt(String(p.plot_number), 10), p]),
	);
	const layoutPlots = canRenderPlannedSlots
		? Array.from({ length: plannedCount }, (_, idx) => {
				const num = startPlotNumber + idx;
				const plotNumber = String(num);
				return (
					plotByNumericNumber.get(num) ?? {
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
					<div className="flex flex-wrap gap-2">
						<ProjectPdfButton
							project={project}
							plots={plots}
							businessProfile={businessProfile}
							plotCounts={plotCounts}
						/>
						<Link href={`/projects/${project.id}?edit=true`}>
							<Button variant="outline" size="sm">
								<Pencil className="h-4 w-4 mr-2" />
								Edit
							</Button>
						</Link>
						<Dialog>
							<DialogTrigger asChild>
								<Button size="sm">
									<LayoutGrid className="h-4 w-4 mr-2" />
									Add Single {singular}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-2xl">
								<DialogHeader>
									<DialogTitle>Add Single {singular}</DialogTitle>
								</DialogHeader>
								<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
									<PlotForm mode="create" projectId={project.id} projectType={project.project_type} />
								</div>
							</DialogContent>
						</Dialog>
						<ProjectDocumentsModal projectId={project.id} initialDocs={projectDocs as any[]} />
					</div>
				}
			/>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<StatCard
					title={`Total ${plural}`}
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
					title="Payment completed / Sold"
					value={plotCounts.sold}
					icon={ShieldCheck}
					color="red"
				/>
			</div>

			{/* Plot Layout */}
			{layoutPlots.length > 0 && (
				<Card className="mb-6">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-zinc-500">
							Interactive {singular} Layout
						</CardTitle>
					</CardHeader>
					<CardContent>
						<PlotLayoutGrid
							plots={layoutPlots}
							projectName={project.name}
							projectId={project.id}
							initialPlotId={plotId}
							projectType={project.project_type}
							projectEmiMonths={project.emi_months}
						/>
					</CardContent>
				</Card>
			)}

			{/* Advisor assignments */}
			<Card className="mb-6">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-zinc-500">
						Advisor Assignment & Selling Price (Project-wise)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ProjectAdvisorAssignmentsModal
						projectId={project.id}
						advisors={advisors}
						assignments={advisorAssignments}
						minPlotRatePerSqft={projectMinPlotRatePerSqft}
					/>
				</CardContent>
			</Card>

			{/* Revenue + Info */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
				<Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center justify-between gap-3.5 w-full">
							<div className="flex items-center gap-3.5">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
									<IndianRupee className="h-5 w-5" />
								</div>
								<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
									Revenue collected
								</p>
							</div>
							
							<span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 uppercase tracking-wider">
								▲ Inflow Active
							</span>
						</div>
						
						<div className="mt-4 flex items-center justify-between gap-4">
							<div className="space-y-1 flex-1">
								<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">
									{formatCurrency(totalRevenue)}
								</p>
								<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-normal mt-1 flex items-center gap-1.5 truncate">
									Confirmed payments. Showing {recentSales.length} recent active sale(s).
								</p>
							</div>

							{/* Premium Sparkline Visual Graphic */}
							<div className="h-10 w-20 shrink-0 flex items-center justify-end">
								<svg className="w-16 h-8 text-emerald-500 shrink-0 opacity-80" viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M0,25 Q15,12 30,22 T60,8 T90,18 L100,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
									<path d="M0,25 Q15,12 30,22 T60,8 T90,18 L100,12 L100,30 L0,30 Z" fill="url(#sparkline-gradient-rev)" opacity="0.15" />
									<defs>
										<linearGradient id="sparkline-gradient-rev" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="currentColor" />
											<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
										</linearGradient>
									</defs>
								</svg>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center justify-between gap-3.5 w-full">
							<div className="flex items-center gap-3.5">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
									<LayoutGrid className="h-5 w-5" />
								</div>
								<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
									{singular} Capacity
								</p>
							</div>
							
							<span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-wider">
								{plannedCount > 0 ? Math.min(100, Math.round((plotCounts.total / plannedCount) * 100)) : 0}% Created
							</span>
						</div>

						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">
								{plotCounts.total}{" "}
								<span className="text-base font-normal text-zinc-400 dark:text-zinc-500">
									/ {project.total_plots_count} planned
								</span>
							</p>

							{/* Visual Utilization Progress Bar */}
							<div className="mt-3">
								<div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
									<div 
										className="bg-indigo-500 h-full rounded-full transition-all duration-300"
										style={{ width: `${plannedCount > 0 ? Math.min(100, Math.round((plotCounts.total / plannedCount) * 100)) : 0}%` }}
									/>
								</div>
								<p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-medium">
									{plotCounts.total} of {project.total_plots_count} planned {plural.toLowerCase()} created inside layout.
								</p>
							</div>
						</div>
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
			<RecentSalesList recentSales={recentSales} />

		</div>
	);
}
