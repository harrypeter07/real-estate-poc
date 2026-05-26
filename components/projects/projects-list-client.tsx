"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Search,
	Pencil,
	Trash2,
	MapPin,
	ExternalLink,
	Plus,
	AlertTriangle,
	Loader2,
	Check,
	ChevronDown,
} from "lucide-react";
import {
	Button,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Badge,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { deleteProject } from "@/app/actions/project-actions";
import { formatCurrency } from "@/lib/utils/formatters";

interface Project {
	id: string;
	name: string;
	code: string | null;
	project_type: string | null;
	location: string | null;
	starting_price: number | null;
	status: string | null;
}

interface ProjectsListClientProps {
	projects: Project[];
}

const statusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
	Upcoming: { 
		label: "Upcoming", 
		dotClass: "bg-blue-500 dark:bg-blue-400",
		badgeClass: "bg-blue-50/80 text-blue-700 border-blue-200/60 shadow-[0_0_8px_rgba(59,130,246,0.06)] dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40"
	},
	Active: { 
		label: "Active", 
		dotClass: "bg-emerald-500 dark:bg-emerald-400 animate-pulse",
		badgeClass: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60 shadow-[0_0_8px_rgba(16,185,129,0.06)] dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40"
	},
	Hold: { 
		label: "Hold", 
		dotClass: "bg-amber-500 dark:bg-amber-400",
		badgeClass: "bg-amber-50/80 text-amber-700 border-amber-200/60 shadow-[0_0_8px_rgba(245,158,11,0.06)] dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40"
	},
	Completed: { 
		label: "Completed", 
		dotClass: "bg-zinc-500 dark:bg-zinc-400",
		badgeClass: "bg-zinc-50/80 text-zinc-700 border-zinc-200/60 shadow-[0_0_8px_rgba(113,113,122,0.06)] dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800/40"
	},
	"Sold Out": { 
		label: "Sold Out", 
		dotClass: "bg-rose-500 dark:bg-rose-400",
		badgeClass: "bg-rose-50/80 text-rose-700 border-rose-200/60 shadow-[0_0_8px_rgba(244,63,94,0.06)] dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40"
	},
};

