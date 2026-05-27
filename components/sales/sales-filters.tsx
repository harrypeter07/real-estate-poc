"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Loader2, Calendar, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const phaseOptions = [
	{ value: "token", label: "Token" },
	{ value: "full_payment", label: "Payment completed (Sold)" },
	{ value: "revoked", label: "Revoked" },
];

export function SalesFilters({
	projects = [],
}: {
	projects?: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const phase = searchParams.get("phase") ?? "all";
	const advisor = searchParams.get("advisor") ?? "";
	const project = searchParams.get("project") ?? "all";
	const sort = searchParams.get("sort") ?? "newest";
	
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);
	const [selectedPhase, setSelectedPhase] = useState(phase);
	const [selectedAdvisor, setSelectedAdvisor] = useState(advisor);
	const [selectedProject, setSelectedProject] = useState(project);
	const [selectedSort, setSelectedSort] = useState(sort);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
		setSelectedPhase(phase);
		setSelectedAdvisor(advisor);
		setSelectedProject(project);
		setSelectedSort(sort);
	}, [from, to, phase, advisor, project, sort]);

	function applyFilters() {
		const params = new URLSearchParams();
		if (customFrom) params.set("from", customFrom);
		if (customTo) params.set("to", customTo);
		if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
		if (selectedAdvisor && selectedAdvisor !== "all") params.set("advisor", selectedAdvisor);
		if (selectedProject && selectedProject !== "all") params.set("project", selectedProject);
		if (selectedSort && selectedSort !== "newest") params.set("sort", selectedSort);
		startTransition(() => {
			router.push(`/sales?${params.toString()}`);
		});
	}

	function clearFilters() {
		setCustomFrom("");
		setCustomTo("");
		setSelectedPhase("all");
		setSelectedProject("all");
		setSelectedSort("newest");
		startTransition(() => {
			router.push("/sales");
		});
	}

	const now = new Date();
	const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const thisMonthEnd = now.toISOString().slice(0, 10);
	const thisYearStart = `${now.getFullYear()}-01-01`;
	const thisYearEnd = thisMonthEnd;

	const isAllTime = !from && !to;
	const isThisMonth = from === thisMonthStart && to === thisMonthEnd;
	const isThisYear = from === thisYearStart && to === thisYearEnd;

	return (
		<div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
			{/* Top row: Period Buttons & Select Dropdowns */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				
				{/* Period buttons group */}
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1.5">
						<Calendar className="h-3.5 w-3.5 text-zinc-400" />
						Period
					</span>
					<div className="bg-zinc-100/80 p-1 rounded-xl flex gap-1 border border-zinc-200/40">
						<button
							type="button"
							onClick={() => {
								setCustomFrom("");
								setCustomTo("");
								setSelectedPhase("all");
								setSelectedProject("all");
								setSelectedSort("newest");
								startTransition(() => {
									router.push("/sales");
								});
							}}
							disabled={isPending}
							className={cn(
								"px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer",
								isAllTime
									? "bg-white text-teal-700 shadow-xs border border-zinc-200/50"
									: "text-zinc-650 hover:text-zinc-900 hover:bg-white/50"
							)}
						>
							All time
						</button>
						<button
							type="button"
							onClick={() => {
								const params = new URLSearchParams();
								params.set("from", thisMonthStart);
								params.set("to", thisMonthEnd);
								if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
								if (selectedAdvisor && selectedAdvisor !== "all") params.set("advisor", selectedAdvisor);
								if (selectedProject && selectedProject !== "all") params.set("project", selectedProject);
								if (selectedSort && selectedSort !== "newest") params.set("sort", selectedSort);
								startTransition(() => {
									router.push(`/sales?${params.toString()}`);
								});
							}}
							disabled={isPending}
							className={cn(
								"px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer",
								isThisMonth
									? "bg-white text-teal-700 shadow-xs border border-zinc-200/50"
									: "text-zinc-650 hover:text-zinc-900 hover:bg-white/50"
							)}
						>
							This month
						</button>
						<button
							type="button"
							onClick={() => {
								const params = new URLSearchParams();
								params.set("from", thisYearStart);
								params.set("to", thisYearEnd);
								if (selectedPhase && selectedPhase !== "all") params.set("phase", selectedPhase);
								if (selectedAdvisor && selectedAdvisor !== "all") params.set("advisor", selectedAdvisor);
								if (selectedProject && selectedProject !== "all") params.set("project", selectedProject);
								if (selectedSort && selectedSort !== "newest") params.set("sort", selectedSort);
								startTransition(() => {
									router.push(`/sales?${params.toString()}`);
								});
							}}
							disabled={isPending}
							className={cn(
								"px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer",
								isThisYear
									? "bg-white text-teal-700 shadow-xs border border-zinc-200/50"
									: "text-zinc-650 hover:text-zinc-900 hover:bg-white/50"
							)}
						>
							This year
						</button>
					</div>
				</div>

				{/* Filters triggers */}
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1.5">
						<Filter className="h-3.5 w-3.5 text-zinc-400" />
						Filters
					</span>
					
					<Select value={selectedPhase} onValueChange={setSelectedPhase}>
						<SelectTrigger className="w-36 h-9 rounded-xl border-zinc-200 bg-white text-xs font-bold focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all focus:ring-offset-0">
							<SelectValue placeholder="Sales Phase" />
						</SelectTrigger>
						<SelectContent className="rounded-xl border-zinc-200 shadow-lg text-xs font-bold">
							<SelectItem value="all" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">All Phases</SelectItem>
							{phaseOptions.map(opt => (
								<SelectItem key={opt.value} value={opt.value} className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">{opt.label}</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={selectedProject} onValueChange={setSelectedProject}>
						<SelectTrigger className="w-40 h-9 rounded-xl border-zinc-200 bg-white text-xs font-bold focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all focus:ring-offset-0">
							<SelectValue placeholder="Project" />
						</SelectTrigger>
						<SelectContent className="rounded-xl border-zinc-200 shadow-lg text-xs font-bold">
							<SelectItem value="all" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">All Projects</SelectItem>
							{projects.map((p) => (
								<SelectItem key={p.id} value={p.id} className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={selectedSort} onValueChange={setSelectedSort}>
						<SelectTrigger className="w-44 h-9 rounded-xl border-zinc-200 bg-white text-xs font-bold focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all focus:ring-offset-0">
							<div className="flex items-center gap-1.5">
								<ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
								<SelectValue placeholder="Sort by" />
							</div>
						</SelectTrigger>
						<SelectContent className="rounded-xl border-zinc-200 shadow-lg text-xs font-bold">
							<SelectItem value="newest" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">Sort: Newest</SelectItem>
							<SelectItem value="oldest" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">Sort: Oldest</SelectItem>
							<SelectItem value="project" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">Sort: Project</SelectItem>
							<SelectItem value="layout" className="rounded-lg focus:bg-teal-50 focus:text-teal-900 font-bold">Sort: Layout (Phase)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Bottom row: Custom Date Range Picker & Action CTA controls */}
			<div className="pt-3 border-t border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-2">Custom range</span>
					<div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200/50">
						<Input
							type="date"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							className="w-34 h-8 text-[11px] font-bold border-zinc-200 bg-white rounded-lg focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
						/>
						<span className="text-[11px] text-zinc-400 font-bold uppercase px-0.5">to</span>
						<Input
							type="date"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							className="w-34 h-8 text-[11px] font-bold border-zinc-200 bg-white rounded-lg focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2.5">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={clearFilters}
						className="h-9 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer px-4"
					>
						Clear
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={applyFilters}
						disabled={isPending}
						className="h-9 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs px-5 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] active:scale-97"
					>
						{isPending ? (
							<span className="flex items-center gap-1.5">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								Applying...
							</span>
						) : (
							"Apply Filters"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
