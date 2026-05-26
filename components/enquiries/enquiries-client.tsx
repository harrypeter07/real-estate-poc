"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getEnquiryCustomers, type EnquiryRow } from "@/app/actions/enquiries";
import { EnquiryCreateModal } from "@/components/enquiries/enquiry-create-modal";
import { EnquiryTempCustomersModal } from "@/components/enquiries/enquiry-temp-customers-modal";
import { LeadDetailDrawer } from "@/components/enquiries/lead-detail-drawer";
import { Calendar, Building2, User, CheckCircle2, Clock3, UserCheck, XCircle, ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/formatters";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { TableSkeleton } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const STAGES = ["new", "contacted", "follow_up", "site_visit", "negotiation", "converted", "lost"] as const;

export function EnquiriesClient({
	initialEnquiries,
	initialTotal,
	projects,
	advisors,
}: {
	initialEnquiries: EnquiryRow[];
	initialTotal: number;
	projects: Array<{ id: string; name: string }>;
	advisors: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [projectFilter, setProjectFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [createOpen, setCreateOpen] = useState(false);
	const [tempCustomersOpen, setTempCustomersOpen] = useState(false);
	const [selectedLead, setSelectedLead] = useState<any | null>(null);

	const pageSize = 50; // Larger page size for Kanban to render columns cleanly
	const debouncedQuery = useDebounce(query, 400);

	// Reset to page 1 on filter change
	useEffect(() => {
		setPage(1);
	}, [debouncedQuery, categoryFilter, projectFilter, statusFilter]);

	// Fetch via REST API for dynamic filtering/updates
	const { data: apiResponse, isLoading, refetch } = useQuery({
		queryKey: ["enquiries", page, debouncedQuery, categoryFilter, projectFilter, statusFilter],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: String(page),
				limit: String(pageSize),
				search: debouncedQuery,
				pipeline_stage: statusFilter,
				project_id: projectFilter,
			});
			const res = await fetch(`/api/enquiries?${params.toString()}`);
			if (!res.ok) throw new Error("Failed to fetch enquiries");
			return res.json();
		},
	});

	const enquiries = apiResponse?.data ?? initialEnquiries;
	const total = apiResponse?.total ?? initialTotal;
	const totalPages = Math.ceil(total / pageSize);

	// Fetch CRM pipeline counts
	const { data: pipelineData, refetch: refetchPipeline } = useQuery({
		queryKey: ["enquiry-pipeline"],
		queryFn: async () => {
			const res = await fetch("/api/enquiries/pipeline");
			if (!res.ok) throw new Error("Failed to fetch pipeline board");
			return res.json();
		},
	});

	// Drag & Drop Mutation
	const updateStageMutation = useMutation({
		mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
			const res = await fetch(`/api/enquiries/${id}/stage`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pipeline_stage: stage }),
			});
			if (!res.ok) throw new Error("Failed to update stage");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Stage updated!");
			refetch();
			refetchPipeline();
		},
		onError: (err: any) => {
			toast.error(err.message || "Failed to update lead stage");
		},
	});

	const handleDragStart = (e: React.DragEvent, id: string) => {
		e.dataTransfer.setData("text/plain", id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, stage: string) => {
		e.preventDefault();
		const id = e.dataTransfer.getData("text/plain");
		if (id) {
			updateStageMutation.mutate({ id, stage });
		}
	};

	const advisorById = useMemo(() => {
		return new Map(advisors.map((a) => [a.id, a.name]));
	}, [advisors]);

	const pipelineLabel = (st: string) => {
		switch (st) {
			case "new":
				return "New Lead";
			case "contacted":
				return "Contact Done";
			case "follow_up":
				return "Follow-Up";
			case "site_visit":
				return "Site Visit Scheduled";
			case "negotiation":
				return "Negotiation";
			case "converted":
				return "Converted";
			case "lost":
				return "Closed Lost";
			default:
				return st;
		}
	};

	const pipelineBadge = (st: string) => {
		switch (st) {
			case "new":
				return { badge: "bg-blue-50 text-blue-700 border-blue-200", Icon: Clock3 };
			case "contacted":
				return { badge: "bg-teal-50 text-teal-700 border-teal-200", Icon: CheckCircle2 };
			case "follow_up":
				return { badge: "bg-amber-50 text-amber-800 border-amber-200", Icon: Clock3 };
			case "site_visit":
				return { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", Icon: Calendar };
			case "negotiation":
				return { badge: "bg-orange-50 text-orange-700 border-orange-200", Icon: Sparkles };
			case "converted":
				return { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: UserCheck };
			case "lost":
				return { badge: "bg-red-50 text-red-700 border-red-200", Icon: XCircle };
			default:
				return { badge: "bg-zinc-50 text-zinc-700 border-zinc-200", Icon: Clock3 };
		}
	};

	// Collapsible summary counts from pipelineData or enquiries
	const summaryStats = useMemo(() => {
		if (pipelineData) {
			let totalBudget = 0;
			let activeLeads = 0;
			let lostLeads = 0;
			let convertedLeads = 0;

			for (const st of STAGES) {
				const col = pipelineData[st] || { count: 0, totalBudget: 0 };
				if (st === "converted") {
					convertedLeads += col.count;
				} else if (st === "lost") {
					lostLeads += col.count;
				} else {
					activeLeads += col.count;
					totalBudget += col.totalBudget;
				}
			}
			const totalLeads = activeLeads + lostLeads + convertedLeads;
			const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";

			return { activeLeads, totalBudget, convertedLeads, conversionRate };
		}
		return { activeLeads: total, totalBudget: 0, convertedLeads: 0, conversionRate: "0" };
	}, [pipelineData, enquiries, total]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="CRM Lead Pipeline"
				subtitle={`${summaryStats.activeLeads} active leads, conversion rate: ${summaryStats.conversionRate}%`}
				action={
					<div className="flex gap-2 flex-wrap">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setTempCustomersOpen(true)}
						>
							Enquiry Customers
						</Button>
						<Button size="sm" onClick={() => setCreateOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow">
							New Lead / Enquiry
						</Button>
					</div>
				}
			/>

			{/* Analytics Bar */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<Card className="shadow-sm border-zinc-100 bg-white/70 backdrop-blur-md">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
							<User className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-bold uppercase">Active Pipeline</p>
							<p className="text-lg font-bold text-zinc-800">{summaryStats.activeLeads} Leads</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-zinc-100 bg-white/70 backdrop-blur-md">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
							<TrendingUp className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-bold uppercase">Conversion Rate</p>
							<p className="text-lg font-bold text-zinc-800">{summaryStats.conversionRate}%</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-zinc-100 bg-white/70 backdrop-blur-md">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
							<UserCheck className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-bold uppercase">Converted</p>
							<p className="text-lg font-bold text-zinc-800">{summaryStats.convertedLeads} Deals</p>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-zinc-100 bg-white/70 backdrop-blur-md">
					<CardContent className="p-4 flex items-center gap-3">
						<div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
							<AlertTriangle className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-bold uppercase">Pipe Volume (Max)</p>
							<p className="text-lg font-bold text-zinc-800">{formatCurrency(summaryStats.totalBudget)}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters Bar */}
			<div className="flex flex-wrap gap-3 items-center justify-between bg-zinc-50 p-3 rounded-lg border border-zinc-200">
				<div className="flex-1 min-w-[250px]">
					<Input
						value={query}
						placeholder="Search by name, phone..."
						onChange={(e) => setQuery(e.target.value)}
						className="bg-white border-zinc-200 shadow-sm"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<select
						className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs shadow-sm focus:outline-none"
						value={projectFilter}
						onChange={(e) => setProjectFilter(e.target.value)}
					>
						<option value="all">All Projects</option>
						{projects.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
					<select
						className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs shadow-sm focus:outline-none"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="all">All stages</option>
						{STAGES.map((st) => (
							<option key={st} value={st}>
								{pipelineLabel(st)}
							</option>
						))}
					</select>

					<div className="flex border border-zinc-200 rounded-md overflow-hidden bg-white shadow-sm">
						<button
							onClick={() => setViewMode("kanban")}
							className={cn(
								"p-2 hover:bg-zinc-50 transition-colors",
								viewMode === "kanban" ? "bg-zinc-100 text-zinc-800" : "text-zinc-400"
							)}
							title="Kanban Board"
						>
							<LayoutGrid className="h-4 w-4" />
						</button>
						<button
							onClick={() => setViewMode("list")}
							className={cn(
								"p-2 hover:bg-zinc-50 transition-colors",
								viewMode === "list" ? "bg-zinc-100 text-zinc-800" : "text-zinc-400"
							)}
							title="List view"
						>
							<List className="h-4 w-4" />
						</button>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							toast.success("Refreshing...");
							refetch();
							refetchPipeline();
						}}
						className="shadow-sm border-zinc-200 bg-white hover:bg-zinc-50"
					>
						Refresh
					</Button>
				</div>
			</div>

			{/* Views */}
			{isLoading ? (
				<TableSkeleton rows={8} />
			) : viewMode === "kanban" ? (
				/* KANBAN BOARD VIEW */
				<div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4 items-start select-none">
					{STAGES.map((st) => {
						const colData = pipelineData ? pipelineData[st] : { count: 0, totalBudget: 0, leads: [] };
						const leads = colData?.leads || [];

						return (
							<div
								key={st}
								onDragOver={handleDragOver}
								onDrop={(e) => handleDrop(e, st)}
								className="bg-zinc-50 rounded-lg p-3 border border-zinc-100 flex flex-col min-w-[220px] max-h-[70vh] overflow-y-auto"
							>
								{/* Column header */}
								<div className="flex justify-between items-center mb-3">
									<div>
										<h3 className="text-xs font-bold text-zinc-800 capitalize">
											{pipelineLabel(st)}
										</h3>
										<p className="text-[10px] text-zinc-400 font-medium">
											{formatCurrency(colData?.totalBudget || 0)}
										</p>
									</div>
									<Badge className="bg-zinc-200 hover:bg-zinc-200 text-zinc-700 font-semibold text-[10px]">
										{colData?.count || 0}
									</Badge>
								</div>

								{/* Cards container */}
								<div className="space-y-2 flex-1 min-h-[150px]">
									{leads.length === 0 ? (
										<div className="border border-dashed border-zinc-200 rounded p-4 text-center text-[10px] text-zinc-400">
											Drag leads here
										</div>
									) : (
										leads.map((lead: any) => {
											const isFuture = lead.follow_up_date && new Date(lead.follow_up_date) >= new Date();
											return (
												<div
													key={lead.id}
													draggable="true"
													onDragStart={(e) => handleDragStart(e, lead.id)}
													onClick={() => setSelectedLead(lead)}
													className={cn(
														"bg-white border rounded p-3 shadow-xs hover:shadow transition-shadow cursor-grab active:cursor-grabbing space-y-2 border-zinc-200",
														lead.follow_up_date
															? isFuture
																? "border-l-4 border-l-emerald-500"
																: "border-l-4 border-l-red-500"
															: ""
													)}
												>
													<div className="flex justify-between items-start gap-1">
														<span className="text-xs font-bold text-zinc-800 truncate block max-w-[130px]">
															{lead.name}
														</span>
														{lead.lead_source && (
															<span className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium capitalize">
																{lead.lead_source}
															</span>
														)}
													</div>

													<p className="text-[10px] font-mono text-zinc-500">{lead.phone}</p>

													<div className="flex justify-between items-center text-[10px] text-zinc-400 border-t border-zinc-50 pt-2 mt-1">
														<span className="font-semibold text-zinc-600">
															{lead.budget_max ? formatCurrency(lead.budget_max) : "—"}
														</span>
														{lead.follow_up_date && (
															<span className="flex items-center gap-0.5">
																<Calendar className="h-3 w-3" />
																{lead.follow_up_date.slice(5, 10)}
															</span>
														)}
													</div>
												</div>
											);
										})
									)}
								</div>
							</div>
						);
					})}
				</div>
			) : (
				/* LIST VIEW */
				<Card>
					<CardContent className="p-0 overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Customer</TableHead>
									<TableHead>Requirements</TableHead>
									<TableHead>Pipeline Status</TableHead>
									<TableHead>Budget</TableHead>
									<TableHead>Advisor</TableHead>
									<TableHead>Project</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{enquiries.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="text-center text-zinc-500 py-10">
											No enquiries found.
										</TableCell>
									</TableRow>
								) : (
									enquiries.map((enq: any) => (
										<TableRow
											key={enq.id}
											className="hover:bg-zinc-50 cursor-pointer"
											onClick={() => setSelectedLead(enq)}
										>
											<TableCell>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<User className="h-4 w-4 text-zinc-400" />
														<div className="font-semibold text-sm truncate">{enq.name}</div>
													</div>
													<div className="text-xs text-zinc-500 font-mono mt-0.5">{enq.phone}</div>
													{enq.email_id && (
														<div className="text-[11px] text-zinc-400 truncate">{enq.email_id}</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-1">
													<div className="flex flex-wrap gap-1">
														{enq.property_type && (
															<Badge variant="secondary" className="text-[10px] font-normal">
																{enq.property_type}
															</Badge>
														)}
														{enq.segment && (
															<Badge variant="outline" className="text-[10px] font-normal">
																{enq.segment}
															</Badge>
														)}
													</div>
													<div className="text-xs text-zinc-500 truncate max-w-[180px]">
														{enq.bhk_size_requirement ?? enq.details ?? "—"}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="font-normal capitalize shadow-xs">
													{(() => {
														const { badge, Icon } = pipelineBadge(enq.pipeline_stage || "new");
														return (
															<span className="flex items-center gap-1">
																<Icon className="h-3.5 w-3.5" />
																<span className="whitespace-nowrap">
																	{pipelineLabel(enq.pipeline_stage || "new")}
																</span>
															</span>
														);
													})()}
												</Badge>
											</TableCell>
											<TableCell className="text-xs text-zinc-700 font-semibold whitespace-nowrap">
												{enq.budget_min != null || enq.budget_max != null ? (
													<>
														{enq.budget_min != null ? formatCurrency(Number(enq.budget_min)) : "—"} -{" "}
														{enq.budget_max != null ? formatCurrency(Number(enq.budget_max)) : "—"}
													</>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell className="text-xs text-zinc-700">
												{enq.assigned_advisor_id ? advisorById.get(enq.assigned_advisor_id) ?? "—" : "Unassigned"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Building2 className="h-4 w-4 text-zinc-400" />
													<span className="text-xs text-zinc-700 truncate max-w-[150px]">
														{enq.project_name || "—"}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2 text-xs text-zinc-700 font-mono">
													<Calendar className="h-4 w-4 text-zinc-400" />
													{String(enq.created_at).slice(0, 10)}
												</div>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						{/* Pagination footer */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between border-t border-zinc-100 p-4">
								<div className="text-xs text-zinc-500">
									Showing {(page - 1) * pageSize + 1} to{" "}
									{Math.min(page * pageSize, total)} of {total} entries
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
									>
										<ChevronLeft className="h-4 w-4 mr-1" />
										Previous
									</Button>
									<div className="text-sm font-medium px-4">
										Page {page} of {totalPages}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page === totalPages}
									>
										Next
										<ChevronRight className="h-4 w-4 ml-1" />
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			<EnquiryCreateModal
				open={createOpen}
				onOpenChange={setCreateOpen}
				projects={projects}
				advisors={advisors}
			/>

			<EnquiryTempCustomersModal
				open={tempCustomersOpen}
				onOpenChange={setTempCustomersOpen}
			/>

			<LeadDetailDrawer
				open={selectedLead !== null}
				onClose={() => setSelectedLead(null)}
				enquiry={selectedLead}
				projects={projects}
				advisors={advisors}
				onUpdated={() => {
					refetch();
					refetchPipeline();
				}}
			/>
		</div>
	);
}
