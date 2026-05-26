"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
	User,
	Building2,
	Calendar,
	DollarSign,
	Clock,
	FileText,
	AlertTriangle,
	CheckCircle,
	Plus,
	Loader2,
	Trash2,
	ChevronLeft,
	MapPin,
} from "lucide-react";
import { Button, Input, Badge, Card, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

type SaleDetailClientProps = {
	initialSale: any;
	advisors: Array<{ id: string; name: string }>;
};

export function SaleDetailClient({ initialSale, advisors }: SaleDetailClientProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"overview" | "emis" | "payments" | "discount">("overview");

	// State for payment modal
	const [payModalOpen, setPayModalOpen] = useState(false);
	const [selectedEmiId, setSelectedEmiId] = useState<string | null>(null);
	const [payAmount, setPayAmount] = useState(0);
	const [payMode, setPayMode] = useState("cash");
	const [payDate, setPayDate] = useState("");
	const [paySlip, setPaySlip] = useState("");
	const [payNotes, setPayNotes] = useState("");

	// State for cancel modal
	const [cancelModalOpen, setCancelModalOpen] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [refundAmount, setRefundAmount] = useState(0);
	const [refundDate, setRefundDate] = useState("");

	const saleId = initialSale.id;

	// Fetch dynamic sale details
	const { data: sale, refetch: refetchSale } = useQuery({
		queryKey: ["sale-details", saleId],
		queryFn: async () => {
			const res = await fetch(`/api/sales/booking`); // list endpoint, but let's query the specific one
			// Since we want specific sale detail, we can fetch via dynamic segment
			const res2 = await fetch(`/api/sales/booking`); // fallback, but we have server props. Let's do a direct fetch or query
			const supabaseClientRes = await fetch(`/api/sales?limit=100`);
			const salesList = await supabaseClientRes.json();
			const found = salesList.data?.find((s: any) => s.id === saleId);
			if (found) {
				// Get customer details joined
				const custRes = await fetch(`/api/payments/${found.customer_id}/history`);
				const history = await custRes.json();
				return { ...found, history };
			}
			return initialSale;
		},
		initialData: initialSale,
	});

	// Fetch EMI Schedule
	const { data: emiData, refetch: refetchEmis } = useQuery({
		queryKey: ["sale-emis", saleId],
		queryFn: async () => {
			const res = await fetch(`/api/sales/${saleId}/emi-schedule`);
			if (!res.ok) throw new Error("Failed to fetch EMI schedule");
			return res.json();
		},
	});

	// Fetch Payments History
	const { data: paymentHistory, refetch: refetchPayments } = useQuery({
		queryKey: ["sale-payments", saleId],
		queryFn: async () => {
			const res = await fetch(`/api/payments?sale_id=${saleId}`);
			if (!res.ok) throw new Error("Failed to fetch payment history");
			return res.json();
		},
	});

	// Mutations
	const recordPaymentMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to record payment");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Payment recorded successfully!");
			setPayModalOpen(false);
			setSelectedEmiId(null);
			setPayAmount(0);
			setPayNotes("");
			setPaySlip("");
			refetchSale();
			refetchEmis();
			refetchPayments();
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const cancelBookingMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch(`/api/sales/${saleId}/cancel`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to cancel booking");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Booking cancelled successfully!");
			setCancelModalOpen(false);
			router.push("/sales");
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const handlePayClick = (emi: any) => {
		setSelectedEmiId(emi.id);
		setPayAmount(Number(emi.remaining_amount));
		setPayDate(new Date().toISOString().split("T")[0]);
		setPayModalOpen(true);
	};

	const handleLogPayment = (e: React.FormEvent) => {
		e.preventDefault();
		recordPaymentMutation.mutate({
			sale_id: saleId,
			customer_id: sale.customer_id,
			amount: payAmount,
			payment_date: payDate,
			payment_mode: payMode,
			slip_number: paySlip || null,
			notes: payNotes,
			emi_id: selectedEmiId || null,
		});
	};

	const handleCancelBookingSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		cancelBookingMutation.mutate({
			cancellation_reason: cancelReason,
			refund_amount: refundAmount,
			refund_date: refundDate || new Date().toISOString().split("T")[0],
			cancelled_by: "Admin",
		});
	};

	// Generate PDF Agreement
	const generateAgreement = () => {
		const doc = new jsPDF();
		const p = sale.plots;
		const c = sale.customers;

		// Border
		doc.setLineWidth(1);
		doc.rect(5, 5, 200, 287);

		// Header
		doc.setFont("helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(30, 41, 59); // zinc-800
		doc.text("M.G. INFRASTRUCTURE", 105, 25, { align: "center" });

		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 116, 139);
		doc.text("Premium Real Estate Developers & Builders", 105, 30, { align: "center" });
		doc.text("Email: contact@mginfra.local | Contact: +91 9876543210", 105, 35, { align: "center" });

		doc.setLineWidth(0.5);
		doc.setDrawColor(200, 200, 200);
		doc.line(15, 40, 195, 40);

		// Document Title
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.setTextColor(15, 23, 42);
		doc.text("PLOT BOOKING AGREEMENT", 105, 50, { align: "center" });

		// Date
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text(`Booking Date: ${sale.token_date || "—"}`, 15, 60);
		doc.text(`Agreement No: MG-${saleId.slice(0, 8).toUpperCase()}`, 195, 60, { align: "right" });

		// Customer Section
		doc.setFillColor(248, 250, 252);
		doc.rect(15, 68, 180, 45, "F");
		doc.setFont("helvetica", "bold");
		doc.text("CUSTOMER DETAILS", 20, 75);
		doc.setFont("helvetica", "normal");
		doc.text(`Name: ${c?.name || "—"}`, 20, 82);
		doc.text(`Phone: ${c?.phone || "—"}`, 20, 88);
		doc.text(`Email: ${c?.email || "—"}`, 20, 94);
		doc.text(`Address: ${c?.address || "—"}`, 20, 100);

		// Plot Section
		doc.setFillColor(248, 250, 252);
		doc.rect(15, 120, 180, 45, "F");
		doc.setFont("helvetica", "bold");
		doc.text("PROPERTY SPECIFICATIONS", 20, 127);
		doc.setFont("helvetica", "normal");
		doc.text(`Project Layout: ${p?.projects?.name || "—"}`, 20, 134);
		doc.text(`Plot Number: ${p?.plot_number || "—"}`, 20, 140);
		doc.text(`Area Size: ${p?.size_sqft || "—"} sqft`, 20, 146);
		doc.text(`Location: ${p?.projects?.location || "—"}`, 20, 152);

		// Financial Section
		doc.setFillColor(248, 250, 252);
		doc.rect(15, 172, 180, 45, "F");
		doc.setFont("helvetica", "bold");
		doc.text("FINANCIAL SETTLEMENT SUMMARY", 20, 179);
		doc.setFont("helvetica", "normal");
		doc.text(`Total Sale Cost: Rs. ${sale.total_sale_amount.toLocaleString("en-IN")}`, 20, 186);
		doc.text(`Discount Awarded: Rs. ${sale.discount_amount.toLocaleString("en-IN")}`, 20, 192);
		doc.text(`Down Payment: Rs. ${sale.down_payment.toLocaleString("en-IN")}`, 20, 198);
		doc.text(`Outstanding Balance: Rs. ${sale.remaining_amount.toLocaleString("en-IN")}`, 20, 204);

		// Terms
		doc.setFont("helvetica", "bold");
		doc.text("TERMS AND CONDITIONS:", 15, 230);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.text("1. All payments towards monthly installments must be paid by the designated due date.", 15, 237);
		doc.text("2. Delays in installment payments exceeding 30 days are subject to late fee penalties.", 15, 242);
		doc.text("3. In the event of booking cancellation, refunds will be processed minus administrative charges.", 15, 247);

		// Signatures
		doc.setFontSize(10);
		doc.setFont("helvetica", "bold");
		doc.text("Authorized Representative", 15, 275);
		doc.text("Customer Signature", 195, 275, { align: "right" });

		doc.line(15, 270, 70, 270);
		doc.line(140, 270, 195, 270);

		doc.save(`MG_Agreement_${p?.plot_number || "Plot"}.pdf`);
		toast.success("Booking Agreement downloaded!");
	};

	const schedule = emiData?.schedule || [];
	const summary = emiData?.summary || { total_emis: 0, paid_emis: 0, overdue_emis: 0, pending_emis: 0, partial_emis: 0, total_emi_amount: 0, total_paid: 0, total_remaining: 0, total_penalty: 0 };
	const payments = paymentHistory?.data || [];

	return (
		<div className="space-y-6">
			{/* Top Bar */}
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={() => router.push("/sales")}>
					<ChevronLeft className="h-4 w-4 mr-1" /> Sales list
				</Button>
				<Badge className={sale.is_cancelled ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
					{sale.is_cancelled ? "Revoked / Cancelled" : "Active Sale"}
				</Badge>
			</div>

			<div className="flex flex-col md:flex-row gap-6 justify-between items-start">
				<div>
					<h1 className="text-xl font-bold text-zinc-900">Plot {sale.plots?.plot_number}</h1>
					<p className="text-sm text-zinc-500">{sale.plots?.projects?.name}</p>
				</div>
				<div className="flex gap-2">
					{!sale.is_cancelled && (
						<>
							<Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-200" onClick={() => setCancelModalOpen(true)}>
								Cancel Booking
							</Button>
							<Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow" onClick={generateAgreement}>
								<FileText className="h-4 w-4 mr-2" /> Generate Agreement
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Finance Overview row */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<Card className="shadow-xs border-zinc-100 bg-white">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Agreement Price</p>
						<p className="text-lg font-bold text-zinc-800">{formatCurrency(sale.total_sale_amount)}</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs border-zinc-100 bg-white">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Amount Paid</p>
						<p className="text-lg font-bold text-green-600">{formatCurrency(sale.amount_paid || 0)}</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs border-zinc-100 bg-white">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Outstanding Dues</p>
						<p className="text-lg font-bold text-red-600">{formatCurrency(sale.remaining_amount || 0)}</p>
					</CardContent>
				</Card>
				<Card className="shadow-xs border-zinc-100 bg-white">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Next installment</p>
						<p className="text-lg font-bold text-zinc-700">
							{schedule.find((e: any) => e.status !== "paid")?.due_date || "Completed"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Header */}
			<div className="border-b border-zinc-200 flex gap-6 text-sm font-semibold">
				<button
					onClick={() => setActiveTab("overview")}
					className={`pb-3 border-b-2 transition-all ${
						activeTab === "overview" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
					}`}
				>
					Booking Overview
				</button>
				<button
					onClick={() => setActiveTab("emis")}
					className={`pb-3 border-b-2 transition-all ${
						activeTab === "emis" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
					}`}
				>
					EMI Plan ({summary.total_emis} installments)
				</button>
				<button
					onClick={() => setActiveTab("payments")}
					className={`pb-3 border-b-2 transition-all ${
						activeTab === "payments" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
					}`}
				>
					Payments Ledger
				</button>
				<button
					onClick={() => setActiveTab("discount")}
					className={`pb-3 border-b-2 transition-all ${
						activeTab === "discount" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
					}`}
				>
					Discount Details
				</button>
			</div>

			{/* Tab Content */}
			<div className="pt-2">
				{/* Tab 1: Overview */}
				{activeTab === "overview" && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Customer info card */}
						<Card className="border-zinc-100 bg-white">
							<CardContent className="p-4 space-y-4">
								<h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Buyer Information</h3>
								<div className="space-y-2 text-sm text-zinc-700">
									<p className="flex items-center gap-2"><User className="h-4 w-4 text-zinc-400" /> {sale.customers?.name}</p>
									<p className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /> {sale.customers?.phone}</p>
									<p className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-400" /> {sale.customers?.email || "No email"}</p>
									<p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" /> {sale.customers?.address || "No address"}</p>
								</div>
							</CardContent>
						</Card>

						{/* Plot specs */}
						<Card className="border-zinc-100 bg-white">
							<CardContent className="p-4 space-y-4">
								<h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Unit Specifications</h3>
								<div className="grid grid-cols-2 gap-4 text-sm text-zinc-700">
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Plot Size</p>
										<p className="font-semibold">{sale.plots?.size_sqft} sqft</p>
									</div>
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Rate per sqft</p>
										<p className="font-semibold">{formatCurrency(sale.plots?.rate_per_sqft)}/sqft</p>
									</div>
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Facing Direction</p>
										<p className="font-semibold capitalize">{sale.plots?.facing || "—"}</p>
									</div>
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Sales Advisor</p>
										<p className="font-semibold">{sale.advisors?.name || "—"}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Tab 2: EMIs */}
				{activeTab === "emis" && (
					<Card className="border-zinc-100 bg-white">
						<CardContent className="p-0 overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>EMI #</TableHead>
										<TableHead>Due Date</TableHead>
										<TableHead className="text-right">EMI Amount</TableHead>
										<TableHead className="text-right">Paid Amount</TableHead>
										<TableHead className="text-right">Remaining</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{schedule.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center text-zinc-400 py-6">
												No EMI installments generated for this sale.
											</TableCell>
										</TableRow>
									) : (
										schedule.map((emi: any) => {
											let statusClass = "bg-zinc-100 text-zinc-600";
											if (emi.display_status === "paid") statusClass = "bg-green-50 text-green-700 border-green-200";
											else if (emi.display_status === "overdue") statusClass = "bg-red-50 text-red-700 border-red-200";
											else if (emi.display_status === "partial") statusClass = "bg-orange-50 text-orange-700 border-orange-200";
											else if (emi.display_status === "upcoming") statusClass = "bg-yellow-50 text-yellow-800 border-yellow-200";

											return (
												<TableRow key={emi.id}>
													<td className="px-4 py-3 font-semibold text-xs text-zinc-800">EMI {emi.emi_number}</td>
													<td className="px-4 py-3 text-xs text-zinc-600">{emi.due_date}</td>
													<td className="px-4 py-3 text-right text-xs font-mono font-semibold">{formatCurrency(emi.emi_amount)}</td>
													<td className="px-4 py-3 text-right text-xs font-mono text-green-600">{formatCurrency(emi.paid_amount)}</td>
													<td className="px-4 py-3 text-right text-xs font-mono text-zinc-700">{formatCurrency(emi.remaining_amount)}</td>
													<td className="px-4 py-3 text-xs">
														<Badge variant="outline" className={`font-normal capitalize ${statusClass}`}>
															{emi.display_status}
														</Badge>
													</td>
													<td className="px-4 py-3 text-right">
														{emi.status !== "paid" && !sale.is_cancelled && (
															<Button size="xs" onClick={() => handlePayClick(emi)} className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5">
																Pay EMI
															</Button>
														)}
													</td>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{/* Tab 3: Payments */}
				{activeTab === "payments" && (
					<Card className="border-zinc-100 bg-white">
						<CardContent className="p-0 overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Receipt #</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Mode</TableHead>
										<TableHead className="text-right">Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Notes</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{payments.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center text-zinc-400 py-6">
												No payments collected yet.
											</TableCell>
										</TableRow>
									) : (
										payments.map((p: any) => (
											<TableRow key={p.id}>
												<td className="px-4 py-3 font-mono text-xs font-bold text-zinc-700">{p.slip_number}</td>
												<td className="px-4 py-3 text-xs text-zinc-600">{p.payment_date}</td>
												<td className="px-4 py-3 text-xs capitalize text-zinc-700">{p.payment_mode}</td>
												<td className={`px-4 py-3 text-right text-xs font-mono font-bold ${Number(p.amount) < 0 ? "text-red-600" : "text-green-600"}`}>
													{formatCurrency(p.amount)}
												</td>
												<td className="px-4 py-3 text-xs">
													<Badge variant="outline" className={p.is_confirmed ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-800 border-yellow-200"}>
														{p.is_confirmed ? "Confirmed" : "Pending"}
													</Badge>
												</td>
												<td className="px-4 py-3 text-xs text-zinc-500 italic max-w-[200px] truncate">{p.notes || "—"}</td>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{/* Tab 4: Discounts */}
				{activeTab === "discount" && (
					<Card className="border-zinc-100 bg-white">
						<CardContent className="p-4 space-y-3">
							<h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Discount Audit</h3>
							{sale.discount_amount > 0 ? (
								<div className="grid grid-cols-2 gap-4 text-sm text-zinc-700">
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Discount Amount</p>
										<p className="font-semibold text-zinc-800">{formatCurrency(sale.discount_amount)}</p>
									</div>
									<div>
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Approved By Admin</p>
										<p className="font-mono text-zinc-500 text-xs">{sale.discount_approved_by || "—"}</p>
									</div>
									<div className="col-span-2">
										<p className="text-[10px] text-zinc-400 font-bold uppercase">Discount Reason</p>
										<p className="italic text-zinc-600">"{sale.discount_reason || "None specified"}"</p>
									</div>
								</div>
							) : (
								<p className="text-xs text-zinc-400">No discount was applied to this booking.</p>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			{/* Record Payment Modal */}
			{payModalOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 font-bold text-zinc-800 text-sm">
							Log Installment Payment
						</div>
						<form onSubmit={handleLogPayment} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Payment Amount (₹)</label>
								<Input
									type="number"
									value={payAmount}
									onChange={(e) => setPayAmount(Number(e.target.value))}
									required
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Payment Date</label>
									<Input
										type="date"
										value={payDate}
										onChange={(e) => setPayDate(e.target.value)}
										required
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Mode</label>
									<select
										value={payMode}
										onChange={(e) => setPayMode(e.target.value)}
										className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
									>
										<option value="cash">Cash</option>
										<option value="online">Online / UPI</option>
										<option value="cheque">Cheque</option>
									</select>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Slip / Transaction Number</label>
								<Input
									value={paySlip}
									onChange={(e) => setPaySlip(e.target.value)}
									placeholder="e.g. TXN1002345"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Remarks</label>
								<Input
									value={payNotes}
									onChange={(e) => setPayNotes(e.target.value)}
									placeholder="Remarks"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setPayModalOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" disabled={recordPaymentMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
									{recordPaymentMutation.isPending ? "Submitting..." : "Log Receipt"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Cancel Booking Modal */}
			{cancelModalOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCancelModalOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-red-50 font-bold text-red-800 text-sm">
							Cancel Plot Booking
						</div>
						<form onSubmit={handleCancelBookingSubmit} className="p-5 space-y-4">
							<p className="text-xs text-zinc-500">
								Warning: This will set the plot status back to Available, waive all subsequent EMIs, and register a negative refund ledger.
							</p>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Cancellation Reason</label>
								<Input
									value={cancelReason}
									onChange={(e) => setCancelReason(e.target.value)}
									required
									placeholder="e.g. Client requested cancellation"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Refund Amount (₹)</label>
									<Input
										type="number"
										value={refundAmount}
										onChange={(e) => setRefundAmount(Number(e.target.value))}
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Refund Date</label>
									<Input
										type="date"
										value={refundDate}
										onChange={(e) => setRefundDate(e.target.value)}
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setCancelModalOpen(false)}>
									Go Back
								</Button>
								<Button size="sm" type="submit" disabled={cancelBookingMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white">
									{cancelBookingMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
