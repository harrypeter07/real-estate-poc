"use client";

import { useState, useMemo } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Card,
	CardContent,
	Button,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import type { HrEmployeeRow } from "@/app/actions/hr";
import { HrEmployeeDialog } from "@/components/hr/hr-employee-dialog";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import { 
	User, 
	Hash, 
	Phone, 
	Briefcase, 
	Coins, 
	Timer, 
	Clock, 
	Pencil, 
	Users, 
	Sparkles,
	Search,
	CreditCard
} from "lucide-react";

const bgColors = [
	"bg-teal-50 text-teal-700 border-teal-100/80 shadow-[0_2px_8px_rgba(13,148,136,0.05)]",
	"bg-blue-50 text-blue-700 border-blue-100/80 shadow-[0_2px_8px_rgba(59,130,246,0.05)]",
	"bg-indigo-50 text-indigo-700 border-indigo-100/80 shadow-[0_2px_8px_rgba(99,102,241,0.05)]",
	"bg-violet-50 text-violet-700 border-violet-100/80 shadow-[0_2px_8px_rgba(139,92,246,0.05)]",
	"bg-sky-50 text-sky-700 border-sky-100/80 shadow-[0_2px_8px_rgba(14,165,233,0.05)]",
	"bg-emerald-50 text-emerald-700 border-emerald-100/80 shadow-[0_2px_8px_rgba(16,185,129,0.05)]",
];

const getInitials = (name: string) => {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return (parts[0]?.[0] || "").toUpperCase();
};

