"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, Users, IndianRupee, Award } from "lucide-react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { ProjectAdvisorAssignments } from "./project-advisor-assignments";
import type { AdvisorProjectAssignment } from "@/app/actions/advisor-projects";
import { formatCurrencyShort } from "@/lib/utils/formatters";

type Advisor = { id: string; name: string; code: string; phone: string; parent_advisor_id?: string | null };

export function ProjectAdvisorAssignmentsModal({
	projectId,
	advisors,
	assignments,
	minPlotRatePerSqft,
}: {
	projectId: string;
	advisors: Advisor[];
	assignments: AdvisorProjectAssignment[];
	/** Minimum admin plot rate (₹/sqft) in this project — used to preview advisor share. */
	minPlotRatePerSqft: number;
}) {
	const [open, setOpen] = useState(false);

	const totalAssigned = assignments.length;
	const avgSellingPrice = useMemo(() => {
		if (totalAssigned === 0) return 0;
		return assignments.reduce((sum, a) => sum + Number((a as any).commission_rate ?? 0), 0) / totalAssigned;
	}, [assignments, totalAssigned]);

	const highestAssignment = useMemo(() => {
		if (totalAssigned === 0) return null;
		return assignments.reduce((prev, current) => 
			Number((current as any).commission_rate ?? 0) > Number((prev as any).commission_rate ?? 0) ? current : prev, 
			assignments[0]
		);
	}, [assignments, totalAssigned]);

	return (
		<>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1 flex-1">
					<p className="text-sm font-semibold text-zinc-800">
						Assign Advisors & Selling Price
					</p>
					<p className="text-xs text-zinc-500">
						Set the advisor selling price per sqft for this project (editable per sale later).
					</p>
					
					{/* Summary Pills */}
					<div className="flex flex-wrap gap-2 pt-2">
						<div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/50 border border-indigo-100/30 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/30 shadow-sm transition-all duration-200 hover:bg-indigo-50">
							<Users className="h-3 w-3" />
							<span>{totalAssigned} Assigned {totalAssigned === 1 ? "Advisor" : "Advisors"}</span>
						</div>
						
						<div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/50 border border-emerald-100/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30 shadow-sm transition-all duration-200 hover:bg-emerald-50">
							<IndianRupee className="h-3 w-3" />
							<span>Avg Selling Price: {formatCurrencyShort(avgSellingPrice)}/sqft</span>
						</div>
						
						{highestAssignment && (
							<div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/50 border border-amber-100/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30 shadow-sm transition-all duration-200 hover:bg-amber-50">
								<Award className="h-3 w-3" />
								<span>Highest: {highestAssignment.advisor?.name || "Advisor"} ({formatCurrencyShort(Number((highestAssignment as any).commission_rate ?? 0))}/sqft)</span>
							</div>
						)}
					</div>
				</div>
				
				<Button 
					size="sm" 
					variant="outline" 
					onClick={() => setOpen(true)}
					className="group shrink-0 h-9 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-1px_rgba(0,0,0,0.05),0_0_12px_rgba(0,0,0,0.02)] hover:border-zinc-300 hover:bg-zinc-50 active:translate-y-0 text-xs font-medium"
				>
					<SlidersHorizontal className="h-3.5 w-3.5 mr-2 group-hover:rotate-12 transition-transform duration-200 text-zinc-500" />
					Manage
				</Button>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-4xl flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>Advisor Assignment & Selling Prices</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} className="shrink-0 w-fit">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
						<ProjectAdvisorAssignments
							projectId={projectId}
							advisors={advisors}
							assignments={assignments}
							minPlotRatePerSqft={minPlotRatePerSqft}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}


