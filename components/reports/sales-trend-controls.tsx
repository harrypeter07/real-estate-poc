"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Loader2, Calendar, LayoutGrid, CalendarRange } from "lucide-react";

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
		<div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-3.5 bg-zinc-50/20 dark:bg-zinc-900/10 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl">
			{/* Granularity Toggle Switches */}
			<div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
				<span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
					<LayoutGrid className="h-3.5 w-3.5" /> Granularity:
				</span>
				<div className="flex bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 shadow-inner w-full sm:w-auto">
					<button
						type="button"
						disabled={isPending}
						onClick={() => {
							setTrend("week");
							pushNow("week");
						}}
						className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer ${
							trend === "week"
								? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-[0_2px_8px_rgba(20,184,166,0.1)] border border-zinc-200/60 dark:border-zinc-850 scale-[1.02]"
								: "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
						}`}
					>
						Weekly
					</button>
					<button
						type="button"
						disabled={isPending}
						onClick={() => {
							setTrend("month");
							pushNow("month");
						}}
						className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer ${
							trend === "month"
								? "bg-white dark:bg-zinc-950 text-teal-600 dark:text-teal-400 shadow-[0_2px_8px_rgba(20,184,166,0.1)] border border-zinc-200/60 dark:border-zinc-850 scale-[1.02]"
								: "text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
						}`}
					>
						Monthly
					</button>
				</div>
			</div>

			{/* Custom Range Override inside Widget */}
			<div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center w-full md:w-auto border-t md:border-t-0 border-zinc-200/60 dark:border-zinc-800/60 pt-3 md:pt-0 md:border-l md:pl-4">
				<span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 shrink-0">
					<CalendarRange className="h-3.5 w-3.5" /> Filter Range:
				</span>
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Input
						type="date"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						className="flex-1 sm:w-32 h-8.5 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 text-xs font-semibold focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
					/>
					<span className="text-zinc-400 text-xs font-bold shrink-0">to</span>
					<Input
						type="date"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						className="flex-1 sm:w-32 h-8.5 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 text-xs font-semibold focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
					/>
					<Button
						size="sm"
						variant="outline"
						onClick={applyDateRange}
						disabled={isPending || (!from && !to)}
						className="h-8.5 px-3.5 rounded-xl text-xs font-bold hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-zinc-900 transition-all duration-300 cursor-pointer shrink-0"
					>
						{isPending ? (
							<>
								<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-teal-600" />
								Applying
							</>
						) : (
							"Apply"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

