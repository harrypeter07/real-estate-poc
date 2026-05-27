"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	BarChart3,
	TrendingUp,
	TrendingDown,
	Handshake,
	IndianRupee,
	UserCheck,
	ShieldAlert,
	Loader2,
	ChevronDown,
	Calendar,
	Filter,
	Users,
	Trophy,
	Sparkles,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	Button,
	Badge,
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
	Input,
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
} from "recharts";

interface AdvisorAnalyticsClientProps {
	businessId: string;
	advisors: any[];
	projects: any[];
}

export function AdvisorAnalyticsClient({
	businessId,
	advisors,
	projects,
}: AdvisorAnalyticsClientProps) {
	// Date Presets Logic
	const getPresetDates = (months: number) => {
		const to = new Date();
		const from = new Date();
		from.setMonth(to.getMonth() - months);
		return {
			from: from.toISOString().slice(0, 10),
			to: to.toISOString().slice(0, 10),
		};
	};

	const initialDates = getPresetDates(3); // Default to last 3 months

	// Filters States
	const [datePreset, setDatePreset] = useState("3m"); // 3m, 12m, custom
	const [dateFrom, setDateFrom] = useState(initialDates.from);
	const [dateTo, setDateTo] = useState(initialDates.to);
	const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState("all");

	// Dropdown Open State
	const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState(false);

	// Multi-select text helpers
	const selectedAdvisorsText = useMemo(() => {
		if (selectedAdvisorIds.length === 0) return "All Advisors";
		if (selectedAdvisorIds.length === 1) {
			const adv = advisors.find((a) => a.id === selectedAdvisorIds[0]);
			return adv ? adv.name : "1 Selected";
		}
		return `${selectedAdvisorIds.length} Selected`;
	}, [selectedAdvisorIds, advisors]);

	// Format advisors for multi-value param
	const advisorFilterParam = selectedAdvisorIds.join(",");

	// Handle Date Preset Click
	const handlePresetChange = (preset: string) => {
		setDatePreset(preset);
		if (preset === "3m") {
			const dates = getPresetDates(3);
			setDateFrom(dates.from);
			setDateTo(dates.to);
		} else if (preset === "12m") {
			const dates = getPresetDates(12);
			setDateFrom(dates.from);
			setDateTo(dates.to);
		}
	};

	// ----------------------------------------------------
	// DATA QUERIES
	// ----------------------------------------------------

	// 1. Metrics query
	const { data: metrics, isLoading: loadingMetrics } = useQuery({
		queryKey: ["analytics", "metrics", businessId, dateFrom, dateTo, advisorFilterParam],
		queryFn: async () => {
			let url = `/api/advisor-analytics/metrics?business_id=${businessId}&from=${dateFrom}&to=${dateTo}`;
			if (advisorFilterParam) url += `&advisor_id=${advisorFilterParam}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load metrics");
			return res.json();
		},
	});

	// 2. Top Performers query (We use the leaderboard endpoint or build custom leaderboard stats)
	// The leaderboard endpoint YYYY-MM gets monthly rank. Let's query it for current selected month
	const activeMonth = dateTo.slice(0, 7); // YYYY-MM
	const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
		queryKey: ["analytics", "leaderboard", businessId, activeMonth],
		queryFn: async () => {
			const res = await fetch(`/api/advisor-analytics/leaderboard?business_id=${businessId}&month=${activeMonth}`);
			if (!res.ok) throw new Error("Failed to load leaderboard");
			return res.json();
		},
	});

	// 3. Sales Trend query
	const { data: salesTrend, isLoading: loadingSalesTrend } = useQuery({
		queryKey: ["analytics", "sales-trend", businessId, dateFrom, dateTo, advisorFilterParam],
		queryFn: async () => {
			let url = `/api/advisor-analytics/sales-trend?business_id=${businessId}&from=${dateFrom}&to=${dateTo}`;
			if (advisorFilterParam) url += `&advisor_id=${advisorFilterParam}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load sales trend");
			return res.json();
		},
	});

	// 4. Commission Trend query
	const { data: commissionTrend, isLoading: loadingCommTrend } = useQuery({
		queryKey: ["analytics", "commission-trend", businessId, dateFrom, dateTo, advisorFilterParam],
		queryFn: async () => {
			let url = `/api/advisor-analytics/commission-trend?business_id=${businessId}&from=${dateFrom}&to=${dateTo}`;
			if (advisorFilterParam) url += `&advisor_id=${advisorFilterParam}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load commission trend");
			return res.json();
		},
	});

	// 5. Collection Graph query
	const { data: collectionGraph, isLoading: loadingCollGraph } = useQuery({
		queryKey: ["analytics", "collection-graph", businessId, dateFrom, dateTo, advisorFilterParam],
		queryFn: async () => {
			let url = `/api/advisor-analytics/collection-graph?business_id=${businessId}&from=${dateFrom}&to=${dateTo}`;
			if (advisorFilterParam) url += `&advisor_id=${advisorFilterParam}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load collection graph");
			return res.json();
		},
	});

	// ----------------------------------------------------
	// PROCESS TRENDS DATA FOR RECHARTS
	// ----------------------------------------------------

	// Sales trend aggregation for Recharts (Format: [{ month: '2026-05', Total: X, 'Advisor Name': Y }])
	const salesTrendChartData = useMemo(() => {
		if (!salesTrend || salesTrend.length === 0) return [];
		const months = Array.from(new Set(salesTrend.map((d: any) => d.month))).sort();
		return months.map((month) => {
			const point: any = { month };
			let total = 0;
			const monthData = salesTrend.filter((d: any) => d.month === month);
			for (const d of monthData) {
				point[d.advisor_name] = d.bookings;
				total += d.bookings;
			}
			point.Total = total;
			return point;
		});
	}, [salesTrend]);

	// Commission trend aggregation for Recharts (Format: [{ month: '2026-05', Paid: X }])
	const commissionTrendChartData = useMemo(() => {
		if (!commissionTrend || commissionTrend.length === 0) return [];
		const months = Array.from(new Set(commissionTrend.map((d: any) => d.month))).sort();
		return months.map((month) => {
			const point: any = { month };
			let paid = 0;
			const monthData = commissionTrend.filter((d: any) => d.month === month);
			for (const d of monthData) {
				paid += d.total_paid;
			}
			point.Paid = paid;
			return point;
		});
	}, [commissionTrend]);

	// Collection Graph aggregation (Format: [{ month: '2026-05', Recovered: X, Pending: Y, Efficiency: Z }])
	const collectionGraphChartData = useMemo(() => {
		if (!collectionGraph || collectionGraph.length === 0) return [];
		const months = Array.from(new Set(collectionGraph.map((d: any) => d.month))).sort();
		return months.map((month) => {
			const monthData = collectionGraph.filter((d: any) => d.month === month);
			let totalDue = 0;
			let recovered = 0;
			let pending = 0;
			for (const d of monthData) {
				totalDue += d.total_due;
				recovered += d.recovered;
				pending += d.pending;
			}
			const efficiency = totalDue > 0 ? Number(((recovered / totalDue) * 100).toFixed(2)) : 0;
			return {
				month,
				Recovered: recovered,
				Pending: pending,
				Efficiency: efficiency,
			};
		});
	}, [collectionGraph]);

	return (
		<div className="space-y-6">
			{/* FILTERS BAR */}
			<Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
				<CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
							<Filter className="h-3.5 w-3.5 text-teal-600" /> Filters:
						</div>

						{/* Date preset buttons */}
						<div className="flex border border-zinc-200/80 rounded-xl overflow-hidden bg-zinc-50/50 p-1 shadow-inner">
							<button
								onClick={() => handlePresetChange("3m")}
								className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
									datePreset === "3m" 
										? "bg-teal-600 text-white shadow-md shadow-teal-500/20 scale-102" 
										: "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50"
								}`}
							>
								Last 3 Months
							</button>
							<button
								onClick={() => handlePresetChange("12m")}
								className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
									datePreset === "12m" 
										? "bg-teal-600 text-white shadow-md shadow-teal-500/20 scale-102" 
										: "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50"
								}`}
							>
								Last 12 Months
							</button>
							<button
								onClick={() => setDatePreset("custom")}
								className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
									datePreset === "custom" 
										? "bg-teal-600 text-white shadow-md shadow-teal-500/20 scale-102" 
										: "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50"
								}`}
							>
								Custom
							</button>
						</div>

						{/* Custom Dates Inputs */}
						{datePreset === "custom" && (
							<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
								<div className="relative group">
									<Input
										type="date"
										className="h-9.5 text-xs w-36 border-zinc-200 bg-white rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 text-zinc-700 transition-all font-semibold"
										value={dateFrom}
										onChange={(e) => setDateFrom(e.target.value)}
									/>
								</div>
								<span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">to</span>
								<div className="relative group">
									<Input
										type="date"
										className="h-9.5 text-xs w-36 border-zinc-200 bg-white rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 text-zinc-700 transition-all font-semibold"
										value={dateTo}
										onChange={(e) => setDateTo(e.target.value)}
									/>
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-3">
						{/* Multi-select Advisor Selector */}
						<div className="relative flex items-center">
							<DropdownMenu open={advisorDropdownOpen} onOpenChange={setAdvisorDropdownOpen}>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="h-9.5 px-3.5 text-xs bg-white border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50 text-zinc-750 hover:text-zinc-950 rounded-xl font-bold shadow-sm transition-all duration-200 gap-2 cursor-pointer active:scale-98 flex items-center justify-center">
										<UserCheck className="h-4 w-4 text-zinc-450 shrink-0" />
										<span className="truncate max-w-[150px]">{selectedAdvisorsText}</span>
										<ChevronDown className="h-3.5 w-3.5 text-zinc-450 shrink-0 transition-transform duration-200" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto rounded-xl p-1.5 border border-zinc-200 shadow-xl bg-white/95 backdrop-blur-md animate-in fade-in duration-150">
									<DropdownMenuCheckboxItem
										checked={selectedAdvisorIds.length === 0}
										onCheckedChange={() => setSelectedAdvisorIds([])}
										className="rounded-lg text-xs font-bold py-2 text-zinc-750 hover:bg-zinc-50 cursor-pointer"
									>
										All Advisors
									</DropdownMenuCheckboxItem>
									<div className="my-1 border-t border-zinc-100" />
									{advisors.map((a) => (
										<DropdownMenuCheckboxItem
											key={a.id}
											checked={selectedAdvisorIds.includes(a.id)}
											onCheckedChange={(checked) => {
												if (checked) {
													setSelectedAdvisorIds((prev) => [...prev, a.id]);
												} else {
													setSelectedAdvisorIds((prev) => prev.filter((id) => id !== a.id));
												}
											}}
											className="rounded-lg text-xs font-semibold py-2 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
										>
											{a.name} <span className="text-[10px] text-zinc-400 font-mono ml-1">({a.code})</span>
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Project Selector */}
						<div className="relative flex items-center">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="h-9.5 px-3.5 text-xs bg-white border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50 text-zinc-750 hover:text-zinc-950 rounded-xl font-bold shadow-sm transition-all duration-200 gap-2 cursor-pointer active:scale-98 flex items-center justify-center">
										<span className="truncate max-w-[150px]">
											{selectedProjectId === "all" ? "All Projects" : projects.find(p => p.id === selectedProjectId)?.name || "All Projects"}
										</span>
										<ChevronDown className="h-3.5 w-3.5 text-zinc-450 shrink-0 transition-transform duration-200" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto rounded-xl p-1.5 border border-zinc-200 shadow-xl bg-white/95 backdrop-blur-md animate-in fade-in duration-150">
									<DropdownMenuCheckboxItem
										checked={selectedProjectId === "all"}
										onCheckedChange={() => setSelectedProjectId("all")}
										className="rounded-lg text-xs font-bold py-2 text-zinc-750 hover:bg-zinc-50 cursor-pointer"
									>
										All Projects
									</DropdownMenuCheckboxItem>
									<div className="my-1 border-t border-zinc-100" />
									{projects.map((p) => (
										<DropdownMenuCheckboxItem
											key={p.id}
											checked={selectedProjectId === p.id}
											onCheckedChange={() => setSelectedProjectId(p.id)}
											className="rounded-lg text-xs font-semibold py-2 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
										>
											{p.name}
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* SECTION 1: METRICS ROW (6 KPI CARDS) */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{[
					{
						title: "Total Bookings",
						value: loadingMetrics ? "..." : metrics?.total_bookings,
						icon: Handshake,
						color: "text-blue-600 bg-blue-50/60 border-blue-100/80",
					},
					{
						title: "Conversion Rate",
						value: loadingMetrics ? "..." : `${metrics?.conversion_rate}%`,
						icon: TrendingUp,
						color: "text-purple-600 bg-purple-50/60 border-purple-100/80",
					},
					{
						title: "Total Leads",
						value: loadingMetrics ? "..." : metrics?.leads_handled,
						icon: UserCheck,
						color: "text-zinc-600 bg-zinc-50/80 border-zinc-200/80",
					},
					{
						title: "Collection Efficiency",
						value: loadingMetrics ? "..." : `${metrics?.collection_efficiency}%`,
						icon: ShieldAlert,
						color: "text-orange-600 bg-orange-50/60 border-orange-100/80",
					},
					{
						title: "Revenue Generated",
						value: loadingMetrics ? "..." : formatCurrency(metrics?.revenue_generated),
						icon: IndianRupee,
						color: "text-emerald-600 bg-emerald-50/60 border-emerald-100/80",
					},
					{
						title: "Commission Paid",
						value: loadingMetrics ? "..." : formatCurrency(metrics?.commission_paid),
						icon: IndianRupee,
						color: "text-teal-600 bg-teal-50/60 border-teal-100/80",
					},
				].map((kpi, idx) => (
					<Card key={idx} className="hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-md border border-zinc-200/80 rounded-2xl bg-gradient-to-tr from-white to-zinc-50/20 overflow-hidden group">
						<CardContent className="p-4.5 flex flex-col justify-between h-full space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider truncate">{kpi.title}</p>
								<div className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${kpi.color}`}>
									<kpi.icon className="h-4 w-4" />
								</div>
							</div>
							<div className="space-y-1">
								<p className="text-xl font-extrabold text-zinc-800 leading-none">{kpi.value}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* SECTION 2: RANKINGS & LEADERBOARD */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Top Performers Table */}
				<Card className="lg:col-span-2 border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:shadow-md">
					<CardHeader className="flex flex-row items-center gap-3 border-b border-zinc-100 pb-4">
						<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
							<Users className="h-4 w-4" />
						</div>
						<div>
							<CardTitle className="text-sm font-extrabold text-zinc-800">Top Performing Channel Partners</CardTitle>
							<CardDescription className="text-[11px] mt-0.5">Rankings based on sales volume and commissions for active filters.</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{loadingLeaderboard ? (
							<div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
								<Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
								<span className="text-xs">Loading rankings...</span>
							</div>
						) : !leaderboard || leaderboard.length === 0 ? (
							<div className="p-12 text-center text-zinc-400 text-sm">No sales data for the selected period.</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent border-l-4 border-l-transparent">
											<TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rank</TableHead>
											<TableHead className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Advisor Name</TableHead>
											<TableHead className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Code</TableHead>
											<TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bookings</TableHead>
											<TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Revenue Generated</TableHead>
											<TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Commission Paid</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{leaderboard.map((item: any, idx: number) => (
											<TableRow key={item.id} className={`transition-all duration-200 hover:bg-teal-500/[0.02] border-l-4 border-l-transparent hover:border-l-teal-500 ${idx < 3 ? "bg-zinc-50/[0.15]" : ""}`}>
												<TableCell className="text-center font-bold">
													{idx === 0 ? (
														<span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-full bg-amber-100 text-amber-800 text-xs shadow-sm font-black animate-bounce-subtle">🥇</span>
													) : idx === 1 ? (
														<span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-full bg-zinc-200/80 text-zinc-800 text-xs shadow-sm font-black">🥈</span>
													) : idx === 2 ? (
														<span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-full bg-orange-100 text-orange-800 text-xs shadow-sm font-black">🥉</span>
													) : (
														<span className="text-zinc-500 font-semibold text-xs">{item.rank}</span>
													)}
												</TableCell>
												<TableCell className="font-bold text-zinc-800 text-sm">{item.name}</TableCell>
												<TableCell className="font-mono text-zinc-400 text-xs font-bold">{item.code}</TableCell>
												<TableCell className="text-center">
													<span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-extrabold border border-zinc-200/50">
														{item.bookings_count}
													</span>
												</TableCell>
												<TableCell className="text-right">
													<div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 shadow-[0_2px_10px_rgba(16,185,129,0.04)] text-xs">
														<TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
														{formatCurrency(item.revenue_generated)}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<div className="inline-flex items-center px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 font-semibold border border-teal-150 text-xs">
														{formatCurrency(item.commission_paid)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Monthly Leaderboard summary list */}
				<Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:shadow-md">
					<CardHeader className="flex flex-row items-center gap-3 border-b border-zinc-100 pb-4">
						<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
							<Trophy className="h-4 w-4 text-teal-650" />
						</div>
						<div>
							<CardTitle className="text-sm font-extrabold text-zinc-800">Monthly Champions</CardTitle>
							<CardDescription className="text-[11px] mt-0.5">Top contributors for this month ({activeMonth}).</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="space-y-4 pt-6">
						{loadingLeaderboard ? (
							<div className="text-center text-zinc-400 text-sm py-8 flex flex-col items-center justify-center gap-2">
								<Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
								<span>Loading champions...</span>
							</div>
						) : !leaderboard || leaderboard.length === 0 ? (
							<div className="text-center text-zinc-400 text-sm py-8 flex flex-col items-center justify-center gap-1.5 border border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50/30">
								<span>📊 No records found.</span>
							</div>
						) : (
							<div className="space-y-3">
								{leaderboard.slice(0, 3).map((item: any, idx: number) => {
									const isFirst = idx === 0;
									return (
										<div 
											key={item.id} 
											className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
												isFirst 
													? "bg-gradient-to-tr from-amber-500/10 via-yellow-500/[0.03] to-transparent border-amber-200/80 shadow-[0_4px_20px_rgba(245,158,11,0.06)]" 
													: "bg-zinc-50/40 hover:bg-zinc-50 border-zinc-100"
											}`}
										>
											<div className="flex items-center gap-3">
												<div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg ${
													isFirst 
														? "bg-amber-100 border border-amber-200 animate-bounce-subtle" 
														: idx === 1 
															? "bg-zinc-100 border border-zinc-200" 
															: "bg-orange-50 border border-orange-100"
												}`}>
													{idx === 0 ? "👑" : idx === 1 ? "⭐" : "✨"}
												</div>
												<div>
													<div className="flex items-center gap-1.5">
														<p className="font-extrabold text-sm text-zinc-800">{item.name}</p>
														{isFirst && (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-[9px] font-black text-amber-700 border border-amber-200/50 uppercase tracking-wide">
																Top
															</span>
														)}
													</div>
													<p className="text-[10px] text-zinc-450 uppercase font-mono font-bold tracking-wider">{item.code}</p>
												</div>
											</div>
											<div className="text-right space-y-0.5">
												<p className="font-black text-sm text-zinc-800 flex items-center justify-end gap-1">
													<span>{item.bookings_count}</span>
													<span className="text-xs text-zinc-400 font-bold">Sales</span>
												</p>
												<p className="text-xs text-emerald-600 font-extrabold">{formatCurrency(item.revenue_generated)}</p>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* SECTION 3: RECHARTS VISUALIZATION GRIDS */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 1. Sales Trend Graph */}
				<Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white transition-all duration-300 hover:shadow-md">
					<CardHeader className="flex flex-row items-center gap-3 border-b border-zinc-100 pb-4">
						<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
							<BarChart3 className="h-4 w-4" />
						</div>
						<div>
							<CardTitle className="text-sm font-extrabold text-zinc-800">Sales Booking Trend</CardTitle>
							<CardDescription className="text-[11px] mt-0.5">Monthly count of completed bookings.</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-6">
						{loadingSalesTrend ? (
							<div className="h-72 flex flex-col items-center justify-center text-zinc-400 gap-2">
								<Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
								<span className="text-xs">Loading trend...</span>
							</div>
						) : salesTrendChartData.length === 0 ? (
							<div className="h-72 flex items-center justify-center">
								<div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20 max-w-sm w-full space-y-3">
									<div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xl shadow-inner">
										📊
									</div>
									<div className="space-y-1">
										<p className="font-bold text-sm text-zinc-800">No analytics available yet</p>
										<p className="text-xs text-zinc-500">Data will appear once bookings and payments are recorded.</p>
									</div>
								</div>
							</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={salesTrendChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
										<YAxis stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dx={-8} />
										<Tooltip 
											contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e4e4e7", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)", background: "rgba(255, 255, 255, 0.95)" }} 
										/>
										<Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
										<Line type="monotone" dataKey="Total" stroke="#0d9488" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
										{/* Multi line dynamically for each advisor in filters */}
										{selectedAdvisorIds.map((id, index) => {
											const adv = advisors.find((a) => a.id === id);
											if (!adv) return null;
											// Simple color palette generator
											const colors = ["#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];
											const strokeColor = colors[index % colors.length];
											return (
												<Line
													key={id}
													type="monotone"
													dataKey={adv.name}
													stroke={strokeColor}
													strokeWidth={2}
													dot={{ r: 4, strokeWidth: 0 }}
												/>
											);
										})}
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 2. Commission Payouts Trend Graph */}
				<Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white transition-all duration-300 hover:shadow-md">
					<CardHeader className="flex flex-row items-center gap-3 border-b border-zinc-100 pb-4">
						<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
							<IndianRupee className="h-4 w-4" />
						</div>
						<div>
							<CardTitle className="text-sm font-extrabold text-zinc-800">Commission Payments Trend</CardTitle>
							<CardDescription className="text-[11px] mt-0.5">Monthly payouts distributed to channel partners.</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-6">
						{loadingCommTrend ? (
							<div className="h-72 flex flex-col items-center justify-center text-zinc-400 gap-2">
								<Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
								<span className="text-xs">Loading trend...</span>
							</div>
						) : commissionTrendChartData.length === 0 ? (
							<div className="h-72 flex items-center justify-center">
								<div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20 max-w-sm w-full space-y-3">
									<div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xl shadow-inner">
										📊
									</div>
									<div className="space-y-1">
										<p className="font-bold text-sm text-zinc-800">No analytics available yet</p>
										<p className="text-xs text-zinc-500">Data will appear once bookings and payments are recorded.</p>
									</div>
								</div>
							</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={commissionTrendChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
										<YAxis stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dx={-8} />
										<Tooltip
											formatter={(value) => [formatCurrency(Number(value)), "Paid"]}
											contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e4e4e7", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)", background: "rgba(255, 255, 255, 0.95)" }}
										/>
										<Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
										<Bar dataKey="Paid" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={45} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 3. Collection Stacked Graph */}
				<Card className="lg:col-span-2 border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white transition-all duration-300 hover:shadow-md">
					<CardHeader className="flex flex-row items-center gap-3 border-b border-zinc-100 pb-4">
						<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
							<TrendingUp className="h-4 w-4" />
						</div>
						<div>
							<CardTitle className="text-sm font-extrabold text-zinc-800">Collection Efficiency</CardTitle>
							<CardDescription className="text-[11px] mt-0.5">Stacked review of recovered vs pending dues collections with efficiency rates.</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-6">
						{loadingCollGraph ? (
							<div className="h-72 flex flex-col items-center justify-center text-zinc-400 gap-2">
								<Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
								<span className="text-xs">Loading recoveries...</span>
							</div>
						) : collectionGraphChartData.length === 0 ? (
							<div className="h-72 flex items-center justify-center">
								<div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20 max-w-sm w-full space-y-3">
									<div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xl shadow-inner">
										📊
									</div>
									<div className="space-y-1">
										<p className="font-bold text-sm text-zinc-800">No analytics available yet</p>
										<p className="text-xs text-zinc-500">Data will appear once bookings and payments are recorded.</p>
									</div>
								</div>
							</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={collectionGraphChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={8} />
										{/* Left YAxis for currency amounts */}
										<YAxis yAxisId="left" stroke="#71717a" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dx={-8} />
										{/* Right YAxis for efficiency percentage */}
										<YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#f59e0b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dx={8} />
										<Tooltip
											formatter={(value, name) => {
												if (name === "Efficiency") return [`${value}%`, name];
												return [formatCurrency(Number(value)), name];
											}}
											contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e4e4e7", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)", background: "rgba(255, 255, 255, 0.95)" }}
										/>
										<Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
										<Bar yAxisId="left" dataKey="Recovered" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={45} />
										<Bar yAxisId="left" dataKey="Pending" stackId="a" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={45} />
										<Line yAxisId="right" type="monotone" dataKey="Efficiency" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
