"use client";

import { eachDayOfInterval, format } from "date-fns";
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

/** Every calendar day from min(work_date) through max(work_date) inclusive (no full-month padding). */
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
	return eachDayOfInterval({ start: min, end: max }).map((d) => format(d, "yyyy-MM-dd"));
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

const bgColors = [
	"bg-teal-600 text-white border border-teal-500/25 shadow-xs shadow-teal-500/8",
	"bg-emerald-600 text-white border border-emerald-500/25 shadow-xs shadow-emerald-500/8",
	"bg-violet-600 text-white border border-violet-500/25 shadow-xs shadow-violet-500/8",
	"bg-sky-600 text-white border border-sky-500/25 shadow-xs shadow-sky-500/8",
	"bg-indigo-600 text-white border border-indigo-500/25 shadow-xs shadow-indigo-500/8",
	"bg-rose-600 text-white border border-rose-500/25 shadow-xs shadow-rose-500/8",
	"bg-amber-600 text-white border border-amber-500/25 shadow-xs shadow-amber-500/8",
];

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
	}
	return (name.trim()[0] ?? "").toUpperCase();
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
		<div className="space-y-3">
			<p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
				Totals by employee
			</p>
			<div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
				{blocks.map((b, idx) => {
					let dur = 0;
					let ot = 0;
					let inv = 0;
					for (const r of b.byDate.values()) {
						dur += r.duration_minutes ?? 0;
						ot += r.overtime_minutes ?? 0;
						if (!r.is_valid) inv++;
					}
					const initials = getInitials(b.name);
					const bgClass = bgColors[idx % bgColors.length];
					return (
						<Card
							key={b.code}
							className="min-w-[145px] max-w-[170px] shrink-0 rounded-2xl border border-zinc-200 bg-white hover:border-teal-500/30 shadow-3xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group select-none border-l-4 border-l-teal-500"
						>
							<CardContent className="p-3 space-y-2.5">
								<div className="flex items-center justify-between gap-1">
									<div className="flex items-center gap-1.5 min-w-0">
										<div className={`h-6.5 w-6.5 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 ${bgClass}`}>
											{initials}
										</div>
										<div className="min-w-0">
											<p className="font-extrabold text-[11px] text-zinc-800 truncate leading-snug">
												{b.name}
											</p>
											<span className="font-mono font-bold text-[9px] text-zinc-500 tracking-wider">
												#{b.code}
											</span>
										</div>
									</div>
									{inv > 0 ? (
										<span
											title={`${inv} invalid row(s)`}
											className="shrink-0 rounded-md bg-red-50 border border-red-150 px-1 py-0.5 text-[8px] font-extrabold text-red-600 flex items-center gap-0.5"
										>
											{inv}!
										</span>
									) : null}
								</div>
								
								<div className="grid grid-cols-2 gap-1 border-t border-zinc-100 pt-2 text-[9px]">
									<div className="min-w-0">
										<p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Total</p>
										<p className="font-bold tabular-nums text-zinc-800 text-[10px] mt-0.5 flex items-center gap-0.5">
											<span>⏱</span>
											{hoursLabel(dur)}
										</p>
									</div>
									<div className="min-w-0">
										<p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">OT</p>
										<p className={`font-bold tabular-nums text-[10px] mt-0.5 flex items-center gap-0.5 ${ot > 0 ? "text-emerald-600 font-extrabold" : "text-zinc-600"}`}>
											<span>🕒</span>
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

/** Excel-style blocks: dates as columns (min…max in data), metrics as rows */
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
			<div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-2xl p-12 text-center bg-white shadow-3xs space-y-4 max-w-lg mx-auto">
				<div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xl text-zinc-400">
					👥
				</div>
				<div className="space-y-1">
					<p className="text-sm font-extrabold text-zinc-800">No attendance records found</p>
					<p className="text-xs text-zinc-550 max-w-[280px] mx-auto leading-relaxed">
						Please upload an attendance Excel / CSV file or mark attendance manually using the dashboard actions above.
					</p>
				</div>
			</div>
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
		<div className="max-w-full min-w-0 space-y-4 overflow-x-hidden">
			{rangeLabel ? (
				<p className="text-xs font-bold text-zinc-500 bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5 shadow-3xs">
					📅 Period: <span className="text-zinc-800 font-extrabold">{rangeLabel}</span>
				</p>
			) : null}
			<div className="space-y-6">
				{blocks.map((block) => {
					let dur = 0;
					let ot = 0;
					let presentDays = 0;
					for (const r of block.byDate.values()) {
						dur += r.duration_minutes ?? 0;
						ot += r.overtime_minutes ?? 0;
						if (r.duration_minutes && r.duration_minutes > 0) presentDays++;
					}

					return (
						<Card
							key={block.code}
							className="overflow-hidden rounded-2xl border border-zinc-200 shadow-3xs hover:shadow-xs transition-all duration-300 bg-white"
						>
							<div className="border-b border-zinc-150 bg-zinc-50/50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-bold">
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Employee Code</span>
										<span className="font-mono bg-zinc-150/70 text-zinc-700 font-extrabold px-1.5 py-0.5 rounded-md text-[10px] tabular-nums">#{block.code}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Employee Name</span>
										<span className="font-extrabold text-zinc-800 text-sm">{block.name}</span>
									</div>
								</div>
								
								<div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 bg-white border border-zinc-150 rounded-xl px-3 py-1 shadow-3xs sm:self-center shrink-0">
									<div className="flex items-center gap-1">
										<span className="text-teal-600">⏱</span>
										<span>{hoursLabel(dur)} total</span>
									</div>
									<div className="w-px h-3.5 bg-zinc-200" />
									<div className="flex items-center gap-1">
										<span className="text-emerald-600">🕒</span>
										<span>{hoursLabel(ot)} OT</span>
									</div>
									<div className="w-px h-3.5 bg-zinc-200" />
									<div className="flex items-center gap-1">
										<span className="text-indigo-600">📅</span>
										<span>{presentDays} active days</span>
									</div>
								</div>
							</div>
							
							{/* Horizontal scroll containing table */}
							<div className="w-full overflow-x-auto [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent overscroll-x-contain pb-1 bg-white">
								<table className="w-max min-w-full border-collapse text-[11px] sm:text-xs">
									<thead>
										<tr className="bg-zinc-50 border-b border-zinc-150">
											<th className="sticky left-0 z-30 w-16 min-w-[4rem] max-w-[4.5rem] shrink-0 bg-zinc-100 border-r border-zinc-200/80 px-2 py-2.5 text-left text-[9px] font-black uppercase tracking-wider text-zinc-500 shadow-[2px_0_5px_rgba(0,0,0,0.015)]" scope="col">
												Metric
											</th>
											{dates.map((d) => {
												const { day, dow } = dateHeadersLocal(d);
												const isWeekend = dow === "Sat" || dow === "Sun";
												const isToday = d === format(new Date(), "yyyy-MM-dd");
												
												return (
													<th 
														key={`hdr-${d}`} 
														className={`min-w-[3.5rem] sm:min-w-[4rem] border-r border-zinc-100 px-1 py-1.5 align-middle transition-colors ${
															isToday 
																? "bg-teal-50/70 border-b-2 border-b-teal-500" 
																: isWeekend 
																	? "bg-zinc-50/50" 
																	: ""
														}`} 
														scope="col"
													>
														<div className="flex flex-col items-center justify-center gap-0.5 leading-none">
															<span className={`text-[10px] font-black tabular-nums ${isToday ? "text-teal-700" : "text-zinc-800"}`}>
																{day}
															</span>
															<span className={`text-[8.5px] font-extrabold ${isToday ? "text-teal-600" : isWeekend ? "text-zinc-400" : "text-zinc-500"}`}>
																{dow}
															</span>
														</div>
													</th>
												);
											})}
										</tr>
									</thead>
									<tbody>
										{(
											[
												["In", "in"] as const,
												["Out", "out"] as const,
												["Dur", "dur"] as const,
												["OT", "ot"] as const,
												["T·Dur", "tdur"] as const,
											] as const
										).map(([label, kind], rowIdx) => (
											<tr
												key={`${block.code}-${label}`}
												className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/30 transition-colors ${
													rowIdx % 2 === 1 ? "bg-zinc-50/20" : "bg-white"
												}`}
											>
												<td className="sticky left-0 z-20 w-16 min-w-[4rem] max-w-[4.5rem] shrink-0 bg-zinc-50/95 backdrop-blur-xs border-r border-zinc-200/80 px-2.5 py-1.5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.015)]">{label}</td>
												{dates.map((d) => {
													const rec = block.byDate.get(d);
													let display = "—";
													let hasValue = false;
													if (rec) {
														if (kind === "in") {
															const val = timeCellExcel(rec.in_time);
															if (val !== "00:00") {
																display = val;
																hasValue = true;
															}
														} else if (kind === "out") {
															const val = timeCellExcel(rec.out_time);
															if (val !== "00:00") {
																display = val;
																hasValue = true;
															}
														} else if (kind === "dur") {
															if (rec.duration_minutes != null && rec.duration_minutes > 0) {
																display = formatMinutesAsClock(rec.duration_minutes);
																hasValue = true;
															}
														} else if (kind === "ot") {
															if (rec.overtime_minutes > 0) {
																display = formatMinutesAsClock(rec.overtime_minutes);
																hasValue = true;
															}
														} else if (kind === "tdur") {
															if (rec.duration_minutes != null && rec.duration_minutes > 0) {
																display = formatMinutesAsClock(rec.duration_minutes);
																hasValue = true;
															}
														}
													}
													const inv = rec && !rec.is_valid;
													const dow = dateHeadersLocal(d).dow;
													const isWeekend = dow === "Sat" || dow === "Sun";
													
													return (
														<td
															key={d}
															className={`border-r border-zinc-100/80 px-1 py-1.5 text-center font-mono tabular-nums text-[10px] sm:text-[11px] transition-colors ${
																!hasValue ? "text-zinc-300 font-normal" : "text-zinc-700 font-semibold"
															} ${
																inv ? "bg-red-50 text-red-700 font-bold dark:bg-red-950/40" : ""
															} ${
																kind === "ot" && rec && rec.overtime_minutes > 0
																	? "font-black text-emerald-600 bg-emerald-50/30"
																	: ""
															} ${
																!inv && isWeekend && !hasValue ? "bg-zinc-50/30" : ""
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
					);
				})}
			</div>
		</div>
	);
}
