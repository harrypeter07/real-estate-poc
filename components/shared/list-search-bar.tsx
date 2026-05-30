"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ListSearchBar({
	value,
	onChange,
	placeholder = "Search by name, phone, or keywords…",
	className,
	inputClassName,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	inputClassName?: string;
}) {
	return (
		<div className={cn("relative w-full max-w-md group", className)}>
			<Search
				className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-all duration-300 group-hover:text-zinc-600 group-focus-within:text-teal-650 group-focus-within:scale-105"
				aria-hidden
			/>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					"rounded-2xl border-zinc-200/80 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] text-xs h-10 placeholder:text-zinc-400 font-bold !pl-10",
					inputClassName
				)}
				autoComplete="off"
			/>
		</div>
	);
}

