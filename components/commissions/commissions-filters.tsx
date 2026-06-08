"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Loader2, Calendar, Filter, RotateCcw, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommissionsFilters() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchParams = useSearchParams();
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const status = searchParams.get("status") ?? "all";
	
	const [customFrom, setCustomFrom] = useState(from);
	const [customTo, setCustomTo] = useState(to);
	const [selectedStatus, setSelectedStatus] = useState(status);

	useEffect(() => {
		setCustomFrom(from);
		setCustomTo(to);
		setSelectedStatus(status);
	}, [from, to, status]);

	function applyFilters() {
		const params = new URLSearchParams();
		if (customFrom) params.set("from", customFrom);
		if (customTo) params.set("to", customTo);
		if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
		startTransition(() => {
			router.push(`/commissions?${params.toString()}`);
		});
	}

	function clearFilters() {
		setCustomFrom("");
		setCustomTo("");
		setSelectedStatus("all");
		startTransition(() => {
			router.push("/commissions");
		});
	}

	const now = new Date();
	const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const thisMonthEnd = now.toISOString().slice(0, 10);
	const thisYearStart = `${now.getFullYear()}-01-01`;
	const thisYearEnd = thisMonthEnd;

	const isAllTime = !from && !to;
	const isThisMonth = from === thisMonthStart && to === thisMonthEnd;
	const isThisYear = from === thisYearStart && to === thisYearEnd;

	const activeValue = isAllTime
		? "all-time"
		: isThisMonth
		? "this-month"
		: isThisYear
		? "this-year"
		: "custom";

	function handlePeriodChange(v: string) {
		if (v === "all-time") {
			setCustomFrom("");
			setCustomTo("");
			setSelectedStatus("all");
			startTransition(() => {
				router.push("/commissions");
			});
		} else if (v === "this-month") {
			const params = new URLSearchParams();
			params.set("from", thisMonthStart);
			params.set("to", thisMonthEnd);
			if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
			startTransition(() => {
				router.push(`/commissions?${params.toString()}`);
			});
		} else if (v === "this-year") {
			const params = new URLSearchParams();
			params.set("from", thisYearStart);
			params.set("to", thisYearEnd);
			if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
			startTransition(() => {
				router.push(`/commissions?${params.toString()}`);
			});
		}
	}

	return (
		<div className="bg-white border border-zinc-200/80 p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
			<div className="flex flex-col lg:flex-row flex-wrap gap-4 items-start lg:items-center justify-between">
				{/* Period Filter Buttons */}
				<div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
					<div className="flex items-center gap-1.5 text-zinc-400 mr-1.5">
						<Clock className="h-3.5 w-3.5 text-zinc-400" />
						<span className="text-[10px] uppercase font-black tracking-wider">Period:</span>
					</div>
					
					{/* Desktop buttons: hidden on mobile, shown on md and larger */}
					<div className="hidden md:flex bg-zinc-100/70 p-1 rounded-xl gap-1 border border-zinc-200/40 w-fit">
						<button
							type="button"
							onClick={() => {
								setCustomFrom("");
								setCustomTo("");
								setSelectedStatus("all");
								startTransition(() => {
									router.push("/commissions");
								});
							}}
							className={cn(
								"px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all duration-200 cursor-pointer uppercase tracking-wider",
								!from && !to
									? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
									: "text-zinc-500 hover:text-zinc-700"
							)}
							disabled={isPending}
						>
							All time
						</button>
						<button
							type="button"
							onClick={() => {
								const params = new URLSearchParams();
								params.set("from", thisMonthStart);
								params.set("to", thisMonthEnd);
								if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
								startTransition(() => {
									router.push(`/commissions?${params.toString()}`);
								});
							}}
							className={cn(
								"px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all duration-200 cursor-pointer uppercase tracking-wider",
								from === thisMonthStart && to === thisMonthEnd
									? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
									: "text-zinc-500 hover:text-zinc-700"
							)}
							disabled={isPending}
						>
							This month
						</button>
						<button
							type="button"
							onClick={() => {
								const params = new URLSearchParams();
								params.set("from", thisYearStart);
								params.set("to", thisYearEnd);
								if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
								startTransition(() => {
									router.push(`/commissions?${params.toString()}`);
								});
							}}
							className={cn(
								"px-3.5 py-1.5 text-[11px] font-black rounded-lg transition-all duration-200 cursor-pointer uppercase tracking-wider",
								from === thisYearStart && to === thisYearEnd
									? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
									: "text-zinc-500 hover:text-zinc-700"
							)}
							disabled={isPending}
						>
							This year
						</button>
					</div>

					{/* Mobile dropdown: shown below md, hidden on md and larger */}
					<div className="flex md:hidden w-full">
						<Select
							value={activeValue}
							disabled={isPending}
							onValueChange={handlePeriodChange}
						>
							<SelectTrigger className="w-full h-9.5 rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 transition-all font-bold text-xs shadow-2xs text-zinc-700 hover:text-zinc-950 cursor-pointer">
								<SelectValue placeholder="Select Period" />
							</SelectTrigger>
							<SelectContent className="rounded-xl border border-zinc-200 bg-white text-xs font-bold shadow-lg">
								<SelectItem value="all-time" className="rounded-lg py-2 hover:bg-zinc-50 cursor-pointer">
									All time
								</SelectItem>
								<SelectItem value="this-month" className="rounded-lg py-2 hover:bg-zinc-50 cursor-pointer">
									This month
								</SelectItem>
								<SelectItem value="this-year" className="rounded-lg py-2 hover:bg-zinc-50 cursor-pointer">
									This year
								</SelectItem>
								{activeValue === "custom" && (
									<SelectItem value="custom" disabled className="rounded-lg py-2 hover:bg-zinc-50 cursor-pointer opacity-70">
										Custom Range
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Dropdown Filters & Actions */}
				<div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
					{/* Status selection */}
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<div className="flex items-center gap-1.5 text-zinc-400 sm:mr-1">
							<Filter className="h-3.5 w-3.5 text-zinc-400" />
							<span className="text-[10px] uppercase font-black tracking-wider">Status:</span>
						</div>
						<Select value={selectedStatus} onValueChange={setSelectedStatus}>
							<SelectTrigger className="w-full sm:w-36 h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent className="rounded-xl border-zinc-200">
								<SelectItem value="all" className="text-xs font-semibold">All Status</SelectItem>
								<SelectItem value="pending" className="text-xs font-semibold">Pending</SelectItem>
								<SelectItem value="partial" className="text-xs font-semibold">Partial Paid</SelectItem>
								<SelectItem value="paid" className="text-xs font-semibold">Fully Paid</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Date Range Selection */}
					<div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
						<div className="flex items-center gap-1.5 text-zinc-400 mr-1">
							<Calendar className="h-3.5 w-3.5 text-zinc-400" />
							<span className="text-[10px] uppercase font-black tracking-wider">Range:</span>
						</div>
						<Input
							type="date"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							className="w-full sm:w-36 h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all"
						/>
						<span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest px-1">to</span>
						<Input
							type="date"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							className="w-full sm:w-36 h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all"
						/>
						
						{/* Action Buttons */}
						<div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
							<Button
								size="sm"
								onClick={applyFilters}
								disabled={isPending}
								className="h-9.5 px-4 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:shadow-xs active:scale-[0.98] transition-all flex items-center gap-1"
							>
								{isPending ? (
									<>
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
										Applying...
									</>
								) : (
									<>
										<Check className="h-3.5 w-3.5" />
										Apply
									</>
								)}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={clearFilters}
								className="h-9.5 px-3 text-xs font-black rounded-xl border-zinc-200 text-zinc-500 hover:text-zinc-800 bg-white hover:bg-zinc-50 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Clear
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