export function ProjectsListClient({ projects }: ProjectsListClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
	const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
	
	const statusRef = useRef<HTMLDivElement>(null);
	const typeRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
				setStatusDropdownOpen(false);
			}
			if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
				setTypeDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const typeOptions = [
		{ 
			value: "all", 
			label: "All Types", 
			icon: "📁",
			hoverClass: "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200 hover:border-l-zinc-500",
			selectedClass: "bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-l-zinc-500"
		},
		{ 
			value: "Plot", 
			label: "Plot", 
			icon: "📦",
			hoverClass: "hover:bg-purple-50/80 dark:hover:bg-purple-950/20 text-purple-800 dark:text-purple-400 hover:border-l-purple-500",
			selectedClass: "bg-purple-50/80 dark:bg-purple-950/20 text-purple-800 dark:text-purple-400 border-l-purple-500"
		},
		{ 
			value: "Flat", 
			label: "Flat", 
			icon: "🏢",
			hoverClass: "hover:bg-orange-50/80 dark:hover:bg-orange-950/20 text-orange-800 dark:text-orange-400 hover:border-l-orange-500",
			selectedClass: "bg-orange-50/80 dark:bg-orange-950/20 text-orange-800 dark:text-orange-400 border-l-orange-500"
		},
		{ 
			value: "Row House", 
			label: "Row House", 
			icon: "🏘",
			hoverClass: "hover:bg-indigo-50/80 dark:hover:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 hover:border-l-indigo-500",
			selectedClass: "bg-indigo-50/80 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-l-indigo-500"
		},
		{ 
			value: "Farm House", 
			label: "Farm House", 
			icon: "🌿",
			hoverClass: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 hover:border-l-emerald-500",
			selectedClass: "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-l-emerald-500"
		},
		{ 
			value: "Commercial", 
			label: "Commercial", 
			icon: "🏬",
			hoverClass: "hover:bg-blue-50/80 dark:hover:bg-blue-950/20 text-blue-800 dark:text-blue-400 hover:border-l-blue-500",
			selectedClass: "bg-blue-50/80 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border-l-blue-500"
		}
	];

	const statusOptions = [
		{ 
			value: "all", 
			label: "All Statuses", 
			icon: "📁",
			hoverClass: "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200 hover:border-l-zinc-500",
			selectedClass: "bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-l-zinc-500"
		},
		{ 
			value: "Upcoming", 
			label: "Upcoming", 
			icon: "🔵",
			hoverClass: "hover:bg-blue-50/80 dark:hover:bg-blue-950/20 text-blue-800 dark:text-blue-400 hover:border-l-blue-500",
			selectedClass: "bg-blue-50/80 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border-l-blue-500"
		},
		{ 
			value: "Active", 
			label: "Active", 
			icon: "🟢",
			hoverClass: "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 hover:border-l-emerald-500",
			selectedClass: "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-l-emerald-500"
		},
		{ 
			value: "Hold", 
			label: "Hold", 
			icon: "🟡",
			hoverClass: "hover:bg-amber-50/80 dark:hover:bg-amber-950/20 text-amber-800 dark:text-amber-400 hover:border-l-amber-500",
			selectedClass: "bg-amber-50/80 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-l-amber-500"
		},
		{ 
			value: "Completed", 
			label: "Completed", 
			icon: "⚪",
			hoverClass: "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200 hover:border-l-zinc-500",
			selectedClass: "bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-l-zinc-500"
		},
		{ 
			value: "Sold Out", 
			label: "Sold Out", 
			icon: "🔴",
			hoverClass: "hover:bg-rose-50/80 dark:hover:bg-rose-950/20 text-rose-800 dark:text-rose-400 hover:border-l-rose-500",
			selectedClass: "bg-rose-50/80 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-l-rose-500"
		}
	];

	const currentTypeOpt = typeOptions.find(o => o.value === typeFilter) || typeOptions[0];
	const currentStatusOpt = statusOptions.find(o => o.value === statusFilter) || statusOptions[0];

	const projectTypes = useMemo(() => {
		const types = new Set<string>();
		projects.forEach((p) => {
			if (p.project_type) types.add(p.project_type);
		});
		return Array.from(types);
	}, [projects]);

	const filteredProjects = useMemo(() => {
		return projects.filter((project) => {
			const matchesSearch =
				project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(project.code ?? "").toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesStatus =
				statusFilter === "all" || project.status === statusFilter;

			const matchesType =
				typeFilter === "all" || project.project_type === typeFilter;

			return matchesSearch && matchesStatus && matchesType;
		});
	}, [projects, searchQuery, statusFilter, typeFilter]);

	const handleDelete = async () => {
		if (!deleteId) return;
		setDeleting(true);
		try {
			const res = await deleteProject(deleteId);
			if (res.success) {
				toast.success("Project deleted successfully");
				setDeleteId(null);
				router.refresh();
			} else {
				toast.error(res.error ?? "Failed to delete project");
			}
		} catch (error) {
			toast.error("An error occurred while deleting the project");
		} finally {
			setDeleting(false);
		}
	};

	const renderProjectType = (type: string | null) => {
		if (!type) return <span className="text-zinc-400 dark:text-zinc-650">—</span>;
		
		const lowerType = type.toLowerCase();
		if (lowerType.includes("farm")) {
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/50 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/40 shrink-0">
					<span className="text-xs shrink-0">🌿</span>
					<span>{type}</span>
				</span>
			);
		}
		
		if (lowerType.includes("plot")) {
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40 shrink-0">
					<span className="text-xs shrink-0">📦</span>
					<span>{type}</span>
				</span>
			);
		}

		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-700 border border-zinc-200/50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800/40 shrink-0">
				<span className="text-xs shrink-0">📁</span>
				<span>{type}</span>
			</span>
		);
	};

	return (
		<div className="space-y-6">
			{/* Filters toolbar */}
			<div className="flex flex-col lg:flex-row gap-4 bg-gradient-to-r from-white to-zinc-50/30 dark:from-zinc-950 dark:to-zinc-900/10 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] transition-all duration-300">
				<div className="relative flex-1 group">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-all duration-300 group-hover:text-zinc-650 group-focus-within:text-teal-650 group-focus-within:scale-105" />
					<Input
						placeholder="Search by name or code..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10 sm:pl-10 h-10 w-full bg-white dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl text-xs transition-all duration-300 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-bold focus-visible:ring-offset-0"
					/>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:border-l lg:border-zinc-200 lg:dark:border-zinc-800 lg:pl-4">
					{/* All Statuses Custom Dropdown */}
					<div ref={statusRef} className="relative flex-1 sm:flex-none">
						<button
							type="button"
							onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
							className="h-10 w-full sm:w-[170px] px-4 py-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 hover:shadow-sm transition-all duration-200 cursor-pointer select-none text-left"
						>
							<span className="flex items-center gap-2">
								<span className="text-[12px] shrink-0">{currentStatusOpt.icon}</span>
								<span className="truncate">{currentStatusOpt.label}</span>
							</span>
							<ChevronDown className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${statusDropdownOpen ? "rotate-180 text-teal-500" : ""}`} />
						</button>

						{statusDropdownOpen && (
							<div className="absolute left-0 mt-2 w-full sm:w-[200px] bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 origin-top-left transform scale-100 transition-all duration-150 animate-in fade-in-0 zoom-in-95">
								{statusOptions.map((option) => {
									const isSelected = statusFilter === option.value;
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => {
												setStatusFilter(option.value);
												setStatusDropdownOpen(false);
											}}
											className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold tracking-wide border-l-2 flex items-center justify-between transition-all duration-150 select-none ${
												isSelected 
													? `${option.hoverClass} ${option.selectedClass} font-bold`
													: "border-l-transparent text-zinc-650 dark:text-zinc-300 hover:border-l-current " + option.hoverClass
											}`}
										>
											<span className="flex items-center gap-2.5">
												<span className={`text-sm shrink-0 transition-transform duration-200 ${isSelected ? "scale-110" : "opacity-80"}`}>{option.icon}</span>
												<span>{option.label}</span>
											</span>
											{isSelected && (
												<Check className="h-3.5 w-3.5 text-current shrink-0 animate-in fade-in zoom-in-90 duration-200" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* All Types Custom Dropdown */}
					<div ref={typeRef} className="relative flex-1 sm:flex-none">
						<button
							type="button"
							onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
							className="h-10 w-full sm:w-[170px] px-4 py-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 hover:shadow-sm transition-all duration-200 cursor-pointer select-none text-left"
						>
							<span className="flex items-center gap-2">
								<span className="text-[12px] shrink-0">{currentTypeOpt.icon}</span>
								<span className="truncate">{currentTypeOpt.label}</span>
							</span>
							<ChevronDown className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${typeDropdownOpen ? "rotate-180 text-teal-500" : ""}`} />
						</button>

						{typeDropdownOpen && (
							<div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-[200px] bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 origin-top-right transform scale-100 transition-all duration-150 animate-in fade-in-0 zoom-in-95">
								{typeOptions.map((option) => {
									const isSelected = typeFilter === option.value;
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => {
												setTypeFilter(option.value);
												setTypeDropdownOpen(false);
											}}
											className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold tracking-wide border-l-2 flex items-center justify-between transition-all duration-150 select-none ${
												isSelected 
													? `${option.hoverClass} ${option.selectedClass} font-bold`
													: "border-l-transparent text-zinc-650 dark:text-zinc-300 hover:border-l-current " + option.hoverClass
											}`}
										>
											<span className="flex items-center gap-2.5">
												<span className={`text-sm shrink-0 transition-transform duration-200 ${isSelected ? "scale-110" : "opacity-80"}`}>{option.icon}</span>
												<span>{option.label}</span>
											</span>
											{isSelected && (
												<Check className="h-3.5 w-3.5 text-current shrink-0 animate-in fade-in zoom-in-90 duration-200" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Desktop Projects Table (hidden on mobile/tablet) */}
			<div className="hidden md:block rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
				<Table>
					<TableHeader className="bg-zinc-50/75 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-10 backdrop-blur-sm">
						<TableRow className="hover:bg-transparent border-none">
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5">Project Name</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5">Code</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5">Type</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5">Location</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5 text-right">Starting Price</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5">Status</TableHead>
							<TableHead className="text-zinc-800 dark:text-zinc-200 font-bold text-[10px] tracking-wider uppercase py-3.5 px-5 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredProjects.map((project) => {
							const statusInfo = statusConfig[project.status ?? "Active"] ?? {
								label: project.status ?? "Active",
								dotClass: "bg-zinc-500 dark:bg-zinc-400",
								badgeClass: "bg-zinc-50 text-zinc-700 border-zinc-200",
							};

							return (
								<TableRow 
									key={project.id} 
									className="group hover:bg-teal-50/[0.03] dark:hover:bg-teal-950/[0.015] hover:shadow-[0_2px_8px_-3px_rgba(20,184,166,0.06)] transition-all duration-200"
								>
									<TableCell className="relative font-bold text-zinc-900 dark:text-zinc-100 py-4 px-5 overflow-hidden">
										{/* Premium Left Teal Accent Line on Row Hover */}
										<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
										<Link href={`/projects/${project.id}`} className="relative z-10 hover:text-teal-600 transition-colors">
											{project.name}
										</Link>
									</TableCell>
									<TableCell className="py-4 px-5">
										<span className="font-mono text-[11px] font-semibold text-zinc-500 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/60 px-2 py-0.5 rounded-md">
											{project.code ?? "—"}
										</span>
									</TableCell>
									<TableCell className="py-4 px-5">
										{renderProjectType(project.project_type)}
									</TableCell>
									<TableCell className="py-4 px-5">
										<div className="flex items-center gap-1.5" title={project.location ?? "No location specified"}>
											<MapPin className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
											<span className="truncate max-w-[150px] text-xs font-semibold text-zinc-500 dark:text-zinc-400">
												{project.location ?? "—"}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100 py-4 px-5">
										{project.starting_price && project.starting_price > 0
											? formatCurrency(project.starting_price)
											: "—"}
									</TableCell>
									<TableCell className="py-4 px-5">
										<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.badgeClass}`}>
											<span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
											{statusInfo.label}
										</span>
									</TableCell>
									<TableCell className="text-right py-4 px-5">
										<div className="flex justify-end items-center gap-1.5">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950/30 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-200"
												title="View Details"
												asChild
											>
												<Link href={`/projects/${project.id}`}>
													<ExternalLink className="h-4 w-4" />
												</Link>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-teal-950/30 text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 hover:shadow-[0_0_10px_rgba(20,184,166,0.12)] hover:-translate-y-0.5 transition-all duration-200"
												title="Edit"
												asChild
											>
												<Link href={`/projects/${project.id}/edit`}>
													<Pencil className="h-4 w-4" />
												</Link>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.12)] hover:-translate-y-0.5 transition-all duration-200"
												onClick={() => setDeleteId(project.id)}
												title="Delete"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
						{filteredProjects.length === 0 && (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={7} className="h-72 text-center p-0">
									<div className="flex flex-col items-center justify-center p-12">
										<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 border border-zinc-200/50 dark:border-zinc-850 mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
											<Search className="h-6 w-6 text-zinc-400" />
										</div>
										<h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">No matching projects</h3>
										<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px]">
											We couldn't find any projects matching "{searchQuery}" or the selected status/type filters.
										</p>
										<Button 
											variant="outline" 
											size="sm" 
											onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); }}
											className="mt-4 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150"
										>
											Clear Filters
										</Button>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Mobile/Tablet Card Grid (visible on mobile/tablet, hidden on desktop) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
				{filteredProjects.map((project) => {
					const statusInfo = statusConfig[project.status ?? "Active"] ?? {
						label: project.status ?? "Active",
						dotClass: "bg-zinc-500 dark:bg-zinc-400",
						badgeClass: "bg-zinc-50 text-zinc-700 border-zinc-200/60 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800/40",
					};

					return (
						<div 
							key={project.id}
							className="relative group bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:shadow-md hover:border-teal-500/20 transition-all duration-200 flex flex-col justify-between overflow-hidden"
						>
							{/* Subtle teal left accent border on card hover */}
							<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />

							<div>
								{/* Header of card: Name and Code */}
								<div className="flex items-start justify-between gap-3 mb-3">
									<div className="min-w-0 flex-1">
										<h4 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight text-sm truncate hover:text-teal-650 transition-colors">
											<Link href={`/projects/${project.id}`}>
												{project.name}
											</Link>
										</h4>
										{project.code && (
											<span className="inline-block font-mono text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 px-1.5 py-0.5 rounded mt-1">
												{project.code}
											</span>
										)}
									</div>
									<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusInfo.badgeClass}`}>
										<span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
										{statusInfo.label}
									</span>
								</div>

								{/* Project Type */}
								<div className="flex flex-wrap gap-2 mb-4">
									{renderProjectType(project.project_type)}
								</div>

								{/* Location and Price Details */}
								<div className="space-y-2.5 py-3 border-t border-b border-zinc-100 dark:border-zinc-900">
									<div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
										<MapPin className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
										<span className="text-xs truncate font-semibold">{project.location ?? "—"}</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Starting Price</span>
										<span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
											{project.starting_price && project.starting_price > 0
												? formatCurrency(project.starting_price)
												: "—"}
										</span>
									</div>
								</div>
							</div>

							{/* Actions Bar */}
							<div className="flex justify-end items-center gap-2 mt-4">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950/30 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-200"
									title="View Details"
									asChild
								>
									<Link href={`/projects/${project.id}`}>
										<ExternalLink className="h-4 w-4" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-teal-50 dark:hover:bg-teal-950/30 text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 hover:shadow-[0_0_10px_rgba(20,184,166,0.12)] hover:-translate-y-0.5 transition-all duration-200"
									title="Edit"
									asChild
								>
									<Link href={`/projects/${project.id}/edit`}>
										<Pencil className="h-4 w-4" />
									</Link>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-lg p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.12)] hover:-translate-y-0.5 transition-all duration-200"
									onClick={() => setDeleteId(project.id)}
									title="Delete"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					);
				})}

				{filteredProjects.length === 0 && (
					<div className="col-span-full py-16 text-center bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col items-center justify-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 border border-zinc-200/50 dark:border-zinc-850 mb-4 shadow-sm">
							<Search className="h-6 w-6 text-zinc-400" />
						</div>
						<h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">No matching projects</h3>
						<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px]">
							We couldn't find any projects matching search criteria.
						</p>
					</div>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			<Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<DialogContent className="sm:max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2.5 text-rose-600 font-bold text-lg">
							<AlertTriangle className="h-5.5 w-5.5" />
							Confirm Deletion
						</DialogTitle>
						<DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
							Are you sure you want to delete this project? This will permanently remove all associated plots and data. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteId(null)}
							disabled={deleting}
							className="rounded-xl px-4 py-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={deleting}
							className="bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl px-4 py-2 flex items-center justify-center"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
