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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
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

const getInitials = (name: string) => {
	const parts = (name || "").trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return "👤";
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
	return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarGradient = (name: string) => {
	const code = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const gradients = [
		"from-blue-500 to-indigo-500 text-blue-100",
		"from-emerald-500 to-teal-500 text-emerald-100",
		"from-violet-500 to-purple-500 text-violet-100",
		"from-amber-500 to-orange-500 text-amber-100",
		"from-rose-500 to-pink-500 text-rose-100",
		"from-sky-500 to-cyan-500 text-sky-100",
	];
	return gradients[code % gradients.length];
};

const getStageColorMeta = (st: string) => {
	switch (st) {
		case "new":
			return { border: "border-t-blue-500", bg: "bg-blue-50/20", text: "text-blue-700", icon: Clock3 };
		case "contacted":
			return { border: "border-t-teal-500", bg: "bg-teal-50/20", text: "text-teal-700", icon: CheckCircle2 };
		case "follow_up":
			return { border: "border-t-amber-500", bg: "bg-amber-50/20", text: "text-amber-700", icon: Clock3 };
		case "site_visit":
			return { border: "border-t-indigo-500", bg: "bg-indigo-50/20", text: "text-indigo-700", icon: Calendar };
		case "negotiation":
			return { border: "border-t-purple-500", bg: "bg-purple-50/20", text: "text-purple-700", icon: Sparkles };
		case "converted":
			return { border: "border-t-emerald-500", bg: "bg-emerald-50/20", text: "text-emerald-700", icon: UserCheck };
		case "lost":
			return { border: "border-t-red-500", bg: "bg-red-50/20", text: "text-red-700", icon: XCircle };
		default:
			return { border: "border-t-zinc-300", bg: "bg-zinc-50/20", text: "text-zinc-700", icon: Clock3 };
	}
};

import { Search } from "lucide-react";

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

	const getStageEmoji = (st: string) => {
		switch (st) {
			case "new": return "🆕";
			case "contacted": return "📞";
			case "follow_up": return "⏰";
			case "site_visit": return "📅";
			case "negotiation": return "💸";
			case "converted": return "🎉";
			case "lost": return "❌";
			default: return "🗂";
		}
	};

	const pipelineBadge = (st: string) => {
		const base = "px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded-full border transition-all duration-250 hover:scale-[1.02] flex items-center w-fit shadow-xs uppercase";
		switch (st) {
			case "new":
				return { className: `${base} bg-blue-50 text-blue-700 border-blue-200/60`, Icon: Clock3, label: "NEW LEAD" };
			case "contacted":
				return { className: `${base} bg-teal-50 text-teal-700 border-teal-200/60`, Icon: CheckCircle2, label: "CONTACT DONE" };
			case "follow_up":
				return { className: `${base} bg-amber-50 text-amber-800 border-amber-200/60`, Icon: Clock3, label: "FOLLOW-UP" };
			case "site_visit":
				return { className: `${base} bg-indigo-50 text-indigo-700 border-indigo-200/60`, Icon: Calendar, label: "SITE VISIT" };
			case "negotiation":
				return { className: `${base} bg-purple-50 text-purple-700 border-purple-200/60`, Icon: Sparkles, label: "NEGOTIATION" };
			case "converted":
				return { className: `${base} bg-emerald-50 text-emerald-700 border-emerald-200/60`, Icon: UserCheck, label: "CONVERTED" };
			case "lost":
				return { className: `${base} bg-red-50 text-red-700 border-red-200/60`, Icon: XCircle, label: "CLOSED LOST" };
			default:
				return { className: `${base} bg-zinc-100 text-zinc-800 border-zinc-200`, Icon: Clock3, label: st.toUpperCase() };
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
				title={
					<div className="flex items-center gap-2.5">
						<div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(20,184,166,0.25)]">
							<TrendingUp className="h-4.5 w-4.5" />
						</div>
						<span className="font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-transparent">
							CRM Lead Pipeline
						</span>
					</div>
				}
				subtitle={
					<div className="flex items-center gap-2 text-zinc-500 font-medium text-xs mt-1">
						<span className="bg-teal-50 text-teal-700 border border-teal-200/50 px-2 py-0.5 rounded-full font-bold">
							{summaryStats.activeLeads} active leads
						</span>
						<span>•</span>
						<span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2 py-0.5 rounded-full font-bold">
							conversion rate: {summaryStats.conversionRate}%
						</span>
					</div>
				}
				action={
					<div className="flex flex-row items-center gap-2.5 w-full sm:w-auto">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setTempCustomersOpen(true)}
							className="flex-1 sm:flex-initial w-full sm:w-auto h-10 px-3 rounded-2xl text-[11px] min-[360px]:text-xs font-bold border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300 shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer shrink-0 truncate flex items-center justify-center"
						>
							Enquiry Customers
						</Button>
						<Button 
							size="sm" 
							onClick={() => setCreateOpen(true)} 
							className="flex-1 sm:flex-initial w-full sm:w-auto h-10 px-3 bg-gradient-to-r from-teal-600 via-teal-650 to-emerald-600 text-white text-[11px] min-[360px]:text-xs font-black rounded-2xl hover:from-teal-500 hover:via-teal-550 hover:to-emerald-500 border border-teal-500/20 shadow-sm hover:shadow-[0_4px_15px_rgba(13,148,136,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 truncate"
						>
							New Lead / Enquiry
						</Button>
					</div>
				}
			/>

			{/* Analytics Bar */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<Card className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-teal-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-blue-500/10">
							<User className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Active Pipeline</p>
							<p className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">{summaryStats.activeLeads} Leads</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-teal-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-emerald-500/10">
							<TrendingUp className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Conversion Rate</p>
							<p className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">{summaryStats.conversionRate}%</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-teal-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 text-purple-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-purple-500/10">
							<UserCheck className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Converted Deals</p>
							<p className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">{summaryStats.convertedLeads} Deals</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-teal-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-amber-500/10">
							<Building2 className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Pipeline Volume</p>
							<p className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">{formatCurrency(summaryStats.totalBudget)}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters Bar */}
			<div className="flex flex-col lg:flex-row lg:flex-wrap xl:flex-nowrap items-stretch lg:items-center gap-4 bg-gradient-to-r from-white to-zinc-50/30 p-4 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] transition-all duration-300">
				<div className="relative flex-1 min-w-[200px] w-full group">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-all duration-300 group-hover:text-zinc-650 group-focus-within:text-teal-650 group-focus-within:scale-105 pointer-events-none" />
					<Input
						value={query}
						placeholder="Search by name, phone..."
						onChange={(e) => setQuery(e.target.value)}
						className="pl-10 sm:pl-10 h-10 w-full bg-white border-zinc-200/80 rounded-2xl text-xs transition-all duration-300 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] placeholder:text-zinc-400 font-bold focus-visible:ring-offset-0"
					/>
				</div>
				<div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 lg:border-l lg:border-zinc-200 lg:pl-4 w-full lg:w-auto">
					<div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
						<Select
							value={projectFilter}
							onValueChange={(val) => setProjectFilter(val)}
						>
							<SelectTrigger className="h-10 rounded-2xl border-zinc-200/80 bg-white px-4 text-xs font-bold text-zinc-700 w-full sm:w-auto sm:min-w-[165px] shrink-0 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 shadow-sm transition-all duration-300 cursor-pointer">
								<SelectValue placeholder="🏢 All Projects" />
							</SelectTrigger>
							<SelectContent className="rounded-2xl border border-zinc-200/80 bg-white text-xs font-bold shadow-lg">
								<SelectItem value="all">🏢 All Projects</SelectItem>
								{projects.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										📍 {p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={statusFilter}
							onValueChange={(val) => setStatusFilter(val)}
						>
							<SelectTrigger className="h-10 rounded-2xl border-zinc-200/80 bg-white px-4 text-xs font-bold text-zinc-700 w-full sm:w-auto sm:min-w-[145px] shrink-0 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 shadow-sm transition-all duration-300 cursor-pointer">
								<SelectValue placeholder="🗂 All Stages" />
							</SelectTrigger>
							<SelectContent className="rounded-2xl border border-zinc-200/80 bg-white text-xs font-bold shadow-lg">
								<SelectItem value="all">🗂 All Stages</SelectItem>
								{STAGES.map((st) => (
									<SelectItem key={st} value={st}>
										{getStageEmoji(st)} {pipelineLabel(st)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
						<div className="flex items-center p-0.5 bg-zinc-100 rounded-2xl border border-zinc-200/60 shadow-inner shrink-0 w-full sm:w-auto justify-center sm:justify-start">
							<button
								type="button"
								onClick={() => setViewMode("kanban")}
								className={cn(
									"px-3.5 py-1.5 rounded-1.5xl text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 select-none flex-1 sm:flex-initial",
									viewMode === "kanban"
										? "bg-white text-teal-650 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold"
										: "text-zinc-400 hover:text-zinc-650"
								)}
								title="Kanban Board"
							>
								<LayoutGrid className="h-3.5 w-3.5 shrink-0" />
								<span className="hidden sm:inline">Pipeline</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("list")}
								className={cn(
									"px-3.5 py-1.5 rounded-1.5xl text-xs font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 select-none flex-1 sm:flex-initial",
									viewMode === "list"
										? "bg-white text-teal-650 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold"
										: "text-zinc-400 hover:text-zinc-650"
								)}
								title="List view"
							>
								<List className="h-3.5 w-3.5 shrink-0" />
								<span className="hidden sm:inline">Table</span>
							</button>
						</div>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								toast.success("Refreshing...");
								refetch();
								refetchPipeline();
							}}
							className="rounded-2xl h-10 text-xs font-bold border-zinc-200/80 bg-white hover:bg-zinc-50 hover:border-zinc-300 shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 px-4 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto"
						>
							<Sparkles className="h-3.5 w-3.5 text-teal-500 shrink-0" />
							<span>Refresh</span>
						</Button>
					</div>
				</div>
			</div>

			{/* Views */}
			{isLoading ? (
				<TableSkeleton rows={8} />
			) : viewMode === "kanban" ? (
				/* KANBAN BOARD VIEW */
				<div className="flex flex-row gap-4 overflow-x-auto pb-4 items-start select-none scrollbar-thin">
					{STAGES.map((st) => {
						const colData = pipelineData ? pipelineData[st] : { count: 0, totalBudget: 0, leads: [] };
						const leads = colData?.leads || [];
						const meta = getStageColorMeta(st);
						const StageIcon = meta.icon;

						return (
							<div
								key={st}
								onDragOver={handleDragOver}
								onDrop={(e) => handleDrop(e, st)}
								className={cn(
									"rounded-2xl p-4 border border-zinc-200/70 bg-gradient-to-b from-zinc-50 to-zinc-50/10 flex flex-col min-w-[270px] w-[270px] shrink-0 max-h-[75vh] overflow-y-auto shadow-[0_1px_4px_rgba(0,0,0,0.01)] border-t-[4px] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)]",
									meta.border
								)}
							>
								{/* Column header */}
								<div className="flex justify-between items-center mb-3.5 pb-2.5 border-b border-zinc-200/60 shrink-0">
									<div className="flex items-center gap-2 min-w-0">
										<div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-white shadow-xs border", meta.border)}>
											<StageIcon className={cn("h-4 w-4", meta.text)} />
										</div>
										<div className="min-w-0">
											<h3 className="text-xs font-black text-zinc-800 truncate uppercase tracking-wider">
												{pipelineLabel(st)}
											</h3>
											<p className="text-[10px] text-zinc-400 font-extrabold tracking-tight mt-0.5">
												{formatCurrency(colData?.totalBudget || 0)}
											</p>
										</div>
									</div>
									<Badge className="bg-zinc-200/60 hover:bg-zinc-200 text-zinc-700 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-inner shrink-0">
										{colData?.count || 0}
									</Badge>
								</div>

								{/* Cards container */}
								<div className="space-y-2 flex-1 min-h-[150px]">
									{leads.length === 0 ? (
										<div className="border border-dashed border-zinc-200/80 rounded-2xl p-6 text-center bg-zinc-50/40 flex flex-col items-center justify-center min-h-[140px] transition-all duration-300">
											<div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
												<Sparkles className="h-3.5 w-3.5 text-zinc-400" />
											</div>
											<p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">No leads in stage</p>
											<p className="text-[9px] text-zinc-400 mt-1 leading-normal max-w-[130px] mx-auto">
												Move enquiries here to track progress.
											</p>
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
														"bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 active:cursor-grabbing space-y-3 transition-all duration-300 border-zinc-200/80 cursor-grab relative overflow-hidden group",
														lead.follow_up_date
															? isFuture
																? "border-l-4 border-l-emerald-500"
																: "border-l-4 border-l-red-500"
															: "border-l-4 border-l-zinc-200"
													)}
												>
													<div className="flex justify-between items-start gap-2">
														<div className="min-w-0">
															<span className="text-xs font-extrabold text-zinc-900 group-hover:text-teal-650 transition-colors truncate block max-w-[130px]">
																{lead.name}
															</span>
															<p className="text-[10px] font-mono text-zinc-400 mt-0.5 tabular-nums">{lead.phone}</p>
														</div>
														{lead.lead_source && (
															<span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full font-extrabold uppercase border border-teal-100/50 shrink-0">
																{lead.lead_source}
															</span>
														)}
													</div>

													<div className="flex flex-wrap gap-1">
														{lead.property_type && (
															<Badge variant="secondary" className="text-[9px] font-bold bg-zinc-50 border border-zinc-200/50 text-zinc-650 px-1.5 py-0">
																{lead.property_type}
															</Badge>
														)}
														{lead.project_name && (
															<Badge variant="outline" className="text-[9px] font-bold text-zinc-500 px-1.5 py-0 truncate max-w-[120px]">
																🏢 {lead.project_name}
															</Badge>
														)}
													</div>

													<div className="flex justify-between items-center text-[10px] text-zinc-450 border-t border-zinc-100/60 pt-2.5 mt-1.5">
														<span className="font-extrabold text-zinc-800 font-mono tracking-tight">
															{lead.budget_max ? formatCurrency(lead.budget_max) : "—"}
														</span>
														{lead.follow_up_date && (
															<span className={cn(
																"flex items-center gap-0.5 font-bold text-[9px] px-1.5 py-0.2 rounded-full border shadow-inner",
																isFuture
																	? "bg-emerald-50/50 text-emerald-700 border-emerald-200/40"
																	: "bg-red-50/50 text-red-700 border-red-200/40"
															)}>
																<Calendar className="h-2.5 w-2.5" />
																{lead.follow_up_date.slice(5, 10)}
															</span>
														)}
													</div>

													{lead.assigned_advisor_id && (
														<div className="flex items-center gap-1 pt-1.5 border-t border-dashed border-zinc-100/60 mt-1">
															<div className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[7px] font-black text-white flex items-center justify-center">
																{getInitials(advisorById.get(lead.assigned_advisor_id) ?? "A")}
															</div>
															<span className="text-[9px] text-zinc-500 font-bold truncate max-w-[120px]">
																{advisorById.get(lead.assigned_advisor_id) ?? "—"}
															</span>
														</div>
													)}
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
				<Card className="border border-zinc-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
					<CardContent className="p-0 overflow-x-auto">
						<Table>
							<TableHeader className="bg-zinc-50/80 border-b border-zinc-100">
								<TableRow className="hover:bg-transparent">
									<TableHead className="font-semibold text-zinc-700 py-3.5 pl-4">Customer</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5">Requirements</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5">Pipeline Status</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5 text-right">Budget</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5">Advisor</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5">Project</TableHead>
									<TableHead className="font-semibold text-zinc-700 py-3.5">Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{enquiries.length === 0 ? (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={7} className="text-center text-zinc-500 py-12">
											No enquiries found.
										</TableCell>
									</TableRow>
								) : (
									enquiries.map((enq: any) => (
										<TableRow
											key={enq.id}
											className="group hover:bg-teal-50/15 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]"
											onClick={() => setSelectedLead(enq)}
										>
											<TableCell className="border-l-[3px] border-l-transparent group-hover:border-l-teal-650 transition-all duration-200 pl-4 py-3.5">
												<div className="flex items-center gap-3">
													<div className={cn(
														"h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-black shadow-inner shrink-0",
														getAvatarGradient(enq.name)
													)}>
														{getInitials(enq.name)}
													</div>
													<div className="min-w-0">
														<div className="font-bold text-sm text-zinc-950 truncate group-hover:text-teal-950 transition-colors">{enq.name}</div>
														<div className="text-[10px] text-zinc-450 font-mono mt-0.5 tabular-nums">{enq.phone}</div>
														{enq.email_id && (
															<div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{enq.email_id}</div>
														)}
													</div>
												</div>
											</TableCell>
											<TableCell className="py-3.5">
												<div className="flex flex-col gap-1">
													<div className="flex flex-wrap gap-1">
														{enq.property_type && (
															<Badge variant="secondary" className="text-[9px] font-bold bg-zinc-50 border border-zinc-200/50 text-zinc-650 px-1.5 py-0">
																{enq.property_type}
															</Badge>
														)}
														{enq.segment && (
															<Badge variant="outline" className="text-[9px] font-bold text-zinc-500 px-1.5 py-0">
																{enq.segment}
															</Badge>
														)}
													</div>
													<div className="text-xs text-zinc-500 truncate max-w-[180px] font-medium mt-0.5">
														{enq.bhk_size_requirement ?? enq.details ?? "—"}
													</div>
												</div>
											</TableCell>
											<TableCell className="py-3.5">
												{(() => {
													const badgeMeta = pipelineBadge(enq.pipeline_stage || "new");
													const Icon = badgeMeta.Icon;
													return (
														<div className={badgeMeta.className}>
															<Icon className="h-3 w-3 mr-1" />
															<span>{badgeMeta.label}</span>
														</div>
													);
												})()}
											</TableCell>
											<TableCell className="text-xs text-zinc-800 font-bold whitespace-nowrap py-3.5 text-right font-mono">
												{enq.budget_min != null || enq.budget_max != null ? (
													<>
														{enq.budget_min != null ? formatCurrency(Number(enq.budget_min)) : "—"} -{" "}
														{enq.budget_max != null ? formatCurrency(Number(enq.budget_max)) : "—"}
													</>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell className="py-3.5">
												{enq.assigned_advisor_id ? (
													<div className="flex items-center gap-1.5 bg-zinc-100/60 border border-zinc-200/50 px-2 py-0.5 rounded-full w-fit">
														<div className="h-4.5 w-4.5 rounded-full bg-indigo-500 text-[8px] font-black text-white flex items-center justify-center shadow-inner">
															{getInitials(advisorById.get(enq.assigned_advisor_id) ?? "A")}
														</div>
														<span className="text-xs text-zinc-700 font-bold max-w-[110px] truncate">
															{advisorById.get(enq.assigned_advisor_id) ?? "—"}
														</span>
													</div>
												) : (
													<span className="text-xs text-zinc-400 font-bold pl-1">Unassigned</span>
												)}
											</TableCell>
											<TableCell className="py-3.5">
												<div className="flex items-center gap-2">
													<div className="h-6 w-6 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center shrink-0 border border-teal-100/50">
														<Building2 className="h-3.5 w-3.5" />
													</div>
													<span className="text-xs font-bold text-zinc-700 truncate max-w-[130px] group-hover:text-teal-700 transition-colors">
														{enq.project_name || "—"}
													</span>
												</div>
											</TableCell>
											<TableCell className="py-3.5">
												<div className="flex items-center gap-1.5 text-xs text-zinc-700 font-mono">
													<Calendar className="h-3.5 w-3.5 text-zinc-400" />
													<span>{String(enq.created_at).slice(0, 10)}</span>
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
								<div className="text-xs text-zinc-500 font-bold">
									Showing {(page - 1) * pageSize + 1} to{" "}
									{Math.min(page * pageSize, total)} of {total} entries
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
										className="rounded-xl border-zinc-200 font-bold h-8 px-3 text-xs shadow-xs"
									>
										<ChevronLeft className="h-4 w-4 mr-1" />
										Previous
									</Button>
									<div className="text-xs font-black text-zinc-600 px-3">
										Page {page} of {totalPages}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page === totalPages}
										className="rounded-xl border-zinc-200 font-bold h-8 px-3 text-xs shadow-xs"
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
