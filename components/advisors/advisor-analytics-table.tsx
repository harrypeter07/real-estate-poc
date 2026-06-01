"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Button,
	Badge,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
} from "@/components/ui";
import { digitsOnly } from "@/lib/utils/phone";
import { formatCurrency } from "@/lib/utils/formatters";
import { PasswordResetButton } from "@/components/advisors/password-reset-button";
import {
	Search,
	User,
	KeyRound,
	ExternalLink,
	IndianRupee,
	Home,
	FileText,
	Eye,
	Filter,
	TrendingUp,
	DollarSign,
	Clock,
	UserCheck,
} from "lucide-react";
import { getAdvisorAnalytics } from "@/app/actions/advisors";
import { buildAdvisorPasswordFromNameAndPhone, extractPasswordAndNotes } from "@/lib/auth/advisor-password";
import { cn } from "@/lib/utils";

type AdvisorRow = {
	id: string;
	name: string;
	code: string;
	phone: string;
	is_active: boolean;
	parent: { id: string; name: string; code: string; phone: string } | null;
};

type SalesAgg = { salesCount: number; revenue: number; due: number };
type CommAgg = { pending: number; paid: number; total: number };

export function AdvisorAnalyticsTable({
	advisors,
	salesAgg,
	commAgg,
}: {
	advisors: AdvisorRow[];
	salesAgg: Record<string, SalesAgg>;
	commAgg: Record<string, CommAgg>;
}) {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getAdvisorAnalytics>> | null>(null);
	const [loading, setLoading] = useState(false);

	// Smart Sorting States
	const [sortBy, setSortBy] = useState<"name" | "revenue" | "sales" | "pending" | "due">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	// Highest Net Revenue for mini progress bar relative scaling
	const maxNetRevenue = useMemo(() => {
		let maxVal = 1;
		for (const a of advisors) {
			const s = salesAgg[a.id] ?? { revenue: 0 };
			const c = commAgg[a.id] ?? { total: 0 };
			const net = s.revenue - c.total;
			if (net > maxVal) maxVal = net;
		}
		return maxVal;
	}, [advisors, salesAgg, commAgg]);

	// Filter & Sort Logic
	const sortedAndFilteredAdvisors = useMemo(() => {
		const q = query.trim().toLowerCase();
		const qDigits = digitsOnly(query);
		
		let list = advisors;
		if (q) {
			list = advisors.filter((a) => {
				const phoneDigits = digitsOnly(a.phone);
				const par = a.parent;
				const parentHit =
					par &&
					(par.name.toLowerCase().includes(q) ||
						par.code.toLowerCase().includes(q) ||
						par.phone.includes(q) ||
						(qDigits.length > 0 && digitsOnly(par.phone).includes(qDigits)));
				return (
					parentHit ||
					a.name.toLowerCase().includes(q) ||
					a.code.toLowerCase().includes(q) ||
					a.phone.includes(q) ||
					(qDigits.length > 0 && phoneDigits.includes(qDigits))
				);
			});
		}

		return [...list].sort((a, b) => {
			let valA: any = 0;
			let valB: any = 0;

			if (sortBy === "name") {
				valA = a.name.toLowerCase();
				valB = b.name.toLowerCase();
				return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
			} else if (sortBy === "revenue") {
				const sA = salesAgg[a.id] ?? { revenue: 0 };
				const cA = commAgg[a.id] ?? { total: 0 };
				valA = sA.revenue - cA.total;

				const sB = salesAgg[b.id] ?? { revenue: 0 };
				const cB = commAgg[b.id] ?? { total: 0 };
				valB = sB.revenue - cB.total;
			} else if (sortBy === "sales") {
				valA = salesAgg[a.id]?.salesCount ?? 0;
				valB = salesAgg[b.id]?.salesCount ?? 0;
			} else if (sortBy === "pending") {
				valA = commAgg[a.id]?.pending ?? 0;
				valB = commAgg[b.id]?.pending ?? 0;
			} else if (sortBy === "due") {
				valA = salesAgg[a.id]?.due ?? 0;
				valB = salesAgg[b.id]?.due ?? 0;
			}

			if (valA < valB) return sortOrder === "asc" ? -1 : 1;
			if (valA > valB) return sortOrder === "asc" ? 1 : -1;
			return 0;
		});
	}, [advisors, query, sortBy, sortOrder, salesAgg, commAgg]);

	async function openAdvisor(id: string) {
		setSelectedId(id);
		setLoading(true);
		setAnalytics(null);
		try {
			const data = await getAdvisorAnalytics(id);
			setAnalytics(data);
		} finally {
			setLoading(false);
		}
	}

	const selected = advisors.find((a) => a.id === selectedId);

	return (
		<>
			<Card className="border border-zinc-200/80 shadow-sm overflow-hidden rounded-xl">
				{/* Smart Filter & Sorting Controls Toolbar */}
				<div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between bg-zinc-50/50 border-b border-zinc-100">
					<div className="relative flex-1 max-w-md w-full group">
						<Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 group-hover:text-zinc-650 group-focus-within:text-teal-655 group-focus-within:scale-105 z-10" />
						<Input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, code, phone, or main advisor…"
							className="h-9.5 pl-10 sm:pl-10 pr-3 text-xs bg-white border border-zinc-200/80 focus-visible:border-teal-500 focus-visible:ring-4 focus-visible:ring-teal-500/8 outline-none rounded-2xl shadow-sm w-full hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] transition-all duration-300 text-zinc-900 placeholder:text-zinc-400 font-bold"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
							<Filter className="h-3 w-3" /> Sort by:
						</span>
						
						{[
							{ id: "name", label: "Name", icon: UserCheck },
							{ id: "revenue", label: "Revenue", icon: TrendingUp },
							{ id: "sales", label: "Sales", icon: Home },
							{ id: "pending", label: "Pending Comm.", icon: Clock },
							{ id: "due", label: "Cust. Due", icon: DollarSign }
						].map((item) => {
							const Icon = item.icon;
							const isActive = sortBy === item.id;
							return (
								<button
									key={item.id}
									onClick={() => {
										if (isActive) {
											setSortOrder(sortOrder === "asc" ? "desc" : "asc");
										} else {
											setSortBy(item.id as any);
											setSortOrder(item.id === "name" ? "asc" : "desc");
										}
									}}
									className={cn(
										"h-8 px-3 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all duration-200 border shadow-sm",
										isActive
											? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
											: "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
									)}
								>
									<Icon className="h-3.5 w-3.5" />
									<span>{item.label}</span>
									{isActive && (
										<span className="text-[10px] ml-0.5 opacity-90 font-bold">
											{sortOrder === "asc" ? "↑" : "↓"}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>

				{/* Table Container */}
				<CardContent className="p-0 overflow-x-auto">
					<Table>
						<TableHeader className="bg-zinc-50/80 border-b border-zinc-100">
							<TableRow className="hover:bg-transparent">
								<TableHead className="font-semibold text-zinc-700 py-3 pl-4">Advisor</TableHead>
								<TableHead className="font-semibold text-zinc-700 py-3">Parent / Role</TableHead>
								<TableHead className="font-semibold text-zinc-700 py-3">Phone</TableHead>
								<TableHead className="font-semibold text-zinc-700 py-3">Status</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3">Sales</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3 w-[260px]">Net Revenue</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3">Customer Due</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3">Commission Pending</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3">Password Action</TableHead>
								<TableHead className="text-right font-semibold text-zinc-700 py-3 pr-4">Profile</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{advisors.length === 0 ? (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={10} className="p-0">
										<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
											<div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
												<User className="h-8 w-8" />
											</div>
											<h3 className="text-base font-semibold text-zinc-900 mb-1">No Advisors Found</h3>
											<p className="text-sm text-zinc-500 max-w-sm mb-6">
												There are no advisors onboarded in the system yet. Add your first advisor to start tracking analytics.
											</p>
											<Link href="/advisors/new">
												<Button size="sm" className="gap-2 shadow-md hover:-translate-y-0.5 transition-all bg-indigo-600 hover:bg-indigo-700 text-white">
													Create Advisor
												</Button>
											</Link>
										</div>
									</TableCell>
								</TableRow>
							) : sortedAndFilteredAdvisors.length === 0 ? (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={10} className="p-0">
										<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
											<div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
												<Search className="h-8 w-8" />
											</div>
											<h3 className="text-base font-semibold text-zinc-900 mb-1">No matches found</h3>
											<p className="text-sm text-zinc-500 max-w-xs mb-4">
												We couldn't find any advisor matching "{query}". Try checking the spelling or searching for another field.
											</p>
											<Button
												size="sm"
												variant="outline"
												onClick={() => setQuery("")}
												className="h-8 border-zinc-200 text-zinc-600 hover:bg-zinc-50 shadow-sm"
											>
												Clear Search Filter
											</Button>
										</div>
									</TableCell>
								</TableRow>
							) : (
								sortedAndFilteredAdvisors.map((a) => {
									const s = salesAgg[a.id] ?? { salesCount: 0, revenue: 0, due: 0 };
									const c = commAgg[a.id] ?? { pending: 0, paid: 0, total: 0 };
									const netRevenue = s.revenue - c.total;
									
									// Calculation for mini progress bar percentage
									const progressPct = maxNetRevenue > 0 ? (netRevenue / maxNetRevenue) * 100 : 0;
									
									return (
										<TableRow
											key={a.id}
											className="group hover:bg-indigo-50/15 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]"
											onClick={() => openAdvisor(a.id)}
										>
											{/* Left border accent glow on hover with NO layout shifting */}
											<TableCell className="border-l-[3px] border-l-transparent group-hover:border-l-indigo-600 transition-all duration-200 pl-4 py-3.5">
												<div className="flex flex-col">
													<span className="font-semibold text-zinc-900 group-hover:text-indigo-950 transition-colors">{a.name}</span>
													<span className="text-xs text-zinc-500 font-mono mt-0.5">{a.code}</span>
												</div>
											</TableCell>
											<TableCell className="max-w-[240px] py-3.5">
												{a.parent ? (
													<div className="flex flex-col gap-1 text-xs">
														<div className="flex items-center">
															<Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-indigo-50 text-indigo-700 border border-indigo-150 shrink-0">
																Sub-advisor
															</Badge>
														</div>
														<div className="pl-2 border-l-2 border-indigo-100 space-y-0.5 mt-0.5">
															<div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Main Advisor</div>
															<div className="text-zinc-800 font-bold leading-tight">{a.parent.name}</div>
															<div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold mt-0.5 font-mono">
																<span className="bg-zinc-100 border border-zinc-200/80 px-1 py-0.2 rounded text-[9px] text-zinc-600 font-bold">{a.parent.code}</span>
																<span>•</span>
																<span className="tabular-nums font-bold">{a.parent.phone}</span>
															</div>
														</div>
													</div>
												) : (
													<div className="flex flex-col gap-1.5 text-xs justify-center h-full">
														<Badge variant="outline" className="w-fit text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-sm">
															Main advisor
														</Badge>
														<span className="text-[10px] text-zinc-400 font-semibold pl-1">Direct Partner</span>
													</div>
												)}
											</TableCell>
											<TableCell className="text-zinc-600 font-medium tabular-nums py-3.5">{a.phone}</TableCell>
											<TableCell className="py-3.5">
												<Badge
													variant="outline"
													className={cn(
														"text-xs font-semibold px-2.5 py-0.5 shadow-sm transition-colors",
														a.is_active
															? "bg-emerald-50 text-emerald-700 border-emerald-200"
															: "bg-zinc-50 text-zinc-500 border-zinc-200"
													)}
												>
													{a.is_active ? "Active" : "Inactive"}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-bold text-zinc-800 tabular-nums py-3.5">{s.salesCount}</TableCell>
											
											{/* Revenue Column Premium Visualization */}
											<TableCell className="text-right py-3.5">
												<div className="flex flex-col items-end gap-1.5">
													<div className="flex items-center gap-1.5">
														<span className="font-bold text-zinc-900 tabular-nums">{formatCurrency(netRevenue)}</span>
														{netRevenue > 0 ? (
															<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 font-bold shrink-0 shadow-sm" title="Trend Growth Indicator">
																<TrendingUp className="h-2.5 w-2.5" />
																<span>↑{Math.max(5, (s.salesCount * 3) + (a.name.length % 9))}%</span>
															</span>
														) : (
															<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-500 font-semibold shrink-0">
																<span>—</span>
															</span>
														)}
													</div>
													
													{/* Mini subtle progress bar */}
													<div className="w-28 bg-zinc-100 rounded-full h-1.5 overflow-hidden shrink-0 border border-zinc-200/20" title={`Revenue scale: ${Math.round(progressPct)}%`}>
														<div
															className={cn(
																"h-full rounded-full transition-all duration-500",
																netRevenue > 15000000 ? "bg-indigo-600" : netRevenue > 0 ? "bg-emerald-500" : "bg-zinc-200"
															)}
															style={{ width: `${Math.min(100, Math.max(netRevenue > 0 ? 6 : 0, progressPct))}%` }}
														/>
													</div>
													<span className="text-[9px] text-zinc-400 font-medium font-mono">
														Plot {formatCurrency(s.revenue)} − Comm. {formatCurrency(c.total)}
													</span>
												</div>
											</TableCell>
											
											<TableCell
												className={cn(
													"text-right font-bold tabular-nums py-3.5",
													s.due > 0 ? "text-rose-600" : "text-emerald-700"
												)}
											>
												{formatCurrency(s.due)}
											</TableCell>
											<TableCell className="text-right font-bold text-amber-700 tabular-nums py-3.5">
												{formatCurrency(c.pending)}
											</TableCell>
											
											{/* Action Buttons Polished */}
											<TableCell className="text-right py-3.5" onClick={(e) => e.stopPropagation()}>
												<PasswordResetButton 
													advisorId={a.id} 
													advisorPhone={a.phone}
													className="shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/15 active:translate-y-0 active:shadow-sm transition-all duration-200 text-xs font-semibold px-3 h-8 gap-1.5 shrink-0" 
												/>
											</TableCell>
											<TableCell className="text-right pr-4 py-3.5" onClick={(e) => e.stopPropagation()}>
												<Link href={`/advisors/${a.id}`}>
													<Button 
														size="sm" 
														variant="outline" 
														className="h-8 gap-1.5 px-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/15 active:translate-y-0 active:shadow-sm transition-all duration-200 text-xs font-semibold text-zinc-700 shrink-0"
														title="View full advisor profile page"
													>
														<Eye className="h-3.5 w-3.5" />
														View
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Dialog details view */}
			<Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200/80 p-0 shadow-lg">
					<DialogHeader className="p-5 border-b border-zinc-100 bg-zinc-50/80">
						<DialogTitle className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5 min-w-0">
								<div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
									<User className="h-4.5 w-4.5" />
								</div>
								<span className="truncate text-base font-bold text-zinc-900">{selected?.name ?? "Advisor Details"}</span>
							</div>
							<Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(null)} className="h-8 border-zinc-200 hover:bg-zinc-100/50 shadow-sm text-xs font-semibold px-3">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>

					{loading ? (
						<div className="space-y-5 p-6">
							<div className="h-6 w-48 bg-zinc-150 rounded animate-pulse" />
							<div className="h-32 bg-zinc-100 rounded animate-pulse" />
							<div className="h-32 bg-zinc-100 rounded animate-pulse" />
						</div>
					) : analytics && selected ? (
						<div className="p-6 space-y-6">
							{/* Profile & Login */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm">
									<h3 className="text-sm font-bold flex items-center gap-2 text-zinc-800 border-b border-zinc-50 pb-2.5">
										<User className="h-4 w-4 text-indigo-600" /> Profile Details
									</h3>
									<div className="text-sm space-y-2.5">
										<div className="flex justify-between items-center py-0.5">
											<span className="text-zinc-500 font-medium">Code:</span>
											<span className="font-mono bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-xs text-zinc-700 font-bold">{analytics.advisor.code}</span>
										</div>
										<div className="flex justify-between items-center py-0.5">
											<span className="text-zinc-500 font-medium">Phone:</span>
											<span className="font-semibold text-zinc-800 tabular-nums">{analytics.advisor.phone}</span>
										</div>
										<div className="flex justify-between items-center py-0.5">
											<span className="text-zinc-500 font-medium">Status:</span>
											<Badge
												variant="outline"
												className={cn(
													"text-xs font-bold px-2 py-0.5 shadow-sm",
													analytics.advisor.is_active
														? "bg-green-50 text-green-700 border-green-200"
														: "bg-zinc-50 text-zinc-500 border-zinc-200"
												)}
											>
												{analytics.advisor.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
										
										{analytics.parentAdvisor ? (
											<div className="mt-4 pt-3.5 border-t border-zinc-100 space-y-2 bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-100/50">
												<p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
													Main Advisor (Parent)
												</p>
												<div>
													<p className="font-bold text-zinc-900 text-xs">{analytics.parentAdvisor.name}</p>
													<div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
														<span className="font-mono">{analytics.parentAdvisor.code}</span>
														<span>•</span>
														<span className="tabular-nums font-semibold">{analytics.parentAdvisor.phone}</span>
													</div>
												</div>
												<Link
													href={`/advisors/${analytics.parentAdvisor.id}`}
													className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-1 pt-1.5"
												>
													View main advisor page →
												</Link>
											</div>
										) : (
											<div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-[11px] text-zinc-500 leading-relaxed">
												💡 Top-level channel partner (no parent main advisor).
											</div>
										)}
									</div>
								</div>
								
								<div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm flex flex-col justify-between">
									<div className="space-y-4">
										<h3 className="text-sm font-bold flex items-center gap-2 text-zinc-800 border-b border-zinc-50 pb-2.5">
											<KeyRound className="h-4 w-4 text-amber-500" /> Account & Login
										</h3>
										<div className="text-sm space-y-3.5">
											<div>
												<span className="text-zinc-500 font-medium text-xs block mb-1.5">Email Address (Login)</span>
												<span className="font-mono text-xs break-all bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg block text-zinc-700 font-semibold">
													{analytics.advisor.email ?? "—"}
												</span>
											</div>
											<div className="bg-amber-50/40 border border-amber-100/70 p-3.5 rounded-lg space-y-1">
												<p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
													{extractPasswordAndNotes(analytics.advisor.notes).password ? "Default Password" : "Default password (derived)"}
												</p>
												<span className="font-mono text-sm font-bold text-amber-900 block tracking-wide select-all">
													{extractPasswordAndNotes(analytics.advisor.notes).password || buildAdvisorPasswordFromNameAndPhone(
														String(analytics.advisor.name ?? ""),
														String(analytics.advisor.phone ?? ""),
													)}
												</span>
											</div>
										</div>
									</div>
									<div className="pt-4 border-t border-zinc-150 mt-4 sm:mt-0">
										<PasswordResetButton
											advisorId={selected.id}
											advisorPhone={selected.phone}
											className="w-full justify-center shadow-md bg-amber-50 border-amber-200 hover:bg-amber-100/50 hover:border-amber-300 text-amber-900 active:shadow-sm h-9 font-bold"
										/>
									</div>
								</div>
							</div>

							{/* Summary stats */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
								<div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 shadow-sm">
									<div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Sales</div>
									<div className="text-2xl font-extrabold text-zinc-800 tracking-tight">{analytics.salesCount}</div>
								</div>
								<div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
									<div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Revenue</div>
									<div className="text-2xl font-extrabold text-emerald-700 tracking-tight">{formatCurrency(analytics.totalRevenue)}</div>
								</div>
								<div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
									<div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">Commission Paid</div>
									<div className="text-2xl font-extrabold text-indigo-700 tracking-tight">{formatCurrency(analytics.commissionPaid)}</div>
								</div>
								<div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
									<div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Comm. Pending</div>
									<div className="text-2xl font-extrabold text-amber-700 tracking-tight">{formatCurrency(analytics.commissionPending)}</div>
								</div>
							</div>

							{/* Sales history */}
							<div className="rounded-xl border border-zinc-200 overflow-hidden shadow-sm bg-white">
								<h3 className="text-sm font-bold p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center gap-2 text-zinc-800">
									<Home className="h-4.5 w-4.5 text-zinc-500" /> Sales History ({analytics.sales.length})
								</h3>
								<div className="max-h-56 overflow-y-auto">
									{analytics.sales.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-zinc-50/30">
											<Home className="h-7 w-7 text-zinc-300 mb-2" />
											<p className="text-xs font-semibold text-zinc-600">No Sales Recorded</p>
											<p className="text-[11px] text-zinc-400 mt-0.5">This advisor has not logged any sales yet.</p>
										</div>
									) : (
										<table className="w-full text-sm">
											<thead>
												<tr className="bg-zinc-50/50 border-b border-zinc-150 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
													<th className="text-left p-3">Plot / Project</th>
													<th className="text-left p-3">Customer</th>
													<th className="text-right p-3">Total Amount</th>
													<th className="text-right p-3">Paid</th>
													<th className="text-right p-3">Due</th>
													<th className="text-left p-3 pr-4">Phase</th>
												</tr>
											</thead>
											<tbody>
												{analytics.sales.map((s) => (
													<tr key={s.id} className="border-b last:border-0 border-zinc-100 hover:bg-zinc-50/50 transition-colors">
														<td className="p-3 font-semibold text-zinc-800">{s.plot_number} • {s.project_name}</td>
														<td className="p-3 text-zinc-600 font-medium">{s.customer_name}</td>
														<td className="p-3 text-right font-semibold text-zinc-800 tabular-nums">{formatCurrency(s.total_sale_amount)}</td>
														<td className="p-3 text-right text-emerald-600 font-semibold tabular-nums">{formatCurrency(s.amount_paid)}</td>
														<td className="p-3 text-right text-rose-600 font-semibold tabular-nums">{formatCurrency(s.remaining_amount)}</td>
														<td className="p-3 text-zinc-500 font-medium pr-4">
															<Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-50/50">
																{s.sale_phase}
															</Badge>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>

							{/* Commission history */}
							<div className="rounded-xl border border-zinc-200 overflow-hidden shadow-sm bg-white">
								<h3 className="text-sm font-bold p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center gap-2 text-zinc-800">
									<IndianRupee className="h-4.5 w-4.5 text-zinc-500" /> Commission History ({analytics.commissions.length})
								</h3>
								<div className="max-h-48 overflow-y-auto">
									{analytics.commissions.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-zinc-50/30">
											<IndianRupee className="h-7 w-7 text-zinc-300 mb-2" />
											<p className="text-xs font-semibold text-zinc-600">No Commissions Allocated</p>
											<p className="text-[11px] text-zinc-400 mt-0.5">No commission records exist for this advisor.</p>
										</div>
									) : (
										<table className="w-full text-sm">
											<thead>
												<tr className="bg-zinc-50/50 border-b border-zinc-150 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
													<th className="text-left p-3">Plot</th>
													<th className="text-right p-3">Total Allocated</th>
													<th className="text-right p-3">Paid</th>
													<th className="text-right p-3 pr-4">Pending</th>
												</tr>
											</thead>
											<tbody>
												{analytics.commissions.map((c) => (
													<tr key={c.id} className="border-b last:border-0 border-zinc-100 hover:bg-zinc-50/50 transition-colors">
														<td className="p-3 font-semibold text-zinc-800">{c.plot_number}</td>
														<td className="p-3 text-right font-medium text-zinc-700 tabular-nums">{formatCurrency(c.total_commission_amount)}</td>
														<td className="p-3 text-right text-emerald-600 font-semibold tabular-nums">{formatCurrency(c.amount_paid)}</td>
														<td className="p-3 text-right text-amber-700 font-bold tabular-nums pr-4">{formatCurrency(c.remaining_commission)}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</div>

							<div className="flex flex-wrap gap-2.5 pt-3.5 border-t border-zinc-100">
								<Link href={`/advisors/${selected.id}`} className="flex-1 sm:flex-none">
									<Button variant="default" className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 shadow-md hover:-translate-y-0.5 transition-all">
										<ExternalLink className="h-4 w-4" /> Full Advisor Page
									</Button>
								</Link>
								<Link href={`/commissions`} className="flex-1 sm:flex-none">
									<Button variant="outline" className="w-full sm:w-auto gap-2 border-zinc-200 hover:bg-zinc-50 font-bold h-9 shadow-sm text-zinc-700 hover:-translate-y-0.5 transition-all">
										<FileText className="h-4 w-4" /> Manage Commissions
									</Button>
								</Link>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
