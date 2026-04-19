"use client";

import { useMemo, useState } from "react";
import { IndianRupee, Home, Search } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

type LeftPlot = {
	plot_number: string;
	value: number;
	size_sqft: number;
	rate_per_sqft: number;
	facing: string | null;
};

export function LeftPlotsCard({ plots }: { plots: LeftPlot[] }) {
	const [q, setQ] = useState("");

	const filtered = useMemo(() => {
		const query = q.trim().toLowerCase();
		if (!query) return plots;
		return plots.filter((p) => p.plot_number.toLowerCase().includes(query));
	}, [plots, q]);

	return (
		<Card className="border-green-200/80 bg-green-50/20">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-bold flex items-center gap-2">
					<Home className="h-4 w-4 text-green-700" /> Left Plots (Available)
				</CardTitle>
				<div className="mt-2 flex items-center gap-2">
					<Input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search plot no..."
						className="h-9"
						style={{ paddingLeft: 12 }}
					/>
					<div className="relative -ml-9 pointer-events-none">
						<Search className="h-4 w-4 text-zinc-400" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{filtered.length === 0 ? (
					<p className="text-sm text-zinc-500">No matching plots</p>
				) : (
					<div className="space-y-2">
						{filtered.map((p) => (
							<div
								key={p.plot_number}
								className="flex items-start justify-between gap-3 rounded-lg border border-green-100 bg-white/60 p-3"
							>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<Badge className="bg-green-100 text-green-800 border-green-200">Available</Badge>
										<span className="font-semibold text-sm truncate">{p.plot_number}</span>
									</div>
									<div className="text-xs text-zinc-500 mt-1">
										{p.size_sqft ? `${p.size_sqft.toLocaleString("en-IN")} sqft` : "—"}
										{p.facing ? ` • ${p.facing}` : ""}
									</div>
								</div>
								<div className="text-right">
									<div className="flex items-center justify-end gap-1 text-xs text-zinc-500">
										<IndianRupee className="h-3.5 w-3.5" /> Est. Price
									</div>
									<div className="font-bold">{formatCurrency(p.value)}</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

