"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { matchesTextSearch } from "@/lib/utils/text-search";

export type SearchableComboboxOption = {
	value: string;
	/** Primary line (e.g. name) */
	label: string;
	/** Secondary line in list (e.g. phone, code) */
	subtitle?: string;
	/** Extra search-only text (indexed but not shown as subtitle) */
	keywords?: string;
};

function defaultFormatSelected(opt: SearchableComboboxOption) {
	return opt.subtitle ? `${opt.label} (${opt.subtitle})` : opt.label;
}

export function SearchableCombobox({
	options,
	value,
	onChange,
	disabled,
	placeholder = "Search…",
	emptyMessage = "No matches.",
	formatSelected: formatSelectedProp,
}: {
	options: SearchableComboboxOption[];
	value: string;
	onChange: (next: string) => void;
	disabled?: boolean;
	placeholder?: string;
	emptyMessage?: string;
	/** How the input shows the current selection */
	formatSelected?: (opt: SearchableComboboxOption) => string;
}) {
	const formatSelectedRef = useRef(formatSelectedProp ?? defaultFormatSelected);
	formatSelectedRef.current = formatSelectedProp ?? defaultFormatSelected;

	const containerRef = useRef<HTMLDivElement>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const reactId = useId();
	const listId = `${reactId}-searchable-combobox-list`;

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	useEffect(() => {
		const s = optionsRef.current.find((o) => o.value === value);
		if (s) setQuery(formatSelectedRef.current(s));
		else if (!value) setQuery("");
	}, [value]);

	useEffect(() => {
		function onDocMouseDown(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				const s = optionsRef.current.find((o) => o.value === value);
				if (s) setQuery(formatSelectedRef.current(s));
				else setQuery("");
			}
		}
		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [value]);

	const filtered = useMemo(() => {
		const q = query.trim();
		if (!q) return options;
		return options.filter((opt) =>
			matchesTextSearch(q, opt.label, opt.subtitle, opt.keywords),
		);
	}, [options, query]);

	return (
		<div ref={containerRef} className="relative w-full">
			<div className="flex gap-1">
				<Input
					disabled={disabled}
					placeholder={placeholder}
					value={query}
					onChange={(e) => {
						const v = e.target.value;
						setQuery(v);
						setOpen(true);
						if (v.trim() === "") {
							onChange("");
							return;
						}
						if (value) {
							const current = options.find((o) => o.value === value);
							if (
								current &&
								v !== formatSelectedRef.current(current)
							) {
								onChange("");
							}
						}
					}}
					onFocus={() => setOpen(true)}
					className="pr-2"
					autoComplete="off"
					aria-expanded={open}
					aria-controls={listId}
					aria-autocomplete="list"
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={disabled}
					className="shrink-0"
					onClick={() => setOpen((o) => !o)}
					aria-label="Toggle list"
				>
					<ChevronsUpDown className="h-4 w-4 opacity-50" />
				</Button>
			</div>
			{open && !disabled && (
				<ul
					id={listId}
					className="absolute z-50 mt-1 max-h-[min(240px,40vh)] w-full overflow-auto rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-md"
					role="listbox"
				>
					{filtered.length === 0 ? (
						<li className="px-3 py-2 text-sm text-zinc-500">{emptyMessage}</li>
					) : (
						filtered.map((opt) => {
							const active = opt.value === value;
							return (
								<li key={opt.value} role="option" aria-selected={active}>
									<button
										type="button"
										className={cn(
											"flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100",
											active && "bg-zinc-50",
										)}
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											onChange(opt.value);
											setQuery(formatSelectedRef.current(opt));
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"h-4 w-4 shrink-0",
												active ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="min-w-0 truncate">
											<span className="font-medium text-zinc-900">{opt.label}</span>
											{opt.subtitle ? (
												<span className="text-zinc-500"> · {opt.subtitle}</span>
											) : null}
										</span>
									</button>
								</li>
							);
						})
					)}
				</ul>
			)}
		</div>
	);
}
