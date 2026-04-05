"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Calendar, User, MapPin, IndianRupee, MessageCircle } from "lucide-react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import { matchesTextSearch } from "@/lib/utils/text-search";
import { openWhatsAppPaymentReminder } from "@/lib/payment-whatsapp";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { SaleDetailModal } from "./sale-detail-modal";
import { useRouter, useSearchParams } from "next/navigation";

const phaseConfig: Record<string, { label: string; className: string }> = {
	token: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	full_payment: {
		label: "Sold",
		className: "bg-purple-100 text-purple-800",
	},
};

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
		return sales.filter((sale: any) =>
			matchesTextSearch(
				listQuery,
				sale.customers?.name,
				sale.customers?.phone,
				sale.advisors?.name,
				sale.advisors?.code,
				sale.plots?.plot_number,
				sale.plots?.projects?.name,
			),
		);
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
			<div className="space-y-3">
				<ListSearchBar
					value={listQuery}
					onChange={setListQuery}
					placeholder="Search by customer, phone, advisor, plot, project…"
					className="max-w-xl"
				/>
				{visibleSales.length === 0 ? (
					<div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-sm text-zinc-600">
						No sales match your search. Clear the box to see all{" "}
						{sales.length} record{sales.length === 1 ? "" : "s"}.
					</div>
				) : null}
			</div>
			{visibleSales.length > 0 ? (
			<div className="grid grid-cols-1 gap-4 mt-4">
				{visibleSales.map((sale) => {
					const subN = Number(sale.sub_advisor_commission_count ?? 0);
					const advisorName = sale.sold_by_admin
						? "Admin (Direct)"
						: `${sale.advisors?.name ?? "—"}${
								subN > 0 ? ` + ${subN} sub-advisor${subN === 1 ? "" : "s"}` : ""
							}`;
					const phase =
						sale.is_cancelled
							? { label: "Plot revoked", className: "bg-zinc-200 text-zinc-700 border-zinc-300" }
							: sale.sale_phase === "token"
							? phaseConfig["token"]
							: phaseConfig["full_payment"];
					return (
						<Card
							key={sale.id}
							className={[
								"overflow-hidden hover:border-zinc-400 transition-colors cursor-pointer",
								sale.is_cancelled ? "opacity-55 grayscale" : "",
							].join(" ")}
							onClick={() => openSaleModal(sale)}
						>
							<CardContent className="p-0">
								<div className="flex flex-col md:flex-row">
									<div className="p-4 md:w-1/4 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200">
										<div className="flex items-center gap-2 mb-1">
										<Badge className={phase.className} title={phase.label}>
											{phase.label}
										</Badge>
											<span className="font-bold text-lg">{sale.plots?.plot_number}</span>
										</div>
										<p className="text-sm text-zinc-500 flex items-center gap-1">
											<MapPin className="h-3 w-3" /> {sale.plots?.projects?.name}
										</p>
										{sale.is_cancelled ? (
											<div className="mt-2 space-y-0.5">
												<p className="text-xs text-zinc-500">Plot revoked</p>
												{sale.revoked_at ? (
													<p className="text-[11px] text-zinc-500">
														Revoked on {formatDate(sale.revoked_at)}
													</p>
												) : null}
												{sale.revoked_by ? (
													<p className="text-[11px] text-zinc-500">
														By {sale.revoked_by}
													</p>
												) : null}
											</div>
										) : null}
										<div className="mt-4 space-y-1">
											<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
												Amount
											</p>
											<p className="text-lg font-bold text-zinc-900">
												{formatCurrency(sale.total_sale_amount)}
											</p>
										</div>
									</div>

									<div className="p-4 md:w-2/4 grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-3">
											<div className="flex items-start gap-2">
												<User className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Customer
													</p>
													<p className="text-sm font-semibold">{sale.customers?.name}</p>
												</div>
											</div>
											<div className="flex items-start gap-2">
												<User className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Advisor
													</p>
													<p className="text-sm font-semibold">
														{advisorName}
													</p>
												</div>
											</div>
										</div>
										<div className="space-y-3 text-sm">
											<div className="flex items-start gap-2">
												<Calendar className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Date
													</p>
													<p>
														{sale.token_date
															? formatDate(sale.token_date)
															: formatDate(sale.created_at)}
													</p>
												</div>
											</div>
											<div className="flex items-start gap-2">
												<IndianRupee className="h-4 w-4 text-zinc-400 mt-0.5" />
												<div>
													<p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
														Paid / Remaining
													</p>
													<p className="font-medium text-green-600">
														{formatCurrency(sale.amount_paid)} /
														<span className="text-red-600 ml-1">
															{formatCurrency(sale.remaining_amount)}
														</span>
													</p>
												</div>
											</div>
										</div>
									</div>

									<div
										className="p-4 md:w-1/4 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-zinc-200"
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											variant="outline"
											size="sm"
											className="w-full"
											onClick={() => openSaleModal(sale)}
										>
											View Details
										</Button>
										{!sale.is_cancelled && sale.payment_due_meta?.is_payment_due ? (
											<Button
												size="sm"
												variant="outline"
												className="w-full gap-1 text-green-700 border-green-200"
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
												Remind payment
											</Button>
										) : null}
										{canCollectPayments && !sale.is_cancelled ? (
											<Link href={`/payments/new?saleId=${sale.id}`} className="w-full">
												<Button size="sm" className="w-full">
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
