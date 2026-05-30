"use client";

import { useEffect, useMemo, useState } from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, Calendar, Search, User, Clock } from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { formatMinutesAsClock } from "@/lib/utils/formatters";
import {
	type EmployeeBlockSort,
	compareEmployeeCode,
	EmployeeTotalsStrip,
	normalizeDateKey,
	WorkDurationPivotGrids,
} from "@/components/hr/hr-attendance-work-duration-report";

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

function formatLocalYmd(iso: string): string {
	const t = normalizeDateKey(iso);
	const y = parseInt(t.slice(0, 4), 10);
	const m = parseInt(t.slice(5, 7), 10);
	const d = parseInt(t.slice(8, 10), 10);
	if (!y || !m || !d) return iso;
	return format(new Date(y, m - 1, d), "dd MMM yyyy");
}

function displayTime(v: string | null | undefined): string {
	if (v == null || v === "") return "—";
	const s = String(v).trim();
	const m = /^(\d{1,2}:\d{2})/.exec(s);
	return m ? m[1]! : s.slice(0, 8);
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

function AttendanceRowListTable({ records }: { records: AttendanceRecordVM[] }) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "employeeCode", desc: false },
		{ id: "work_date", desc: true },
	]);

	const columns = useMemo<ColumnDef<AttendanceRecordVM>[]>(
		() => [
			{
				accessorKey: "employeeCode",
				header: ({ column }) => (
					<Button 
						variant="ghost" 
						className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 hover:bg-transparent" 
						onClick={() => column.toggleSorting()}
					>
						Employee
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<div className="h-6.5 w-6.5 rounded-lg bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-[10px] font-extrabold text-zinc-700 shrink-0">
							{row.original.employeeName[0]?.toUpperCase() || "—"}
						</div>
						<div className="min-w-0">
							<div className="font-extrabold text-zinc-800 text-[11px] truncate leading-snug">{row.original.employeeName}</div>
							<div className="font-mono text-[9px] text-zinc-450 font-bold tracking-wider leading-none">#{row.original.employeeCode}</div>
						</div>
					</div>
				),
			},
			{
				accessorKey: "work_date",
				header: ({ column }) => (
					<Button 
						variant="ghost" 
						className="-ml-3 h-8 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 hover:bg-transparent" 
						onClick={() => column.toggleSorting()}
					>
						Date
						<ArrowUpDown className="ml-1 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="font-bold text-zinc-600 text-xs">{formatLocalYmd(row.original.work_date)}</span>
				),
			},
			{
				accessorKey: "in_time",
				header: () => <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">In Time</span>,
				cell: ({ row }) => {
					const display = displayTime(row.original.in_time);
					const isMuted = display === "—" || display === "00:00";
					return (
						<span className={`font-mono text-xs tabular-nums ${isMuted ? "text-zinc-300" : "font-semibold text-zinc-700"}`}>
							{display}
						</span>
					);
				},
			},
			{
				accessorKey: "out_time",
				header: () => <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Out Time</span>,
				cell: ({ row }) => {
					const display = displayTime(row.original.out_time);
					const isMuted = display === "—" || display === "00:00";
					return (
						<span className={`font-mono text-xs tabular-nums ${isMuted ? "text-zinc-300" : "font-semibold text-zinc-700"}`}>
							{display}
						</span>
					);
				},
			},
			{
				accessorKey: "duration_minutes",
				header: () => <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Duration</span>,
				cell: ({ row }) => {
					const dur = row.original.duration_minutes;
					const isZero = dur == null || dur <= 0;
					return (
						<span className={`font-mono text-xs ${isZero ? "text-zinc-300" : "font-extrabold text-zinc-700"}`}>
							{isZero ? "—" : formatMinutesAsClock(dur)}
						</span>
					);
				},
			},
			{
				accessorKey: "overtime_minutes",
				header: () => <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Overtime</span>,
				cell: ({ row }) => {
					const ot = row.original.overtime_minutes;
					const hasOt = ot > 0;
					return (
						<span
							className={`font-mono text-xs ${
								hasOt ? "font-black text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded-md" : "text-zinc-300"
							}`}
						>
							{hasOt ? formatMinutesAsClock(ot) : "—"}
						</span>
					);
				},
			},
			{
				id: "status",
				header: () => <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Status</span>,
				cell: ({ row }) => (
					<span
						className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-extrabold border uppercase tracking-wider select-none ${
							row.original.is_valid
								? "bg-emerald-50 text-emerald-700 border-emerald-150"
								: "bg-red-50 text-red-700 border-red-150"
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
		data: records,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="rounded-2xl border border-zinc-200/80 overflow-hidden bg-white shadow-3xs">
			<div className="max-h-[min(65vh,640px)] overflow-auto [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
				<Table>
					<TableHeader className="bg-zinc-50/80 backdrop-blur-md">
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id} className="hover:bg-transparent border-b border-zinc-200">
								{hg.headers.map((h) => (
									<TableHead
										key={h.id}
										className="sticky top-0 z-20 h-10 px-4 bg-zinc-50/80 backdrop-blur-md border-b border-zinc-200 text-left align-middle"
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
										className={`group transition-colors hover:bg-zinc-50/40 border-b border-zinc-150 last:border-0 ${
											inv
												? "bg-red-50/30 hover:bg-red-50/50"
												: ot
													? "border-l-4 border-l-emerald-500"
													: ""
										}`}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="px-4 py-2.5 align-middle">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-28 text-center text-zinc-400 font-bold text-xs">
									No records matching filters found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export type HrFileReportMeta = {
	reportPeriodRaw?: string | null;
	reportPeriodStartIso?: string | null;
	reportPeriodEndIso?: string | null;
	generatedOnRaw?: string | null;
	generatedOnDateIso?: string | null;
};

export function HrAttendanceRecordsView({
	records,
	title,
	showFilters = true,
	parsedCalendarYear,
	fileReport,
}: {
	records: AttendanceRecordVM[];
	title?: string;
	showFilters?: boolean;
	/** Shown after import preview — year used when parsing DD-MMM cells */
	parsedCalendarYear?: number;
	/** Header lines read from the Work Duration file (CSV/Excel) */
	fileReport?: HrFileReportMeta | null;
}) {
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	/** When set (YYYY-MM-DD), only that day’s rows (still combined with From/To if set). */
	const [specificDay, setSpecificDay] = useState("");
	const [layout, setLayout] = useState<"report" | "list">("report");
	const [employeeOnly, setEmployeeOnly] = useState<string>("all");
	const [employeeSort, setEmployeeSort] = useState<EmployeeBlockSort>("id");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		const dayKey =
			specificDay && /^\d{4}-\d{2}-\d{2}$/.test(specificDay) ? specificDay : "";
		return records.filter((r) => {
			if (q && !r.employeeName.toLowerCase().includes(q) && !r.employeeCode.toLowerCase().includes(q))
				return false;
			const wd = normalizeDateKey(r.work_date);
			if (from && wd < from) return false;
			if (to && wd > to) return false;
			if (dayKey && wd !== dayKey) return false;
			return true;
		});
	}, [records, search, from, to, specificDay]);

	const employeeOptions = useMemo(() => {
		const m = new Map<string, string>();
		for (const r of filtered) {
			if (!m.has(r.employeeCode)) m.set(r.employeeCode, r.employeeName);
		}
		return [...m.entries()].sort(([a], [b]) => compareEmployeeCode(a, b));
	}, [filtered]);

	useEffect(() => {
		if (employeeOnly !== "all" && !filtered.some((r) => r.employeeCode === employeeOnly)) {
			setEmployeeOnly("all");
		}
	}, [filtered, employeeOnly]);

	const viewRows = useMemo(() => {
		if (employeeOnly === "all") return filtered;
		return filtered.filter((r) => r.employeeCode === employeeOnly);
	}, [filtered, employeeOnly]);

	const meta = useMemo(() => {
		const emp = new Set(viewRows.map((r) => r.employeeCode));
		return { employees: emp.size, rows: viewRows.length };
	}, [viewRows]);

	/** Stable default for list + mobile: employee ID ↑, then date ↓ */
	const listRows = useMemo(() => {
		return [...viewRows].sort((a, b) => {
			const c = compareEmployeeCode(a.employeeCode, b.employeeCode);
			if (c !== 0) return c;
			return b.work_date.localeCompare(a.work_date);
		});
	}, [viewRows]);

	return (
		<div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
			{/* Title and Switcher */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{title ? (
					<h3 className="text-sm font-black uppercase tracking-wider text-zinc-500">
						{title}
					</h3>
				) : null}
				
				{/* Segmented premium toggle controls */}
				<div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 shrink-0 select-none shadow-3xs sm:w-auto self-start">
					<button
						type="button"
						className={`h-8 px-3.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
							layout === "report" 
								? "bg-teal-600 text-white shadow-xs hover:bg-teal-700" 
								: "text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100"
						}`}
						onClick={() => setLayout("report")}
					>
						<span>📊</span>
						Summary View
					</button>
					<button
						type="button"
						className={`h-8 px-3.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
							layout === "list" 
								? "bg-teal-600 text-white shadow-xs hover:bg-teal-700" 
								: "text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100"
						}`}
						onClick={() => setLayout("list")}
					>
						<span>📋</span>
						Full Rows
					</button>
				</div>
			</div>

			{/* Inline Info Badge Summary */}
			<div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 shadow-3xs">
				<div className="flex items-center gap-1 text-zinc-600 font-bold">
					<span>👥</span>
					<span className="font-extrabold text-zinc-800">{meta.employees}</span> employee{meta.employees === 1 ? "" : "s"}
					<span className="text-zinc-300 mx-1.5">|</span>
					<span>📅</span>
					<span className="font-extrabold text-zinc-800">{meta.rows}</span> day record{meta.rows === 1 ? "" : "s"}
					{viewRows.length !== records.length ? (
						<>
							<span className="text-zinc-300 mx-1.5">|</span>
							<span className="text-zinc-500 font-semibold">(filtered from {records.length} records)</span>
						</>
					) : null}
				</div>
				
				{parsedCalendarYear != null ? (
					<div className="text-[10px] text-zinc-500 font-bold bg-white border border-zinc-200 rounded-lg px-2 py-0.5 shadow-3xs flex items-center gap-1 shrink-0">
						<span>⚙️</span>
						<span>Calendar Year: <strong className="text-zinc-600 font-extrabold">{parsedCalendarYear}</strong></span>
					</div>
				) : null}
			</div>

			{fileReport &&
			(fileReport.reportPeriodRaw ||
				fileReport.generatedOnRaw ||
				fileReport.reportPeriodStartIso ||
				fileReport.generatedOnDateIso) ? (
				<div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-xs text-sky-950 shadow-3xs space-y-2.5">
					<p className="font-black text-[10px] uppercase tracking-wider text-sky-800/80">
						📎 Uploaded Report Details
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-600 font-semibold">
						{fileReport.reportPeriodRaw ? (
							<p className="leading-relaxed break-words">
								<span className="text-zinc-500 font-bold">Date Range: </span>
								{fileReport.reportPeriodRaw}
							</p>
						) : fileReport.reportPeriodStartIso && fileReport.reportPeriodEndIso ? (
							<p className="leading-relaxed">
								<span className="text-zinc-500 font-bold">Date Range: </span>
								{formatLocalYmd(fileReport.reportPeriodStartIso)} → {formatLocalYmd(fileReport.reportPeriodEndIso)}
							</p>
						) : null}
						{fileReport.generatedOnRaw ? (
							<p className="leading-relaxed break-words">
								<span className="text-zinc-500 font-bold">Generated: </span>
								{fileReport.generatedOnRaw.replace(/^Generated\s*On:\s*/i, "")}
							</p>
						) : fileReport.generatedOnDateIso ? (
							<p className="leading-relaxed">
								<span className="text-zinc-500 font-bold">Generated: </span>
								{formatLocalYmd(fileReport.generatedOnDateIso)}
							</p>
						) : null}
					</div>
				</div>
			) : null}

			{showFilters && (
				<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-3xs space-y-4">
					<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
						{/* Search Bar */}
						<div className="flex-1 min-w-[14rem]">
							<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">Search employee</label>
							<div className="relative">
								<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
									<Search className="h-4 w-4" />
								</div>
								<Input
									placeholder="Name or employee code…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs placeholder:text-zinc-400 shadow-3xs"
								/>
							</div>
						</div>
						
						{/* Employee Select */}
						<div className="w-full min-w-[12rem] sm:w-48">
							<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">Filter Employee</label>
							<Select value={employeeOnly} onValueChange={setEmployeeOnly}>
								<SelectTrigger className="w-full h-10 rounded-xl border-zinc-200 focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs bg-white shadow-3xs">
									<div className="flex items-center gap-1.5 min-w-0">
										<User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										<SelectValue placeholder="All employees" />
									</div>
								</SelectTrigger>
								<SelectContent className="rounded-xl border-zinc-200 shadow-lg font-bold text-xs">
									<SelectItem value="all">All employees</SelectItem>
									{employeeOptions.map(([code, name]) => (
										<SelectItem key={code} value={code}>
											<span className="font-mono text-zinc-400 mr-1.5">#{code}</span> {name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						
						{/* Sort Select */}
						{layout === "report" && (
							<div className="w-full min-w-[12rem] sm:w-44">
								<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">Sort By</label>
								<Select value={employeeSort} onValueChange={(v) => setEmployeeSort(v as EmployeeBlockSort)}>
									<SelectTrigger className="w-full h-10 rounded-xl border-zinc-200 focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs bg-white shadow-3xs">
										<div className="flex items-center gap-1.5 min-w-0">
											<ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											<SelectValue />
										</div>
									</SelectTrigger>
									<SelectContent className="rounded-xl border-zinc-200 shadow-lg font-bold text-xs">
										<SelectItem value="id">Employee ID ↑</SelectItem>
										<SelectItem value="name">Employee Name (A–Z)</SelectItem>
										<SelectItem value="duration">Total Duration ↓</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
						
						{/* Date From */}
						<div className="w-full sm:w-40">
							<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">From Date</label>
							<Input 
								type="date" 
								value={from} 
								onChange={(e) => setFrom(e.target.value)} 
								className="h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs shadow-3xs"
							/>
						</div>
						
						{/* Date To */}
						<div className="w-full sm:w-40">
							<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">To Date</label>
							<Input 
								type="date" 
								value={to} 
								onChange={(e) => setTo(e.target.value)} 
								className="h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs shadow-3xs"
							/>
						</div>
						
						{/* Specific Day */}
						<div className="w-full sm:w-44">
							<label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">Specific day</label>
							<div className="flex gap-1.5">
								<Input
									type="date"
									value={specificDay}
									onChange={(e) => setSpecificDay(e.target.value)}
									className="min-w-0 flex-1 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs shadow-3xs"
								/>
								{specificDay ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="shrink-0 px-2.5 h-10 rounded-xl font-extrabold text-xs"
										onClick={() => setSpecificDay("")}
									>
										Clear
									</Button>
								) : null}
							</div>
						</div>
					</div>
				</div>
			)}

			{layout === "report" ? (
				<div className="space-y-6">
					<EmployeeTotalsStrip rows={viewRows} sortOrder={employeeSort} />
					<div className="space-y-3">
						<p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
							Employee grid view (dates as columns)
						</p>
						<WorkDurationPivotGrids rows={viewRows} sortOrder={employeeSort} />
					</div>
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Flat record view (grouped by date)</p>
					
					{/* Desktop list view */}
					<div className="hidden md:block">
						<AttendanceRowListTable records={listRows} />
					</div>
					
					{/* Mobile list view */}
					<div className="md:hidden space-y-3">
						{listRows.length === 0 ? (
							<div className="border border-dashed border-zinc-200 rounded-2xl p-12 text-center bg-white shadow-3xs max-w-sm mx-auto">
								<p className="text-sm font-extrabold text-zinc-700">No records matched filters</p>
								<p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
									Adjust your search terms or date scope to view matches.
								</p>
							</div>
						) : (
							listRows.map((r) => {
								const inv = !r.is_valid;
								const ot = r.overtime_minutes > 0;
								return (
									<Card
										key={r.id}
										className={`overflow-hidden rounded-2xl border bg-white shadow-3xs transition-all duration-200 active:scale-99 select-none ${
											inv
												? "border-red-200 border-l-4 border-l-red-500"
												: ot
													? "border-l-4 border-l-emerald-500 border-zinc-200"
													: "border-zinc-200 border-l-4 border-l-zinc-400"
										}`}
									>
										<CardContent className="p-4 space-y-3 text-xs">
											<div className="flex items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center text-[10px] font-black text-zinc-600 shrink-0">
														{r.employeeName[0]?.toUpperCase() || "—"}
													</div>
													<div>
														<p className="font-extrabold text-zinc-800 text-xs leading-snug">{r.employeeName}</p>
														<p className="font-mono text-[9px] text-zinc-500 font-bold tracking-wider leading-none">#{r.employeeCode}</p>
													</div>
												</div>
												<span
													className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
														r.is_valid ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-red-50 text-red-700 border-red-150"
													}`}
												>
													{r.is_valid ? "Valid" : "Invalid"}
												</span>
											</div>
											
											<div className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px] bg-zinc-50 border border-zinc-150 rounded-lg px-2.5 py-1.5">
												<Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
												<span>Date:</span>
												<span className="text-zinc-800 font-extrabold">{formatLocalYmd(r.work_date)}</span>
											</div>
											
											<div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-50/50 border border-zinc-150/80 rounded-xl p-2.5">
												<div className="space-y-0.5">
													<span className="text-zinc-500 font-bold uppercase tracking-wide text-[8.5px]">In Time</span>
													<p className={`font-mono text-xs ${r.in_time ? "text-zinc-800 font-bold" : "text-zinc-300 font-normal"}`}>
														{displayTime(r.in_time)}
													</p>
												</div>
												<div className="space-y-0.5">
													<span className="text-zinc-500 font-bold uppercase tracking-wide text-[8.5px]">Out Time</span>
													<p className={`font-mono text-xs ${r.out_time ? "text-zinc-800 font-bold" : "text-zinc-300 font-normal"}`}>
														{displayTime(r.out_time)}
													</p>
												</div>
												<div className="space-y-0.5 border-t border-zinc-200/50 pt-1.5">
													<span className="text-zinc-500 font-bold uppercase tracking-wide text-[8.5px] flex items-center gap-0.5">
														<Clock className="h-2.5 w-2.5 text-zinc-400" />
														Duration
													</span>
													<p className={`font-mono text-xs ${r.duration_minutes ? "text-zinc-800 font-extrabold" : "text-zinc-300 font-normal"}`}>
														{r.duration_minutes && r.duration_minutes > 0 ? formatMinutesAsClock(r.duration_minutes) : "—"}
													</p>
												</div>
												<div className="space-y-0.5 border-t border-zinc-200/50 pt-1.5">
													<span className="text-zinc-500 font-bold uppercase tracking-wide text-[8.5px] flex items-center gap-0.5">
														<span>🕒</span>
														Overtime
													</span>
													<p className={`font-mono text-xs ${ot ? "text-emerald-700 font-black" : "text-zinc-300 font-normal"}`}>
														{ot ? formatMinutesAsClock(r.overtime_minutes) : "—"}
													</p>
												</div>
											</div>
											{r.error ? (
												<div className="rounded-lg bg-amber-50 border border-amber-150 p-2 text-[10px] text-amber-800/90 font-bold leading-normal">
													⚠️ Warning: {r.error}
												</div>
											) : null}
										</CardContent>
									</Card>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
