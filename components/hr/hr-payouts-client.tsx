"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HrPayoutsClient({ initialBatches }: { initialBatches: any[] }) {
	const router = useRouter();
	const [month, setMonth] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	});
	const [genLoading, setGenLoading] = useState(false);
	const [payLoading, setPayLoading] = useState<string | null>(null);

	const generate = async () => {
		setGenLoading(true);
		try {
			const res = await fetch("/api/hr/payouts/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ month }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success("Payout batch generated", { description: data.month_label });
			router.refresh();
		} finally {
			setGenLoading(false);
		}
	};

	const pay = async (rowId: string, amount: number) => {
		setPayLoading(rowId);
		try {
			const res = await fetch("/api/hr/payouts/pay", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: rowId, paid_amount: amount }),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error ?? "Failed");
				return;
			}
			toast.success("Payment recorded");
			router.refresh();
		} finally {
			setPayLoading(null);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="p-4 flex flex-wrap items-end gap-3">
					<div className="grid gap-1">
						<Label>Month</Label>
						<Input
							className="w-40 font-mono"
							value={month}
							onChange={(e) => setMonth(e.target.value)}
							placeholder="YYYY-MM"
						/>
					</div>
					<Button onClick={generate} disabled={genLoading} className="gap-2">
						{genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Generate / refresh
					</Button>
				</CardContent>
			</Card>

			{!initialBatches?.length ? (
				<p className="text-sm text-zinc-500">No batches yet.</p>
			) : (
				<div className="space-y-6">
					{initialBatches.map((batch: any) => (
						<Card key={batch.id}>
							<CardContent className="p-4 space-y-3">
								<div className="font-semibold">
									{batch.month_label}{" "}
									<span className="text-xs font-normal text-zinc-500">({batch.status})</span>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b text-left text-xs text-zinc-500">
												<th className="py-2 pr-2">Employee</th>
												<th className="py-2 pr-2 text-right">Final</th>
												<th className="py-2 pr-2 text-right">Paid</th>
												<th className="py-2 pr-2 text-right">Remaining</th>
												<th className="py-2 pr-2">Status</th>
												<th className="py-2">Pay</th>
											</tr>
										</thead>
										<tbody>
											{(batch.hr_employee_payouts ?? []).map((p: any) => (
												<tr key={p.id} className="border-b border-zinc-100">
													<td className="py-2 pr-2">
														{p.hr_employees?.employee_code} — {p.hr_employees?.name}
													</td>
													<td className="py-2 pr-2 text-right">
														{formatCurrency(Number(p.final_salary))}
													</td>
													<td className="py-2 pr-2 text-right">
														{formatCurrency(Number(p.paid_amount))}
													</td>
													<td className="py-2 pr-2 text-right">
														{formatCurrency(Number(p.remaining_amount))}
													</td>
													<td className="py-2 pr-2 capitalize">{p.payout_status}</td>
													<td className="py-2">
														<div className="flex items-center gap-1">
															<Input
																className="h-8 w-24 text-xs"
																type="number"
																id={`pay-${p.id}`}
																placeholder="Amt"
															/>
															<Button
																size="sm"
																variant="outline"
																disabled={payLoading === p.id}
																onClick={() => {
																	const el = document.getElementById(
																		`pay-${p.id}`
																	) as HTMLInputElement | null;
																	const v = Number(el?.value ?? 0);
																	if (!v) return;
																	pay(p.id, v);
																}}
															>
																{payLoading === p.id ? (
																	<Loader2 className="h-3 w-3 animate-spin" />
																) : (
																	"Pay"
																)}
															</Button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
