"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Calendar, User, MapPin, IndianRupee, MessageCircle, Building2, Tag, Percent, ArrowRight, Wallet, HelpCircle, UserCheck } from "lucide-react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import { matchesTextSearch } from "@/lib/utils/text-search";
import { openWhatsAppPaymentReminder } from "@/lib/payment-whatsapp";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { SaleDetailModal } from "./sale-detail-modal";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const phaseConfig: Record<string, { label: string; className: string }> = {
	token: { label: "Token Paid", className: "bg-amber-50 text-amber-700 border-amber-100/60" },
	full_payment: {
		label: "Fully Paid",
		className: "bg-emerald-50 text-emerald-700 border-emerald-100/60",
	},
};

function getInitials(name: string) {
	if (!name) return "—";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarGradient(name: string) {
	const colors = [
		"bg-gradient-to-br from-teal-500/10 to-emerald-500/10 text-teal-700 border-teal-100/50",
		"bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-100/50",
		"bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 text-purple-700 border-purple-100/50",
		"bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-100/50",
		"bg-gradient-to-br from-pink-500/10 to-rose-500/10 text-rose-700 border-rose-100/50",
	];
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % colors.length;
	return colors[index];
}

export function SalesList({
	sales,
	canCollectPayments = true,
}: {
	sales: any[];
	canCollectPayments?: boolean;
}) {
	const [selectedSale, setSelectedSale] = useState<any | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [listQuery, setListQuery] = useState("");
	const router = useRouter();
	const searchParams = useSearchParams();

	const visibleSales = useMemo(() => {
		return sales.filter((sale: any) => {
			const teamNames = (sale.commission_participants ?? [])
				.map((p: { name?: string }) => p?.name)
				.filter(Boolean);
			return matchesTextSearch(
				listQuery,
				sale.customers?.name,
				sale.customers?.phone,
				sale.advisors?.name,
				sale.advisors?.code,
				sale.plots?.plot_number,
				sale.plots?.projects?.name,
				...teamNames,
			);
		});
	}, [sales, listQuery]);

	const openSaleModal = (sale: any) => {
		setSelectedSale(sale);
		setModalOpen(true);
	};

	useEffect(() => {
		const openSaleId = searchParams.get("openSaleId");
		if (!openSaleId) return;
		const match = (sales ?? []).find((s: any) => String(s?.id ?? "") === String(openSaleId));
		if (!match) return;
		openSaleModal(match);

		// Prevent re-opening the modal on refresh/back.
		const params = new URLSearchParams(searchParams.toString());
		params.delete("openSaleId");
		params.delete("collect");
		router.replace(params.toString() ? `/sales?${params.toString()}` : "/sales");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sales]);

	return (
		<>
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-50/50 p-3 rounded-2xl border border-zinc-200/50">
					<ListSearchBar
						value={listQuery}
						onChange={setListQuery}
						placeholder="Search by customer, phone, advisor, plot, project…"
						className="max-w-xl w-full"
					/>
					<div className="flex items-center gap-2 px-3 text-[11px] font-black uppercase tracking-wider text-zinc-400">
						<span>Showing {visibleSales.length} of {sales.length} records</span>
					</div>
				</div>
				
				{visibleSales.length === 0 ? (
					<div className="border border-dashed border-zinc-200/85 rounded-2xl p-12 text-center bg-white flex flex-col items-center justify-center transition-all duration-300 shadow-xs max-w-md mx-auto my-6">
						<div className="h-12 w-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
							<ShoppingCart className="h-5 w-5 text-zinc-400" />
						</div>
						<p className="text-xs font-black text-zinc-700 uppercase tracking-wide">No transactions match search</p>
						<p className="text-[11px] text-zinc-400 font-medium mt-1.5">
							Try clear search box to list all {sales.length} recorded booking records.
						</p>
					</div>
				) : null}
			</div>

			{visibleSales.length > 0 ? (
				<div className="grid grid-cols-1 gap-5 mt-5">
					{visibleSales.map((sale) => {
						const subN = Number(sale.sub_advisor_commission_count ?? 0);
						const team = Array.isArray(sale.commission_participants)
							? sale.commission_participants
							: [];
						const subNames = team
							.filter((p: { is_main?: boolean }) => p.is_main === false)
							.map((p: { name?: string }) => p.name)
							.filter(Boolean) as string[];
						const advisorName = sale.sold_by_admin
							? "Admin (Direct)"
							: `${sale.advisors?.name ?? "—"}${
									subNames.length > 0
										? ` · ${subNames.join(", ")}`
										: subN > 0
											? ` + ${subN} sub-advisor${subN === 1 ? "" : "s"}`
											: ""
								}`;
						const phase =
							sale.is_cancelled
								? { label: "Plot revoked", className: "bg-red-50 text-red-700 border-red-150" }
								: sale.sale_phase === "token"
								? phaseConfig["token"]
								: phaseConfig["full_payment"];

						const customerInitials = getInitials(sale.customers?.name || "");
						const customerGradient = getAvatarGradient(sale.customers?.name || "");
						const advisorInitials = getInitials(sale.sold_by_admin ? "Admin" : (sale.advisors?.name || ""));
						const advisorGradient = getAvatarGradient(sale.sold_by_admin ? "Admin" : (sale.advisors?.name || ""));

						return (
							<Card
								key={sale.id}
								className={cn(
									"group overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-teal-500/50 hover:shadow-[0_8px_30px_rgb(13,148,136,0.06)] active:scale-[0.99] transition-all duration-300 cursor-pointer relative",
									sale.is_cancelled ? "opacity-60 grayscale" : ""
								)}
								onClick={() => router.push(`/sales/${sale.id}`)}
							>
								{/* Top subtle gradient accent line */}
								<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/0 via-teal-500/20 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

								<CardContent className="p-0">
									<div className="flex flex-col lg:flex-row">
										{/* LEFT: Plot/Project & Amount Panel */}
										<div className="p-5 lg:w-1/4 bg-zinc-50/70 border-b lg:border-b-0 lg:border-r border-zinc-150/80 flex flex-col justify-between gap-4">
											<div className="space-y-2.5">
												<div className="flex items-center gap-2">
													<Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs", phase.className)} title={phase.label}>
														{phase.label}
													</Badge>
													
													{/* Sale ID Badge with elegant glow */}
													<span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100/60 rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-2xs">
														<Tag className="h-2.5 w-2.5 shrink-0" />
														PLOT #{sale.plots?.plot_number}
													</span>
												</div>
												
												<div className="space-y-1">
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
														<Building2 className="h-3 w-3 text-zinc-400" /> Project Layout
													</p>
													<p className="text-sm font-black text-zinc-800 tracking-tight leading-tight truncate">
														{sale.plots?.projects?.name ?? "—"}
													</p>
												</div>
											</div>

											{sale.is_cancelled ? (
												<div className="bg-red-50/60 border border-red-100/40 rounded-xl p-2.5 space-y-0.5">
													<p className="text-[9px] font-black uppercase tracking-wide text-red-500">Revoked Transaction</p>
													{sale.revoked_at ? (
														<p className="text-[10px] font-medium text-zinc-500">
															Date: {formatDate(sale.revoked_at)}
														</p>
													) : null}
													{sale.revoked_by ? (
														<p className="text-[10px] font-medium text-zinc-500">
															By: {sale.revoked_by}
														</p>
													) : null}
												</div>
											) : null}

											<div className="pt-2 border-t border-zinc-200/50 space-y-0.5">
												<p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
													Total Sale Amount
												</p>
												<p className="text-xl font-black text-teal-700 tracking-tight font-mono">
													{formatCurrency(sale.total_sale_amount)}
												</p>
											</div>
										</div>

										{/* CENTER: Customer & Advisor Info Column Grid */}
										<div className="p-5 lg:w-2/4 grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
											{/* Customers & Advisors block */}
											<div className="space-y-4">
												{/* Customer Block */}
												<div className="flex items-start gap-3">
													<div className={cn("h-9 w-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-2xs", customerGradient)}>
														{customerInitials}
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">
															Customer
														</p>
														<p className="text-xs font-black text-zinc-800 leading-normal mt-0.5 truncate">
															{sale.customers?.name ?? "—"}
														</p>
														<p className="text-[10px] text-zinc-400 font-medium font-mono">
															{sale.customers?.phone ?? "—"}
														</p>
													</div>
												</div>

												{/* Advisor Block */}
												<div className="flex items-start gap-3">
													<div className={cn("h-9 w-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-2xs", advisorGradient)}>
														{advisorInitials}
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">
															Sold By Advisor
														</p>
														<p className="text-xs font-black text-zinc-800 leading-normal mt-0.5 truncate">
															{advisorName}
														</p>
														
														{/* Custom Sub-Advisor Commission details box if present */}
														{!sale.sold_by_admin && team.length > 0 ? (
															<div className="mt-2.5 rounded-xl border border-zinc-150 bg-zinc-50/50 p-2.5 space-y-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.015)]">
																<p className="text-[8px] font-black uppercase tracking-wider text-zinc-450 flex items-center gap-1">
																	<Percent className="h-3 w-3 text-zinc-450" />
																	Commission Details
																</p>
																<ul className="space-y-1 text-[10px]">
																	{team.map((p: { name?: string; amount?: number; is_main?: boolean }, idx: number) => (
																		<li
																			key={`${p.name}-${idx}`}
																			className="flex items-center justify-between gap-2 text-zinc-650"
																		>
																			<span className="min-w-0 truncate font-semibold">
																				{p.name ?? "—"}
																				{p.is_main === true ? (
																					<span className="text-[9px] text-teal-650 font-black uppercase ml-1"> (main)</span>
																				) : p.is_main === false ? (
																					<span className="text-[9px] text-amber-700 font-black uppercase ml-1"> (sub)</span>
																				) : null}
																			</span>
																			<span className="shrink-0 font-bold font-mono text-zinc-800">
																				{typeof p.amount === "number" ? formatCurrency(p.amount) : "—"}
																			</span>
																		</li>
																	))}
																</ul>
															</div>
														) : !sale.sold_by_admin && subN > 0 && team.length === 0 ? (
															<p className="mt-1 text-[10px] text-amber-800 font-bold bg-amber-50/60 px-2 py-0.5 rounded-md border border-amber-100/50 w-fit">
																{subN} sub-advisor{subN === 1 ? "" : "s"} commission share active
															</p>
														) : null}
													</div>
												</div>
											</div>

											{/* Dates & Paid/Remaining balance stats */}
											<div className="space-y-4 pt-1 md:pt-0">
												{/* Transaction Date */}
												<div className="flex items-start gap-2.5 text-xs">
													<div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
														<Calendar className="h-3.5 w-3.5 text-zinc-450" />
													</div>
													<div>
														<p className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">
															Date
														</p>
														<p className="font-bold text-zinc-700 mt-0.5">
															{sale.token_date
																? formatDate(sale.token_date)
																: formatDate(sale.created_at)}
														</p>
													</div>
												</div>

												{/* Paid vs Remaining details */}
												<div className="flex items-start gap-2.5 text-xs">
													<div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-150 flex items-center justify-center shrink-0">
														<Wallet className="h-3.5 w-3.5 text-zinc-450" />
													</div>
													<div className="space-y-1">
														<p className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">
															Payment Status
														</p>
														<div className="space-y-1 mt-0.5">
															<span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/30 shadow-2xs">
																<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
																Paid: {formatCurrency(sale.amount_paid)}
															</span>
															
															{(() => {
																const remaining = sale.remaining_amount !== null && sale.remaining_amount !== undefined
																	? Number(sale.remaining_amount)
																	: Number(sale.total_sale_amount) - Number(sale.amount_paid ?? 0);
																return remaining > 0 ? (
																	<div className="text-[10px] text-zinc-400 font-bold pl-0.5">
																		Remaining: <span className="text-red-500 font-mono font-black">{formatCurrency(remaining)}</span>
																	</div>
																) : (
																	<div className="text-[9px] text-teal-650 font-black uppercase tracking-wider bg-teal-50/50 px-2 py-0.5 rounded-lg border border-teal-100/30 w-fit">
																		Fully Settled
																	</div>
																);
															})()}
														</div>
													</div>
												</div>
											</div>
										</div>

										{/* RIGHT: Quick Action panel buttons */}
										<div
											className="p-5 lg:w-1/4 flex flex-col justify-center gap-2.5 border-t lg:border-t-0 lg:border-l border-zinc-150/80 bg-zinc-50/20"
											onClick={(e) => e.stopPropagation()}
										>
											<Button
												variant="outline"
												size="sm"
												className="w-full h-9 text-xs font-black rounded-xl border-zinc-200 text-zinc-650 hover:text-zinc-900 bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
												onClick={() => openSaleModal(sale)}
											>
												View Details
											</Button>
											
											{!sale.is_cancelled && sale.payment_due_meta?.is_payment_due ? (
												<Button
													size="sm"
													variant="outline"
													className="w-full h-9 text-xs font-black rounded-xl text-green-700 hover:text-green-800 border-green-200/70 hover:border-green-300 hover:bg-green-50/40 bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
													onClick={() =>
														openWhatsAppPaymentReminder({
															phone: sale.customers?.phone,
															customerName: sale.customers?.name ?? "Customer",
															plot: String(sale.plots?.plot_number ?? "—"),
															project: String(sale.plots?.projects?.name ?? "—"),
															remainingAmount: Number(sale.remaining_amount ?? 0),
															monthlyEmi: sale.monthly_emi,
															nextDue: sale.payment_due_meta?.next_emi_due,
														})
													}
												>
													<MessageCircle className="h-3.5 w-3.5" />
													Remind Payment
												</Button>
											) : null}
											
											{canCollectPayments && !sale.is_cancelled ? (
												<Link href={`/payments/new?saleId=${sale.id}`} className="w-full">
													<Button size="sm" className="w-full h-9 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] flex items-center justify-center gap-1">
														Collect Payment
													</Button>
												</Link>
											) : null}
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : null}

			{selectedSale && (
				<SaleDetailModal
					sale={selectedSale}
					open={modalOpen}
					onOpenChange={setModalOpen}
					canCollectPayments={canCollectPayments}
				/>
			)}
		</>
	);
}
