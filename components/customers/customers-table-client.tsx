"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import {
	Button,
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";
import { digitsOnly } from "@/lib/utils/phone";

export type CustomerTableRow = {
	id: string;
	name: string;
	phone: string;
	route?: string | null;
	birth_date?: string | null;
	created_at?: string | null;
	advisors?: { name: string } | null;
	created_by_name?: string | null;
	created_by_email?: string | null;
	created_by_at?: string | null;
	last_edited_by_name?: string | null;
	last_edited_by_email?: string | null;
	last_edited_by_at?: string | null;
};

type Props = {
	customers: CustomerTableRow[];
	basePath?: string;
	/** Advisor list: tighter columns, no audit metadata. */
	variant?: "admin" | "advisor";
};

export function CustomersTableClient({
	customers,
	basePath = "/customers",
	variant = "admin",
}: Props) {
	const isAdvisor = variant === "advisor";
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const qDigits = digitsOnly(query);
		if (!q) return customers;
		return customers.filter((c) => {
			const nameMatch = c.name.toLowerCase().includes(q);
			const phoneDigits = digitsOnly(c.phone);
			const phoneMatch =
				c.phone.includes(q) ||
				(qDigits.length > 0 && phoneDigits.includes(qDigits));
			return nameMatch || phoneMatch;
		});
	}, [customers, query]);

	return (
		<Card className="border-zinc-200 shadow-sm">
			<CardContent className="p-3 md:p-4 space-y-3">
				<ListSearchBar
					value={query}
					onChange={setQuery}
					placeholder="Search by name or phone…"
					className="max-w-md"
					inputClassName="h-8 text-sm"
				/>

				<div className="overflow-x-auto rounded-md border border-zinc-100">
					<Table>
						<TableHeader>
							<TableRow className="h-8 hover:bg-transparent">
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Name
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Phone
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Route
								</TableHead>
								{!isAdvisor && (
									<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
										Advisor
									</TableHead>
								)}
								{isAdvisor ? (
									<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
										Birth
									</TableHead>
								) : (
									<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
										Added
									</TableHead>
								)}
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2 text-right">
									Edit
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={isAdvisor ? 5 : 6}
										className="text-xs text-zinc-500 py-8 text-center"
									>
										No customers match your search.
									</TableCell>
								</TableRow>
							) : (
								filtered.map((c) => (
									<TableRow
										key={c.id}
										className="cursor-pointer h-9 hover:bg-zinc-50/80"
									>
										<TableCell className="py-1.5 px-2 text-xs font-medium">
											<Link
												href={`${basePath}/${c.id}`}
												className="block truncate max-w-[140px] sm:max-w-[200px]"
											>
												{c.name}
											</Link>
										</TableCell>
										<TableCell className="py-1.5 px-2 text-xs font-mono tabular-nums">
											<Link href={`${basePath}/${c.id}`} className="block">
												{c.phone}
											</Link>
										</TableCell>
										<TableCell className="py-1.5 px-2 text-xs text-zinc-600">
											<span className="line-clamp-1">{c.route || "—"}</span>
										</TableCell>
										{!isAdvisor && (
											<TableCell className="py-1.5 px-2 text-xs text-zinc-700">
												<span className="line-clamp-1">
													{c.advisors?.name ?? "—"}
												</span>
											</TableCell>
										)}
										<TableCell className="py-1.5 px-2 text-[11px] text-zinc-500 whitespace-nowrap">
											{isAdvisor
												? c.birth_date
													? formatDate(c.birth_date)
													: "—"
												: formatDate(c.created_by_at ?? c.created_at ?? null)}
										</TableCell>
										<TableCell className="py-1.5 px-2 text-right">
											<Link href={`${basePath}/${c.id}/edit`}>
												<Button
													size="sm"
													variant="ghost"
													className="h-7 px-2 text-xs"
													onClick={(e) => e.stopPropagation()}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
