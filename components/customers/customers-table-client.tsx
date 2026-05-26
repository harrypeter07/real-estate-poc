"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
	Pencil, 
	User, 
	Phone, 
	MapPin, 
	UserCheck, 
	Calendar, 
	ShieldCheck, 
	Plus, 
	Settings2 
} from "lucide-react";
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
		"bg-teal-50 text-teal-700 border-teal-100/80 shadow-[0_2px_8px_rgba(13,148,136,0.05)]",
		"bg-blue-50 text-blue-700 border-blue-100/80 shadow-[0_2px_8px_rgba(59,130,246,0.05)]",
		"bg-indigo-50 text-indigo-700 border-indigo-100/80 shadow-[0_2px_8px_rgba(99,102,241,0.05)]",
		"bg-violet-50 text-violet-700 border-violet-100/80 shadow-[0_2px_8px_rgba(139,92,246,0.05)]",
		"bg-sky-50 text-sky-700 border-sky-100/80 shadow-[0_2px_8px_rgba(14,165,233,0.05)]",
		"bg-emerald-50 text-emerald-700 border-emerald-100/80 shadow-[0_2px_8px_rgba(16,185,129,0.05)]",
	];

	const renderKycBadge = (status: string | null | undefined) => {
		const s = status || "pending";
		if (s === "verified") {
			return (
				<span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full uppercase shadow-[0_2px_8px_rgba(16,185,129,0.06)]">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
					🟢 Verified
				</span>
			);
		}
		if (s === "uploaded") {
			return (
				<span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full uppercase shadow-[0_2px_8px_rgba(245,158,11,0.06)]">
					<span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
					🟡 Uploaded
				</span>
			);
		}
		return (
			<span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-zinc-100 text-zinc-650 border border-zinc-200 px-2.5 py-0.5 rounded-full uppercase">
				<span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
				🟠 Pending
			</span>
		);
	};

	return (
		<Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden bg-white transition-all duration-300">
			<CardContent className="p-4 md:p-6 space-y-5">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<ListSearchBar
						value={query}
						onChange={setQuery}
						placeholder="Search by name or phone…"
						className="max-w-md w-full"
						inputClassName="h-9.5 text-xs rounded-2xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 font-bold hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] shadow-sm"
					/>
				</div>

				<div className="overflow-x-auto rounded-2xl border border-zinc-200/80 shadow-[0_2px_15px_rgba(0,0,0,0.01)] bg-white">
					<Table>
						<TableHeader className="bg-zinc-50/50 sticky top-0 z-10 backdrop-blur-md border-b border-zinc-200/80">
							<TableRow className="h-11 hover:bg-transparent border-b border-zinc-200/80">
								<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
									<span className="inline-flex items-center gap-1.5">
										<User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										Name
									</span>
								</TableHead>
								<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
									<span className="inline-flex items-center gap-1.5">
										<Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										Phone
									</span>
								</TableHead>
								<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
									<span className="inline-flex items-center gap-1.5">
										<MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										Route
									</span>
								</TableHead>
								{!isAdvisor && (
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<UserCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Advisor
										</span>
									</TableHead>
								)}
								{isAdvisor ? (
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Birth
										</span>
									</TableHead>
								) : (
									<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
										<span className="inline-flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
											Added
										</span>
									</TableHead>
								)}
								<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5">
									<span className="inline-flex items-center gap-1.5">
										<ShieldCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										KYC Status
									</span>
								</TableHead>
								<TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 py-3.5 px-5 text-right">
									<span className="inline-flex items-center gap-1.5 justify-end w-full">
										<Settings2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
										Actions
									</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow className="hover:bg-transparent">
									<TableCell
										colSpan={isAdvisor ? 6 : 7}
										className="py-16 text-center"
									>
										<div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-4">
											<div className="h-14 w-14 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 shadow-inner">
												<User className="h-6 w-6 text-zinc-400" />
											</div>
											<div className="space-y-1.5">
												<h3 className="text-sm font-extrabold text-zinc-800">No customers found</h3>
												<p className="text-xs text-zinc-500 leading-relaxed">
													{query.trim() 
														? "No customers match your active search filters. Try using different keywords." 
														: "Create your first customer to start tracking plots and KYC."}
												</p>
											</div>
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
											className="group cursor-pointer hover:bg-teal-500/[0.015] border-l-4 border-l-transparent hover:border-l-teal-500 border-b border-zinc-150 last:border-b-0 transition-all duration-200 shadow-none hover:shadow-[0_2px_15px_-3px_rgba(0,0,0,0.015)] trigger-loading"
										>
											<TableCell className="py-3 px-5">
												<div className="flex items-center gap-3">
													<div className={`h-8.5 w-8.5 rounded-xl border flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm transition-transform duration-250 group-hover:scale-105 ${bgClass}`}>
														{initials}
													</div>
													<div className="min-w-0">
														<span className="block font-extrabold text-zinc-800 group-hover:text-teal-650 transition-colors truncate max-w-[140px] sm:max-w-[200px] text-xs">
															{c.name}
														</span>
													</div>
												</div>
											</TableCell>
											<TableCell className="py-3 px-5 text-xs font-mono text-zinc-800 tabular-nums font-bold">
												<span className="block group-hover:text-teal-650 transition-colors">
													{c.phone}
												</span>
											</TableCell>
											<TableCell className="py-3 px-5 text-xs text-zinc-500 font-bold">
												<span className="line-clamp-1 font-semibold">{c.route || "—"}</span>
											</TableCell>
											{!isAdvisor && (
												<TableCell className="py-3 px-5">
													<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-50 border border-zinc-200/60 text-zinc-700 font-bold text-[11px] shadow-sm">
														<span className="h-4 w-4 rounded-full bg-teal-500/10 text-teal-700 text-[9px] font-extrabold flex items-center justify-center border border-teal-200/30">
															{c.advisors?.name ? getInitials(c.advisors.name) : "👤"}
														</span>
														{c.advisors?.name ?? "—"}
													</span>
												</TableCell>
											)}
											<TableCell className="py-3 px-5 text-[11px] text-zinc-400 whitespace-nowrap font-bold font-sans">
												{isAdvisor
													? c.birth_date
														? formatDate(c.birth_date)
														: "—"
													: formatDate(c.created_by_at ?? c.created_at ?? null)}
											</TableCell>
											<TableCell className="py-3 px-5">
												{renderKycBadge(c.kyc_status)}
											</TableCell>
											<TableCell className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
												<Link href={`${basePath}/${c.id}/edit`}>
													<Button
														size="icon"
														variant="ghost"
														className="h-8 w-8 rounded-xl text-zinc-400 hover:text-teal-650 hover:bg-teal-50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-none hover:shadow-sm"
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
