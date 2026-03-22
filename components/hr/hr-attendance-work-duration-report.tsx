"use client";

import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
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

export type EmployeeBlockSort = "id" | "name" | "duration";

/** Numeric-aware sort for employee codes (shared with list view). */
export function compareEmployeeCode(a: string, b: string): number {
	const na = parseInt(String(a).replace(/\D/g, ""), 10);
	const nb = parseInt(String(b).replace(/\D/g, ""), 10);
	if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).replace(/\D/g, "") && String(b).replace(/\D/g, "")) {
		return na - nb;
	}
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Calendar YYYY-MM-DD from DB/API — avoids UTC drift from ISO strings. */
export function normalizeDateKey(s: string): string {
	const t = String(s ?? "")
		.trim()
		.slice(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
	return t;
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

/** Format headers using local calendar date (not parseISO UTC midnight). */
function dateHeadersLocal(d: string): { day: string; dow: string; dayOfMonth: number } {
	const t = normalizeDateKey(d);
	const y = parseInt(t.slice(0, 4), 10);
	const m = parseInt(t.slice(5, 7), 10);
	const day = parseInt(t.slice(8, 10), 10);
	if (!y || !m || !day) return { day: t, dow: "", dayOfMonth: 0 };
	const x = new Date(y, m - 1, day);
	if (Number.isNaN(x.getTime())) return { day: t, dow: "", dayOfMonth: day };
	return { day: format(x, "dd-MMM"), dow: format(x, "EEE"), dayOfMonth: day };
}

/** All calendar days from min(row) … max(row), expanded to full month(s). */
export function fullCalendarDatesFromRows(rows: AttendanceReportRow[]): string[] {
	const keys = rows.map((r) => normalizeDateKey(r.work_date)).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
	if (!keys.length) return [];
	const toLocal = (iso: string) => {
		const y = parseInt(iso.slice(0, 4), 10);
		const m = parseInt(iso.slice(5, 7), 10);
		const d = parseInt(iso.slice(8, 10), 10);
		return new Date(y, m - 1, d);
	};
	let min = toLocal(keys[0]!);
	let max = toLocal(keys[0]!);
	for (const k of keys) {
		const t = toLocal(k);
		if (t < min) min = t;
		if (t > max) max = t;
	}
	const start = startOfMonth(min);
	const end = endOfMonth(max);
	return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
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
		b.byDate.set(normalizeDateKey(r.work_date), r);
		if (r.employeeName && r.employeeName !== "—") b.name = r.employeeName;
	}
	return [...map.values()];
}

function sortEmployeeBlocks(blocks: EmpBlock[], order: EmployeeBlockSort): EmpBlock[] {
	const copy = [...blocks];
	if (order === "name") {
		return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	}
	if (order === "duration") {
		const sumDur = (blk: EmpBlock) => {
			let d = 0;
			for (const r of blk.byDate.values()) d += r.duration_minutes ?? 0;
			return d;
		};
		return copy.sort((a, b) => sumDur(b) - sumDur(a));
	}
	return copy.sort((a, b) => compareEmployeeCode(a.code, b.code));
}

function hoursLabel(minutes: number): string {
	if (!minutes) return "0h";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** One card per employee: total duration & OT */
export function EmployeeTotalsStrip({
	rows,
	sortOrder = "id",
}: {
	rows: AttendanceReportRow[];
	sortOrder?: EmployeeBlockSort;
}) {
	const blocks = sortEmployeeBlocks(buildEmployeeBlocks(rows), sortOrder);
	if (!blocks.length) return null;

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				Totals by employee
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
							className="min-w-[200px] shrink-0 border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950"
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
								<div className="grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800">
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

const thSticky =
	"sticky left-0 z-20 min-w-[6rem] border border-zinc-300 bg-zinc-100 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";
const tdSticky =
	"sticky left-0 z-10 border border-zinc-300 bg-zinc-50 px-2 py-1 font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100";
const cell = "border border-zinc-300 px-1 py-1 text-center font-mono tabular-nums text-[11px] sm:text-xs dark:border-zinc-600";

/** Excel-style blocks: full month columns, dates as columns, metrics as rows */
export function WorkDurationPivotGrids({
	rows,
	sortOrder = "id",
}: {
	rows: AttendanceReportRow[];
	sortOrder?: EmployeeBlockSort;
}) {
	const dates = fullCalendarDatesFromRows(rows);
	const blocks = sortEmployeeBlocks(buildEmployeeBlocks(rows), sortOrder);

	if (!rows.length) {
		return (
			<p className="text-sm text-muted-foreground border border-dashed border-zinc-300 rounded-lg p-8 text-center dark:border-zinc-600">
				No attendance rows in this view.
			</p>
		);
	}

	const rangeLabel =
		dates.length > 0
			? (() => {
					const a = dates[0]!;
					const b = dates[dates.length - 1]!;
					const p = (iso: string) => {
						const y = parseInt(iso.slice(0, 4), 10);
						const m = parseInt(iso.slice(5, 7), 10);
						const d = parseInt(iso.slice(8, 10), 10);
						return new Date(y, m - 1, d);
					};
					return `${format(p(a), "dd-MMM-yyyy")} → ${format(p(b), "dd-MMM-yyyy")}`;
				})()
			: "";

	return (
		<div className="max-w-full min-w-0 space-y-6">
			{rangeLabel ? (
				<p className="text-xs font-medium text-muted-foreground">
					Period: <span className="text-foreground">{rangeLabel}</span> · empty days show 00:00
				</p>
			) : null}
			<div className="space-y-8">
				{blocks.map((block) => (
					<Card
						key={block.code}
						className="overflow-hidden border border-zinc-300 shadow-md dark:border-zinc-600"
					>
						<div className="border-b border-zinc-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 dark:border-zinc-600">
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
						{/* Constrain width to viewport; scroll inside */}
						<div className="w-full max-w-full overflow-x-auto bg-white dark:bg-zinc-950">
							<table className="w-max min-w-full border-collapse border border-zinc-300 text-[11px] sm:text-xs dark:border-zinc-600">
								<thead>
									<tr className="bg-slate-100 dark:bg-zinc-900">
										<th className={thSticky}>Day</th>
										{dates.map((d) => {
											const { dayOfMonth } = dateHeadersLocal(d);
											return (
												<th key={`didx-${d}`} className={`${cell} min-w-[3.25rem] bg-slate-100 font-semibold text-zinc-800 dark:bg-zinc-900`}>
													Day{dayOfMonth || "—"}
												</th>
											);
										})}
									</tr>
									<tr className="bg-zinc-100 dark:bg-zinc-900">
										<th className={thSticky}>Date</th>
										{dates.map((d) => {
											const { day } = dateHeadersLocal(d);
											return (
												<th key={`date-${d}`} className={`${cell} min-w-[3.25rem] bg-zinc-100 font-semibold dark:bg-zinc-900`}>
													{day}
												</th>
											);
										})}
									</tr>
									<tr className="bg-zinc-50 dark:bg-zinc-900/80">
										<th className={thSticky}>Weekday</th>
										{dates.map((d) => {
											const { dow } = dateHeadersLocal(d);
											return (
												<th key={`dow-${d}`} className={`${cell} min-w-[3.25rem] text-muted-foreground dark:bg-zinc-900`}>
													{dow}
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
											["T Duration", "tdur"] as const,
										] as const
									).map(([label, kind]) => (
										<tr
											key={`${block.code}-${label}`}
											className="odd:bg-white even:bg-slate-50/80 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/40"
										>
											<td className={tdSticky}>{label}</td>
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
													else if (kind === "tdur")
														display =
															rec.duration_minutes != null && rec.duration_minutes > 0
																? formatMinutesAsClock(rec.duration_minutes)
																: "00:00";
												}
												const inv = rec && !rec.is_valid;
												return (
													<td
														key={d}
														className={`${cell} ${
															inv ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100" : ""
														} ${
															kind === "ot" && rec && rec.overtime_minutes > 0
																? "font-semibold text-emerald-800 dark:text-emerald-300"
																: ""
														}`}
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
		</div>
	);
}
