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
	projectMinPlotRate,
}: {
	projectId: string;
	advisors: Advisor[];
	assignments: AdvisorProjectAssignment[];
	projectMinPlotRate: number;
}) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-zinc-700">
						Assign Advisors & Face Rates
					</p>
					<p className="text-xs text-zinc-500">
						Set Face-wise commission rates per project (₹/sqft).
					</p>
				</div>
				<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
					<SlidersHorizontal className="h-4 w-4 mr-2" />
					Manage
				</Button>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-4xl p-0 overflow-hidden">
					<DialogHeader className="p-5 pb-4 border-b border-zinc-100">
						<DialogTitle>Advisor Assignment & Face Rates</DialogTitle>
					</DialogHeader>
					<div className="p-5">
						<ProjectAdvisorAssignments
							projectId={projectId}
							advisors={advisors}
							assignments={assignments}
							projectMinPlotRate={projectMinPlotRate}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

