"use client";

import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui";
import { formatMinutesAsClock } from "@/lib/utils/formatters";
/** Same shape as AttendanceRecordVM (avoid circular imports). */
export type AttendanceReportRow = {
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

/** Numeric-aware sort for employee codes (shared with list view). */
export function compareEmployeeCode(a: string, b: string): number {
	const na = parseInt(String(a).replace(/\D/g, ""), 10);
	const nb = parseInt(String(b).replace(/\D/g, ""), 10);
	if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).replace(/\D/g, "") && String(b).replace(/\D/g, "")) {
		return na - nb;
	}
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function timeCellExcel(v: string | null | undefined): string {
	if (v == null || v === "") return "00:00";
	const s = String(v).trim();
	const m = /^(\d{1,2}):(\d{2})/.exec(s);
	if (!m) return "00:00";
	const hh = String(Math.min(23, parseInt(m[1]!, 10))).padStart(2, "0");
	const mm = m[2]!;
	return `${hh}:${mm}`;
}

function dateHeaders(d: string): { day: string; dow: string } {
	try {
		const x = parseISO(d);
		if (Number.isNaN(x.getTime())) return { day: d.slice(0, 10), dow: "" };
		return { day: format(x, "dd-MMM"), dow: format(x, "EEE") };
	} catch {
		return { day: d, dow: "" };
	}
}

type EmpBlock = {
	code: string;
	name: string;
	byDate: Map<string, AttendanceReportRow>;
};

function buildEmployeeBlocks(rows: AttendanceReportRow[]): EmpBlock[] {
	const map = new Map<string, EmpBlock>();
	for (const r of rows) {
		const code = String(r.employeeCode || "").trim() || "?";
		if (!map.has(code)) {
			map.set(code, { code, name: r.employeeName || "—", byDate: new Map() });
		}
		const b = map.get(code)!;
		b.byDate.set(r.work_date, r);
		if (r.employeeName && r.employeeName !== "—") b.name = r.employeeName;
	}
	return [...map.values()].sort((a, b) => compareEmployeeCode(a.code, b.code));
}

function uniqueSortedDates(rows: AttendanceReportRow[]): string[] {
	return [...new Set(rows.map((r) => r.work_date).filter(Boolean))].sort();
}

function hoursLabel(minutes: number): string {
	if (!minutes) return "0h";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** One card per employee: total duration & OT, sorted by employee ID */
export function EmployeeTotalsStrip({ rows }: { rows: AttendanceReportRow[] }) {
	const blocks = buildEmployeeBlocks(rows);
	if (!blocks.length) return null;

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				Totals by employee (sorted by ID)
			</p>
			<div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
				{blocks.map((b) => {
					let dur = 0;
					let ot = 0;
					let inv = 0;
					for (const r of b.byDate.values()) {
						dur += r.duration_minutes ?? 0;
						ot += r.overtime_minutes ?? 0;
						if (!r.is_valid) inv++;
					}
					return (
						<Card
							key={b.code}
							className="min-w-[200px] shrink-0 border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white shadow-sm dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800"
						>
							<CardContent className="p-4 space-y-2">
								<div className="flex items-baseline justify-between gap-2">
									<span className="font-mono text-lg font-bold tabular-nums text-primary">#{b.code}</span>
									{inv > 0 ? (
										<span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
											{inv} invalid
										</span>
									) : null}
								</div>
								<p className="text-sm font-medium leading-tight line-clamp-2">{b.name}</p>
								<div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
									<div>
										<p className="text-muted-foreground">Duration</p>
										<p className="font-semibold tabular-nums">{hoursLabel(dur)}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Overtime</p>
										<p
											className={`font-semibold tabular-nums ${ot > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
										>
											{hoursLabel(ot)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

/** Excel-style blocks: dates as columns, In / Out / Duration / OT as rows */
export function WorkDurationPivotGrids({ rows }: { rows: AttendanceReportRow[] }) {
	const dates = uniqueSortedDates(rows);
	const blocks = buildEmployeeBlocks(rows);

	if (!rows.length) {
		return (
			<p className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
				No attendance rows in this view.
			</p>
		);
	}

	return (
		<div className="space-y-10">
			{blocks.map((block) => (
				<Card
					key={block.code}
					className="overflow-hidden border-zinc-200/90 shadow-md dark:border-zinc-800"
				>
					<div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 px-4 py-3 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 dark:border-zinc-800">
						<div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-sm">
							<span>
								<span className="text-muted-foreground">Employee Code:-</span>{" "}
								<span className="font-mono font-semibold tabular-nums">{block.code}</span>
							</span>
							<span>
								<span className="text-muted-foreground">Employee Name:-</span>{" "}
								<span className="font-medium">{block.name}</span>
							</span>
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-max min-w-full border-collapse text-[11px] sm:text-xs">
							<thead>
								<tr className="border-b border-zinc-200 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900/90">
									<th className="sticky left-0 z-20 min-w-[5.5rem] border-r border-zinc-200 bg-zinc-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900">
										Days
									</th>
									{dates.map((d) => {
										const { day, dow } = dateHeaders(d);
										return (
											<th
												key={d}
												className="min-w-[3.5rem] border-r border-zinc-100 px-1 py-2 text-center font-normal last:border-r-0 dark:border-zinc-800"
											>
												<div className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{day}</div>
												{dow ? (
													<div className="text-[10px] font-medium text-muted-foreground">{dow}</div>
												) : null}
											</th>
										);
									})}
								</tr>
							</thead>
							<tbody>
								{(
									[
										["In Time", "in"] as const,
										["Out Time", "out"] as const,
										["Duration", "dur"] as const,
										["OT", "ot"] as const,
									] as const
								).map(([label, kind]) => (
									<tr
										key={`${block.code}-${label}`}
										className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/40 dark:border-zinc-800 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/25"
									>
										<td className="sticky left-0 z-10 border-r border-zinc-200 bg-inherit px-2 py-1.5 font-medium text-zinc-700 dark:border-zinc-800">
											{label}
										</td>
										{dates.map((d) => {
											const rec = block.byDate.get(d);
											let display = "00:00";
											if (rec) {
												if (kind === "in") display = timeCellExcel(rec.in_time);
												else if (kind === "out") display = timeCellExcel(rec.out_time);
												else if (kind === "dur")
													display =
														rec.duration_minutes != null && rec.duration_minutes > 0
															? formatMinutesAsClock(rec.duration_minutes)
															: "00:00";
												else if (kind === "ot")
													display =
														rec.overtime_minutes > 0
															? formatMinutesAsClock(rec.overtime_minutes)
															: "00:00";
											}
											const inv = rec && !rec.is_valid;
											return (
												<td
													key={d}
													className={`border-r border-zinc-100 px-1 py-1.5 text-center font-mono tabular-nums last:border-r-0 dark:border-zinc-800 ${
														inv ? "bg-red-50/80 text-red-900 dark:bg-red-950/30 dark:text-red-200" : ""
													} ${kind === "ot" && rec && rec.overtime_minutes > 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : ""}`}
												>
													{display}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			))}
		</div>
	);
}
