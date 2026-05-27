"use client";

import { useState } from "react";
import { Search, Home, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

interface Sale {
	id: string;
	plot_number: string;
	customer_name: string;
	advisor_name: string;
	total_sale_amount: number;
	sale_phase: string;
	token_date: string | null;
}

interface RecentSalesListProps {
	recentSales: Sale[];
}

const getPlotIcon = (plotNumber: string) => {
	const lower = (plotNumber || "").toLowerCase().trim();
	if (
		lower.includes("shop") ||
		lower.includes("comm") ||
		lower.includes("office") ||
		lower.includes("building") ||
		lower.includes("show")
	) {
		return <Building className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 transition-colors group-hover:text-emerald-500" />;
	}
	return <Home className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 transition-colors group-hover:text-emerald-500" />;
};

const getPhaseBadge = (phaseStr: string) => {
	const phase = (phaseStr || "").toLowerCase().trim();
	const baseClass = "px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full border transition-all duration-200 hover:scale-[1.02] flex items-center w-fit shadow-sm";

	switch (phase) {
		case "token":
			return (
				<Badge variant="outline" className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 hover:bg-amber-100/80 dark:hover:bg-amber-950/50`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
					TOKEN
				</Badge>
			);
		case "sold":
			return (
				<Badge variant="outline" className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
					SOLD
				</Badge>
			);
		case "emi":
			return (
				<Badge variant="outline" className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50 hover:bg-blue-100/80 dark:hover:bg-blue-950/50`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
					EMI
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className={`${baseClass} bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400" />
					{phaseStr.toUpperCase()}
				</Badge>
			);
	}
};

export function RecentSalesList({ recentSales }: RecentSalesListProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredSales = recentSales.filter((sale) => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return true;

		return (
			(sale.customer_name || "").toLowerCase().includes(query) ||
			(sale.advisor_name || "").toLowerCase().includes(query) ||
			(sale.plot_number || "").toLowerCase().includes(query)
		);
	});

	const displayedSales = searchQuery.trim() ? filteredSales : filteredSales.slice(0, 5);

	return (
		<Card>
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
				<CardTitle className="text-base">Recent Sales</CardTitle>
				<div className="relative w-full sm:max-w-xs group">
					<Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-all duration-300 group-hover:text-zinc-600 group-focus-within:text-teal-650 group-focus-within:scale-105" />
					<Input
						placeholder="Search customer, advisor or plot..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10 sm:pl-10 h-9.5 text-xs rounded-2xl border-zinc-200/80 bg-white hover:border-zinc-300 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] placeholder:text-zinc-400 font-bold transition-all duration-300"
					/>
				</div>
			</CardHeader>
			<CardContent>
				{recentSales.length === 0 ? (
					<p className="text-sm text-zinc-400 py-4 text-center">
						No sales yet for this project
					</p>
				) : filteredSales.length === 0 ? (
					<div className="py-8 text-center bg-zinc-50/50 rounded-lg border border-dashed border-zinc-200">
						<p className="text-sm text-zinc-500 font-medium">No sales found</p>
						<p className="text-xs text-zinc-400 mt-1">
							No results matching "{searchQuery}"
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left text-zinc-500">
									<th className="pb-2 pr-4 font-medium pl-3">Plot</th>
									<th className="pb-2 pr-4 font-medium">Customer</th>
									<th className="pb-2 pr-4 font-medium">Advisor</th>
									<th className="pb-2 pr-4 font-medium">Amount</th>
									<th className="pb-2 pr-4 font-medium">Phase</th>
									<th className="pb-2 font-medium">Date</th>
								</tr>
							</thead>
							<tbody>
								{displayedSales.map((sale) => (
									<tr
										key={sale.id}
										className="group border-b last:border-0 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30 transition-all duration-200 cursor-default"
									>
										<td className="relative py-3 pr-4 pl-3 font-medium transition-all duration-200">
											{/* Soft left accent glow/accent bar */}
											<div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-emerald-500 dark:bg-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-200 origin-left scale-y-75 group-hover:scale-y-100" />
											<div className="flex items-center gap-2">
												{getPlotIcon(sale.plot_number)}
												<span className="truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
													{sale.plot_number}
												</span>
											</div>
										</td>
										<td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
											{sale.customer_name}
										</td>
										<td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
											{sale.advisor_name}
										</td>
										<td className="py-3 pr-4">
											<span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight text-sm sm:text-[15px] transition-all duration-200">
												{formatCurrency(sale.total_sale_amount)}
											</span>
										</td>
										<td className="py-3 pr-4">
											{getPhaseBadge(sale.sale_phase)}
										</td>
										<td className="py-3 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
											{sale.token_date ? formatDate(sale.token_date) : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

