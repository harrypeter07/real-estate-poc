"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import {
	Loader2,
	Calendar,
	CalendarDays,
	History,
	Layers,
	ArrowRight,
	CalendarRange,
} from "lucide-react";

export function ReportsFilters({ basePath = "/reports" }: { basePath?: string }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
	}, [from, to]);

	function setRange(start: string, end: string) {
		const params = new URLSearchParams(searchParams.toString());
		if (start) params.set("from", start);
		else params.delete("from");
		if (end) params.set("to", end);
		else params.delete("to");
		startTransition(() => {
			router.push(`${basePath}?${params.toString()}`);
		});
	}

	const now = new Date();
	const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const thisMonthEnd = now.toISOString().slice(0, 10);
	const thisYearStart = `${now.getFullYear()}-01-01`;
	const thisYearEnd = thisMonthEnd;

	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
	const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

	// Check which period is currently active
	const isAllTime = !from && !to;
	const isThisMonth = from === thisMonthStart && to === thisMonthEnd;
	const isThisYear = from === thisYearStart && to === thisYearEnd;
	const isLastMonth = from === lastMonthStart && to === lastMonthEnd;

	return (
		<div className="flex flex-col lg:flex-row flex-wrap gap-4 items-start lg:items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/50 dark:border-zinc-800/40 p-3 rounded-2xl shadow-sm">
			{/* Period Toggle Group */}
			<div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
				<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-2 flex items-center gap-1.5">
					<CalendarRange className="h-3.5 w-3.5" /> Period
				</span>
				
				<div className="flex flex-wrap gap-1 bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 shadow-inner">
					<button
						type="button"
						onClick={() => setRange("", "")}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 border ${
							isAllTime
								? "bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border-zinc-200/60 dark:border-zinc-800 shadow-[0_2px_8px_rgba(99,102,241,0.08)] scale-[1.02]"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-zinc-800/40 border-transparent"
						}`}
					>
						<Layers className="h-3 w-3" />
						All time
					</button>

					<button
						type="button"
						onClick={() => setRange(thisMonthStart, thisMonthEnd)}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 border ${
							isThisMonth
								? "bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border-zinc-200/60 dark:border-zinc-800 shadow-[0_2px_8px_rgba(99,102,241,0.08)] scale-[1.02]"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-zinc-800/40 border-transparent"
						}`}
					>
						<Calendar className="h-3 w-3" />
						This month
					</button>

					<button
						type="button"
						onClick={() => setRange(thisYearStart, thisYearEnd)}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 border ${
							isThisYear
								? "bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border-zinc-200/60 dark:border-zinc-800 shadow-[0_2px_8px_rgba(99,102,241,0.08)] scale-[1.02]"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-zinc-800/40 border-transparent"
						}`}
					>
						<CalendarDays className="h-3 w-3" />
						This year
					</button>

					<button
						type="button"
						onClick={() => {
							const start = lastMonthStart;
							const end = lastMonthEnd;
							setRange(start, end);
						}}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 border ${
							isLastMonth
								? "bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border-zinc-200/60 dark:border-zinc-800 shadow-[0_2px_8px_rgba(99,102,241,0.08)] scale-[1.02]"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-zinc-800/40 border-transparent"
						}`}
					>
						<History className="h-3 w-3" />
						Last month
					</button>
				</div>
			</div>

			{/* Custom Date Range Inputs */}
			<div className="flex flex-wrap gap-2 items-center w-full lg:w-auto border-t lg:border-t-0 border-zinc-200/60 dark:border-zinc-800/60 pt-3 lg:pt-0 lg:border-l lg:pl-4">
				<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1.5">
					Custom Range
				</span>
				
				<div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
					<div className="relative flex-1 min-w-[120px] sm:w-36 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200">
						<Input
							type="date"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							className="w-full h-9 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-xs font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none focus:outline-none"
						/>
					</div>
					
					<span className="text-zinc-400 font-bold text-xs flex items-center justify-center shrink-0">
						<ArrowRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700" />
					</span>
					
					<div className="relative flex-1 min-w-[120px] sm:w-36 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200">
						<Input
							type="date"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							className="w-full h-9 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-xs font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none focus:outline-none"
						/>
					</div>

					<Button
						size="sm"
						onClick={() => setRange(customFrom, customTo)}
						disabled={!customFrom || !customTo || isPending}
						className="w-full sm:w-auto h-9 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0"
					>
						{isPending ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
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
