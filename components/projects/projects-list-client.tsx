"use client";

import { useState, useMemo } from "react";
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

const statusConfig: Record<string, { label: string; className: string }> = {
	Upcoming: { label: "Upcoming", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
	Active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
	Hold: { label: "Hold", className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
	Completed: { label: "Completed", className: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
	"Sold Out": { label: "Sold Out", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

export function ProjectsListClient({ projects }: ProjectsListClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

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

	return (
		<div className="space-y-4">
			{/* Filters toolbar */}
			<div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
					<Input
						placeholder="Search by name or code..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-9 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
					>
						<option value="all">All Statuses</option>
						<option value="Upcoming">Upcoming</option>
						<option value="Active">Active</option>
						<option value="Hold">Hold</option>
						<option value="Completed">Completed</option>
						<option value="Sold Out">Sold Out</option>
					</select>

					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value)}
						className="h-9 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
					>
						<option value="all">All Types</option>
						{projectTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Projects Table */}
			<div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 shadow-sm overflow-hidden">
				<Table>
					<TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/30">
						<TableRow>
							<TableHead>Project Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Location</TableHead>
							<TableHead className="text-right">Starting Price</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredProjects.map((project) => {
							const statusInfo = statusConfig[project.status ?? "Active"] ?? {
								label: project.status ?? "Active",
								className: "bg-zinc-100 text-zinc-800 border-zinc-200",
							};

							return (
								<TableRow key={project.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
									<TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
										{project.name}
									</TableCell>
									<TableCell className="font-mono text-xs text-zinc-500">
										{project.code ?? "—"}
									</TableCell>
									<TableCell className="text-zinc-650 dark:text-zinc-350">
										{project.project_type ?? "—"}
									</TableCell>
									<TableCell className="text-zinc-650 dark:text-zinc-350">
										<div className="flex items-center gap-1">
											<MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
											<span className="truncate max-w-[150px]">{project.location ?? "—"}</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium text-zinc-900 dark:text-zinc-100">
										{project.starting_price && project.starting_price > 0
											? formatCurrency(project.starting_price)
											: "—"}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className={statusInfo.className}>
											{statusInfo.label}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
												onClick={() => router.push(`/projects/${project.id}`)}
												title="View Details"
											>
												<ExternalLink className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
												onClick={() => router.push(`/projects/${project.id}/edit`)}
												title="Edit"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-600"
												onClick={() => setDeleteId(project.id)}
												title="Delete"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
						{filteredProjects.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} className="h-32 text-center text-zinc-500">
									No projects match your search filters.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Delete Confirmation Modal */}
			<Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-rose-600">
							<AlertTriangle className="h-5 w-5" />
							Confirm Deletion
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this project? This will permanently remove all associated plots and data. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-4 flex gap-2 justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteId(null)}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={deleting}
							className="bg-rose-600 text-white hover:bg-rose-700"
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
