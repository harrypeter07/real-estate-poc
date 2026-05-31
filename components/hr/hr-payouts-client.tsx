"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { WeekBucket } from "@/lib/hr/salary-engine";
import { computeRegularHourlyEquivalent } from "@/lib/hr/salary-engine";
import type { HrSalaryType } from "@/lib/hr/types";
import { describeRegularRateBasis, describeSalaryBasis } from "@/lib/hr/payout-display";

function fmtHours(n: number) {
	return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type PayoutRow = {
	id: string;
	total_days: number;
	total_hours: number;
	overtime_hours: number;
	required_hours: number;
	short_hours: number;
	deduction_amount: number;
	base_salary: number;
	overtime_pay: number;
	final_salary: number;
	paid_amount: number;
	remaining_amount: number;
	payout_status: string;
	weekly_breakdown?: WeekBucket[] | null;
	hr_employees?: {
		name?: string;
		employee_code?: string;
		salary_type?: string;
		salary_rate?: number;
		overtime_rate?: number;
		required_hours_per_week?: number;
		grace_hours?: number;
		deduction_enabled?: boolean;
	} | null;
};

const bgColors = [
	"bg-teal-50 text-teal-700 border border-teal-150/60 shadow-[0_2px_8px_rgba(13,148,136,0.04)]",
	"bg-blue-50 text-blue-700 border border-blue-150/60 shadow-[0_2px_8px_rgba(59,130,246,0.04)]",
	"bg-indigo-50 text-indigo-700 border border-indigo-150/60 shadow-[0_2px_8px_rgba(99,102,241,0.04)]",
	"bg-violet-50 text-violet-700 border border-violet-150/60 shadow-[0_2px_8px_rgba(139,92,246,0.04)]",
	"bg-sky-50 text-sky-700 border border-sky-150/60 shadow-[0_2px_8px_rgba(14,165,233,0.04)]",
	"bg-emerald-50 text-emerald-700 border border-emerald-150/60 shadow-[0_2px_8px_rgba(16,185,129,0.04)]",
];

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
	}
	return (name.trim()[0] ?? "").toUpperCase();
}

