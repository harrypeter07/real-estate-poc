"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { HrAttendanceUpload, type HrAttendanceUploadResult } from "@/components/hr/hr-attendance-upload";
import {
	HrAttendanceRecordsView,
	mapDbRowsToAttendanceVM,
} from "@/components/hr/hr-attendance-records-view";

export function HrAttendanceClient({ initialRows }: { initialRows: any[] }) {
	const [lastImport, setLastImport] = useState<Pick<HrAttendanceUploadResult, "inserted" | "parsed" | "errors"> | null>(
		null
	);

	const vm = useMemo(() => mapDbRowsToAttendanceVM(initialRows), [initialRows]);

	return (
		<div className="mx-auto w-full max-w-full min-w-0 space-y-8 px-4 md:px-0">
			<PageHeader
				title="Attendance"
				action={
					<div className="flex flex-wrap gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link href="/hr">Back</Link>
						</Button>
						<HrAttendanceUpload
							onComplete={(r) => {
								setLastImport({
									inserted: r.inserted,
									parsed: r.parsed,
									errors: r.errors,
								});
							}}
						/>
					</div>
				}
			/>

			{lastImport && (
				<Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
					<CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
						<Badge className="bg-emerald-600">Saved</Badge>
						<span>
							Inserted <strong>{lastImport.inserted}</strong> of {lastImport.parsed} parsed rows
						</span>
						{lastImport.errors.length > 0 && (
							<span className="text-amber-800 dark:text-amber-200">
								· {lastImport.errors.length} message(s) — check upload panel if you re-import
							</span>
						)}
					</CardContent>
				</Card>
			)}

			<HrAttendanceRecordsView records={vm} title="Saved attendance" showFilters />
		</div>
	);
}
