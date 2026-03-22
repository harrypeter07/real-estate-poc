"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Card,
	CardContent,
	Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";

export function HrAttendanceTable({ rows }: { rows: any[] }) {
	if (!rows.length) {
		return (
			<p className="text-sm text-zinc-500 border border-dashed rounded-lg p-8 text-center">
				No attendance rows. Upload a spreadsheet after creating employees.
			</p>
		);
	}
	return (
		<Card>
			<CardContent className="p-0 overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Employee</TableHead>
							<TableHead>Type</TableHead>
							<TableHead className="text-right">Duration (min)</TableHead>
							<TableHead className="text-right">OT (min)</TableHead>
							<TableHead>Valid</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.id}>
								<TableCell>{formatDate(r.work_date)}</TableCell>
								<TableCell>
									<span className="font-mono text-xs">{r.hr_employees?.employee_code}</span>{" "}
									{r.hr_employees?.name}
								</TableCell>
								<TableCell className="capitalize">{r.attendance_type}</TableCell>
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
	);
}
