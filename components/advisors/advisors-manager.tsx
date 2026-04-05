"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Eye, ChevronDown } from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Badge,
} from "@/components/ui";
import { AdvisorForm } from "./advisor-form";
import { cn } from "@/lib/utils";
import { digitsOnly } from "@/lib/utils/phone";

export type AdvisorSubRow = {
	id: string;
	name: string;
	code: string;
	phone: string;
	email?: string | null;
	is_active?: boolean | null;
	derived_password: string;
};

export type MainAdvisorRow = AdvisorSubRow & {
	sub_count: number;
	subs: AdvisorSubRow[];
};

export function AdvisorsManager({ advisors }: { advisors: MainAdvisorRow[] }) {
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [openEdit, setOpenEdit] = useState(false);
	const [openView, setOpenView] = useState(false);
	const [selected, setSelected] = useState<AdvisorSubRow | null>(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const qDigits = digitsOnly(query);
		if (!q) return advisors;
		return advisors.filter((a) => {
			const phoneDigits = digitsOnly(a.phone);
			const subHit = a.subs.some(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.code.toLowerCase().includes(q) ||
					s.phone.includes(q) ||
					(qDigits.length > 0 && digitsOnly(s.phone).includes(qDigits)),
			);
			return (
				subHit ||
				a.name.toLowerCase().includes(q) ||
				a.code.toLowerCase().includes(q) ||
				a.phone.includes(q) ||
				(qDigits.length > 0 && phoneDigits.includes(qDigits)) ||
				(a.email || "").toLowerCase().includes(q) ||
				a.derived_password.toLowerCase().includes(q)
			);
		});
	}, [advisors, query]);

	function toggleExpand(id: string) {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<Card className="border-zinc-200 shadow-sm">
			<CardContent className="p-3 md:p-4 space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center gap-3">
					<div className="relative flex-1 max-w-md">
						<Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, code, phone, password hint…"
							className="pl-8 h-8 text-sm"
						/>
					</div>
				</div>

				<p className="text-[10px] text-zinc-500">
					Default login password is derived from name + phone (see column). It does not update Auth
					automatically if you change name or phone — reset password or run the sync script.
				</p>

				<div className="overflow-x-auto rounded-md border border-zinc-100">
					<Table>
						<TableHeader>
							<TableRow className="h-8 hover:bg-transparent">
								<TableHead className="w-8 p-1" />
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Advisor
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Phone
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Default password
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2 w-14">
									Subs
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">
									Status
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2 text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-xs text-zinc-500 py-8 text-center">
										No advisors found.
									</TableCell>
								</TableRow>
							) : (
								filtered.flatMap((a) => {
									const isOpen = expanded.has(a.id);
									const rows = [
										<TableRow
											key={a.id}
											className="h-9"
										>
											<TableCell className="py-1 px-1 w-8 align-middle">
												{a.sub_count > 0 ? (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-7 w-7 shrink-0"
														aria-expanded={isOpen}
														onClick={(e) => {
															e.stopPropagation();
															toggleExpand(a.id);
														}}
													>
														<ChevronDown
															className={cn(
																"h-4 w-4 text-zinc-500 transition-transform",
																isOpen ? "rotate-180" : "rotate-0",
															)}
														/>
													</Button>
												) : null}
											</TableCell>
											<TableCell
												className="py-1.5 px-2 cursor-pointer"
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												<div className="flex flex-col gap-0">
													<span className="font-medium text-xs leading-tight">{a.name}</span>
													<span className="text-[11px] text-zinc-500 font-mono leading-tight">
														{a.code}
													</span>
												</div>
											</TableCell>
											<TableCell
												className="py-1.5 px-2 text-xs font-mono tabular-nums cursor-pointer"
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												{a.phone}
											</TableCell>
											<TableCell
												className="py-1.5 px-2 text-[11px] font-mono text-zinc-700 max-w-[140px] truncate cursor-pointer"
												title={a.derived_password}
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												{a.derived_password}
											</TableCell>
											<TableCell
												className="py-1.5 px-2 text-xs tabular-nums cursor-pointer"
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												{a.sub_count}
											</TableCell>
											<TableCell
												className="py-1.5 px-2 cursor-pointer"
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												<Badge
													variant="outline"
													className={cn(
														"border text-[10px] px-1.5 py-0 h-5",
														a.is_active
															? "bg-green-50 text-green-700 border-green-200"
															: "bg-zinc-50 text-zinc-500 border-zinc-200",
													)}
												>
													{a.is_active ? "Active" : "Inactive"}
												</Badge>
											</TableCell>
											<TableCell className="text-right py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
												<div className="flex justify-end gap-1">
													<Button
														size="sm"
														variant="ghost"
														className="h-7 w-7 p-0"
														onClick={() => {
															setSelected(a);
															setOpenView(true);
														}}
													>
														<Eye className="h-3.5 w-3.5" />
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="h-7 w-7 p-0"
														onClick={() => {
															setSelected(a);
															setOpenEdit(true);
														}}
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>,
									];
									if (isOpen && a.subs.length > 0) {
										rows.push(
											<TableRow key={`${a.id}-subs`} className="bg-zinc-50/80 hover:bg-zinc-50/80">
												<TableCell colSpan={7} className="p-0">
													<div className="px-4 py-2 border-t border-zinc-100">
														<p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
															Sub-advisors
														</p>
														<div className="flex flex-col gap-1">
															{a.subs.map((s) => (
																<div
																	key={s.id}
																	className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs"
																>
																	<div>
																		<span className="font-medium">{s.name}</span>
																		<span className="text-zinc-500 font-mono ml-2">{s.code}</span>
																		<span className="text-zinc-600 font-mono ml-2">{s.phone}</span>
																	</div>
																	<div className="flex items-center gap-1">
																		<Button
																			size="sm"
																			variant="ghost"
																			className="h-7 px-2"
																			onClick={() => {
																				setSelected(s);
																				setOpenView(true);
																			}}
																		>
																			View
																		</Button>
																		<Button
																			size="sm"
																			variant="ghost"
																			className="h-7 px-2"
																			onClick={() => {
																				setSelected(s);
																				setOpenEdit(true);
																			}}
																		>
																			Edit
																		</Button>
																	</div>
																</div>
															))}
														</div>
													</div>
												</TableCell>
											</TableRow>,
										);
									}
									return rows;
								})
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>

			<Dialog open={openView} onOpenChange={setOpenView}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenView(false)} className="w-fit shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
						{selected && (
							<>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-lg font-bold">{selected.name}</p>
										<p className="text-xs text-zinc-500 font-mono">{selected.code}</p>
									</div>
									<Badge
										variant="outline"
										className={cn(
											"border",
											selected.is_active
												? "bg-green-50 text-green-700 border-green-200"
												: "bg-zinc-50 text-zinc-500 border-zinc-200",
										)}
									>
										{selected.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								<div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 text-sm space-y-1">
									<p>
										<span className="text-zinc-500">Phone:</span>{" "}
										<span className="font-medium">{selected.phone}</span>
									</p>
									<p>
										<span className="text-zinc-500">Login email:</span>{" "}
										<span className="font-medium">{selected.email || "(auto-generated)"}</span>
									</p>
									<p>
										<span className="text-zinc-500">Default password (derived):</span>{" "}
										<span className="font-mono text-xs break-all">{selected.derived_password}</span>
									</p>
									<p className="text-[11px] text-zinc-500 pt-1">
										If name or phone was changed without a password reset, the real login password may
										differ.
									</p>
								</div>
								<div className="flex gap-2 pt-2">
									<Button
										variant="outline"
										className="flex-1"
										onClick={() => {
											setOpenView(false);
											setOpenEdit(true);
										}}
									>
										<Pencil className="h-4 w-4 mr-2" />
										Edit
									</Button>
								</div>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={openEdit} onOpenChange={setOpenEdit}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>Edit Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenEdit(false)} className="w-fit shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
						{selected && (
							<AdvisorForm
								mode="edit"
								initialData={selected}
								redirectToList={false}
								onSuccess={() => setOpenEdit(false)}
								onCancel={() => setOpenEdit(false)}
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
