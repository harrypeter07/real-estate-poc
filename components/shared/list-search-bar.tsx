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
		<div className={cn("relative w-full max-w-md", className)}>
			<Search
				className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
				aria-hidden
			/>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn("pl-9", inputClassName)}
				autoComplete="off"
			/>
		</div>
	);
}
