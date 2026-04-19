"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { ProjectAdvisorAssignments } from "./project-advisor-assignments";
import type { AdvisorProjectAssignment } from "@/app/actions/advisor-projects";

type Advisor = { id: string; name: string; code: string; phone: string };

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

	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-zinc-700">
						Assign Advisors & Selling Price
					</p>
					<p className="text-xs text-zinc-500">
						Set the advisor selling price per sqft for this project (editable per sale later).
					</p>
				</div>
				<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
					<SlidersHorizontal className="h-4 w-4 mr-2" />
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

