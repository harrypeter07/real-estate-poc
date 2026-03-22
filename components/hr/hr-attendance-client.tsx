"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { HrAttendanceUpload, type HrAttendanceUploadResult } from "@/components/hr/hr-attendance-upload";
import { HrAttendanceTable } from "@/components/hr/hr-attendance-table";
import { formatDate } from "@/lib/utils/formatters";

export function HrAttendanceClient({ initialRows }: { initialRows: any[] }) {
	const [lastUpload, setLastUpload] = useState<HrAttendanceUploadResult | null>(null);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Attendance"
				subtitle="Upload normalized Excel (Employee Code, Date, In, Out, Duration, OT, Type) or Work Duration Report export (Days row + columns)"
				action={
					<div className="flex gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link href="/hr">Back</Link>
						</Button>
						<HrAttendanceUpload onComplete={setLastUpload} />
					</div>
				}
			/>

			{lastUpload && (
				<div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span className="font-medium">Last upload</span>
						<Badge variant="secondary">{lastUpload.format} format</Badge>
						<span className="text-zinc-600 dark:text-zinc-400">
							Parsed: {lastUpload.parsed} · Inserted: {lastUpload.inserted}
						</span>
					</div>
					{lastUpload.errors.length > 0 && (
						<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
							<p className="font-medium">Messages ({lastUpload.errors.length})</p>
							<ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
								{lastUpload.errors.slice(0, 40).map((e, i) => (
									<li key={i}>{e}</li>
								))}
								{lastUpload.errors.length > 40 && (
									<li>…and {lastUpload.errors.length - 40} more</li>
								)}
							</ul>
						</div>
					)}
					{lastUpload.previewRows.length > 0 && (
						<div>
							<p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
								Preview (first {lastUpload.previewRows.length} parsed rows)
							</p>
							<Card>
								<CardContent className="p-0 overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Code</TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>In</TableHead>
												<TableHead>Out</TableHead>
												<TableHead className="text-right">Dur (min)</TableHead>
												<TableHead className="text-right">OT</TableHead>
												<TableHead>Valid</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{lastUpload.previewRows.map((r, idx) => (
												<TableRow key={`${r.employee_code}-${r.work_date}-${idx}`}>
													<TableCell className="font-mono text-xs">{r.employee_code}</TableCell>
													<TableCell className="text-sm">{r.employee_name ?? "—"}</TableCell>
													<TableCell>{formatDate(r.work_date)}</TableCell>
													<TableCell className="font-mono text-xs">{r.in_time ?? "—"}</TableCell>
													<TableCell className="font-mono text-xs">{r.out_time ?? "—"}</TableCell>
													<TableCell className="text-right">{r.duration_minutes ?? "—"}</TableCell>
													<TableCell className="text-right">{r.overtime_minutes ?? 0}</TableCell>
													<TableCell>
														{r.is_valid ? (
															<Badge className="bg-green-100 text-green-800">OK</Badge>
														) : (
															<Badge variant="destructive">Check</Badge>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			)}

			<HrAttendanceTable rows={initialRows} />
		</div>
	);
}