export function HrEmployeesTable({ employees }: { employees: HrEmployeeRow[] }) {
	const [editTarget, setEditTarget] = useState<HrEmployeeRow | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return employees;
		return employees.filter((e) => {
			const nameMatch = e.name?.toLowerCase().includes(q);
			const codeMatch = e.employee_code?.toLowerCase().includes(q);
			const phoneMatch = e.phone?.toLowerCase().includes(q);
			return nameMatch || codeMatch || phoneMatch;
		});
	}, [employees, query]);

	if (!employees.length) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 max-w-lg mx-auto mt-6">
				<div className="h-16 w-16 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600 shadow-md mb-4 animate-pulse">
					<Users className="h-8 w-8" />
				</div>
				<h3 className="text-lg font-extrabold text-zinc-800">No Employees Found</h3>
				<p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
					Get started by creating your first HR staff employee profile to track attendance files and payroll.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Search Filter Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<ListSearchBar
					value={query}
					onChange={setQuery}
					placeholder="Search by name, employee code or phone number…"
					className="max-w-md w-full"
					inputClassName="h-10 text-xs rounded-2xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 font-bold hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] shadow-sm"
				/>
				<div className="text-[10px] text-zinc-400 font-bold self-end sm:self-center mr-2">
					Showing {filtered.length} of {employees.length} employees
				</div>
			</div>

			{/* Grid Card Layout for Mobile Screens (< md) */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:hidden">
				{filtered.length === 0 ? (
					<div className="col-span-full py-12 text-center text-zinc-500 border border-dashed rounded-2xl bg-zinc-50/50">
						<Search className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
						<p className="text-xs font-bold">No match found for &quot;{query}&quot;</p>
					</div>
				) : (
					filtered.map((e) => {
						const initials = getInitials(e.name);
						const bgClass = bgColors[e.name.length % bgColors.length];
						return (
							<Card 
								key={e.id}
								className="border border-zinc-200/80 shadow-xs rounded-2xl overflow-hidden bg-white active:scale-[0.99] hover:border-teal-500/30 transition-all duration-200 cursor-pointer"
								onClick={() => {
									setEditTarget(e);
									setEditOpen(true);
								}}
							>
								<CardContent className="p-4 space-y-4">
									{/* Card Header Info */}
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className={`h-10 w-10 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${bgClass}`}>
												{initials}
											</div>
											<div>
												<h4 className="font-extrabold text-sm text-zinc-800 line-clamp-1">
													{e.name}
												</h4>
												<span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-655 font-bold">
													<Hash className="h-3 w-3 opacity-60" />
													{e.employee_code}
												</span>
											</div>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 rounded-xl text-zinc-400 hover:text-teal-600 hover:bg-teal-50 shadow-none hover:shadow-xs shrink-0"
											onClick={(event) => {
												event.stopPropagation();
												setEditTarget(e);
												setEditOpen(true);
											}}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
									</div>

									{/* Divider */}
									<div className="border-t border-zinc-100" />

									{/* Card Details Body */}
									<div className="space-y-2">
										{/* Phone section */}
										{e.phone ? (
											<a 
												href={`tel:${e.phone}`}
												onClick={(event) => event.stopPropagation()}
												className="inline-flex items-center gap-2 text-xs font-bold text-teal-600 hover:underline hover:text-teal-700 bg-teal-50/50 border border-teal-100/50 rounded-xl px-2.5 py-1"
											>
												<Phone className="h-3.5 w-3.5" />
												<span className="font-mono">{e.phone}</span>
											</a>
										) : (
											<span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 bg-zinc-50 border border-zinc-200/50 rounded-xl px-2.5 py-1">
												<Phone className="h-3.5 w-3.5 opacity-60" />
												<span>No Phone</span>
											</span>
										)}

										{/* Structured Info Grid */}
										<div className="grid grid-cols-2 gap-2 mt-2">
											<div className="p-2 bg-zinc-50/60 border border-zinc-100/60 rounded-xl space-y-0.5">
												<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Salary Scheme</span>
												<div className="flex items-center gap-1 text-xs font-bold text-zinc-800 capitalize">
													<Briefcase className="h-3 w-3 text-zinc-400 shrink-0" />
													{e.salary_type}
												</div>
											</div>
											<div className="p-2 bg-zinc-50/60 border border-zinc-100/60 rounded-xl space-y-0.5">
												<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Salary Rate</span>
												<div className="flex items-center gap-1 text-xs font-black text-zinc-800">
													<CreditCard className="h-3 w-3 text-zinc-400 shrink-0" />
													{formatCurrency(Number(e.salary_rate))}
												</div>
											</div>
											<div className="p-2 bg-zinc-50/60 border border-zinc-100/60 rounded-xl space-y-0.5">
												<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Overtime Rate</span>
												<div className="flex items-center gap-1 text-xs font-bold text-zinc-800">
													<Coins className="h-3 w-3 text-teal-600/70 shrink-0" />
													{formatCurrency(Number(e.overtime_rate))}/hr
												</div>
											</div>
											<div className="p-2 bg-zinc-50/60 border border-zinc-100/60 rounded-xl space-y-0.5">
												<span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Work Hours Required</span>
												<div className="flex items-center gap-1 text-xs font-bold text-zinc-800">
													<Clock className="h-3 w-3 text-zinc-400 shrink-0" />
													{e.required_hours_per_week} hrs/wk
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			{/* Responsive Table Layout for Desktop Screens (>= md) */}
			<Card className="hidden md:block border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden bg-white transition-all duration-300">
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-zinc-50/50 sticky top-0 z-10 border-b border-zinc-200/80">
								<TableRow className="h-11 hover:bg-transparent border-b border-zinc-200/80">
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 w-[140px]">
										<span className="inline-flex items-center gap-1.5">
											<Hash className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Code
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Name
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Phone
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Type
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 text-right">
										<span className="inline-flex items-center gap-1.5 justify-end w-full">
											<CreditCard className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Salary
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 text-right">
										<span className="inline-flex items-center gap-1.5 justify-end w-full">
											<Coins className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											OT Rate
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 text-right w-[150px]">
										<span className="inline-flex items-center gap-1.5 justify-end w-full">
											<Timer className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Req Hrs/Wk
										</span>
									</TableHead>
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 text-right w-[90px]">
										<span className="inline-flex items-center gap-1.5 justify-end w-full">
											<Pencil className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Action
										</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.length === 0 ? (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={8} className="py-16 text-center">
											<div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
												<div className="h-12 w-12 rounded-full bg-zinc-55 border border-zinc-200 flex items-center justify-center text-zinc-450 shadow-inner">
													<Search className="h-5 w-5 text-zinc-400" />
												</div>
												<div className="space-y-1">
													<h4 className="text-xs font-extrabold text-zinc-800">No matching employees</h4>
													<p className="text-[11px] text-zinc-500 leading-relaxed">
														No results found for &quot;{query}&quot;. Try adjusting your search query.
													</p>
												</div>
											</div>
										</TableCell>
									</TableRow>
								) : (
									filtered.map((e) => {
										const initials = getInitials(e.name);
										const bgClass = bgColors[e.name.length % bgColors.length];
										return (
											<TableRow
												key={e.id}
												className="group cursor-pointer hover:bg-teal-500/[0.015] border-l-4 border-l-transparent hover:border-l-teal-500 border-b border-zinc-150 last:border-b-0 transition-all duration-200 shadow-none"
												onClick={() => {
													setEditTarget(e);
													setEditOpen(true);
												}}
											>
												<TableCell className="py-3 px-5 font-mono text-xs text-zinc-700 font-bold">
													<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200">
														{e.employee_code}
													</span>
												</TableCell>
												<TableCell className="py-3 px-5">
													<div className="flex items-center gap-3">
														<div className={`h-8 w-8 rounded-xl border flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm transition-transform duration-250 group-hover:scale-105 ${bgClass}`}>
															{initials}
														</div>
														<div className="min-w-0">
															<span className="block font-extrabold text-zinc-800 group-hover:text-teal-600 transition-colors truncate max-w-[180px] text-xs">
																{e.name}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="py-3 px-5 text-xs font-mono text-zinc-700 font-bold">
													{e.phone ? (
														<a 
															href={`tel:${e.phone}`}
															onClick={(event) => event.stopPropagation()}
															className="hover:underline hover:text-teal-600 inline-flex items-center gap-1"
														>
															{e.phone}
														</a>
													) : (
														<span className="text-zinc-400 font-sans font-medium">—</span>
													)}
												</TableCell>
												<TableCell className="py-3 px-5 text-xs font-bold text-zinc-600 capitalize">
													<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-50 border border-zinc-200 text-[11px]">
														<span className={`h-1.5 w-1.5 rounded-full ${
															e.salary_type === "monthly" ? "bg-teal-500" : e.salary_type === "daily" ? "bg-blue-500" : "bg-purple-500"
														}`} />
														{e.salary_type}
													</span>
												</TableCell>
												<TableCell className="py-3 px-5 text-right text-xs font-mono font-black text-zinc-800">
													{formatCurrency(Number(e.salary_rate))}
												</TableCell>
												<TableCell className="py-3 px-5 text-right text-xs font-mono font-bold text-zinc-800">
													<span className="text-teal-600 font-black">{formatCurrency(Number(e.overtime_rate))}</span>/hr
												</TableCell>
												<TableCell className="py-3 px-5 text-right text-xs font-mono font-bold text-zinc-700">
													{e.required_hours_per_week} hrs
												</TableCell>
												<TableCell className="py-3 px-5 text-right" onClick={(event) => event.stopPropagation()}>
													<Button
														size="icon"
														variant="ghost"
														className="h-8 w-8 rounded-xl text-zinc-500 hover:text-teal-600 hover:bg-teal-50 shadow-none hover:shadow-xs active:scale-95 transition-all duration-200"
														onClick={() => {
															setEditTarget(e);
															setEditOpen(true);
														}}
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Edit Employee Dialog Modal container */}
			{editTarget && (
				<HrEmployeeDialog
					variant="edit"
					employee={editTarget}
					open={editOpen}
					onOpenChange={(o) => {
						setEditOpen(o);
						if (!o) setEditTarget(null);
					}}
				/>
			)}
		</div>
	);
}

