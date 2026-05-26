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
			<Card className="border border-zinc-200 shadow-sm bg-white">
				<CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2 text-zinc-500 text-sm font-semibold">
							<Filter className="h-4 w-4" /> Filters:
						</div>

						{/* Date preset buttons */}
						<div className="flex border border-zinc-200 rounded-md overflow-hidden bg-zinc-50 p-0.5">
							<button
								onClick={() => handlePresetChange("3m")}
								className={`px-3 py-1 text-xs font-semibold rounded ${
									datePreset === "3m" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
								}`}
							>
								Last 3 Months
							</button>
							<button
								onClick={() => handlePresetChange("12m")}
								className={`px-3 py-1 text-xs font-semibold rounded ${
									datePreset === "12m" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
								}`}
							>
								Last 12 Months
							</button>
							<button
								onClick={() => setDatePreset("custom")}
								className={`px-3 py-1 text-xs font-semibold rounded ${
									datePreset === "custom" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
								}`}
							>
								Custom
							</button>
						</div>

						{/* Custom Dates Inputs */}
						{datePreset === "custom" && (
							<div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
								<Input
									type="date"
									className="h-8 text-xs w-32 border-zinc-300"
									value={dateFrom}
									onChange={(e) => setDateFrom(e.target.value)}
								/>
								<span className="text-zinc-400 text-xs">to</span>
								<Input
									type="date"
									className="h-8 text-xs w-32 border-zinc-300"
									value={dateTo}
									onChange={(e) => setDateTo(e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-3">
						{/* Multi-select Advisor Selector */}
						<div className="relative">
							<DropdownMenu open={advisorDropdownOpen} onOpenChange={setAdvisorDropdownOpen}>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="h-9 border-zinc-300 gap-2">
										<UserCheck className="h-4 w-4 text-zinc-400" />
										<span className="truncate max-w-[150px]">{selectedAdvisorsText}</span>
										<ChevronDown className="h-3 w-3 text-zinc-400" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
									<DropdownMenuCheckboxItem
										checked={selectedAdvisorIds.length === 0}
										onCheckedChange={() => setSelectedAdvisorIds([])}
									>
										All Advisors
									</DropdownMenuCheckboxItem>
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
										>
											{a.name} ({a.code})
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Project Selector */}
						<select
							className="h-9 border border-zinc-300 rounded-md bg-white px-3 text-xs font-medium"
							value={selectedProjectId}
							onChange={(e) => setSelectedProjectId(e.target.value)}
						>
							<option value="all">All Projects</option>
							{projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
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
						color: "text-blue-600 bg-blue-50 border-blue-100",
					},
					{
						title: "Conversion Rate",
						value: loadingMetrics ? "..." : `${metrics?.conversion_rate}%`,
						icon: TrendingUp,
						color: "text-purple-600 bg-purple-50 border-purple-100",
					},
					{
						title: "Total Leads",
						value: loadingMetrics ? "..." : metrics?.leads_handled,
						icon: UserCheck,
						color: "text-zinc-600 bg-zinc-50 border-zinc-200",
					},
					{
						title: "Collection Efficiency",
						value: loadingMetrics ? "..." : `${metrics?.collection_efficiency}%`,
						icon: ShieldAlert,
						color: "text-orange-600 bg-orange-50 border-orange-100",
					},
					{
						title: "Revenue Generated",
						value: loadingMetrics ? "..." : formatCurrency(metrics?.revenue_generated),
						icon: IndianRupee,
						color: "text-emerald-600 bg-emerald-50 border-emerald-100",
					},
					{
						title: "Commission Paid",
						value: loadingMetrics ? "..." : formatCurrency(metrics?.commission_paid),
						icon: IndianRupee,
						color: "text-teal-600 bg-teal-50 border-teal-100",
					},
				].map((kpi, idx) => (
					<Card key={idx} className="hover:-translate-y-1 transition-all duration-300 shadow-sm border border-zinc-200">
						<CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">{kpi.title}</p>
								<div className={`h-7 w-7 rounded-lg flex items-center justify-center ${kpi.color}`}>
									<kpi.icon className="h-4 w-4" />
								</div>
							</div>
							<p className="text-lg font-extrabold text-zinc-800 leading-none">{kpi.value}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* SECTION 2: RANKINGS & LEADERBOARD */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Top Performers Table */}
				<Card className="lg:col-span-2 border border-zinc-200 shadow-sm bg-white">
					<CardHeader>
						<CardTitle className="text-base font-bold">Top Performing Channel Partners</CardTitle>
						<CardDescription>Rankings based on sales volume and commissions for active filters.</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{loadingLeaderboard ? (
							<div className="p-6 text-center text-zinc-500">Loading rankings...</div>
						) : !leaderboard || leaderboard.length === 0 ? (
							<div className="p-12 text-center text-zinc-400 text-sm">No sales data for the selected period.</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12 text-center">Rank</TableHead>
										<TableHead>Advisor Name</TableHead>
										<TableHead>Code</TableHead>
										<TableHead className="text-center">Bookings</TableHead>
										<TableHead className="text-right">Revenue Generated</TableHead>
										<TableHead className="text-right">Commission Paid</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{leaderboard.map((item: any, idx: number) => (
										<TableRow key={item.id} className={idx < 3 ? "bg-zinc-50/50" : ""}>
											<TableCell className="text-center font-bold">
												{idx === 0 ? (
													<span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-800 text-xs">🥇</span>
												) : idx === 1 ? (
													<span className="flex items-center justify-center h-6 w-6 rounded-full bg-zinc-200 text-zinc-800 text-xs">🥈</span>
												) : idx === 2 ? (
													<span className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 text-orange-800 text-xs">🥉</span>
												) : (
													item.rank
												)}
											</TableCell>
											<TableCell className="font-semibold text-zinc-800">{item.name}</TableCell>
											<TableCell className="font-mono text-xs">{item.code}</TableCell>
											<TableCell className="text-center font-bold text-zinc-800">{item.bookings_count}</TableCell>
											<TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(item.revenue_generated)}</TableCell>
											<TableCell className="text-right font-medium text-zinc-700">{formatCurrency(item.commission_paid)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Monthly Leaderboard summary list */}
				<Card className="border border-zinc-200 shadow-sm bg-white">
					<CardHeader>
						<CardTitle className="text-base font-bold">Monthly Champions</CardTitle>
						<CardDescription>Top contributors for this month ({activeMonth}).</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{loadingLeaderboard ? (
							<div className="text-center text-zinc-400 text-sm py-4">Loading champions...</div>
						) : !leaderboard || leaderboard.length === 0 ? (
							<div className="text-center text-zinc-400 text-sm py-4">No records found.</div>
						) : (
							<div className="space-y-3.5">
								{leaderboard.slice(0, 3).map((item: any, idx: number) => (
									<div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition">
										<div className="flex items-center gap-3">
											<span className="text-xl">
												{idx === 0 ? "👑" : idx === 1 ? "⭐" : "✨"}
											</span>
											<div>
												<p className="font-bold text-sm text-zinc-800">{item.name}</p>
												<p className="text-[10px] text-zinc-400 uppercase font-mono font-bold">{item.code}</p>
											</div>
										</div>
										<div className="text-right">
											<p className="font-extrabold text-sm text-zinc-800">{item.bookings_count} sales</p>
											<p className="text-xs text-emerald-600 font-semibold">{formatCurrency(item.revenue_generated)}</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* SECTION 3: RECHARTS VISUALIZATION GRIDS */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 1. Sales Trend Graph */}
				<Card className="border border-zinc-200 shadow-sm bg-white">
					<CardHeader>
						<CardTitle className="text-sm font-bold">Sales Bookings Trend</CardTitle>
						<CardDescription>Monthly count of completed bookings.</CardDescription>
					</CardHeader>
					<CardContent className="p-2">
						{loadingSalesTrend ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">Loading trend...</div>
						) : salesTrendChartData.length === 0 ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">No chart data.</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={salesTrendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
										<YAxis stroke="#71717a" fontSize={11} tickLine={false} />
										<Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
										<Legend wrapperStyle={{ fontSize: 11 }} />
										<Line type="monotone" dataKey="Total" stroke="#18181b" strokeWidth={2.5} activeDot={{ r: 6 }} />
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
													strokeWidth={1.5}
													dot={{ r: 3 }}
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
				<Card className="border border-zinc-200 shadow-sm bg-white">
					<CardHeader>
						<CardTitle className="text-sm font-bold">Commission Payments Trend</CardTitle>
						<CardDescription>Monthly payouts distributed to channel partners.</CardDescription>
					</CardHeader>
					<CardContent className="p-2">
						{loadingCommTrend ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">Loading trend...</div>
						) : commissionTrendChartData.length === 0 ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">No chart data.</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={commissionTrendChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
										<YAxis stroke="#71717a" fontSize={11} tickLine={false} />
										<Tooltip
											formatter={(value) => [formatCurrency(Number(value)), "Paid"]}
											contentStyle={{ fontSize: 12, borderRadius: 8 }}
										/>
										<Legend wrapperStyle={{ fontSize: 11 }} />
										<Bar dataKey="Paid" fill="#0d9488" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</CardContent>
				</Card>

				{/* 3. Collection Stacked Graph */}
				<Card className="lg:col-span-2 border border-zinc-200 shadow-sm bg-white">
					<CardHeader>
						<CardTitle className="text-sm font-bold">Collection Efficiency (Recoveries)</CardTitle>
						<CardDescription>Stacked review of recovered vs pending dues collections with efficiency rates.</CardDescription>
					</CardHeader>
					<CardContent className="p-2">
						{loadingCollGraph ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">Loading recoveries...</div>
						) : collectionGraphChartData.length === 0 ? (
							<div className="h-64 flex items-center justify-center text-zinc-400">No chart data.</div>
						) : (
							<div className="h-72 w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={collectionGraphChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
										<CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
										<XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
										{/* Left YAxis for currency amounts */}
										<YAxis yAxisId="left" stroke="#71717a" fontSize={11} tickLine={false} />
										{/* Right YAxis for efficiency percentage */}
										<YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#f59e0b" fontSize={11} tickLine={false} />
										<Tooltip
											formatter={(value, name) => {
												if (name === "Efficiency") return [`${value}%`, name];
												return [formatCurrency(Number(value)), name];
											}}
											contentStyle={{ fontSize: 12, borderRadius: 8 }}
										/>
										<Legend wrapperStyle={{ fontSize: 11 }} />
										<Bar yAxisId="left" dataKey="Recovered" stackId="a" fill="#16a34a" />
										<Bar yAxisId="left" dataKey="Pending" stackId="a" fill="#ea580c" />
										<Line yAxisId="right" type="monotone" dataKey="Efficiency" stroke="#f59e0b" strokeWidth={2} />
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
