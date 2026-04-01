"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	AlertTriangle,
	CalendarClock,
	CreditCard,
	FileText,
	MessageCircle,
	User,
	Home,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import type { EmiDueRow } from "@/app/actions/payment-due";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { openWhatsAppPaymentReminder } from "@/lib/payment-whatsapp";

export function PaymentsEmiDueSection({
	rows,
	asOf,
}: {
	rows: EmiDueRow[];
	asOf?: string;
}) {
	const [selected, setSelected] = useState<EmiDueRow | null>(null);

	const sorted = useMemo(() => rows ?? [], [rows]);
	if (!sorted.length) return null;

	const title = asOf ? `EMI Due (as of ${formatDate(asOf)})` : "EMI Due";

	return (
		<>
			<Card className="border-zinc-200 shadow-sm">
				<CardContent className="p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<CalendarClock className="h-4 w-4 text-zinc-500" />
								<h3 className="font-semibold truncate">{title}</h3>
							</div>
							<p className="text-xs text-zinc-500 mt-1">
								Shows EMI sales where missed months (confirmed payments &lt; monthly EMI) exist.
							</p>
						</div>
						<Badge variant="outline" className="text-xs">
							{sorted.length} due
						</Badge>
					</div>
				</CardContent>
				<CardContent className="p-0 overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Customer / Plot</TableHead>
								<TableHead>Sold by</TableHead>
								<TableHead className="text-right">Monthly EMI</TableHead>
								<TableHead className="text-right">Missed</TableHead>
								<TableHead className="text-right">Due (collapsed)</TableHead>
								<TableHead>Next due</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sorted.map((r) => {
								const critical = r.missed_months >= 3;
								return (
									<TableRow
										key={r.sale_id}
										className={[
											"cursor-pointer hover:bg-zinc-50",
											critical ? "bg-red-50/40" : "",
										].join(" ")}
										onClick={() => setSelected(r)}
									>
										<TableCell>
											<div className="flex flex-col">
												<span className="font-semibold text-sm flex items-center gap-1">
													<User className="h-3 w-3 text-zinc-400" />
													{r.customer.name}
												</span>
												<span className="text-xs text-zinc-500 flex items-center gap-1">
													<Home className="h-3 w-3 text-zinc-400" />
													{r.plot.project_name} - {r.plot.plot_number}
												</span>
											</div>
										</TableCell>
										<TableCell className="text-sm">{r.seller.label}</TableCell>
										<TableCell className="text-right font-medium">
											{formatCurrency(r.monthly_emi)}
											<div className="text-[10px] text-zinc-500">Day {r.emi_day}</div>
										</TableCell>
										<TableCell className="text-right font-bold">
											{critical ? (
												<span className="inline-flex items-center gap-1 text-red-700">
													<AlertTriangle className="h-3.5 w-3.5" />
													{r.missed_months} mo
												</span>
											) : (
												`${r.missed_months} mo`
											)}
										</TableCell>
										<TableCell className="text-right font-bold text-red-700">
											{formatCurrency(r.collapsed_due_amount)}
										</TableCell>
										<TableCell className="text-sm">
											{r.next_emi_due ? formatDate(r.next_emi_due) : "—"}
										</TableCell>
										<TableCell
											className="text-right"
											onClick={(e) => e.stopPropagation()}
										>
											<div className="flex justify-end gap-2">
												<Link href={`/sales?openSaleId=${r.sale_id}&collect=1`}>
													<Button size="sm" className="h-8 gap-1">
														<CreditCard className="h-3.5 w-3.5" />
														Collect
													</Button>
												</Link>
												<Button
													type="button"
													size="sm"
													variant="outline"
													className={[
														"h-8 gap-1",
														critical ? "text-red-700 border-red-200" : "text-green-700 border-green-200",
													].join(" ")}
													onClick={() =>
														openWhatsAppPaymentReminder({
															phone: r.customer.phone,
															customerName: r.customer.name,
															plot: r.plot.plot_number,
															project: r.plot.project_name,
															remainingAmount: r.remaining_amount,
															monthlyEmi: r.monthly_emi,
															nextDue: r.next_emi_due,
															templateId: critical
																? "plot_cancellation_reminder"
																: "emi_due",
														})
													}
													disabled={!r.customer.phone}
												>
													<MessageCircle className="h-3.5 w-3.5" />
													{critical ? "Cancellation reminder" : "Remind"}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													className="h-8 px-2"
													onClick={() => setSelected(r)}
													title="Details"
												>
													<FileText className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={!!selected} onOpenChange={(o) => (o ? null : setSelected(null))}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<div className="truncate">EMI Due Details</div>
								<div className="text-xs text-zinc-500 font-normal truncate">
									{selected
										? `${selected.plot.project_name} • ${selected.plot.plot_number}`
										: ""}
								</div>
							</div>
							<Button type="button" variant="outline" onClick={() => setSelected(null)}>
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>

					{selected ? (
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
										Customer
									</div>
									<div className="space-y-1">
										<div className="font-semibold">{selected.customer.name}</div>
										<div className="text-zinc-600">Phone: {selected.customer.phone ?? "—"}</div>
									</div>
								</div>
								<div className="rounded-lg border border-zinc-200 p-3">
									<div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
										Sale / EMI
									</div>
									<div className="space-y-1">
										<div>
											Sold by: <span className="font-medium">{selected.seller.label}</span>
										</div>
										<div>
											Monthly EMI:{" "}
											<span className="font-semibold">
												{formatCurrency(selected.monthly_emi)}
											</span>{" "}
											(Day {selected.emi_day})
										</div>
										<div>
											Anchor date:{" "}
											<span className="font-medium">
												{formatDate(selected.anchor_date)}
											</span>
										</div>
										<div>
											Remaining amount:{" "}
											<span className="font-semibold text-red-700">
												{formatCurrency(selected.remaining_amount)}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-zinc-200 overflow-hidden">
								<div className="p-3 border-b flex items-center justify-between">
									<div className="font-semibold text-sm">Due months</div>
									<Badge
										variant="outline"
										className={selected.missed_months >= 3 ? "border-red-200 text-red-700" : ""}
									>
										{selected.missed_months} missed
									</Badge>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="bg-zinc-50 border-b">
												<th className="text-left p-2">Month</th>
												<th className="text-left p-2">Due date</th>
												<th className="text-right p-2">Due</th>
												<th className="text-right p-2">Paid (confirmed)</th>
												<th className="text-left p-2">Status</th>
											</tr>
										</thead>
										<tbody>
											{selected.months.map((m) => (
												<tr key={m.month} className="border-b last:border-0">
													<td className="p-2 font-mono text-xs">{m.month}</td>
													<td className="p-2">{formatDate(m.dueDate)}</td>
													<td className="p-2 text-right font-medium">
														{formatCurrency(m.dueAmount)}
													</td>
													<td className="p-2 text-right">
														{formatCurrency(m.paidAmount)}
													</td>
													<td className="p-2">
														{m.isPaid ? (
															<Badge className="bg-green-100 text-green-800 border-green-200">
																Paid
															</Badge>
														) : m.isOverdue ? (
															<Badge className="bg-red-100 text-red-800 border-red-200">
																Overdue
															</Badge>
														) : (
															<Badge className="bg-amber-100 text-amber-800 border-amber-200">
																Due
															</Badge>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							<div className="rounded-lg border border-zinc-200 overflow-hidden">
								<div className="p-3 border-b flex items-center justify-between">
									<div className="font-semibold text-sm">Recent payments</div>
									<Badge variant="outline">{selected.latest_payments.length}</Badge>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="bg-zinc-50 border-b">
												<th className="text-left p-2">Date</th>
												<th className="text-right p-2">Amount</th>
												<th className="text-left p-2">Mode</th>
												<th className="text-left p-2">Status</th>
											</tr>
										</thead>
										<tbody>
											{selected.latest_payments.map((p) => (
												<tr key={p.id} className="border-b last:border-0">
													<td className="p-2">{formatDate(p.payment_date)}</td>
													<td className="p-2 text-right font-medium">
														{formatCurrency(p.amount)}
													</td>
													<td className="p-2 capitalize">{p.payment_mode}</td>
													<td className="p-2">
														{p.is_confirmed ? (
															<Badge className="bg-green-100 text-green-800 border-green-200">
																Confirmed
															</Badge>
														) : (
															<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
																Pending
															</Badge>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}

