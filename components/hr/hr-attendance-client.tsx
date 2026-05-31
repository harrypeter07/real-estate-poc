"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { HrAttendanceUpload, type HrAttendanceUploadResult } from "@/components/hr/hr-attendance-upload";
import { formatAttendanceSaveBannerSubline } from "@/lib/hr/attendance-save-messages";
import {
	HrAttendanceRecordsView,
	mapDbRowsToAttendanceVM,
} from "@/components/hr/hr-attendance-records-view";
import { HrAttendanceDeleteModal } from "@/components/hr/hr-attendance-delete-modal";
import { HrAttendanceManualModal } from "@/components/hr/hr-attendance-manual-modal";
import type { HrEmployeeRow } from "@/app/actions/hr";

export function HrAttendanceClient({
	initialRows,
	employees,
}: {
	initialRows: any[];
	employees: HrEmployeeRow[];
}) {
	const [lastImport, setLastImport] = useState<
		Pick<HrAttendanceUploadResult, "inserted" | "parsed" | "errors" | "attendanceCreated" | "attendanceUpdated"> | null
	>(null);

	const vm = useMemo(() => mapDbRowsToAttendanceVM(initialRows), [initialRows]);

	return (
		<div className="w-full space-y-6">
			{/* Full-width premium header */}
			<header className="flex flex-col gap-4 border-b border-zinc-150 pb-5">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-black tracking-tight text-zinc-800">Attendance Dashboard</h1>
						<p className="text-xs font-semibold text-zinc-500">
							Monitor daily work durations, manage overtime hours, and upload attendance records.
						</p>
					</div>
					
					{/* Grouped Actions Toolbar */}
					<div className="flex flex-wrap items-center gap-2 sm:self-center">
						<Button asChild variant="ghost" size="sm" className="h-9 px-3 rounded-xl border border-zinc-200 bg-white font-bold hover:bg-zinc-50 hover:text-zinc-900 shadow-3xs transition-all text-xs flex items-center gap-1.5 shrink-0">
							<Link href="/hr">
								<ArrowLeft className="h-3.5 w-3.5" />
								Back
							</Link>
						</Button>
						<HrAttendanceManualModal employees={employees} />
						<HrAttendanceUpload
							onComplete={(r) => {
								setLastImport({
									inserted: r.inserted,
									parsed: r.parsed,
									errors: r.errors,
									attendanceCreated: r.attendanceCreated,
									attendanceUpdated: r.attendanceUpdated,
								});
							}}
						/>
						<HrAttendanceDeleteModal employees={employees} />
					</div>
				</div>
			</header>

			{lastImport && (
				<Card className="border-emerald-100 bg-emerald-50/50 shadow-3xs rounded-2xl overflow-hidden">
					<CardContent className="flex flex-wrap items-center gap-3 py-3 text-xs font-bold text-emerald-800">
						<Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-extrabold rounded-lg flex items-center gap-1">
							<CheckCircle2 className="h-3 w-3" />
							Attendance Saved
						</Badge>
						<div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
							<span>
								Successfully logged <strong>{lastImport.inserted}</strong> of {lastImport.parsed} parsed row
								{lastImport.parsed === 1 ? "" : "s"}
							</span>
							{lastImport.inserted > 0 ? (
								<span className="text-emerald-600/80 text-[11px] font-semibold">
									{formatAttendanceSaveBannerSubline(lastImport)}
								</span>
							) : null}
						</div>
						{lastImport.errors.length > 0 && (
							<span className="text-amber-800/80 font-semibold">
								· {lastImport.errors.length} alert message(s) — review parsed preview details
							</span>
						)}
					</CardContent>
				</Card>
			)}

			<HrAttendanceRecordsView records={vm} title="Saved attendance records" showFilters />
		</div>
	);
}

