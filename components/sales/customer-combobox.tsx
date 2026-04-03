"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CustomerOption = {
	id: string;
	name: string;
	phone: string;
};

function formatLabel(c: CustomerOption) {
	return `${c.name} (${c.phone})`;
}

export function CustomerCombobox({
	customers,
	value,
	onChange,
	disabled,
	placeholder = "Search by name or phone…",
}: {
	customers: CustomerOption[];
	value: string;
	onChange: (id: string) => void;
	disabled?: boolean;
	placeholder?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const customersRef = useRef(customers);
	customersRef.current = customers;

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	useEffect(() => {
		const s = customersRef.current.find((c) => c.id === value);
		if (s) setQuery(formatLabel(s));
		else if (!value) setQuery("");
	}, [value]);

	useEffect(() => {
		function onDocMouseDown(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				const s = customersRef.current.find((c) => c.id === value);
				if (s) setQuery(formatLabel(s));
				else setQuery("");
			}
		}
		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, [value]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const digits = q.replace(/\D/g, "");
		if (!q) return customers;
		return customers.filter((c) => {
			const nameOk = c.name.toLowerCase().includes(q);
			const phone = String(c.phone ?? "").replace(/\D/g, "");
			const phoneOk = digits.length > 0 && phone.includes(digits);
			return nameOk || phoneOk;
		});
	}, [customers, query]);

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
							const current = customers.find((c) => c.id === value);
							if (current && v !== formatLabel(current)) {
								onChange("");
							}
						}
					}}
					onFocus={() => setOpen(true)}
					className="pr-2"
					autoComplete="off"
					aria-expanded={open}
					aria-controls="customer-combobox-list"
					aria-autocomplete="list"
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={disabled}
					className="shrink-0"
					onClick={() => setOpen((o) => !o)}
					aria-label="Toggle customer list"
				>
					<ChevronsUpDown className="h-4 w-4 opacity-50" />
				</Button>
			</div>
			{open && !disabled && (
				<ul
					id="customer-combobox-list"
					className={cn(
						"absolute z-50 mt-1 max-h-[min(240px,40vh)] w-full overflow-auto rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-md",
					)}
					role="listbox"
				>
					{filtered.length === 0 ? (
						<li className="px-3 py-2 text-sm text-zinc-500">No customer matches.</li>
					) : (
						filtered.map((c) => {
							const active = c.id === value;
							return (
								<li key={c.id} role="option" aria-selected={active}>
									<button
										type="button"
										className={cn(
											"flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100",
											active && "bg-zinc-50",
										)}
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											onChange(c.id);
											setQuery(formatLabel(c));
											setOpen(false);
										}}
									>
										<Check
											className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")}
										/>
										<span className="min-w-0 truncate">
											<span className="font-medium text-zinc-900">{c.name}</span>
											<span className="text-zinc-500"> · {c.phone}</span>
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
