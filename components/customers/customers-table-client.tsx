"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import {
	Badge,
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
	kyc_status?: string | null;
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
	const router = useRouter();
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

	const getInitials = (name: string) => {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		}
		return (parts[0]?.[0] || "").toUpperCase();
	};

	const bgColors = [
		"bg-emerald-50 text-emerald-700 border-emerald-100",
		"bg-blue-50 text-blue-700 border-blue-100",
		"bg-purple-50 text-purple-700 border-purple-100",
		"bg-orange-50 text-orange-700 border-orange-100",
		"bg-rose-50 text-rose-700 border-rose-100",
		"bg-teal-50 text-teal-700 border-teal-100",
	];

	const renderKycBadge = (status: string | null | undefined) => {
		const s = status || "pending";
		if (s === "verified") {
			return (
				<span className="inline-flex items-center gap-1 text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-150 px-2 py-0.5 rounded-full uppercase">
					🟢 Verified
				</span>
			);
		}
		if (s === "uploaded") {
			return (
				<span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-150 px-2 py-0.5 rounded-full uppercase">
					🟡 Uploaded
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold bg-zinc-100 text-zinc-650 border border-zinc-200 px-2 py-0.5 rounded-full uppercase">
				🔴 Pending
			</span>
		);
	};

	return (
		<Card className="border-zinc-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
			<CardContent className="p-4 md:p-6 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<ListSearchBar
						value={query}
						onChange={setQuery}
						placeholder="Search by name or phone…"
						className="max-w-md"
						inputClassName="h-10 text-sm rounded-xl"
					/>
				</div>

				<div className="overflow-x-auto rounded-xl border border-zinc-150 shadow-inner">
					<Table>
						<TableHeader className="bg-zinc-50/70 sticky top-0 z-10 backdrop-blur-sm border-b border-zinc-200">
							<TableRow className="h-11 hover:bg-transparent">
								<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
									Name
								</TableHead>
								<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
									Phone
								</TableHead>
								<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
									Route
								</TableHead>
								{!isAdvisor && (
									<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
										Advisor
									</TableHead>
								)}
								{isAdvisor ? (
									<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
										Birth
									</TableHead>
								) : (
									<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
										Added
									</TableHead>
								)}
								<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4">
									KYC Status
								</TableHead>
								<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 py-3 px-4 text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={isAdvisor ? 6 : 7}
										className="text-xs text-zinc-500 py-12 text-center bg-zinc-50/20"
									>
										<div className="flex flex-col items-center justify-center space-y-2">
											<span className="text-xl">🔍</span>
											<span className="font-medium text-zinc-600">No customers match your search.</span>
											<span className="text-[11px] text-zinc-400">Check spelling or search by different keywords.</span>
										</div>
									</TableCell>
								</TableRow>
							) : (
								filtered.map((c) => {
									const initials = getInitials(c.name);
									const bgClass = bgColors[c.name.length % bgColors.length];
									
									return (
										<TableRow
											key={c.id}
											onClick={() => router.push(`${basePath}/${c.id}`)}
											className="group cursor-pointer hover:bg-teal-50/10 transition-colors duration-150 border-b border-zinc-100 last:border-b-0"
										>
											<TableCell className="py-2.5 px-4">
												<div className="flex items-center gap-3">
													<div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 ${bgClass}`}>
														{initials}
													</div>
													<div className="min-w-0">
														<span className="block font-semibold text-zinc-900 group-hover:text-teal-600 transition-colors truncate max-w-[140px] sm:max-w-[200px]">
															{c.name}
														</span>
													</div>
												</div>
											</TableCell>
											<TableCell className="py-2.5 px-4 text-xs font-mono text-zinc-800 tabular-nums">
												<span className="block group-hover:text-teal-600 transition-colors">
													{c.phone}
												</span>
											</TableCell>
											<TableCell className="py-2.5 px-4 text-xs text-zinc-500">
												<span className="line-clamp-1 font-medium">{c.route || "—"}</span>
											</TableCell>
											{!isAdvisor && (
												<TableCell className="py-2.5 px-4 text-xs text-zinc-600">
													<span className="line-clamp-1 font-medium bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-700 inline-block">
														{c.advisors?.name ?? "—"}
													</span>
												</TableCell>
											)}
											<TableCell className="py-2.5 px-4 text-[11px] text-zinc-400 whitespace-nowrap font-medium font-sans">
												{isAdvisor
													? c.birth_date
														? formatDate(c.birth_date)
														: "—"
													: formatDate(c.created_by_at ?? c.created_at ?? null)}
											</TableCell>
											<TableCell className="py-2.5 px-4">
												{renderKycBadge(c.kyc_status)}
											</TableCell>
											<TableCell className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
												<Link href={`${basePath}/${c.id}/edit`}>
													<Button
														size="icon"
														variant="ghost"
														className="h-8 w-8 rounded-full text-zinc-400 hover:text-teal-600 hover:bg-teal-50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-none hover:shadow-sm"
														title="Edit Customer"
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
