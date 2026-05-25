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
				className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors duration-200 group-focus-within:text-teal-600"
				aria-hidden
			/>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					"pl-10 sm:pl-10 rounded-xl border-zinc-200 bg-white hover:border-zinc-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all duration-200 shadow-sm text-sm h-10 placeholder:text-zinc-400/80",
					inputClassName
				)}
				autoComplete="off"
			/>
		</div>
	);
}
