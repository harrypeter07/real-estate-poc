"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Loader2 } from "lucide-react";

type TrendMode = "week" | "month";

export function SalesTrendControls() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const fromParam = searchParams.get("from") ?? "";
	const toParam = searchParams.get("to") ?? "";
	const trendParam = (searchParams.get("trend") as TrendMode | null) ?? "month";

	const [trend, setTrend] = useState<TrendMode>(trendParam);
	const [from, setFrom] = useState(fromParam);
	const [to, setTo] = useState(toParam);

	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setTrend(trendParam);
		setFrom(fromParam);
		setTo(toParam);
	}, [trendParam, fromParam, toParam]);

	function pushNow(nextTrend: TrendMode) {
		const p = new URLSearchParams(searchParams.toString());
		p.set("trend", nextTrend);
		if (from) p.set("from", from);
		else p.delete("from");
		if (to) p.set("to", to);
		else p.delete("to");

		startTransition(() => {
			router.push(`/dashboard?${p.toString()}`);
		});
	}

	function applyDateRange() {
		const p = new URLSearchParams(searchParams.toString());
		p.set("trend", trend);
		if (from) p.set("from", from);
		else p.delete("from");
		if (to) p.set("to", to);
		else p.delete("to");

		startTransition(() => {
			router.push(`/dashboard?${p.toString()}`);
		});
	}

	return (
		<div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center justify-between">
			<div className="flex flex-wrap gap-2 items-center">
				<span className="text-sm font-medium text-zinc-600">Trend:</span>
				<Button
					size="sm"
					variant={trend === "week" ? "default" : "outline"}
					disabled={isPending}
					onClick={() => {
						setTrend("week");
						pushNow("week");
					}}
				>
					Week
				</Button>
				<Button
					size="sm"
					variant={trend === "month" ? "default" : "outline"}
					disabled={isPending}
					onClick={() => {
						setTrend("month");
						pushNow("month");
					}}
				>
					Month
				</Button>
			</div>

			<div className="flex flex-wrap gap-2 items-center border-l border-zinc-200 pl-4">
				<span className="text-sm font-medium text-zinc-600">Range:</span>
				<Input
					type="date"
					value={from}
					onChange={(e) => setFrom(e.target.value)}
					className="w-36 h-9"
				/>
				<span className="text-zinc-400">to</span>
				<Input
					type="date"
					value={to}
					onChange={(e) => setTo(e.target.value)}
					className="w-36 h-9"
				/>
				<Button
					size="sm"
					variant="outline"
					onClick={applyDateRange}
					disabled={isPending || (!from && !to)}
				>
					{isPending ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Updating...
						</>
					) : (
						"Apply"
					)}
				</Button>
			</div>
		</div>
	);
}