function WeeklyBreakdownTable({ weeks }: { weeks: WeekBucket[] }) {
	if (!weeks.length) {
		return <p className="text-xs text-zinc-400 py-3 font-extrabold italic">No weekly breakdown stored.</p>;
	}
	return (
		<div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-3xs [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
			<table className="w-full min-w-[640px] text-xs border-collapse">
				<thead>
					<tr className="bg-zinc-50 border-b border-zinc-150 text-left text-zinc-500 font-bold">
						<th className="px-3 py-2 font-black text-[9px] uppercase tracking-wider text-zinc-400">Week (Mon range)</th>
						<th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Worked h</th>
						<th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Required h</th>
						<th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Short h</th>
						<th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">OT h</th>
						<th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Shortfall deduction</th>
					</tr>
				</thead>
				<tbody>
					{weeks.map((w, idx) => (
						<tr key={w.weekKey} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/40 transition-colors ${
							idx % 2 === 1 ? "bg-zinc-50/20" : "bg-white"
						}`}>
							<td className="px-3 py-2 font-mono font-bold text-zinc-700 tabular-nums">
								{w.start} → {w.end}
							</td>
							<td className={`px-3 py-2 text-right font-mono tabular-nums ${w.workedHours ? "text-zinc-700 font-bold" : "text-zinc-300 font-normal"}`}>
								{w.workedHours ? fmtHours(w.workedHours) : "—"}
							</td>
							<td className={`px-3 py-2 text-right font-mono tabular-nums ${w.requiredHours ? "text-zinc-700 font-semibold" : "text-zinc-300 font-normal"}`}>
								{w.requiredHours ? fmtHours(w.requiredHours) : "—"}
							</td>
							<td className={`px-3 py-2 text-right font-mono tabular-nums ${w.shortHours ? "text-amber-700 font-bold bg-amber-50/50 px-1 py-0.5 rounded" : "text-zinc-300 font-normal"}`}>
								{w.shortHours ? fmtHours(w.shortHours) : "—"}
							</td>
							<td className={`px-3 py-2 text-right font-mono tabular-nums ${w.overtimeHours ? "text-emerald-700 font-extrabold bg-emerald-50/30 px-1 py-0.5 rounded" : "text-zinc-300 font-normal"}`}>
								{w.overtimeHours ? fmtHours(w.overtimeHours) : "—"}
							</td>
							<td className={`px-3 py-2 text-right font-mono tabular-nums ${Number(w.deduction) > 0 ? "text-amber-800 font-bold bg-amber-50/30 px-2 py-0.5 rounded" : "text-zinc-300 font-normal"}`}>
								{Number(w.deduction) > 0 ? formatCurrency(Number(w.deduction)) : "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function HrPayoutsClient({ initialBatches }: { initialBatches: any[] }) {
	const router = useRouter();
	const [month, setMonth] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	});
	const [search, setSearch] = useState("");
	const [genLoading, setGenLoading] = useState(false);
	const [payLoading, setPayLoading] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const toggleExpand = (id: string) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const filteredBatches = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return initialBatches ?? [];
		return (initialBatches ?? [])
			.map((batch: any) => ({
				...batch,
				hr_employee_payouts: (batch.hr_employee_payouts ?? []).filter((p: PayoutRow) => {
					const code = String(p.hr_employees?.employee_code ?? "").toLowerCase();
					const name = String(p.hr_employees?.name ?? "").toLowerCase();
					return code.includes(q) || name.includes(q);
				}),
			}))
			.filter((batch: any) => (batch.hr_employee_payouts ?? []).length > 0);
	}, [initialBatches, search]);

	const generate = async () => {
		setGenLoading(true);
		try {
			const res = await fetch("/api/hr/payouts/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ month }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success(`Payout calculated: ${data.month_label ?? month}`, {
				description:
					typeof data.period_from === "string" && typeof data.period_to === "string"
						? `${data.employees_processed ?? "—"} employees · attendance ${data.period_from} → ${data.period_to} · shortfall uses weekly buckets (prorated at month edges).`
						: "Open the batch below for hours, rates, and weekly breakdown.",
				duration: 8000,
			});
			router.refresh();
		} finally {
			setGenLoading(false);
		}
	};

	const pay = async (rowId: string, amount: number) => {
		setPayLoading(rowId);
		try {
			const res = await fetch("/api/hr/payouts/pay", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: rowId, paid_amount: amount }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success("Payment recorded");
			router.refresh();
		} finally {
			setPayLoading(null);
		}
	};

	const batches = filteredBatches;
	const searchActive = search.trim().length > 0;

	return (
		<div className="space-y-6">
			{/* Glassmorphism Filters Block */}
			<Card className="border border-zinc-200/80 bg-zinc-50/50 rounded-3xl p-5 shadow-3xs overflow-hidden">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="flex flex-wrap items-end gap-4 flex-1">
						{/* Month selector */}
						<div className="w-full sm:w-48">
							<label htmlFor="payout-month" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400">
								Month
							</label>
							<Input
								id="payout-month"
								type="month"
								className="h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs bg-white shadow-3xs"
								value={month}
								onChange={(e) => setMonth(e.target.value)}
							/>
						</div>

						{/* Calculate Payout button */}
						<Button 
							type="button" 
							onClick={() => void generate()} 
							disabled={genLoading} 
							className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs hover:shadow transition-all duration-300 flex items-center justify-center gap-1.5 px-4 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
						>
							{genLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
							Calculate payout for month
						</Button>
					</div>

					{/* Search input */}
					<div className="w-full md:w-72 shrink-0">
						<label htmlFor="payout-search" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
							<span>🔍</span> Search employee
						</label>
						<div className="relative group">
							<Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-all duration-300 group-hover:text-zinc-650 group-focus-within:text-teal-650 group-focus-within:scale-105" />
							<Input
								id="payout-search"
								placeholder="Code or name…"
								className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs bg-white shadow-3xs"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
					</div>
				</div>

				<div className="mt-4 border-t border-zinc-200/50 pt-3.5 flex flex-wrap items-center justify-between gap-3 text-[10px] text-zinc-500 font-semibold leading-relaxed">
					<p className="max-w-xl">
						ℹ️ Uses calendar month boundaries. Attendance rows must fall in this range. Re-running replaces lines in the same batch (same month label) only.
					</p>
					{searchActive && batches.length === 0 ? (
						<p className="font-extrabold text-amber-700 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-3xs">
							⚠️ No matches found in any batch
						</p>
					) : null}
				</div>
			</Card>

			{!(initialBatches ?? []).length ? (
				<div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-3xl p-16 text-center bg-white shadow-3xs max-w-lg mx-auto">
					<div className="h-14 w-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-2xl text-zinc-400 mb-4 shadow-3xs">
						💳
					</div>
					<h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider">No payout batches found</h3>
					<p className="text-xs text-zinc-500 max-w-xs mt-2 leading-relaxed font-bold">
						Please pick a calendar month scope above and run the calculator engine to initialize employee salary records.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{batches.map((batch: any) => {
						const isDraft = String(batch.status).toLowerCase().includes("draft");
						return (
							<Card key={batch.id} className="overflow-hidden rounded-3xl border border-zinc-200 shadow-3xs hover:shadow-xs transition-all duration-300 bg-white">
								{/* Card header */}
								<div className="border-b border-zinc-150 bg-zinc-50/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
									<div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
										<span className="text-sm font-black text-zinc-800">{batch.month_label}</span>
										<span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-3xs ${
											isDraft ? "bg-amber-50 text-amber-700 border-amber-150" : "bg-emerald-50 text-emerald-700 border-emerald-150"
										}`}>
											{batch.status}
										</span>
									</div>
									<span className="text-[10px] text-zinc-500 font-bold bg-white border border-zinc-150 rounded-xl px-3 py-1 shadow-3xs flex items-center gap-1.5 shrink-0 self-start sm:self-center">
										<span>👥</span>
										<span>
											{(batch.hr_employee_payouts ?? []).length} employee{(batch.hr_employee_payouts ?? []).length === 1 ? "" : "s"}
											{searchActive ? " (filtered)" : ""}
										</span>
									</span>
								</div>

								{/* Desktop spreadsheet view */}
								<div className="hidden md:block overflow-x-auto -mx-1 px-1 [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
									<table className="w-full min-w-[1250px] text-xs border-collapse">
										<thead>
											<tr className="bg-zinc-50/40 border-b border-zinc-150 text-left text-zinc-500 font-bold">
												<th className="sticky left-0 z-30 w-12 min-w-[3rem] max-w-[3rem] py-3 pr-1 bg-zinc-50 dark:bg-zinc-900 text-center" aria-hidden />
												<th className="sticky left-12 z-30 py-3 pr-2 min-w-[12rem] bg-zinc-50 dark:bg-zinc-900 font-black text-[9px] uppercase tracking-wider text-zinc-400">Employee</th>
												<th className="py-3 pr-2 font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Salary type from HR master">Type</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Days with worked hours > 0">Days</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Sum of duration from attendance">Work h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Prorated required hours for the month">Req h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="After grace hours per week">Short h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Overtime hours from attendance">OT h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Rate used for shortfall deduction">Reg ₹/h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400" title="Overtime pay rate">OT ₹/h</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Base</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Deduct</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">OT pay</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Net</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Paid</th>
												<th className="py-3 pr-2 text-right font-black text-[9px] uppercase tracking-wider text-zinc-400">Due</th>
												<th className="py-3 pr-2 font-black text-[9px] uppercase tracking-wider text-zinc-400">Status</th>
												<th className="py-3 min-w-[7.5rem] font-black text-[9px] uppercase tracking-wider text-zinc-400">Pay</th>
											</tr>
										</thead>
										<tbody>
											{(batch.hr_employee_payouts ?? []).map((p: PayoutRow) => {
												const emp = p.hr_employees ?? {};
												const st = (emp.salary_type ?? "monthly") as HrSalaryType;
												const sr = Number(emp.salary_rate ?? 0);
												const rh = Number(emp.required_hours_per_week ?? 48);
												const otRate = Number(emp.overtime_rate ?? 0);
												const dedOn = emp.deduction_enabled !== false;
												const regHr = computeRegularHourlyEquivalent(st, sr, rh);
												const isOpen = Boolean(expanded[p.id]);
												const weeks = Array.isArray(p.weekly_breakdown) ? p.weekly_breakdown : [];
												
												const initials = getInitials(emp.name ?? "");
												const bgClass = bgColors[p.id.charCodeAt(0) % bgColors.length];

												return (
													<Fragment key={p.id}>
														<tr className="border-b border-zinc-100 dark:border-zinc-800 align-middle hover:bg-zinc-50/20 transition-colors">
															<td className="py-2.5 pr-1 text-center sticky left-0 z-20 bg-white dark:bg-zinc-900 w-12 min-w-[3rem] max-w-[3rem] shrink-0">
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className={`h-7.5 w-7.5 p-0 rounded-xl transition-all duration-300 flex items-center justify-center mx-auto shadow-3xs hover:shadow-2xs cursor-pointer ${
																		isOpen 
																			? "bg-teal-50 text-teal-600 border-teal-150 hover:bg-teal-100 hover:border-teal-200" 
																			: "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
																	}`}
																	onClick={() => toggleExpand(p.id)}
																	aria-expanded={isOpen}
																	aria-label={isOpen ? "Hide weekly breakdown" : "Show weekly breakdown"}
																>
																	{isOpen ? (
																		<ChevronDown className="h-3.5 w-3.5 shrink-0" />
																	) : (
																		<ChevronRight className="h-3.5 w-3.5 shrink-0" />
																	)}
																</Button>
															</td>
															<td className="sticky left-12 z-20 py-2.5 pr-2 bg-white dark:bg-zinc-900 min-w-[12rem]">
																<div className="flex items-center gap-2">
																	<div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${bgClass}`}>
																		{initials}
																	</div>
																	<div className="min-w-0">
																		<div className="font-extrabold text-zinc-800 text-[11px] leading-tight truncate max-w-[9.5rem]">{emp.name ?? "—"}</div>
																		<div className="font-mono text-[9px] font-bold text-zinc-400 leading-none">#{emp.employee_code ?? "—"}</div>
																	</div>
																</div>
																<div className="mt-1 text-[9px] leading-snug text-zinc-400 font-bold max-w-[11.2rem] break-words text-wrap">
																	{describeSalaryBasis({
																		salary_type: String(emp.salary_type ?? "monthly"),
																		salary_rate: sr,
																		presentDays: Number(p.total_days ?? 0),
																		totalWorkedHours: Number(p.total_hours ?? 0),
																		requiredHoursMonth: Number(p.required_hours ?? 0),
																	})}
																	{!dedOn ? " · Shortfall deduction off" : ""}
																</div>
															</td>
															<td className="py-2.5 pr-2 capitalize text-xs font-bold text-zinc-600">
																{emp.salary_type ?? "—"}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{p.total_days ? <span className="text-zinc-700 font-bold">{p.total_days}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.total_hours) ? <span className="text-zinc-700 font-bold">{fmtHours(Number(p.total_hours))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.required_hours) ? <span className="text-zinc-600 font-semibold">{fmtHours(Number(p.required_hours))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.short_hours) ? <span className="text-amber-700 font-black bg-amber-50/50 px-1.5 py-0.5 rounded">{fmtHours(Number(p.short_hours))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.overtime_hours) ? <span className="text-emerald-700 font-black bg-emerald-50/50 px-1.5 py-0.5 rounded">{fmtHours(Number(p.overtime_hours))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td
																className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs text-zinc-600 font-semibold"
																title={describeRegularRateBasis(String(emp.salary_type ?? "monthly"), rh)}
															>
																{formatCurrency(regHr)}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{otRate > 0 ? <span className="text-zinc-700 font-semibold">{formatCurrency(otRate)}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs text-zinc-700 font-bold">
																{formatCurrency(Number(p.base_salary))}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.deduction_amount) > 0 ? <span className="text-amber-800 font-black bg-amber-50/50 px-1.5 py-0.5 rounded-lg">{formatCurrency(Number(p.deduction_amount))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.overtime_pay) > 0 ? <span className="text-emerald-700 font-black bg-emerald-50/50 px-1.5 py-0.5 rounded-lg">{formatCurrency(Number(p.overtime_pay))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																<span className="font-extrabold text-zinc-950 bg-zinc-50 border border-zinc-200/60 px-1.5 py-0.5 rounded-lg shadow-3xs">{formatCurrency(Number(p.final_salary))}</span>
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.paid_amount) > 0 ? <span className="text-emerald-700 font-extrabold bg-emerald-50/50 px-1.5 py-0.5 rounded-lg">{formatCurrency(Number(p.paid_amount))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 text-right font-mono tabular-nums text-xs">
																{Number(p.remaining_amount) > 0 ? <span className="text-amber-700 font-bold bg-amber-50/30 px-1.5 py-0.5 rounded-lg">{formatCurrency(Number(p.remaining_amount))}</span> : <span className="text-zinc-300 font-normal">—</span>}
															</td>
															<td className="py-2.5 pr-2 capitalize text-xs">
																<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-3xs ${
																	String(p.payout_status).toLowerCase() === "paid" 
																		? "bg-emerald-50 text-emerald-700 border-emerald-150" 
																		: "bg-amber-50 text-amber-700 border-amber-150"
																}`}>
																	<span className={`h-1.5 w-1.5 rounded-full ${
																		String(p.payout_status).toLowerCase() === "paid" ? "bg-emerald-500" : "bg-amber-500"
																	}`} />
																	{p.payout_status}
																</span>
															</td>
															<td className="py-2.5">
																<div className="flex items-center gap-1.5">
																	<Input
																		className="h-8 w-20 text-xs font-bold rounded-xl border-zinc-200 shadow-3xs focus-visible:ring-4 focus-visible:ring-teal-500/8 bg-white"
																		type="number"
																		id={`pay-${p.id}`}
																		placeholder="Amount"
																	/>
																	<Button
																		type="button"
																		size="sm"
																		disabled={payLoading === p.id}
																		className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-3xs hover:shadow-2xs transition-all px-3 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
																		onClick={() => {
																			const el = document.getElementById(`pay-${p.id}`) as HTMLInputElement | null;
																			const v = Number(el?.value ?? 0);
																			if (!v) return;
																			pay(p.id, v);
																		}}
																	>
																		{payLoading === p.id ? (
																			<Loader2 className="h-3 w-3 animate-spin" />
																		) : (
																			"Pay"
																		)}
																	</Button>
																</div>
															</td>
														</tr>
														{isOpen ? (
															<tr className="border-b border-zinc-150 bg-zinc-50/20">
																<td colSpan={18} className="px-3 py-4 sticky left-0">
																	<div className="space-y-3.5 w-[calc(100vw-4.2rem)] sm:w-full max-w-5xl">
																		<div className="flex items-center justify-between border-b border-zinc-150 pb-2">
																			<h4 className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
																				<span>📊</span> Weekly breakdown details
																			</h4>
																			<span className="text-[10px] text-zinc-400 font-bold">(shortfall &amp; deduction per ISO week; month edges prorated)</span>
																		</div>
																		
																		<WeeklyBreakdownTable weeks={weeks} />
																		
																		<div className="rounded-2xl border border-zinc-200/85 bg-white p-3.5 shadow-3xs text-[10px] text-zinc-500 font-semibold space-y-1.5">
																			<p className="flex items-start gap-1">
																				<span className="text-zinc-400">⚡</span>
																				<span><strong>Monthly:</strong> base is pro-rata of the monthly salary vs required hours in this month (no separate shortfall deduction that can exceed pay).</span>
																			</p>
																			<p className="flex items-start gap-1">
																				<span className="text-zinc-400">⚡</span>
																				<span><strong>Daily:</strong> base = days × day rate; shortfall deductions are capped so net cannot fall below the value of hours worked.</span>
																			</p>
																			<p className="flex items-start gap-1">
																				<span className="text-zinc-400">⚡</span>
																				<span><strong>Hourly:</strong> base = worked × rate; no norm shortfall deduction. OT pay = OT hours × OT ₹/h.</span>
																			</p>
																			<p className="flex items-start gap-1">
																				<span className="text-zinc-400">⚡</span>
																				<span><strong>Reg ₹/h:</strong> package implied rate for reference (weekly table still shows theoretical shortfall per week).</span>
																			</p>
																		</div>
																	</div>
																</td>
															</tr>
														) : null}
													</Fragment>
												);
											})}
										</tbody>
									</table>
								</div>

								{/* Mobile Card list view */}
								<div className="block md:hidden divide-y divide-zinc-150">
									{(batch.hr_employee_payouts ?? []).map((p: PayoutRow) => {
										const emp = p.hr_employees ?? {};
										const st = (emp.salary_type ?? "monthly") as HrSalaryType;
										const sr = Number(emp.salary_rate ?? 0);
										const rh = Number(emp.required_hours_per_week ?? 48);
										const otRate = Number(emp.overtime_rate ?? 0);
										const dedOn = emp.deduction_enabled !== false;
										const regHr = computeRegularHourlyEquivalent(st, sr, rh);
										const isOpen = Boolean(expanded[p.id]);
										const weeks = Array.isArray(p.weekly_breakdown) ? p.weekly_breakdown : [];
										const initials = getInitials(emp.name ?? "");
										const bgClass = bgColors[p.id.charCodeAt(0) % bgColors.length];

										return (
											<div key={p.id} className="p-4 space-y-4 bg-white hover:bg-zinc-50/20 transition-colors">
												{/* Employee header */}
												<div className="flex items-start justify-between gap-3">
													<div className="flex items-center gap-2.5">
														<div className={`h-8.5 w-8.5 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${bgClass}`}>
															{initials}
														</div>
														<div className="min-w-0">
															<div className="font-extrabold text-zinc-800 text-xs.5 leading-tight truncate max-w-[12rem]">{emp.name ?? "—"}</div>
															<div className="flex items-center gap-1.5 mt-0.5">
																<span className="font-mono text-[9px] font-bold text-zinc-400">#{emp.employee_code ?? "—"}</span>
																<span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-850 rounded px-1.5 py-0.5 capitalize">{emp.salary_type ?? "—"}</span>
															</div>
														</div>
													</div>
													
													{/* Status badge */}
													<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider shadow-3xs ${
														String(p.payout_status).toLowerCase() === "paid" 
															? "bg-emerald-50 text-emerald-700 border-emerald-150" 
															: "bg-amber-50 text-amber-700 border-amber-150"
													}`}>
														<span className={`h-1 w-1 rounded-full ${
															String(p.payout_status).toLowerCase() === "paid" ? "bg-emerald-500" : "bg-amber-500"
														}`} />
														{p.payout_status}
													</span>
												</div>

												{/* Calculation basis subtext */}
												<div className="text-[10px] leading-relaxed text-zinc-400 font-bold bg-zinc-50/40 rounded-2xl p-3 border border-zinc-150/40">
													{describeSalaryBasis({
														salary_type: String(emp.salary_type ?? "monthly"),
														salary_rate: sr,
														presentDays: Number(p.total_days ?? 0),
														totalWorkedHours: Number(p.total_hours ?? 0),
														requiredHoursMonth: Number(p.required_hours ?? 0),
													})}
													{!dedOn ? " · Shortfall deduction off" : ""}
												</div>

												{/* Quick stats grid */}
												<div className="grid grid-cols-3 gap-3 text-xs bg-zinc-50/30 rounded-2xl p-3.5 border border-zinc-100/60">
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Days</div>
														<div className="font-bold text-zinc-700 mt-0.5">{p.total_days ?? 0} days</div>
													</div>
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Worked</div>
														<div className="font-bold text-zinc-700 mt-0.5">{fmtHours(p.total_hours ?? 0)} h</div>
													</div>
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Required</div>
														<div className="font-bold text-zinc-600 mt-0.5">{fmtHours(p.required_hours ?? 0)} h</div>
													</div>
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Short h</div>
														<div className="font-bold text-amber-700 mt-0.5">{fmtHours(p.short_hours ?? 0)} h</div>
													</div>
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">OT h</div>
														<div className="font-bold text-emerald-700 mt-0.5">{fmtHours(p.overtime_hours ?? 0)} h</div>
													</div>
													<div>
														<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">OT rate</div>
														<div className="font-bold text-zinc-700 mt-0.5">{otRate > 0 ? formatCurrency(otRate) : "—"}</div>
													</div>
												</div>

												{/* Financial values card */}
												<div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50/10 rounded-2xl p-3 border border-zinc-100">
													<div className="flex items-center justify-between border-r border-zinc-150/40 pr-2">
														<span className="text-zinc-400 font-bold text-[10px]">Base:</span>
														<span className="font-bold text-zinc-700">{formatCurrency(p.base_salary)}</span>
													</div>
													<div className="flex items-center justify-between pl-2">
														<span className="text-zinc-400 font-bold text-[10px]">Deduct:</span>
														<span className="font-bold text-amber-800">-{formatCurrency(p.deduction_amount)}</span>
													</div>
													<div className="flex items-center justify-between border-r border-zinc-150/40 pr-2 pt-1">
														<span className="text-zinc-400 font-bold text-[10px]">OT Pay:</span>
														<span className="font-bold text-emerald-700">+{formatCurrency(p.overtime_pay)}</span>
													</div>
													<div className="flex items-center justify-between pl-2 pt-1">
														<span className="text-zinc-400 font-bold text-[10px]">Net:</span>
														<span className="font-black text-zinc-900">{formatCurrency(p.final_salary)}</span>
													</div>
												</div>

												{/* Paid & Due status tracker */}
												<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-teal-50/10 rounded-2xl p-3.5 border border-teal-150/20">
													<div className="flex items-center gap-4">
														<div>
															<span className="text-zinc-400 font-bold text-[10px]">Paid: </span>
															<span className="font-extrabold text-emerald-700">{formatCurrency(p.paid_amount)}</span>
														</div>
														<div>
															<span className="text-zinc-400 font-bold text-[10px]">Due: </span>
															<span className={`font-black ${Number(p.remaining_amount) > 0 ? "text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" : "text-zinc-450"}`}>
																{formatCurrency(p.remaining_amount)}
															</span>
														</div>
													</div>

													{/* Payment Action form */}
													<div className="flex items-center gap-2 w-full text-xs">
														<Input
															className="h-9 flex-1 text-xs font-bold rounded-xl border-zinc-200 shadow-3xs focus-visible:ring-4 focus-visible:ring-teal-500/8 bg-white text-right"
															type="number"
															id={`pay-mob-${p.id}`}
															placeholder="Amount"
															defaultValue={p.remaining_amount > 0 ? String(p.remaining_amount) : ""}
														/>
														<Button
															type="button"
															size="sm"
															disabled={payLoading === p.id}
															className="h-9 w-20 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-3xs hover:shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
															onClick={() => {
																const el = document.getElementById(`pay-mob-${p.id}`) as HTMLInputElement | null;
																const v = Number(el?.value ?? 0);
																if (!v) return;
																pay(p.id, v);
															}}
														>
															{payLoading === p.id ? (
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															) : (
																"Pay"
															)}
														</Button>
													</div>
												</div>

												{/* Drawer expand button */}
												<div>
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="w-full h-8.5 text-[10px] font-black text-zinc-500 hover:text-teal-600 bg-zinc-50 hover:bg-teal-50/20 rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 shadow-3xs border-zinc-200/80 cursor-pointer"
														onClick={() => toggleExpand(p.id)}
													>
														<span>📊</span>
														<span>{isOpen ? "Hide Weekly Breakdown" : "View Weekly Breakdown"}</span>
														{isOpen ? (
															<ChevronDown className="h-3.5 w-3.5 shrink-0" />
														) : (
															<ChevronRight className="h-3.5 w-3.5 shrink-0" />
														)}
													</Button>

													{/* Collapsible weekly table */}
													{isOpen ? (
														<div className="mt-3 space-y-3.5 p-3.5 rounded-2xl bg-zinc-50/50 border border-zinc-150/50">
															<div className="flex items-center justify-between pb-2 border-b border-zinc-200">
																<h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
																	<span>📊</span> Weekly details
																</h4>
																<span className="text-[8px] text-zinc-400 font-bold">(shortfall &amp; deduction per week)</span>
															</div>
															
															<WeeklyBreakdownTable weeks={weeks} />

															<div className="text-[9px] text-zinc-400 font-semibold space-y-1 mt-2.5">
																<p>• <strong>Monthly:</strong> base is pro-rata vs required hours in this month.</p>
																<p>• <strong>Daily:</strong> base = days × day rate; deductions capped.</p>
															</div>
														</div>
													) : null}
												</div>
											</div>
										);
									})}
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
