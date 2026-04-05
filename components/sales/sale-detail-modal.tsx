"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
	MapPin,
	User,
	Calendar,
	IndianRupee,
	CreditCard,
	ArrowUpRight,
} from "lucide-react";

interface SaleDetailModalProps {
	sale: {
		id: string;
		total_sale_amount: number;
		amount_paid?: number | null;
		remaining_amount?: number | null;
		is_cancelled?: boolean | null;
		revoked_at?: string | null;
		revoked_by?: string | null;
		token_date?: string | null;
		agreement_date?: string | null;
		sale_phase: string;
		plots: { plot_number: string; projects?: { name: string } | null };
		customers: { name: string };
		advisors: { name: string; code?: string };
		commission_participants?: {
			name: string;
			phone: string;
			amount?: number;
			is_main?: boolean;
		}[];
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canCollectPayments?: boolean;
}

const phaseConfig: Record<string, { label: string; className: string }> = {
	token: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
	full_payment: { label: "Payment completed / Sold", className: "bg-purple-100 text-purple-800" },
};

export function SaleDetailModal({
	sale,
	open,
	onOpenChange,
	canCollectPayments = true,
}: SaleDetailModalProps) {
	const router = useRouter();
	const phase = sale.is_cancelled
		? { label: "Plot revoked", className: "bg-zinc-200 text-zinc-700" }
		: sale.sale_phase === "token"
		? phaseConfig["token"]
		: phaseConfig["full_payment"];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<DialogTitle className="flex flex-wrap items-center gap-2 text-left">
							<span className="font-bold text-base sm:text-lg">
								{sale.plots?.plot_number ?? "—"}
							</span>
							<span
								className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${phase.className}`}
							title={phase.label}
							>
								{phase.label}
							</span>
						</DialogTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					</div>
					{sale.plots?.projects?.name && (
						<p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
							<MapPin className="h-3.5 w-3.5 shrink-0" />
							{sale.plots.projects.name}
						</p>
					)}
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
					{sale.is_cancelled ? (
						<div className="rounded-lg border border-zinc-200 bg-zinc-100/60 p-3">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
								Status
							</p>
							<p className="mt-1 text-sm font-medium text-zinc-800">
								Plot revoked. Existing payments are kept but this plot is no longer active for collection.
							</p>
							{sale.revoked_at ? (
								<p className="mt-2 text-[11px] text-zinc-600">
									Revoked on {formatDate(sale.revoked_at)}
								</p>
							) : null}
							{sale.revoked_by ? (
								<p className="text-[11px] text-zinc-600">
									Revoked by {sale.revoked_by}
								</p>
							) : null}
						</div>
					) : null}
					<div>
						<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
							Amount
						</p>
						<p className="text-2xl font-bold text-zinc-900">
							{formatCurrency(sale.total_sale_amount)}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Customer
							</p>
							<p className="text-sm font-semibold flex items-center gap-1">
								<User className="h-3.5 w-3.5 text-zinc-400" />
								{sale.customers?.name ?? "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Advisor
							</p>
							<p className="text-sm font-semibold flex items-center gap-1">
								<User className="h-3.5 w-3.5 text-zinc-400" />
								{sale.advisors?.name ?? "—"}
								{sale.advisors?.code && (
									<span className="text-xs text-zinc-500 font-normal">
										({sale.advisors.code})
									</span>
								)}
							</p>
						</div>
					</div>

					{sale.commission_participants && sale.commission_participants.length > 0 ? (
						<div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
								Commission split (this sale)
							</p>
							<ul className="space-y-2 text-sm">
								{sale.commission_participants.map((p, i) => (
									<li
										key={i}
										className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
									>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="font-medium">{p.name}</span>
												{p.is_main === true ? (
													<span className="rounded bg-zinc-200 px-1.5 py-0 text-[10px] font-semibold uppercase text-zinc-700">
														Main
													</span>
												) : p.is_main === false ? (
													<span className="rounded bg-amber-100 px-1.5 py-0 text-[10px] font-semibold uppercase text-amber-900">
														Sub
													</span>
												) : null}
											</div>
											<span className="text-xs text-zinc-500">{p.phone}</span>
										</div>
										<span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-900">
											{typeof p.amount === "number" ? formatCurrency(p.amount) : "—"}
										</span>
									</li>
								))}
							</ul>
						</div>
					) : null}

					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Token Date
							</p>
							<p className="text-sm flex items-center gap-1">
								<Calendar className="h-3.5 w-3.5 text-zinc-400" />
								{sale.token_date ? formatDate(sale.token_date) : "—"}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
								Full Payment Date
							</p>
							<p className="text-sm flex items-center gap-1">
								<Calendar className="h-3.5 w-3.5 text-zinc-400" />
								{sale.agreement_date ? formatDate(sale.agreement_date) : "—"}
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
						<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
							Payment Status
						</p>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-zinc-500">Paid</p>
								<p className="font-semibold text-green-600">
									{formatCurrency(sale.amount_paid ?? 0)}
								</p>
							</div>
							<div className="text-right">
								<p className="text-xs text-zinc-500">Remaining</p>
								<p className="font-semibold text-red-600">
									{formatCurrency(sale.remaining_amount ?? sale.total_sale_amount)}
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-2 pt-2">
						{canCollectPayments && !sale.is_cancelled ? (
							<Link href={`/payments/new?saleId=${sale.id}`} className="flex-1">
								<Button
									size="sm"
									className="w-full"
									onClick={() => onOpenChange(false)}
								>
									<CreditCard className="h-4 w-4 mr-2" />
									Collect Payment
								</Button>
							</Link>
						) : null}
						<Button
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={() => {
								onOpenChange(false);
								router.push("/sales");
							}}
						>
							<ArrowUpRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
