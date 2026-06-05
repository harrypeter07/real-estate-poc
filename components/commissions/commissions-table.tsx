"use client";

import { Fragment, useMemo, useState } from "react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import { matchesTextSearch } from "@/lib/utils/text-search";
import { toast } from "sonner";
import { 
	BadgePercent, 
	CheckCircle2, 
	Clock, 
	Home, 
	User, 
	AlertCircle,
	Building2,
	Coins,
	CheckSquare,
	Shield,
	Settings,
	History,
	ArrowRight,
	Printer,
	Loader2,
	HelpCircle,
	Sparkles,
	Coins as CoinsIcon
} from "lucide-react";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Textarea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { recordCommissionPayment } from "@/app/actions/commissions";
import { ReceiptUpload } from "@/components/shared/receipt-upload";
import { ReceiptViewButton } from "@/components/shared/receipt-view-button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function getProportionalCommission(comm: any) {
	const saleTotal = Number(comm?.plot_sales?.total_sale_amount ?? 0);
	const saleReceived = Number(comm?.plot_sales?.amount_paid ?? 0);
	const profitTotal = Number(comm?.total_commission_amount ?? 0);
	if (saleTotal <= 0 || profitTotal <= 0) return 0;
	const ratio = Math.min(1, Math.max(0, saleReceived / saleTotal));
	return profitTotal * ratio;
}

function commissionRemaining(comm: any) {
	const eligible = getProportionalCommission(comm);
	return Math.max(
		0,
		eligible - Number(comm?.amount_paid ?? 0)
	);
}


