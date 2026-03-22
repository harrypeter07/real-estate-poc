"use client";

import { useMemo, useState } from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Calendar } from "lucide-react";
import { Button, Card, CardContent, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatMinutesAsClock } from "@/lib/utils/formatters";

export type AttendanceRecordVM = {
	id: string;
	employeeName: string;
	employeeCode: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	is_valid: boolean;
	error?: string;
};

function displayTime(v: string | null | undefined): string {
	if (v == null || v === "") return "—";
	const s = String(v).trim();
	const m = /^(\d{1,2}:\d{2})/.exec(s);
	return m ? m[1]! : s.slice(0, 8);
}

function hoursLabel(minutes: number): string {
	if (!minutes) return "0h";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

export function mapDbRowsToAttendanceVM(rows: any[]): AttendanceRecordVM[] {
	return rows.map((r) => ({
		id: String(r.id),
		employeeName: r.hr_employees?.name ?? "—",
		employeeCode: String(r.hr_employees?.employee_code ?? "—"),
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes ?? 0,
		is_valid: Boolean(r.is_valid),
	}));
}

export function mapPreviewToAttendanceVM(
	rows: Array<{
		employee_code: string;
		employee_name?: string;
		work_date: string;
		in_time: string | null;
		out_time: string | null;
		duration_minutes: number | null;
		overtime_minutes: number;
		is_valid: boolean;
		error?: string;
	}>
): AttendanceRecordVM[] {
	return rows.map((r, i) => ({
		id: `preview-${i}`,
		employeeName: r.employee_name ?? "—",
		employeeCode: r.employee_code,
		work_date: r.work_date,
		in_time: r.in_time,
		out_time: r.out_time,
		duration_minutes: r.duration_minutes,
		overtime_minutes: r.overtime_minutes ?? 0,
		is_valid: r.is_valid,
		error: r.error,
	}));
}

function SummaryCards({
	records,
}: {
	records: AttendanceRecordVM[];
}) {
	const { employees, totalDur, totalOt, invalidCount } = useMemo(() => {
		const emp = new Set<string>();
		let d = 0;
		let o = 0;
		let inv = 0;
		for (const r of records) {
			emp.add(r.employeeCode);
			d += r.duration_minutes ?? 0;
			o += r.overtime_minutes ?? 0;
			if (!r.is_valid) inv++;
		}
		return { employees: emp.size, totalDur: d, totalOt: o, invalidCount: inv };
	}, [records]);

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-xs font-medium text-muted-foreground">Employees (in view)</p>
					<p className="text-2xl font-semibold tabular-nums">{employees}</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-xs font-medium text-muted-foreground">Total duration</p>
					<p className="text-2xl font-semibold tabular-nums">{hoursLabel(totalDur)}</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4 pb-3">
					<p className="text-xs font-medium text-muted-foreground">Total overtime</p>
					<p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
						{hoursLabel(totalOt)}
					</p>
				</CardContent>
			</Card>
			<Card className={invalidCount > 0 ? "border-red-200 dark:border-red-900" : ""}>
				<CardContent className="pt-4 pb-3">
					<p className="text-xs font-medium text-muted-foreground">Invalid rows</p>
					<p className={`text-2xl font-semibold tabular-nums ${invalidCount ? "text-red-600" : ""}`}>
						{invalidCount}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

export function HrAttendanceRecordsView({
	records,
	title,
	showFilters = true,
}: {
	records: AttendanceRecordVM[];
	title?: string;
	showFilters?: boolean;
}) {
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [sorting, setSorting] = useState<SortingState>([{ id: "work_date", desc: true }]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return records.filter((r) => {
			if (q && !r.employeeName.toLowerCase().includes(q) && !r.employeeCode.toLowerCase().includes(q))
				return false;
			if (from && r.work_date < from) return false;
			if (to && r.work_date > to) return false;
			return true;
		});
	}, [records, search, from, to]);

	const columns = useMemo<ColumnDef<AttendanceRecordVM>[]>(
		() => [
			{
				accessorKey: "employeeName",
				header: ({ column }) => (
					<Button variant="ghost" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
						Employee
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => (
					<div>
						<div className="font-medium">{row.original.employeeName}</div>
						<div className="font-mono text-xs text-muted-foreground">{row.original.employeeCode}</div>
					</div>
				),
			},
			{
				accessorKey: "work_date",
				header: ({ column }) => (
					<Button variant="ghost" className="-ml-3 h-8" onClick={() => column.toggleSorting()}>
						Date
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => {
					try {
						return format(parseISO(row.original.work_date), "dd MMM yyyy");
					} catch {
						return row.original.work_date;
					}
				},
			},
			{
				accessorKey: "in_time",
				header: "In time",
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums">{displayTime(row.original.in_time)}</span>
				),
			},
			{
				accessorKey: "out_time",
				header: "Out time",
				cell: ({ row }) => (
					<span className="font-mono text-xs tabular-nums">{displayTime(row.original.out_time)}</span>
				),
			},
			{
				accessorKey: "duration_minutes",
				header: "Duration",
				cell: ({ row }) => (
					<span className="font-mono text-xs">{formatMinutesAsClock(row.original.duration_minutes)}</span>
				),
			},
			{
				accessorKey: "overtime_minutes",
				header: "Overtime",
				cell: ({ row }) => (
					<span
						className={`font-mono text-xs ${row.original.overtime_minutes > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""}`}
					>
						{formatMinutesAsClock(row.original.overtime_minutes)}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<span
						className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
							row.original.is_valid
								? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
								: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
						}`}
					>
						{row.original.is_valid ? "Valid" : "Invalid"}
					</span>
				),
			},
		],
		[]
	);

	const table = useReactTable({
		data: filtered,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-4">
			{title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
			<SummaryCards records={filtered} />

			{showFilters && (
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
					<div className="flex-1 min-w-[12rem]">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">Search employee</label>
						<Input
							placeholder="Name or code…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="w-full sm:w-40">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
						<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
					</div>
					<div className="w-full sm:w-40">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
						<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
					</div>
				</div>
			)}

			{/* Desktop */}
			<div className="hidden md:block rounded-md border">
				<div className="max-h-[min(70vh,720px)] overflow-auto">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((hg) => (
								<TableRow key={hg.id} className="hover:bg-transparent">
									{hg.headers.map((h) => (
										<TableHead
											key={h.id}
											className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm"
										>
											{flexRender(h.column.columnDef.header, h.getContext())}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length ? (
								table.getRowModel().rows.map((row) => {
									const ot = row.original.overtime_minutes > 0;
									const inv = !row.original.is_valid;
									return (
										<TableRow
											key={row.id}
											className={
												inv
													? "bg-red-50/90 dark:bg-red-950/25"
													: ot
														? "border-l-4 border-l-emerald-500"
														: undefined
											}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
										No rows match filters.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Mobile — same sort order as desktop */}
			<div className="md:hidden space-y-3">
				{table.getRowModel().rows.length === 0 ? (
					<p className="text-center text-sm text-muted-foreground py-8">No rows match filters.</p>
				) : (
					table.getRowModel().rows.map((tableRow) => {
						const r = tableRow.original;
						const inv = !r.is_valid;
						const ot = r.overtime_minutes > 0;
						return (
							<Card
								key={r.id}
								className={
									inv
										? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
										: ot
											? "border-l-4 border-l-emerald-500"
											: ""
								}
							>
								<CardContent className="p-4 space-y-2 text-sm">
									<div className="flex items-start justify-between gap-2">
										<div>
											<p className="font-semibold">{r.employeeName}</p>
											<p className="font-mono text-xs text-muted-foreground">{r.employeeCode}</p>
										</div>
										<span
											className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
												r.is_valid
													? "bg-emerald-100 text-emerald-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{r.is_valid ? "Valid" : "Invalid"}
										</span>
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-xs">
										<Calendar className="h-3.5 w-3.5" />
										{(() => {
											try {
												return format(parseISO(r.work_date), "dd MMM yyyy");
											} catch {
												return r.work_date;
											}
										})()}
									</div>
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<span className="text-muted-foreground">In</span>
											<p className="font-mono">{displayTime(r.in_time)}</p>
										</div>
										<div>
											<span className="text-muted-foreground">Out</span>
											<p className="font-mono">{displayTime(r.out_time)}</p>
										</div>
										<div>
											<span className="text-muted-foreground">Duration</span>
											<p className="font-mono">{formatMinutesAsClock(r.duration_minutes)}</p>
										</div>
										<div>
											<span className="text-muted-foreground">OT</span>
											<p className={`font-mono ${ot ? "font-semibold text-emerald-700" : ""}`}>
												{formatMinutesAsClock(r.overtime_minutes)}
											</p>
										</div>
									</div>
									{r.error ? <p className="text-xs text-amber-800 dark:text-amber-200">{r.error}</p> : null}
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			<p className="text-xs text-muted-foreground text-center md:text-left">
				{filtered.length} row{filtered.length === 1 ? "" : "s"} shown
				{filtered.length !== records.length ? ` (filtered from ${records.length})` : ""}
			</p>
		</div>
	);
}
