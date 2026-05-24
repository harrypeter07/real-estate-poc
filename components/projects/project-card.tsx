"use client";

import { useRouter } from "next/navigation";
import {
	MapPin,
	LayoutGrid,
	IndianRupee,
	ArrowRight,
	Pencil,
	Ruler,
	BadgeCheck,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	Button,
	Badge,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import type { PlotStatusCounts } from "@/app/actions/project-actions";

interface ProjectCardProps {
	id: string;
	name: string;
	location: string | null;
	total_plots_count: number;
	layout_expense: number | null;
	plotCounts: PlotStatusCounts;
	available_area_sqft?: number;
	sold_area_sqft?: number;
	/** @deprecated duplicate of available; use total_area_sqft + available + booked */
	left_area_sqft?: number;
	total_area_sqft?: number;
	status?: string | null;
	project_type?: string | null;
	starting_price?: number | null;
}

const statusConfig = {
	available: {
		label: "Available",
		className: "bg-green-100 text-green-800 hover:bg-green-100",
	},
	token: {
		label: "Token",
		className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
	},
	agreement: {
		label: "Agreement",
		className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
	},
	sold: {
		label: "Sold",
		className: "bg-red-100 text-red-800 hover:bg-red-100",
	},
};

const projectStatusConfig: Record<string, { label: string; className: string }> = {
	Upcoming: { label: "Upcoming", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
	Active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
	Hold: { label: "Hold", className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
	Completed: { label: "Completed", className: "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
	"Sold Out": { label: "Sold Out", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

export function ProjectCard({
	id,
	name,
	location,
	total_plots_count,
	layout_expense,
	plotCounts,
	available_area_sqft,
	sold_area_sqft,
	left_area_sqft: _leftDup,
	total_area_sqft,
	status,
	project_type,
	starting_price,
}: ProjectCardProps) {
	const router = useRouter();
	const totalArea = Math.round(Number(total_area_sqft ?? 0));
	const availableArea = Math.round(Number(available_area_sqft ?? 0));
	const bookedArea = Math.round(Number(sold_area_sqft ?? 0));

	const activeTotal = plotCounts.available + plotCounts.token + plotCounts.agreement + plotCounts.sold;
	const availablePercent = activeTotal > 0 ? (plotCounts.available / activeTotal) * 100 : 0;
	const tokenPercent = activeTotal > 0 ? (plotCounts.token / activeTotal) * 100 : 0;
	const agreementPercent = activeTotal > 0 ? (plotCounts.agreement / activeTotal) * 100 : 0;
	const soldPercent = activeTotal > 0 ? (plotCounts.sold / activeTotal) * 100 : 0;

	const projectStatus = projectStatusConfig[status ?? "Active"] ?? {
		label: status ?? "Active",
		className: "bg-zinc-100 text-zinc-800 border-zinc-200",
	};

	return (
		<div
			onClick={() => router.push(`/projects/${id}`)}
			className="block h-full cursor-pointer group"
		>
			<Card className="flex flex-col h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-zinc-400">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="space-y-1 min-w-0">
							<div className="flex items-center gap-2">
								<CardTitle className="text-lg truncate">{name}</CardTitle>
								<Badge variant="outline" className={projectStatus.className}>
									{projectStatus.label}
								</Badge>
							</div>
							{location && (
								<div className="flex items-center gap-1 text-sm text-zinc-500">
									<MapPin className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate">{location}</span>
								</div>
							)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={(e) => {
								e.stopPropagation();
								router.push(`/projects/${id}/edit`);
							}}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					</div>
				</CardHeader>

				<CardContent className="flex-1 space-y-4">
					{/* Status badges & Segmented Progress Bar */}
					<div className="space-y-3">
						<div className="flex flex-wrap gap-1.5">
							{(
								Object.keys(statusConfig) as Array<keyof typeof statusConfig>
							).map((status) => {
								const count = plotCounts[status];
								if (count === 0) return null;
								const config = statusConfig[status];
								return (
									<Badge
										key={status}
										variant="secondary"
										className={config.className}
									>
										{config.label}: {count}
									</Badge>
								);
							})}
							{plotCounts.total === 0 && (
								<span className="text-xs text-zinc-400">No plots added yet</span>
							)}
						</div>

						{/* Segmented Progress Bar */}
						{activeTotal > 0 ? (
							<div className="w-full h-1.5 flex rounded-full overflow-hidden bg-zinc-100 gap-[1px]">
								{plotCounts.available > 0 && (
									<div
										className="bg-emerald-500 transition-all duration-300"
										style={{ width: `${availablePercent}%` }}
										title={`Available: ${plotCounts.available}`}
									/>
								)}
								{plotCounts.token > 0 && (
									<div
										className="bg-amber-500 transition-all duration-300"
										style={{ width: `${tokenPercent}%` }}
										title={`Token: ${plotCounts.token}`}
									/>
								)}
								{plotCounts.agreement > 0 && (
									<div
										className="bg-orange-500 transition-all duration-300"
										style={{ width: `${agreementPercent}%` }}
										title={`Agreement: ${plotCounts.agreement}`}
									/>
								)}
								{plotCounts.sold > 0 && (
									<div
										className="bg-rose-500 transition-all duration-300"
										style={{ width: `${soldPercent}%` }}
										title={`Sold: ${plotCounts.sold}`}
									/>
								)}
							</div>
						) : (
							<div className="w-full h-1.5 bg-zinc-100 rounded-full" title="No plots added" />
						)}
					</div>

					{/* Stats details section */}
					<div className="space-y-2 text-xs text-zinc-600 pt-1">
						{/* Total Plots count */}
						<div className="flex items-center gap-2 text-sm text-zinc-600">
							<LayoutGrid className="h-4 w-4 shrink-0 text-zinc-400" />
							<span>{total_plots_count} total plots</span>
						</div>

						{/* Area stats with Ruler icon */}
						{total_plots_count > 0 && (
							<div className="flex items-start gap-2">
								<Ruler className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
								<div className="leading-relaxed">
									<span className="font-semibold text-zinc-700">Area:</span>{" "}
									<span>{totalArea.toLocaleString("en-IN")} sqft total</span>
								</div>
							</div>
						)}

						{/* Booked Inventory with BadgeCheck icon */}
						{total_plots_count > 0 && (
							<div className="flex items-start gap-2">
								<BadgeCheck className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
								<div className="leading-relaxed">
									<span className="font-semibold text-zinc-700">Inventory:</span>{" "}
									<span>
										{availableArea.toLocaleString("en-IN")} sqft unsold ·{" "}
										{bookedArea.toLocaleString("en-IN")} sqft booked
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Layout expense */}
					{layout_expense && layout_expense > 0 ? (
						<div className="flex items-center gap-2 text-sm text-zinc-600 border-t border-zinc-50 pt-3">
							<IndianRupee className="h-4 w-4 shrink-0 text-zinc-400" />
							<span>Layout Expense: {formatCurrency(layout_expense)}</span>
						</div>
					) : null}
				</CardContent>

				<CardFooter className="pt-0 gap-2">
					<Button
						variant="default"
						size="sm"
						className="flex-1"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/projects/${id}/plots`);
						}}
					>
						View Plots
						<ArrowRight className="h-4 w-4 ml-2" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/projects/${id}`);
						}}
					>
						Details
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