export function CommissionsTable({ commissions }: { commissions: any[] }) {
	const router = useRouter();
	const [selected, setSelected] = useState<any | null>(null);
	const [open, setOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<"manage" | "history">("manage");
	const [saving, setSaving] = useState(false);
	const [payAmount, setPayAmount] = useState("");
	const [paidDate, setPaidDate] = useState(() =>
		new Date().toISOString().slice(0, 10)
	);
	const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "cheque">(
		"cash"
	);
	const [referenceNumber, setReferenceNumber] = useState("");
	const [receiptPath, setReceiptPath] = useState("");
	const [note, setNote] = useState("");
	const [payStatus, setPayStatus] = useState<"idle" | "success" | "error">("idle");
	const [payStatusText, setPayStatusText] = useState("");
	const [confirmExtraOpen, setConfirmExtraOpen] = useState(false);
	const [pendingExtraAmount, setPendingExtraAmount] = useState(0);
	const [extraReason, setExtraReason] = useState("");
	const [listQuery, setListQuery] = useState("");

	const visibleCommissions = useMemo(
		() =>
			commissions.filter((comm) => {
				const team = Array.isArray(comm.sale_commission_team_rows)
					? comm.sale_commission_team_rows
					: [comm];
				const teamParts = team.flatMap((t: any) => [
					t.advisors?.name,
					t.advisors?.code,
				]);
				return matchesTextSearch(
					listQuery,
					...teamParts,
					comm.plot_sales?.plots?.plot_number,
					comm.plot_sales?.plots?.projects?.name,
				);
			}),
		[commissions, listQuery],
	);

	const tableDisplayRows = useMemo(() => {
		const seenSale = new Set<string>();
		const out: { key: string; main: any; subs: any[] }[] = [];
		for (const c of visibleCommissions) {
			const sid = String(c.sale_id ?? "");
			const mainAid = c.plot_sales?.advisor_id ?? null;
			const team = Array.isArray(c.sale_commission_team_rows)
				? c.sale_commission_team_rows
				: [c];

			if (!sid || !mainAid) {
				out.push({ key: `single-${c.id}`, main: c, subs: [] });
				continue;
			}
			if (seenSale.has(sid)) continue;

			const mainRow = team.find((t: any) => t.advisor_id === mainAid);
			if (!mainRow) {
				seenSale.add(sid);
				for (const t of team) {
					out.push({ key: `orphan-${t.id}`, main: t, subs: [] });
				}
				continue;
			}

			seenSale.add(sid);
			const subs = team.filter((t: any) => t.advisor_id !== mainAid);
			out.push({ key: `sale-${sid}`, main: mainRow, subs });
		}
		return out;
	}, [visibleCommissions]);

	const remaining = useMemo(() => {
		if (!selected) return 0;
		return Math.max(
			0,
			Number(selected.total_commission_amount ?? 0) - Number(selected.amount_paid ?? 0)
		);
	}, [selected]);

	const totalExtraPaid = useMemo(() => {
		if (!selected) return 0;
		const history = Array.isArray(selected.advisor_commission_payments)
			? selected.advisor_commission_payments
			: [];
		return history.reduce(
			(sum: number, p: any) => sum + Number(p.extra_paid_amount ?? 0),
			0
		);
	}, [selected]);

	const eligibleNow = useMemo(() => {
		if (!selected) return 0;
		const saleTotal = Number(selected.plot_sales?.total_sale_amount ?? 0);
		const saleReceived = Number(selected.plot_sales?.amount_paid ?? 0);
		const profitTotal = Number(selected.total_commission_amount ?? 0);
		if (saleTotal <= 0 || profitTotal <= 0) return 0;
		const ratio = Math.min(1, Math.max(0, saleReceived / saleTotal));
		return profitTotal * ratio;
	}, [selected]);

	const availableNow = useMemo(() => {
		if (!selected) return 0;
		const paidToAdvisor = Number(selected.amount_paid ?? 0);
		return Math.max(0, eligibleNow - paidToAdvisor);
	}, [eligibleNow, selected]);

	const canPay = !!selected && remaining > 0;

	function openRow(comm: any, mode: "manage" | "history") {
		setSelected(comm);
		setPayAmount("");
		setPaidDate(new Date().toISOString().slice(0, 10));
		setPaymentMode("cash");
		setReferenceNumber("");
		setReceiptPath("");
		setNote("");
		setPayStatus("idle");
		setPayStatusText("");
		setConfirmExtraOpen(false);
		setPendingExtraAmount(0);
		setExtraReason("");
		setDialogMode(mode);
		setOpen(true);
	}

	const playSubmitTone = (kind: "success" | "error") => {
		if (typeof window === "undefined") return;
		try {
			const AudioCtx =
				(window as any).AudioContext || (window as any).webkitAudioContext;
			if (!AudioCtx) return;
			const ctx = new AudioCtx();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = kind === "success" ? 720 : 210;
			gain.gain.value = 0.0001;
			osc.connect(gain);
			gain.connect(ctx.destination);
			const now = ctx.currentTime;
			gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(
				0.0001,
				now + (kind === "success" ? 0.2 : 0.14)
			);
			osc.start(now);
			osc.stop(now + (kind === "success" ? 0.22 : 0.16));
			setTimeout(() => void ctx.close(), 300);
		} catch {
			// ignore
		}
	};

	async function submitPay() {
		await submitPayInternal(false);
	}

	async function submitPayInternal(allowExtra: boolean, overrideNote?: string) {
		if (!selected) return;
		const amt = Number(payAmount);
		if (!Number.isFinite(amt) || amt <= 0) {
			toast.error("Enter a valid amount");
			setPayStatus("error");
			setPayStatusText("Enter a valid payment amount.");
			playSubmitTone("error");
			return;
		}
		setSaving(true);
		setPayStatus("idle");
		setPayStatusText("");
		try {
			const res = await recordCommissionPayment(selected.id, amt, {
				paid_date: paidDate,
				payment_mode: paymentMode,
				reference_number: referenceNumber,
				receipt_path: receiptPath,
				note: overrideNote ?? note,
				allow_extra: allowExtra,
			});
			if ((res as any).requiresExtraConfirmation) {
				setPendingExtraAmount(Number((res as any).extraPaidAmount ?? 0));
				setConfirmExtraOpen(true);
				setSaving(false);
				return;
			}
			if (!res.success) {
				toast.error("Payment failed", { description: res.error });
				setPayStatus("error");
				setPayStatusText(res.error ?? "Payment failed.");
				playSubmitTone("error");
				return;
			}
			toast.success("Commission payment recorded");
			setPayStatus("success");
			const extra = Number((res as any).extraPaidAmount ?? 0);
			setPayStatusText(
				extra > 0
					? `Commission payment recorded with extra paid: ${formatCurrency(extra)}.`
					: "Commission payment recorded successfully."
			);
			playSubmitTone("success");
			setOpen(false);
			setSelected(null);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	if (commissions.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-16 text-center bg-white shadow-2xs max-w-lg mx-auto">
				<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-200/80 mb-4 shadow-3xs">
					<BadgePercent className="h-6 w-6 text-zinc-450" />
				</div>
				<h3 className="text-xs font-black text-zinc-750 uppercase tracking-wider">No commission records found</h3>
				<p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed font-semibold">
					Advisor payouts and commission tracking will appear here automatically when sales are recorded in the platform database.
				</p>
			</div>
		);
	}

	return (
		<>
			<Card className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
				<CardContent className="p-0">
					<div className="p-4 border-b border-zinc-150 bg-gradient-to-r from-zinc-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-3">
						<ListSearchBar
							value={listQuery}
							onChange={setListQuery}
							placeholder="Search by advisor name, code, plot number..."
							className="max-w-md w-full h-9.5 text-xs font-bold border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 rounded-xl"
						/>
						<p className="text-[10px] text-zinc-400 font-bold max-w-md md:text-right">
							Each booking contains a main advisor row and optional sub-advisors shown nested beneath. Sub-advisor totals display in separate cards.
						</p>
					</div>

					{visibleCommissions.length === 0 ? (
						<div className="px-6 py-12 text-center text-xs font-black text-zinc-450 uppercase tracking-wider bg-white">
							No commissions match your search query. Please clear filters to browse all records.
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table className="min-w-full">
								<TableHeader className="bg-zinc-50/80 border-b border-zinc-150 sticky top-0 z-10">
									<TableRow>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 pl-5">
											<div className="flex items-center gap-1.5">
												<User className="h-3.5 w-3.5 text-zinc-400" />
												Advisor
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<Building2 className="h-3.5 w-3.5 text-zinc-400" />
												Plot / Project
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<Coins className="h-3.5 w-3.5 text-zinc-400" />
												Main Commission
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
												Paid
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
												Due
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<Sparkles className="h-3.5 w-3.5 text-zinc-400" />
												Extra
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
											<div className="flex items-center gap-1.5">
												<Shield className="h-3.5 w-3.5 text-zinc-400" />
												Status
											</div>
										</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 text-right pr-5">
											<div className="flex items-center gap-1.5 justify-end">
												<Settings className="h-3.5 w-3.5 text-zinc-400" />
												Actions
											</div>
										</TableHead>
									</TableRow>
								</TableHeader>
								
								<TableBody>
									{tableDisplayRows.map(({ key, main: comm, subs }) => {
										const rem = commissionRemaining(comm);
										const isPaid = rem <= 0;
										const extraCol =
											Number(comm.amount_paid ?? 0) > Number(comm.total_commission_amount ?? 0)
												? Number(comm.amount_paid ?? 0) - Number(comm.total_commission_amount ?? 0)
												: 0;

										// Generate a soft gradient color base for the initials circle
										const nameChar = comm.advisors?.name ? comm.advisors.name.charAt(0).toUpperCase() : "?";
										
										return (
											<Fragment key={key}>
												{/* Main Advisor Row */}
												<TableRow className="hover:bg-teal-50/15 align-top relative transition-all duration-200 group border-b border-zinc-150/80 hover:shadow-[inset_4px_0_0_0_#0d9488]">
													<TableCell className="py-4 pl-5 min-w-[200px]">
														<div className="flex items-start gap-3">
															{/* Premium Gradient Circle Initials */}
															<div className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-600/10 to-teal-500/5 text-teal-700 border border-teal-550/15 flex items-center justify-center font-black text-xs shadow-3xs shrink-0 group-hover:scale-105 transition-all">
																{nameChar}
															</div>
															<div className="flex flex-col gap-0.5">
																<div className="flex items-center gap-1.5">
																	<span className="font-black text-xs text-zinc-800 tracking-tight">{comm.advisors?.name ?? "—"}</span>
																	<Badge variant="outline" className="bg-zinc-50 text-zinc-550 border-zinc-200/80 font-black text-[8px] uppercase tracking-wider py-0 px-1 rounded shadow-3xs">
																		MAIN
																	</Badge>
																</div>
																<span className="text-[10px] text-zinc-450 font-bold font-mono">
																	CODE: {comm.advisors?.code ?? "—"}
																</span>
															</div>
														</div>
													</TableCell>
													
													{/* Project/Plot column */}
													<TableCell className="py-4">
														<div className="flex items-start gap-2">
															<div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-center text-zinc-400 group-hover:text-teal-600 transition-colors shadow-3xs shrink-0 mt-0.5">
																<Home className="h-3.5 w-3.5" />
															</div>
															<div className="flex flex-col">
																<span className="font-black text-zinc-850 text-xs">Plot {comm.plot_sales?.plots?.plot_number ?? "—"}</span>
																<span className="text-[10px] text-zinc-450 font-bold truncate max-w-[150px] leading-tight">
																	{comm.plot_sales?.plots?.projects?.name ?? "—"}
																</span>
															</div>
														</div>
													</TableCell>
													
													{/* Main Commission with slight glow on hover */}
													<TableCell className="py-4 font-black text-zinc-900 text-xs font-mono group-hover:scale-[1.01] transition-transform">
														{formatCurrency(getProportionalCommission(comm))}
													</TableCell>
													
													{/* Paid main with finance glow */}
													<TableCell className="py-4 font-black text-emerald-600 text-xs font-mono group-hover:text-emerald-700">
														{formatCurrency(comm.amount_paid)}
													</TableCell>
													
													{/* Due main with soft red accent highlighting */}
													<TableCell className={cn("py-4 font-black text-xs font-mono", rem > 0 ? "text-red-500 bg-red-50/10" : "text-zinc-400")}>
														{formatCurrency(rem)}
													</TableCell>
													
													<TableCell className="py-4 font-black text-amber-600 text-xs font-mono">
														{formatCurrency(extraCol)}
													</TableCell>
													
													{/* Status Badges with Finance Glowing Circles */}
													<TableCell className="py-4">
														{isPaid ? (
															<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100/50 font-black text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-md shadow-3xs flex items-center gap-1.5 w-fit">
																<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
																Paid
															</Badge>
														) : (
															<Badge variant="outline" className="bg-amber-50/80 text-amber-700 border-amber-100/50 font-black text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-md shadow-3xs flex items-center gap-1.5 w-fit">
																<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
																Pending
															</Badge>
														)}
													</TableCell>
													
													<TableCell className="py-4 text-right pr-5">
														<div className="flex justify-end gap-1.5">
															<Button
																type="button"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation();
																	openRow(comm, "manage");
																}}
																className="h-8 px-3 text-[10px] font-black rounded-lg bg-white border border-zinc-200 text-zinc-650 hover:text-zinc-800 hover:border-zinc-350 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1 cursor-pointer"
															>
																<Settings className="h-3 w-3" />
																Manage
															</Button>
															<Button
																type="button"
																size="sm"
																variant="ghost"
																onClick={(e) => {
																	e.stopPropagation();
																	openRow(comm, "history");
																}}
																className="h-8 px-3 text-[10px] font-black rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1 cursor-pointer"
															>
																<History className="h-3 w-3" />
																History
															</Button>
														</div>
													</TableCell>
												</TableRow>
												
												{/* Sub-Advisors Connected Breakdown Component */}
												{subs.length > 0 ? (
													<TableRow className="bg-amber-50/5 hover:bg-amber-50/10 align-top border-b border-zinc-150/50">
														<TableCell colSpan={8} className="py-3.5 pl-6 pr-5 border-l-2 border-amber-400">
															<div className="text-[10px] font-black uppercase tracking-wider text-amber-850/80 mb-2 px-1 flex items-center gap-1.5">
																<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
																Sub-advisors Commission Payout Breakdowns
															</div>
															<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
																{subs.map((sub: any) => {
																	const srem = commissionRemaining(sub);
																	const subInitials = sub.advisors?.name ? sub.advisors.name.charAt(0).toUpperCase() : "?";
																	return (
																		<div
																			key={sub.id}
																			className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
																		>
																			{/* Sub-advisor ID Badge */}
																			<div className="flex items-center gap-2 pb-2 border-b border-zinc-100/80">
																				<div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500/10 to-amber-600/5 text-amber-700 border border-amber-500/10 flex items-center justify-center font-black text-[10px] shadow-3xs shrink-0">
																					{subInitials}
																				</div>
																				<div className="flex flex-col">
																					<span className="font-bold text-xs text-zinc-800">{sub.advisors?.name ?? "—"}</span>
																					<span className="text-[9px] text-zinc-400 font-bold font-mono leading-none mt-0.5">
																						CODE: {sub.advisors?.code ?? "—"}
																					</span>
																				</div>
																			</div>
																			
																			{/* Numerical payouts */}
																			<div className="mt-2.5 grid grid-cols-3 gap-2 text-[9px] tabular-nums text-zinc-500">
																				<div className="space-y-0.5">
																					<span className="uppercase font-black text-[8px] tracking-wider text-zinc-400">Total</span>
																					<span className="block font-black text-zinc-800 font-mono text-xs">
																						{formatCurrency(getProportionalCommission(sub))}
																					</span>
																				</div>
																				<div className="space-y-0.5">
																					<span className="uppercase font-black text-[8px] tracking-wider text-zinc-400">Paid</span>
																					<span className="block font-black text-emerald-600 font-mono text-xs">
																						{formatCurrency(sub.amount_paid)}
																					</span>
																				</div>
																				<div className="space-y-0.5">
																					<span className="uppercase font-black text-[8px] tracking-wider text-zinc-400">Due</span>
																					<span className={cn("block font-black font-mono text-xs", srem > 0 ? "text-red-500" : "text-zinc-450")}>
																						{formatCurrency(srem)}
																					</span>
																				</div>
																			</div>
																			
																			{/* Inline Control Buttons */}
																			<div className="mt-3.5 flex justify-end gap-1.5 border-t border-zinc-100/80 pt-2.5">
																				<Button
																					type="button"
																					size="sm"
																					className="h-7 px-2.5 text-[9px] font-black rounded-lg bg-white border border-zinc-200 text-zinc-650 hover:text-zinc-800 hover:border-zinc-350 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-0.5 cursor-pointer"
																					onClick={(e) => {
																						e.stopPropagation();
																						openRow(sub, "manage");
																					}}
																				>
																					<Settings className="h-2.5 w-2.5" />
																					Manage
																				</Button>
																				<Button
																					type="button"
																					size="sm"
																					variant="ghost"
																					className="h-7 px-2.5 text-[9px] font-black rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-0.5 cursor-pointer"
																					onClick={(e) => {
																						e.stopPropagation();
																						openRow(sub, "history");
																					}}
																				>
																					<History className="h-2.5 w-2.5" />
																					History
																				</Button>
																			</div>
																		</div>
																	);
																})}
															</div>
														</TableCell>
													</TableRow>
												) : null}
											</Fragment>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialogs exactly same functionality upgraded UI */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className={cn("rounded-2xl border border-zinc-200/80 bg-white shadow-2xl z-50 overflow-hidden p-0", dialogMode === "manage" ? "max-w-lg" : "max-w-2xl")}>
					<DialogHeader className="px-4 sm:px-6 py-4 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white flex flex-row items-center justify-between">
						<DialogTitle className="font-black text-zinc-850 text-xs uppercase tracking-wider flex items-center gap-2 m-0">
							<div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								{dialogMode === "manage" ? <Settings className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
							</div>
							{dialogMode === "manage" ? "Manage Commission Payment" : "Commission Payout History"}
						</DialogTitle>
					</DialogHeader>

					{selected && (
						<div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
							<div className="space-y-3">
								{dialogMode === "history" &&
									Array.isArray(selected.sale_commission_team_rows) &&
									selected.sale_commission_team_rows.length > 1 && (
										<div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-3xs">
											<div className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-2.5">
												All advisors linked to this sale
											</div>
											<ul className="space-y-2">
												{selected.sale_commission_team_rows.map((t: any) => {
													const mainAid = selected.plot_sales?.advisor_id;
													const isMain = Boolean(mainAid && t.advisor_id === mainAid);
													const tr = commissionRemaining(t);
													return (
														<li
															key={t.id}
															className="flex flex-wrap justify-between items-center gap-2 border-b border-zinc-200/50 pb-1.5 last:border-0 last:pb-0"
														>
															<span className="font-bold text-xs text-zinc-700">
																{t.advisors?.name ?? "—"}
																{isMain ? (
																	<span className="text-zinc-400 font-semibold text-[10px]"> (main)</span>
																) : mainAid ? (
																	<span className="text-amber-800/80 font-semibold text-[10px]"> (sub)</span>
																) : null}
															</span>
															<span className="font-mono text-xs text-zinc-700 font-bold">
																{formatCurrency(getProportionalCommission(t))} &middot; due{" "}
																<span className={tr > 0 ? "text-red-500" : "text-emerald-600"}>{formatCurrency(tr)}</span>
															</span>
														</li>
													);
												})}
											</ul>
										</div>
									)}

								{dialogMode === "manage" ? (
									<div className="rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 shadow-3xs space-y-1">
										<div className="text-[9px] font-black uppercase tracking-wider text-zinc-450">
											Target Ledger Commission Row
										</div>
										<div className="font-black text-sm text-zinc-800">{selected.advisors?.name ?? "—"}</div>
										<div className="text-xs font-bold text-zinc-450 leading-tight">
											{selected.plot_sales?.plots?.projects?.name ?? "—"} &middot; Plot{" "}
											{selected.plot_sales?.plots?.plot_number ?? "—"}
										</div>
									</div>
								) : (
									<div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-zinc-500 mb-3 bg-zinc-50/50 p-3 rounded-xl border border-zinc-200">
										<span><strong>Advisor:</strong> {selected.advisors?.name ?? "—"}</span>
										<span><strong>Plot:</strong> {selected.plot_sales?.plots?.projects?.name ?? "—"} • {selected.plot_sales?.plots?.plot_number ?? "—"}</span>
										<span><strong>Total:</strong> {formatCurrency(selected.total_commission_amount)}</span>
										<span><strong>Paid:</strong> {formatCurrency(selected.amount_paid)}</span>
										<span><strong>Available:</strong> {formatCurrency(availableNow)}</span>
									</div>
								)}

								{dialogMode === "manage" && (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
										<InfoRow label="Commission on this sale" value={formatCurrency(selected.total_commission_amount)} strong />
										<InfoRow label="Paid out so far" value={formatCurrency(selected.amount_paid)} />
										<InfoRow
											label="Eligible pro-rata collections"
											value={formatCurrency(eligibleNow)}
											strong
										/>
										<InfoRow label="Can pay now (eligible)" value={formatCurrency(availableNow)} strong />
										<InfoRow label="Commission still due" value={formatCurrency(remaining)} />
										<InfoRow label="Extra paid (recorded)" value={formatCurrency(totalExtraPaid)} />
										{selected.notes && (
											<div className="rounded-xl border border-zinc-250 bg-zinc-50/80 p-3.5 text-xs text-zinc-650 font-semibold whitespace-pre-wrap sm:col-span-2">
												{selected.notes}
											</div>
										)}
									</div>
								)}

								{dialogMode === "history" &&
									Array.isArray(selected.advisor_commission_payments) &&
									selected.advisor_commission_payments.length > 0 && (
										<div className="rounded-xl border border-zinc-200 p-4 space-y-3">
											<div className="text-xs font-black text-zinc-800 uppercase tracking-wider">
												Payout Payer Ledger List
											</div>
											<div className="space-y-2 max-h-56 overflow-y-auto pr-1">
												{selected.advisor_commission_payments
													.slice()
													.sort(
														(a: any, b: any) =>
															String(b.paid_date).localeCompare(String(a.paid_date)) ||
															String(b.created_at).localeCompare(String(a.created_at))
													)
													.map((p: any) => (
														<div
															key={p.id}
															className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 hover:bg-zinc-50/50 transition-colors shadow-3xs"
														>
															<div className="min-w-0 space-y-0.5">
																<div className="text-xs font-bold text-zinc-450">
																	{p.paid_date} &middot;{" "}
																	<span className="text-[10px] uppercase font-black text-zinc-650 bg-zinc-100 px-1 rounded-sm">{String(p.payment_mode ?? "cash")}</span>
																	{p.reference_number
																		? ` &middot; Ref: ${p.reference_number}`
																		: ""}
																</div>
																{p.note ? (
																	<div className="text-xs font-semibold text-zinc-650 truncate">
																		{p.note}
																	</div>
																) : null}
																{Number(p.extra_paid_amount ?? 0) > 0 && (
																	<div className="text-[10px] text-amber-700 font-black uppercase tracking-wider mt-0.5">
																		Extra Paid: {formatCurrency(Number(p.extra_paid_amount ?? 0))}
																	</div>
																)}
															</div>
															<div className="flex items-center gap-2 shrink-0">
																<ReceiptViewButton
																	receiptPath={p.receipt_path}
																	title="Commission receipt"
																/>
																<div className="font-black text-zinc-900 text-sm font-mono whitespace-nowrap">
																	{formatCurrency(p.amount)}
																</div>
															</div>
														</div>
													))}
											</div>
										</div>
									)}
							</div>

							{dialogMode === "manage" ? (
								<div className="space-y-3.5 pt-3 border-t border-zinc-150">
									<div className="rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-4 bg-zinc-50/30 shadow-3xs">
										<div className="text-xs font-black text-zinc-800 uppercase tracking-wider">
											Log Commission Payout
										</div>

										<div className="grid grid-cols-2 gap-3 sm:gap-4">
											<div className="space-y-2">
												<label className="block text-[10px] uppercase font-black text-zinc-450 tracking-wider">Amount</label>
												<Input
													type="number"
													value={payAmount}
													onChange={(e) =>
														setPayAmount(e.target.value.replace(/^0+(?=\d)/, ""))
													}
													placeholder="e.g. 5000"
													disabled={!canPay || saving}
													className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus:visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
												/>
											</div>
											<div className="space-y-2">
												<label className="block text-[10px] uppercase font-black text-zinc-450 tracking-wider">Date</label>
												<Input
													type="date"
													value={paidDate}
													onChange={(e) => setPaidDate(e.target.value)}
													disabled={!canPay || saving}
													className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
											<div className="space-y-2">
												<label className="block text-[10px] uppercase font-black text-zinc-450 tracking-wider">Mode</label>
												<Select
													value={paymentMode}
													onValueChange={(v) =>
														setPaymentMode(v as "cash" | "online" | "cheque")
													}
													disabled={!canPay || saving}
												>
													<SelectTrigger className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all">
														<SelectValue placeholder="Select mode" />
													</SelectTrigger>
													<SelectContent className="rounded-xl border-zinc-200">
														<SelectItem value="cash" className="text-xs font-semibold">Cash</SelectItem>
														<SelectItem value="online" className="text-xs font-semibold">Online / UPI</SelectItem>
														<SelectItem value="cheque" className="text-xs font-semibold">Cheque</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<label className="block text-[10px] uppercase font-black text-zinc-450 tracking-wider">
													Reference # (optional)
												</label>
												<Input
													value={referenceNumber}
													onChange={(e) => setReferenceNumber(e.target.value)}
													placeholder="UTR / cheque / ref"
													disabled={!canPay || saving}
													className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
												/>
											</div>
										</div>

										<ReceiptUpload
											folder="commissions"
											recordId={selected.id}
											value={receiptPath}
											onChange={setReceiptPath}
										/>

										<div className="space-y-2">
											<label className="block text-[10px] uppercase font-black text-zinc-450 tracking-wider">Note (optional)</label>
											<Textarea
												rows={2}
												value={note}
												onChange={(e) => setNote(e.target.value)}
												placeholder="UPI/Bank ref, specific remarks..."
												disabled={!canPay || saving}
												className="text-xs font-semibold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
											/>
										</div>

										<div className="flex justify-end gap-2.5 pt-2">
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													setPayAmount(String(Math.max(0, availableNow)))
												}
												disabled={!canPay || saving}
												className="h-9.5 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer"
											>
												Pay Max
											</Button>
											<Button
												type="button"
												onClick={submitPay}
												disabled={!canPay || saving}
												className="h-9.5 px-5 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:shadow-xs active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
											>
												{saving ? (
													<>
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
														Saving...
													</>
												) : (
													"Record Payout"
												)}
											</Button>
										</div>
										
										{payStatus !== "idle" && (
											<div
												className={cn(
													"mt-2 flex items-center gap-2 rounded-xl border px-3.5 py-3 text-xs font-bold animate-in fade-in zoom-in-95 duration-200 shadow-3xs",
													payStatus === "success"
														? "border-green-200 bg-green-50 text-green-700"
														: "border-red-250 bg-red-50 text-red-750"
												)}
											>
												{payStatus === "success" ? (
													<CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0" />
												) : (
													<AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
												)}
												<span>{payStatusText}</span>
											</div>
										)}
									</div>
								</div>
							) : null}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Extra Payment confirmation modal */}
			<Dialog open={confirmExtraOpen} onOpenChange={setConfirmExtraOpen}>
				<DialogContent className="rounded-2xl border border-zinc-250 bg-white shadow-2xl z-50 overflow-hidden max-w-md p-6">
					<DialogHeader>
						<DialogTitle className="font-black text-zinc-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
							<AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
							Confirm Extra Payment
						</DialogTitle>
					</DialogHeader>
					
					<div className="space-y-4.5 pt-2 text-xs font-semibold leading-relaxed text-zinc-650">
						<p>
							This payment includes an extra payout of{" "}
							<span className="font-black text-amber-700 font-mono text-sm">
								{formatCurrency(pendingExtraAmount)}
							</span>{" "}
							beyond currently eligible commission metrics.
						</p>
						<p className="text-zinc-400">
							Do you want to continue and record this as an extra payment?
						</p>
						
						<div className="space-y-1.5">
							<div className="text-[10px] uppercase font-black text-zinc-450 tracking-wider">
								Reason / Note for extra payment *
							</div>
							<Textarea
								rows={3}
								value={extraReason}
								onChange={(e) => setExtraReason(e.target.value)}
								placeholder="Provide precise justification for logging this extra payment value..."
								className="text-xs font-semibold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
							/>
						</div>
						
						<div className="flex justify-end gap-2.5 pt-3.5 border-t border-zinc-150">
							<Button
								type="button"
								variant="outline"
								onClick={() => setConfirmExtraOpen(false)}
								className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer"
							>
								Cancel
							</Button>
							<Button
								type="button"
								disabled={!extraReason.trim()}
								onClick={async () => {
									const reasonText = extraReason.trim();
									if (!reasonText) {
										toast.error("Reason is required for extra payment");
										return;
									}
									setConfirmExtraOpen(false);
									const mergedNote = [note?.trim(), `Extra payment reason: ${reasonText}`]
										.filter(Boolean)
										.join("\n\n");
									await submitPayInternal(true, mergedNote);
								}}
								className="h-9 px-4.5 text-xs font-black rounded-xl bg-amber-600 hover:bg-amber-700 text-white hover:shadow-xs active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
							>
								Confirm Extra Payment
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function InfoRow({
	label,
	value,
	strong,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/85 p-3.5 shadow-3xs bg-white">
			<span className="text-[11px] text-zinc-450 font-bold uppercase tracking-wider">{label}</span>
			<span className={cn(strong ? "font-black text-zinc-900" : "font-bold text-zinc-650", "text-xs font-mono")}>
				{value}
			</span>
		</div>
	);
}
