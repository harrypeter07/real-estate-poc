"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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

	return (
		<Card>
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
				<CardTitle className="text-base">Recent Sales</CardTitle>
				<div className="relative w-full sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
					<Input
						placeholder="Search customer, advisor or plot..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10 sm:pl-10 h-9 text-sm"
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
									<th className="pb-2 pr-4 font-medium">Plot</th>
									<th className="pb-2 pr-4 font-medium">Customer</th>
									<th className="pb-2 pr-4 font-medium">Advisor</th>
									<th className="pb-2 pr-4 font-medium">Amount</th>
									<th className="pb-2 pr-4 font-medium">Phase</th>
									<th className="pb-2 font-medium">Date</th>
								</tr>
							</thead>
							<tbody>
								{filteredSales.map((sale) => (
									<tr key={sale.id} className="border-b last:border-0 hover:bg-zinc-50/30 transition-colors">
										<td className="py-2.5 pr-4 font-medium">{sale.plot_number}</td>
										<td className="py-2.5 pr-4">{sale.customer_name}</td>
										<td className="py-2.5 pr-4">{sale.advisor_name}</td>
										<td className="py-2.5 pr-4">
											{formatCurrency(sale.total_sale_amount)}
										</td>
										<td className="py-2.5 pr-4">
											<Badge variant="secondary">{sale.sale_phase}</Badge>
										</td>
										<td className="py-2.5">
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
