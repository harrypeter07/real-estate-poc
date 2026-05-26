"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
	CreditCard,
	DollarSign,
	Plus,
	Calendar,
	CheckCircle,
	AlertCircle,
	Trash2,
	Printer,
	Loader2,
	ChevronLeft,
	ChevronRight,
	Percent,
} from "lucide-react";
import { Button, Input, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

type Props = {
	customers: Array<{ id: string; name: string; phone: string }>;
	sales: any[];
};

export function PaymentsDashboard({ customers, sales }: Props) {
	const queryClient = useQueryClient();
	const [activeSubTab, setActiveSubTab] = useState<"ledger" | "penalties" | "adjustments">("ledger");

	// State for Add Payment Modal
	const [addOpen, setAddOpen] = useState(false);
	const [selectedCustId, setSelectedCustId] = useState("");
	const [selectedSaleId, setSelectedSaleId] = useState("");
	const [paymentAmount, setPaymentAmount] = useState(0);
	const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
	const [paymentMode, setPaymentMode] = useState("cash");
	const [slipNumber, setSlipNumber] = useState("");
	const [notes, setNotes] = useState("");
	const [selectedEmiId, setSelectedEmiId] = useState("");

	// State for Waive Penalty Modal
	const [waiveOpen, setWaiveOpen] = useState(false);
	const [waivingPenaltyId, setWaivingPenaltyId] = useState("");
	const [waverReason, setWaverReason] = useState("");

	// State for Adjust EMI Modal
	const [adjustOpen, setAdjustOpen] = useState(false);
	const [adjustSaleId, setAdjustSaleId] = useState("");
	const [adjustEmiId, setAdjustEmiId] = useState("");
	const [newEmiDueDate, setNewEmiDueDate] = useState("");
	const [newEmiAmount, setNewEmiAmount] = useState(0);
	const [adjustReason, setAdjustReason] = useState("");

	// Filters
	const [page, setPage] = useState(1);
	const limit = 20;

	// Queries
	const { data: paymentsRes, isLoading: loadingPayments } = useQuery({
		queryKey: ["payments-list", page],
		queryFn: async () => {
			const res = await fetch(`/api/payments?page=${page}&limit=${limit}`);
			if (!res.ok) throw new Error("Failed to fetch payments");
			return res.json();
		},
	});

	const { data: summary } = useQuery({
		queryKey: ["payments-summary"],
		queryFn: async () => {
			const res = await fetch("/api/payments/summary");
			if (!res.ok) throw new Error("Failed to fetch summary");
			return res.json();
		},
	});

	const { data: penaltiesRes } = useQuery({
		queryKey: ["penalties-list"],
		queryFn: async () => {
			const res = await fetch("/api/penalties?limit=100");
			if (!res.ok) throw new Error("Failed to fetch penalties");
			return res.json();
		},
	});

	// Get available EMIs for selected sale
	const { data: saleEmis } = useQuery({
		queryKey: ["sale-emis-dropdown", selectedSaleId],
		queryFn: async () => {
			if (!selectedSaleId) return [];
			const res = await fetch(`/api/sales/${selectedSaleId}/emi-schedule`);
			if (!res.ok) return [];
			const data = await res.json();
			return data.schedule?.filter((e: any) => e.status !== "paid") || [];
		},
		enabled: !!selectedSaleId,
	});

	// Mutations
	const createPaymentMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to create payment");
			return res.json();
		},
		onSuccess: (data) => {
			toast.success("Payment transaction saved successfully!");
			setAddOpen(false);
			setPaymentAmount(0);
			setNotes("");
			setSlipNumber("");
			setSelectedEmiId("");
			queryClient.invalidateQueries({ queryKey: ["payments-list"] });
			queryClient.invalidateQueries({ queryKey: ["payments-summary"] });
			queryClient.invalidateQueries({ queryKey: ["sale-emis"] });

			// Print receipt automatically
			handlePrintPDF(data.payment);
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const confirmPaymentMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/payments/${id}/confirm`, {
				method: "PATCH",
			});
			if (!res.ok) throw new Error("Failed to confirm payment");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Payment confirmed!");
			queryClient.invalidateQueries({ queryKey: ["payments-list"] });
			queryClient.invalidateQueries({ queryKey: ["payments-summary"] });
		},
	});

	const waivePenaltyMutation = useMutation({
		mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
			const res = await fetch(`/api/penalties/${id}/waive`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ waived_by: "Admin", waiver_reason: reason }),
			});
			if (!res.ok) throw new Error("Failed to waive penalty");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Penalty waived successfully!");
			setWaiveOpen(false);
			setWaverReason("");
			queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const payPenaltyMutation = useMutation({
		mutationFn: async ({ id, payId }: { id: string; payId: string }) => {
			const res = await fetch(`/api/penalties/${id}/pay`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ payment_id: payId }),
			});
			if (!res.ok) throw new Error("Failed to mark penalty paid");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Penalty marked as paid!");
			queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
		},
	});

	const adjustEmiMutation = useMutation({
		mutationFn: async ({ saleId, payload }: { saleId: string; payload: any }) => {
			const res = await fetch(`/api/sales/${saleId}/emi-adjustment`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to adjust EMI");
			return res.json();
		},
		onSuccess: () => {
			toast.success("EMI terms adjusted successfully!");
			setAdjustOpen(false);
			setNewEmiAmount(0);
			setAdjustReason("");
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const handleAddPaymentSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createPaymentMutation.mutate({
			sale_id: selectedSaleId,
			customer_id: selectedCustId,
			amount: paymentAmount,
			payment_date: paymentDate,
			payment_mode: paymentMode,
			slip_number: slipNumber || null,
			notes,
			emi_id: selectedEmiId || null,
		});
	};

	const handlePrintPDF = (pay: any) => {
		const doc = new jsPDF();
		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.text("PAYMENT COLLECTION RECEIPT", 105, 20, { align: "center" });

		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text("M.G. Infrastructure Developers", 105, 26, { align: "center" });
		doc.line(15, 30, 195, 30);

		const body = [
			["Receipt No", pay.slip_number],
			["Date", pay.payment_date],
			["Customer Name", pay.customer_name || pay.customer_id],
			["Payment Amount", formatCurrency(pay.amount)],
			["Mode of Payment", pay.payment_mode],
			["Installment Number", pay.emi_number ? `EMI ${pay.emi_number}` : "Token / Other"],
			["Status", pay.is_confirmed ? "Confirmed" : "Pending Verification"],
		];

		autoTable(doc, {
			startY: 38,
			head: [["Field Description", "Collection Details"]],
			body: body,
			theme: "striped",
			headStyles: { fillColor: [30, 41, 59] }, // slate-800
		});

		const finalY = (doc as any).lastAutoTable.finalY || 120;
		doc.text("Remarks / Notes:", 15, finalY + 12);
		doc.setFont("helvetica", "italic");
		doc.text(pay.notes || "No remarks logged.", 15, finalY + 18, { maxWidth: 175 });

		doc.setFont("helvetica", "bold");
		doc.text("Authorized Signature", 195, finalY + 45, { align: "right" });
		doc.line(140, finalY + 40, 195, finalY + 40);

		doc.save(`Receipt_${pay.slip_number}.pdf`);
	};

	const ledger = paymentsRes?.data || [];
	const totalItems = paymentsRes?.total || 0;
	const totalPages = Math.ceil(totalItems / limit);

	const selectedCustSales = sales.filter((s) => s.customer_id === selectedCustId && !s.is_cancelled);

	return (
		<div className="space-y-6">
			{/* Stats grid */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
				<Card className="bg-white border-zinc-100 shadow-sm">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Total Collected (This Month)</p>
						<p className="text-xl font-bold text-green-600">
							{formatCurrency(summary?.total_collected || 0)}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Cash Ledger</p>
						<p className="text-xl font-bold text-zinc-800">
							{formatCurrency(summary?.breakdown?.cash || 0)}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Online / UPI volume</p>
						<p className="text-xl font-bold text-zinc-800">
							{formatCurrency(summary?.breakdown?.online || 0)}
						</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Cheque clearance</p>
						<p className="text-xl font-bold text-zinc-800">
							{formatCurrency(summary?.breakdown?.cheque || 0)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Sub Tabs Toggle & Page Actions */}
			<div className="flex flex-wrap justify-between items-center gap-3">
				<div className="flex border-b border-zinc-200 text-sm font-semibold">
					<button
						onClick={() => setActiveSubTab("ledger")}
						className={`pb-2.5 px-4 border-b-2 transition-all ${
							activeSubTab === "ledger" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
						}`}
					>
						Payment Ledger
					</button>
					<button
						onClick={() => setActiveSubTab("penalties")}
						className={`pb-2.5 px-4 border-b-2 transition-all ${
							activeSubTab === "penalties" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
						}`}
					>
						Outstanding Penalties
					</button>
				</div>

				<Button size="sm" onClick={() => setAddOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow">
					<Plus className="h-4 w-4 mr-1.5" /> Log Payment
				</Button>
			</div>

			{/* Tab 1: Ledger Table */}
			{activeSubTab === "ledger" && (
				<Card className="border-zinc-100 bg-white">
					<CardContent className="p-0 overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Receipt #</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Plot/Project</TableHead>
									<TableHead className="text-right">Amount</TableHead>
									<TableHead>Mode</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>EMI #</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Print</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingPayments ? (
									<TableRow>
										<TableCell colSpan={9} className="text-center py-6">
											<Loader2 className="h-6 w-6 animate-spin text-zinc-400 mx-auto" />
										</TableCell>
									</TableRow>
								) : ledger.length === 0 ? (
									<TableRow>
										<TableCell colSpan={9} className="text-center text-zinc-400 py-6">
											No payment entries logged yet.
										</TableCell>
									</TableRow>
								) : (
									ledger.map((pay: any) => (
										<TableRow key={pay.id}>
											<td className="px-4 py-3 font-mono text-xs font-bold text-zinc-700">{pay.slip_number}</td>
											<td className="px-4 py-3 text-xs font-semibold text-zinc-800">{pay.customer_name}</td>
											<td className="px-4 py-3 text-xs text-zinc-500">Plot {pay.plot_number} ({pay.project_name})</td>
											<td className={`px-4 py-3 text-right text-xs font-mono font-bold ${Number(pay.amount) < 0 ? "text-red-600" : "text-green-600"}`}>
												{formatCurrency(pay.amount)}
											</td>
											<td className="px-4 py-3 text-xs capitalize text-zinc-600">{pay.payment_mode}</td>
											<td className="px-4 py-3 text-xs text-zinc-500 font-mono">{pay.payment_date}</td>
											<td className="px-4 py-3 text-xs font-semibold">{pay.emi_number ? `EMI ${pay.emi_number}` : "—"}</td>
											<td className="px-4 py-3 text-xs">
												{pay.is_confirmed ? (
													<Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 font-normal">
														Confirmed
													</Badge>
												) : (
													<div className="flex items-center gap-1.5">
														<Badge className="bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-50 font-normal">
															Unconfirmed
														</Badge>
														<Button size="xs" variant="outline" className="text-[10px]" onClick={() => confirmPaymentMutation.mutate(pay.id)}>
															Confirm
														</Button>
													</div>
												)}
											</td>
											<td className="px-4 py-3 text-right">
												<Button size="xs" variant="outline" className="p-1" onClick={() => handlePrintPDF(pay)} title="Print Receipt">
													<Printer className="h-3.5 w-3.5" />
												</Button>
											</td>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex justify-between items-center p-4 border-t border-zinc-100">
								<span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
								<div className="flex gap-2">
									<Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
										<ChevronLeft className="h-4 w-4" /> Previous
									</Button>
									<Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
										Next <ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Tab 2: Penalties */}
			{activeSubTab === "penalties" && (
				<Card className="border-zinc-100 bg-white">
					<CardContent className="p-0 overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Customer</TableHead>
									<TableHead>Unit / Plot</TableHead>
									<TableHead>EMI #</TableHead>
									<TableHead>Penalty Type</TableHead>
									<TableHead className="text-right">Penalty Amount</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{!penaltiesRes?.data || penaltiesRes.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="text-center text-zinc-400 py-6">
											No unpaid penalties currently raised.
										</TableCell>
									</TableRow>
								) : (
									penaltiesRes.data.map((pen: any) => (
										<TableRow key={pen.id}>
											<td className="px-4 py-3 text-xs font-semibold text-zinc-800">{pen.customer_name}</td>
											<td className="px-4 py-3 text-xs text-zinc-500">Plot {pen.plot_number}</td>
											<td className="px-4 py-3 text-xs">{pen.emi_number ? `EMI ${pen.emi_number}` : "General"}</td>
											<td className="px-4 py-3 text-xs capitalize font-medium">{pen.penalty_type.replace(/_/g, " ")}</td>
											<td className="px-4 py-3 text-right text-xs font-mono font-bold text-red-600">{formatCurrency(pen.penalty_amount)}</td>
											<td className="px-4 py-3 text-xs">
												<Badge variant="outline" className={pen.is_paid ? "bg-green-50 text-green-700 border-green-200" : pen.is_waived ? "bg-zinc-100 text-zinc-600" : "bg-red-50 text-red-700 border-red-200"}>
													{pen.is_paid ? "Paid" : pen.is_waived ? "Waived" : "Outstanding"}
												</Badge>
											</td>
											<td className="px-4 py-3 text-right flex gap-1.5 justify-end">
												{!pen.is_paid && !pen.is_waived && (
													<>
														<Button size="xs" variant="outline" className="text-red-600 hover:text-red-700 border-red-200" onClick={() => {
															setWaivingPenaltyId(pen.id);
															setWaiveOpen(true);
														}}>
															Waive
														</Button>
														<Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => {
															const confirmPay = confirm("Are you sure you want to mark this penalty as paid?");
															if (confirmPay) {
																payPenaltyMutation.mutate({ id: pen.id, payId: pen.payment_id || "direct" });
															}
														}}>
															Mark Paid
														</Button>
													</>
												)}
											</td>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Add Payment Modal */}
			{addOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 font-bold text-zinc-800 text-sm">
							Record Receipt Transaction
						</div>
						<form onSubmit={handleAddPaymentSubmit} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Select Customer</label>
								<select
									value={selectedCustId}
									onChange={(e) => {
										setSelectedCustId(e.target.value);
										setSelectedSaleId("");
										setSelectedEmiId("");
									}}
									required
									className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
								>
									<option value="">Choose Customer</option>
									{customers.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} ({c.phone})
										</option>
									))}
								</select>
							</div>

							{selectedCustId && (
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Select Booking / Plot</label>
									<select
										value={selectedSaleId}
										onChange={(e) => {
											setSelectedSaleId(e.target.value);
											setSelectedEmiId("");
										}}
										required
										className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
									>
										<option value="">Choose Plot</option>
										{selectedCustSales.map((s) => (
											<option key={s.id} value={s.id}>
												Plot {s.plot_number} (₹{s.remaining_amount?.toLocaleString()})
											</option>
										))}
									</select>
								</div>
							)}

							{selectedSaleId && saleEmis && saleEmis.length > 0 && (
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Link to EMI installment</label>
									<select
										value={selectedEmiId}
										onChange={(e) => {
											setSelectedEmiId(e.target.value);
											const emi = saleEmis.find((x: any) => x.id === e.target.value);
											if (emi) {
												setPaymentAmount(Number(emi.remaining_amount));
											}
										}}
										className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
									>
										<option value="">Token / General Dues</option>
										{saleEmis.map((e: any) => (
											<option key={e.id} value={e.id}>
												EMI {e.emi_number} (Due: {e.due_date} - ₹{e.remaining_amount?.toLocaleString()})
											</option>
										))}
									</select>
								</div>
							)}

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Amount (₹)</label>
								<Input
									type="number"
									value={paymentAmount}
									onChange={(e) => setPaymentAmount(Number(e.target.value))}
									required
									className="h-9 text-xs border-zinc-200"
								/>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Date</label>
									<Input
										type="date"
										value={paymentDate}
										onChange={(e) => setPaymentDate(e.target.value)}
										required
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Mode</label>
									<select
										value={paymentMode}
										onChange={(e) => setPaymentMode(e.target.value)}
										className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
									>
										<option value="cash">Cash</option>
										<option value="online">Online / UPI</option>
										<option value="cheque">Cheque</option>
									</select>
								</div>
							</div>

							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Transaction Slip Number</label>
								<Input
									value={slipNumber}
									onChange={(e) => setSlipNumber(e.target.value)}
									placeholder="Optional"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setAddOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" disabled={createPaymentMutation.isPending} className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold">
									{createPaymentMutation.isPending ? "Saving..." : "Log and Print Receipt"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Waive Penalty Modal */}
			{waiveOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setWaiveOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 font-bold text-zinc-800 text-sm">
							Waive Payment Penalty
						</div>
						<form onSubmit={(e) => {
							e.preventDefault();
							waivePenaltyMutation.mutate({ id: waivingPenaltyId, reason: waverReason });
						}} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Waiver Justification / Reason</label>
								<Input
									value={waverReason}
									onChange={(e) => setWaverReason(e.target.value)}
									required
									placeholder="Reason for waiver approval"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setWaiveOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white">
									Approve Waiver
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
