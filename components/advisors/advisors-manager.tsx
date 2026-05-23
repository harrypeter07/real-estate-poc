"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Eye, ChevronDown, GitBranch, Trash2, Loader2, Copy, Users, User } from "lucide-react";
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
	SearchableCombobox,
} from "@/components/ui";
import { AdvisorForm } from "./advisor-form";
import { cn } from "@/lib/utils";
import { digitsOnly } from "@/lib/utils/phone";
import {
	deleteAdvisorWithConfirmation,
	getAdvisorDeleteImpact,
	setAdvisorParent,
	type AdvisorDeleteImpact,
} from "@/app/actions/advisors";
import { getAdvisorDefaultCredential } from "@/app/actions/advisor-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type AdvisorSubRow = {
	id: string;
	name: string;
	code: string;
	phone: string;
	email?: string | null;
	is_active?: boolean | null;
	parent_advisor_id?: string | null;
	derived_password: string;
};

export type MainAdvisorRow = AdvisorSubRow & {
	sub_count: number;
	subs: AdvisorSubRow[];
};

export function AdvisorsManager({ advisors }: { advisors: MainAdvisorRow[] }) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [openEdit, setOpenEdit] = useState(false);
	const [openView, setOpenView] = useState(false);
	const [openTeam, setOpenTeam] = useState(false);
	const [openDelete, setOpenDelete] = useState(false);
	const [selected, setSelected] = useState<AdvisorSubRow | null>(null);
	const [targetParentId, setTargetParentId] = useState("");
	const [deleteMode, setDeleteMode] = useState<"detach" | "hard">("detach");
	const [confirmText, setConfirmText] = useState("");
	const [impactLoading, setImpactLoading] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [teamLoading, setTeamLoading] = useState(false);
	const [deleteImpact, setDeleteImpact] = useState<AdvisorDeleteImpact | null>(null);
	const [credentialLoading, setCredentialLoading] = useState(false);
	const [liveCredential, setLiveCredential] = useState<{
		email: string;
		phone: string;
		derivedPassword: string;
	} | null>(null);

	useEffect(() => {
		let active = true;
		async function loadCredential() {
			if (!openView || !selected?.id) {
				setLiveCredential(null);
				return;
			}
			setCredentialLoading(true);
			const res = await getAdvisorDefaultCredential(selected.id);
			if (active) {
				setLiveCredential(res.success ? (res.data ?? null) : null);
				setCredentialLoading(false);
			}
		}
		void loadCredential();
		return () => {
			active = false;
		};
	}, [openView, selected?.id]);

	const mainAdvisorOptions = useMemo(() => {
		return advisors.map((a) => ({
			value: a.id,
			label: a.name,
			subtitle: a.code,
			keywords: a.phone,
		}));
	}, [advisors]);
	const mainAdvisorNameById = useMemo(() => {
		const m = new Map<string, string>();
		for (const a of advisors) m.set(a.id, a.name);
		return m;
	}, [advisors]);

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

	async function openDeleteDialog(row: AdvisorSubRow) {
		setSelected(row);
		setOpenDelete(true);
		setDeleteImpact(null);
		setConfirmText("");
		setDeleteMode("detach");
		setImpactLoading(true);
		try {
			const impact = await getAdvisorDeleteImpact(row.id);
			setDeleteImpact(impact);
		} finally {
			setImpactLoading(false);
		}
	}

	async function handleTeamSave() {
		if (!selected) return;
		setTeamLoading(true);
		const parentId = targetParentId || null;
		const res = await setAdvisorParent(selected.id, parentId);
		setTeamLoading(false);
		if (!res.success) {
			toast.error("Team update failed", { description: res.error });
			return;
		}
		toast.success(
			selected.parent_advisor_id
				? "Sub-advisor parent updated"
				: "Advisor is now a sub-advisor",
		);
		setOpenTeam(false);
		router.refresh();
	}

	async function handleRemoveAsSubAdvisor() {
		if (!selected) return;
		setTeamLoading(true);
		const res = await setAdvisorParent(selected.id, null);
		setTeamLoading(false);
		if (!res.success) {
			toast.error("Could not remove sub-advisor", { description: res.error });
			return;
		}
		toast.success("Advisor is now a main advisor");
		setOpenTeam(false);
		router.refresh();
	}

	function openTeamDialog(row: AdvisorSubRow) {
		setSelected(row);
		setTargetParentId(row.parent_advisor_id ?? "");
		setOpenTeam(true);
	}

	async function handleDelete() {
		if (!selected) return;
		setDeleteLoading(true);
		const res = await deleteAdvisorWithConfirmation(selected.id, {
			confirmText,
			mode: deleteMode,
		});
		setDeleteLoading(false);
		if (!res.success) {
			toast.error("Delete failed", { description: res.error });
			return;
		}
		toast.success("Advisor deleted");
		setOpenDelete(false);
		router.refresh();
	}

	async function copyText(value: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} copied`);
		} catch {
			toast.error(`Failed to copy ${label.toLowerCase()}`);
		}
	}

	return (
		<Card className="border border-zinc-200/80 shadow-sm rounded-xl overflow-hidden">
			{/* Top Toolbar */}
			<div className="flex flex-col gap-3 p-4 bg-zinc-50/50 border-b border-zinc-100">
				<div className="flex flex-col sm:flex-row sm:items-center gap-3">
					<div className="relative flex-1 max-w-md w-full">
						<Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, code, phone, password hint…"
							className="h-9 pl-9 pr-3 text-xs sm:text-sm bg-white border border-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg shadow-sm w-full transition-all text-zinc-900 placeholder:text-zinc-400"
						/>
					</div>
				</div>

				<p className="text-[10px] text-zinc-500 font-medium">
					💡 Default login password is derived from current advisor name + phone from DB. Changing name or phone doesn't automatically update Auth — reset password or run the sync script.
				</p>
			</div>

			<CardContent className="p-0 overflow-x-auto">
				<Table>
					<TableHeader className="bg-zinc-50/80 border-b border-zinc-100">
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-10 p-1 pl-4" />
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 pl-2">
								Advisor
							</TableHead>
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 px-2">
								Phone
							</TableHead>
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 px-2">
								Default password
							</TableHead>
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 px-2 w-20">
								Subs
							</TableHead>
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 px-2">
								Status
							</TableHead>
							<TableHead className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 py-3 px-2 text-right pr-4">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={7} className="p-0">
									<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
										<div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
											<Search className="h-8 w-8" />
										</div>
										<h3 className="text-base font-semibold text-zinc-900 mb-1">No matches found</h3>
										<p className="text-sm text-zinc-500 max-w-xs mb-4">
											We couldn't find any advisor matching "{query}". Try checking spelling, or searching for other fields.
										</p>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setQuery("")}
											className="h-8 border-zinc-200 text-zinc-600 hover:bg-zinc-50 shadow-sm"
										>
											Clear Search Filter
										</Button>
									</div>
								</TableCell>
							</TableRow>
						) : (
							filtered.flatMap((a) => {
								const isOpen = expanded.has(a.id);
								const rows = [
									<TableRow
										key={a.id}
										className="group hover:bg-indigo-50/15 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]"
									>
										{/* Highlight Left Border Accordion Style */}
										<TableCell className="border-l-[3px] border-l-transparent group-hover:border-l-indigo-600 transition-all duration-200 pl-4 py-3 align-middle w-10">
											{a.sub_count > 0 ? (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 rounded-full bg-zinc-50 hover:bg-indigo-50 text-zinc-500 hover:text-indigo-600 border border-zinc-200/80 shrink-0 shadow-sm transition-all"
													aria-expanded={isOpen}
													onClick={(e) => {
														e.stopPropagation();
														toggleExpand(a.id);
													}}
												>
													<ChevronDown
														className={cn(
															"h-4 w-4 transition-transform duration-200",
															isOpen ? "rotate-180" : "rotate-0",
														)}
													/>
												</Button>
											) : null}
										</TableCell>
										<TableCell
											className="py-3 px-2 pl-2"
											onClick={() => {
												setSelected(a);
												setOpenView(true);
											}}
										>
											<div className="flex flex-col gap-0.5">
												<span className="font-bold text-zinc-900 group-hover:text-indigo-950 transition-colors text-sm leading-tight">{a.name}</span>
												<span className="text-xs text-zinc-500 font-mono mt-0.5">
													{a.code}
												</span>
											</div>
										</TableCell>
										<TableCell
											className="py-3 px-2 text-xs font-semibold text-zinc-700 font-mono tabular-nums"
											onClick={() => {
												setSelected(a);
												setOpenView(true);
											}}
										>
											{a.phone}
										</TableCell>
										<TableCell
											className="py-3 px-2 text-[11px] font-mono text-zinc-600 max-w-[160px] truncate"
											title={a.derived_password}
											onClick={() => {
												setSelected(a);
												setOpenView(true);
											}}
										>
											{a.derived_password}
										</TableCell>
										<TableCell
											className="py-3 px-2 text-xs font-bold text-zinc-800 tabular-nums"
											onClick={() => {
												setSelected(a);
												setOpenView(true);
											}}
										>
											{a.sub_count}
										</TableCell>
										<TableCell
											className="py-3 px-2"
											onClick={() => {
												setSelected(a);
												setOpenView(true);
											}}
										>
											<Badge
												variant="outline"
												className={cn(
													"text-xs font-semibold px-2 py-0.5 shadow-sm transition-colors",
													a.is_active
														? "bg-emerald-50 text-emerald-700 border-emerald-200"
														: "bg-zinc-50 text-zinc-500 border-zinc-200",
												)}
											>
												{a.is_active ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell className="text-right py-3 px-2 pr-4" onClick={(e) => e.stopPropagation()}>
											<div className="flex justify-end gap-1.5">
												<Button
													size="sm"
													variant="ghost"
													className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
													title="View details"
													onClick={() => {
														setSelected(a);
														setOpenView(true);
													}}
												>
													<Eye className="h-4 w-4 shrink-0" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:border-purple-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
													title="Change team"
													onClick={() => {
														openTeamDialog(a);
													}}
												>
													<GitBranch className="h-4 w-4 shrink-0" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
													title="Delete advisor"
													onClick={() => {
														void openDeleteDialog(a);
													}}
												>
													<Trash2 className="h-4 w-4 shrink-0" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
													title="Edit advisor"
													onClick={() => {
														setSelected(a);
														setOpenEdit(true);
													}}
												>
													<Pencil className="h-4 w-4 shrink-0" />
												</Button>
											</div>
										</TableCell>
									</TableRow>,
								];
								if (isOpen && a.subs.length > 0) {
									rows.push(
										<TableRow key={`${a.id}-subs`} className="bg-zinc-50/20 hover:bg-zinc-50/20 border-b border-zinc-150">
											<TableCell colSpan={7} className="p-0">
												<div className="pl-8 pr-4 py-3 bg-zinc-50/30">
													<div className="flex items-center gap-2 mb-3">
														<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded shadow-sm">
															Sub-advisors ({a.subs.length})
														</span>
														<div className="h-px bg-zinc-250 flex-1" />
													</div>
													
													<div className="relative border-l-2 border-dashed border-zinc-200 pl-4 space-y-3">
														{a.subs.map((s) => (
															<div
																key={s.id}
																className="group/sub relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
															>
																{/* Custom hierarchy line branch connector */}
																<div className="absolute left-[-18px] top-[24px] w-4 h-px border-t-2 border-dashed border-zinc-200 group-hover/sub:border-indigo-300 transition-colors" />
																
																<div className="flex items-center gap-3">
																	<div className="h-8 w-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-650 shrink-0 font-bold text-xs uppercase shadow-inner group-hover/sub:bg-indigo-50 group-hover/sub:text-indigo-600 group-hover/sub:border-indigo-150 transition-all">
																		{s.name.slice(0, 2)}
																	</div>
																	<div className="flex flex-col gap-0.5">
																		<div className="flex items-center gap-2 flex-wrap">
																			<span className="font-bold text-zinc-900 group-hover/sub:text-indigo-950 transition-colors text-xs sm:text-sm">{s.name}</span>
																			<span className="bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.2 rounded text-[10px] text-zinc-500 font-bold font-mono">{s.code}</span>
																		</div>
																		<div className="flex items-center gap-2.5 text-xs text-zinc-500">
																			<span className="tabular-nums font-semibold font-mono">{s.phone}</span>
																			{s.email && (
																				<>
																					<span>•</span>
																					<span className="truncate max-w-[150px] sm:max-w-none text-zinc-400 font-medium">{s.email}</span>
																				</>
																			)}
																		</div>
																	</div>
																</div>
																
																<div className="flex items-center justify-end gap-1.5 border-t border-zinc-50 pt-2 sm:border-t-0 sm:pt-0 shrink-0">
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
																		title="View sub-advisor profile"
																		onClick={() => {
																			setSelected(s);
																			setOpenView(true);
																		}}
																	>
																		<Eye className="h-4 w-4 shrink-0" />
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-purple-50 hover:text-purple-600 hover:border-purple-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
																		title="Change parent team"
																		onClick={() => {
																			openTeamDialog(s);
																		}}
																	>
																		<GitBranch className="h-4 w-4 shrink-0" />
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
																		title="Delete sub-advisor"
																		onClick={() => {
																			void openDeleteDialog(s);
																		}}
																	>
																		<Trash2 className="h-4 w-4 shrink-0" />
																	</Button>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="h-8 w-8 p-0 rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-250 active:scale-95 hover:-translate-y-0.5 transition-all duration-150"
																		title="Edit sub-advisor"
																		onClick={() => {
																			setSelected(s);
																			setOpenEdit(true);
																		}}
																	>
																		<Pencil className="h-4 w-4 shrink-0" />
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
			</CardContent>

			{/* Dialog details view */}
			<Dialog open={openView} onOpenChange={setOpenView}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden p-0 rounded-xl border border-zinc-200/80 shadow-lg">
					<DialogHeader className="shrink-0 border-b border-zinc-100 bg-zinc-50/80 p-5 text-left">
						<DialogTitle className="flex items-center justify-between text-base sm:text-lg">
							<div className="flex items-center gap-2.5">
								<div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
									<User className="h-4.5 w-4.5" />
								</div>
								<span className="font-bold text-zinc-900">Advisor Details</span>
							</div>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenView(false)} className="h-8 border-zinc-200 hover:bg-zinc-100/50 shadow-sm text-xs font-semibold px-3 shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
						{selected && (
							<>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-lg font-bold text-zinc-900 leading-tight">{selected.name}</p>
										<p className="text-xs text-zinc-500 font-mono mt-1 font-semibold bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded w-fit">{selected.code}</p>
									</div>
									<Badge
										variant="outline"
										className={cn(
											"text-xs font-bold px-2.5 py-0.5 shadow-sm transition-colors",
											selected.is_active
												? "bg-green-50 text-green-700 border-green-200"
												: "bg-zinc-50 text-zinc-500 border-zinc-200",
										)}
									>
										{selected.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								<div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm space-y-3.5 shadow-sm">
									<div className="flex justify-between items-center py-0.5 border-b border-zinc-50">
										<span className="text-zinc-500 font-semibold">Phone:</span>{" "}
										<span className="font-bold text-zinc-850 tabular-nums">{liveCredential?.phone ?? selected.phone}</span>
									</div>
									<div className="flex justify-between items-center py-0.5 border-b border-zinc-50">
										<span className="text-zinc-500 font-semibold">Login Email:</span>{" "}
										<span className="font-mono text-xs text-zinc-700 font-bold bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
											{(liveCredential?.email ?? selected.email) || "(auto-generated)"}
										</span>
									</div>
									<div className="flex flex-col gap-1.5 py-0.5 pt-1">
										<span className="text-zinc-500 font-semibold text-xs">Default Password (Derived):</span>{" "}
										<div className="flex items-center justify-between gap-1.5 bg-amber-50/40 border border-amber-100/70 p-3 rounded-lg">
											<span className="font-mono text-sm font-bold text-amber-900 select-all tracking-wide">
												{liveCredential?.derivedPassword ?? selected.derived_password}
											</span>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-8 border-amber-200 bg-white text-amber-900 hover:bg-amber-50 shadow-sm px-2 gap-1.5 font-bold"
												title="Copy password to clipboard"
												onClick={() =>
													void copyText(
														liveCredential?.derivedPassword ?? selected.derived_password,
														"Password",
													)
												}
											>
												<Copy className="h-3.5 w-3.5" />
												Copy
											</Button>
										</div>
									</div>
									<p className="text-[10px] text-zinc-400 pt-1 leading-relaxed">
										💡 {credentialLoading
											? "Refreshing credentials preview from database..."
											: "Credential preview represents latest advisor profile from the database."}
									</p>
								</div>
								<div className="flex gap-2 pt-2">
									<Button
										variant="outline"
										className="flex-1 font-bold border-zinc-250 hover:bg-zinc-50 shadow-sm text-zinc-700"
										onClick={() => {
											setOpenView(false);
											setOpenEdit(true);
										}}
									>
										<Pencil className="h-4 w-4 mr-2 text-zinc-500" />
										Edit Advisor Details
									</Button>
								</div>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={openEdit} onOpenChange={setOpenEdit}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0 rounded-xl border border-zinc-200/80 shadow-lg">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span className="font-bold text-zinc-900">Edit Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenEdit(false)} className="w-fit shrink-0 border-zinc-200 text-xs font-semibold h-8 px-3 hover:bg-zinc-50 shadow-sm">
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

			<Dialog open={openTeam} onOpenChange={setOpenTeam}>
				<DialogContent className="max-w-lg rounded-xl border border-zinc-200/80 shadow-lg">
					<DialogHeader>
						<DialogTitle className="font-bold text-zinc-900">Manage Advisor Team</DialogTitle>
					</DialogHeader>
					{selected ? (
						<div className="space-y-4 text-sm">
							<div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
								<div className="text-base font-bold text-zinc-900">{selected.name}</div>
								<div className="text-xs text-zinc-500 font-mono mt-0.5 font-semibold">{selected.code}</div>
							</div>
							{selected.parent_advisor_id ? (
								<div className="rounded-xl border border-amber-250 bg-amber-50 p-4 text-amber-900">
									<div className="text-xs font-bold uppercase tracking-wider text-amber-800">Current Role: Sub-advisor</div>
									<div className="text-xs mt-1.5 font-medium">
										Current main advisor:{" "}
										<strong>
											{mainAdvisorNameById.get(selected.parent_advisor_id) ?? "Unknown main advisor"}
										</strong>
									</div>
								</div>
							) : (
								<div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-700 text-xs font-medium">
									Current role: <strong className="text-zinc-950 font-bold bg-zinc-200 px-2 py-0.5 rounded text-[10px] uppercase border border-zinc-300">Main advisor</strong>
								</div>
							)}
							<div className="flex flex-wrap gap-2">
								{selected.parent_advisor_id ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={teamLoading}
										onClick={() => void handleRemoveAsSubAdvisor()}
										className="h-9 font-bold border-zinc-250 hover:bg-zinc-50 shadow-sm"
									>
										{teamLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
										Remove as Sub-advisor
									</Button>
								) : null}
							</div>
							<div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-inner space-y-2">
								<label className="text-xs font-bold text-zinc-600 block">
									{selected.parent_advisor_id ? "Update main advisor" : "Assign main advisor"}
								</label>
								<SearchableCombobox
									options={mainAdvisorOptions.filter((o) => o.value !== selected.id)}
									value={targetParentId}
									onChange={setTargetParentId}
									placeholder="Search main advisor…"
									emptyMessage="No main advisor available."
								/>
							</div>
							<div className="flex justify-end gap-2 pt-1">
								<Button type="button" variant="outline" className="font-bold border-zinc-250" onClick={() => setOpenTeam(false)}>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={teamLoading || !targetParentId || targetParentId === (selected.parent_advisor_id ?? "")}
									onClick={() => void handleTeamSave()}
									className="min-w-36 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:-translate-y-0.5 transition-all"
								>
									{teamLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
									{selected.parent_advisor_id ? "Update Main Advisor" : "Make Sub-advisor"}
								</Button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog open={openDelete} onOpenChange={setOpenDelete}>
				<DialogContent className="max-w-xl rounded-xl border border-zinc-200/80 shadow-lg">
					<DialogHeader>
						<DialogTitle className="font-bold text-zinc-900">Delete Advisor</DialogTitle>
					</DialogHeader>
					{selected ? (
						<div className="space-y-4 text-sm">
							<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
								<div className="font-bold text-base">{selected.name}</div>
								<div className="text-xs mt-1 font-medium">⚠️ Warning: This action is irreversible.</div>
							</div>
							{impactLoading ? (
								<div className="text-zinc-500 text-xs flex items-center gap-2 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading related-record impact…</div>
							) : deleteImpact ? (
								<div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50 shadow-inner">
									<div className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">Related records affected</div>
									<div className="grid grid-cols-2 gap-3 text-xs text-zinc-650 font-semibold">
										<div>Sub-advisors: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.sub_advisors}</strong></div>
										<div>Customers: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.customers}</strong></div>
										<div>Sales: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.sales}</strong></div>
										<div>Commissions: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.commission_rows}</strong></div>
										<div>Payments: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.commission_payments}</strong></div>
										<div>Assignments: <strong className="text-zinc-900 font-bold bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">{deleteImpact.project_assignments}</strong></div>
									</div>
								</div>
							) : null}
							<div className="flex flex-col sm:flex-row gap-2.5 pt-1.5">
								<Button
									type="button"
									size="sm"
									variant={deleteMode === "detach" ? "default" : "outline"}
									onClick={() => setDeleteMode("detach")}
									className={cn("flex-1 font-bold", deleteMode === "detach" ? "bg-zinc-800 hover:bg-zinc-900 text-white" : "border-zinc-250")}
								>
									Preserve Sales (detach advisor)
								</Button>
								<Button
									type="button"
									size="sm"
									variant={deleteMode === "hard" ? "default" : "outline"}
									onClick={() => setDeleteMode("hard")}
									className={cn("flex-1 font-bold", deleteMode === "hard" ? "bg-red-600 hover:bg-red-700 text-white border-red-650" : "border-zinc-250 text-red-600 hover:text-red-700")}
								>
									Delete Sales + Related Records
								</Button>
							</div>
							<div className="space-y-2 pt-1.5">
								<label className="text-xs font-bold text-zinc-650 block">
									Type advisor name to confirm: <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-900 font-bold border border-zinc-200">{selected.name}</span>
								</label>
								<Input
									value={confirmText}
									onChange={(e) => setConfirmText(e.target.value)}
									placeholder={selected.name}
									className="mt-1"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<Button type="button" variant="outline" className="font-bold border-zinc-250" onClick={() => setOpenDelete(false)}>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={deleteLoading || confirmText.trim().toLowerCase() !== selected.name.trim().toLowerCase()}
									className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-32 shadow-md hover:-translate-y-0.5 transition-all"
									onClick={() => void handleDelete()}
								>
									{deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
									Delete Advisor
								</Button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</Card>
	);
}
