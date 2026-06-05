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
	Percent,
	Compass,
	Mail,
	ArrowRight,
	Wallet,
	CheckCircle2,
	XCircle
} from "lucide-react";
import { Button, Input, Badge, Card, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { updateSaleRegistryAmount } from "@/app/actions/sales";

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
			const res = await fetch(`/api/sales/booking`);
			const supabaseClientRes = await fetch(`/api/sales?limit=100`);
			const salesList = await supabaseClientRes.json();
			const found = salesList.data?.find((s: any) => s.id === saleId);
			if (found) {
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

		// Fetch builder details from settings (localStorage)
		const savedBizName = typeof window !== "undefined" ? localStorage.getItem("app_business_display_name") : null;
		const savedTagline = typeof window !== "undefined" ? localStorage.getItem("app_business_tagline") : null;
		const bizName = savedBizName || "M.G. INFRASTRUCTURE";
		const tagline = savedTagline || "Premium Real Estate Developers & Builders";

		doc.setLineWidth(1);
		doc.rect(5, 5, 200, 287);

		doc.setFont("helvetica", "bold");
		doc.setFontSize(20);
		doc.setTextColor(30, 41, 59);
		doc.text(bizName.toUpperCase(), 105, 23, { align: "center" });

		doc.setFontSize(9.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 116, 139);
		doc.text(tagline, 105, 28, { align: "center" });
		doc.text("Email: contact@mginfra.local | Contact: +91 9876543210", 105, 33, { align: "center" });

		doc.setLineWidth(0.5);
		doc.setDrawColor(200, 200, 200);
		doc.line(15, 38, 195, 38);

		doc.setFont("helvetica", "bold");
		doc.setFontSize(13);
		doc.setTextColor(15, 23, 42);
		doc.text("PLOT BOOKING AGREEMENT", 105, 47, { align: "center" });

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9.5);
		doc.text(`Booking Date: ${sale.token_date || "—"}`, 15, 56);
		doc.text(`Agreement No: MG-${saleId.slice(0, 8).toUpperCase()}`, 195, 56, { align: "right" });

		let currentY = 63;

		// 1. Customer Details Block
		const custLines: string[] = [];
		custLines.push(...doc.splitTextToSize(`Name: ${c?.name || "—"}`, 170));
		custLines.push(...doc.splitTextToSize(`Phone: ${c?.phone || "—"}`, 170));
		custLines.push(...doc.splitTextToSize(`Email: ${c?.email || "—"}`, 170));
		custLines.push(...doc.splitTextToSize(`Address: ${c?.address || "—"}`, 170));

		const custBlockHeight = 8 + custLines.length * 5.5 + 4;
		doc.setFillColor(248, 250, 252);
		doc.rect(15, currentY, 180, custBlockHeight, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9.5);
		doc.setTextColor(30, 41, 59);
		doc.text("CUSTOMER DETAILS", 20, currentY + 6);

		doc.setFont("helvetica", "normal");
		doc.setTextColor(51, 65, 85);
		let lineY = currentY + 11.5;
		custLines.forEach((line) => {
			doc.text(line, 20, lineY);
			lineY += 5.5;
		});

		currentY += custBlockHeight + 5;

		// 2. Property Specifications Block
		const propLines: string[] = [];
		propLines.push(...doc.splitTextToSize(`Project Layout: ${p?.projects?.name || "—"}`, 170));
		propLines.push(...doc.splitTextToSize(`Plot Number: ${p?.plot_number || "—"}`, 170));
		propLines.push(...doc.splitTextToSize(`Area Size: ${p?.size_sqft || "—"} sqft`, 170));
		propLines.push(...doc.splitTextToSize(`Location: ${p?.projects?.location || "—"}`, 170));

		const propBlockHeight = 8 + propLines.length * 5.5 + 4;
		doc.setFillColor(248, 250, 252);
		doc.rect(15, currentY, 180, propBlockHeight, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9.5);
		doc.setTextColor(30, 41, 59);
		doc.text("PROPERTY SPECIFICATIONS", 20, currentY + 6);

		doc.setFont("helvetica", "normal");
		doc.setTextColor(51, 65, 85);
		lineY = currentY + 11.5;
		propLines.forEach((line) => {
			doc.text(line, 20, lineY);
			lineY += 5.5;
		});

		currentY += propBlockHeight + 5;

		// 3. Financial Settlement Summary Block
		const registryVal = Number(sale.registry_amount || 0);
		const totalWithRegistry = Number(sale.total_sale_amount || 0) + registryVal;
		const finLines: string[] = [];
		finLines.push(...doc.splitTextToSize(`Total Sale Cost: Rs. ${sale.total_sale_amount.toLocaleString("en-IN")}`, 170));
		finLines.push(...doc.splitTextToSize(`Discount Awarded: Rs. ${sale.discount_amount.toLocaleString("en-IN")}`, 170));
		finLines.push(...doc.splitTextToSize(`Down Payment: Rs. ${sale.down_payment.toLocaleString("en-IN")}`, 170));
		if (registryVal > 0) {
			finLines.push(...doc.splitTextToSize(`Registry Fee: Rs. ${registryVal.toLocaleString("en-IN")}`, 170));
			finLines.push(...doc.splitTextToSize(`Grand Total: Rs. ${totalWithRegistry.toLocaleString("en-IN")}`, 170));
		}
		finLines.push(...doc.splitTextToSize(`Outstanding Balance: Rs. ${sale.remaining_amount.toLocaleString("en-IN")}`, 170));

		const finBlockHeight = 8 + finLines.length * 5.5 + 4;
		doc.setFillColor(248, 250, 252);
		doc.rect(15, currentY, 180, finBlockHeight, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9.5);
		doc.setTextColor(30, 41, 59);
		doc.text("FINANCIAL SETTLEMENT SUMMARY", 20, currentY + 6);

		doc.setFont("helvetica", "normal");
		doc.setTextColor(51, 65, 85);
		lineY = currentY + 11.5;
		finLines.forEach((line) => {
			doc.text(line, 20, lineY);
			lineY += 5.5;
		});

		currentY += finBlockHeight + 8;

		// 4. Terms and Conditions
		doc.setFont("helvetica", "bold");
		doc.setFontSize(9.5);
		doc.setTextColor(30, 41, 59);
		doc.text("TERMS AND CONDITIONS:", 15, currentY);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(71, 85, 105);

		const term1 = "1. All payments towards monthly installments must be paid by the designated due date.";
		const term2 = "2. Delays in installment payments exceeding 30 days are subject to late fee penalties.";
		const term3 = "3. In the event of booking cancellation, refunds will be processed minus administrative charges.";

		const term1Lines = doc.splitTextToSize(term1, 180);
		const term2Lines = doc.splitTextToSize(term2, 180);
		const term3Lines = doc.splitTextToSize(term3, 180);

		lineY = currentY + 5;
		term1Lines.forEach((l: string) => { doc.text(l, 15, lineY); lineY += 4.5; });
		term2Lines.forEach((l: string) => { doc.text(l, 15, lineY); lineY += 4.5; });
		term3Lines.forEach((l: string) => { doc.text(l, 15, lineY); lineY += 4.5; });

		// Handle page overflow for signature block
		if (lineY > 255) {
			doc.addPage();
			doc.setLineWidth(1);
			doc.rect(5, 5, 200, 287);
			lineY = 30; // reset to top of new page
		}

		const sigLineY = Math.max(270, lineY + 12);
		const sigTextY = sigLineY + 5;

		doc.setLineWidth(0.5);
		doc.setDrawColor(200, 200, 200);
		doc.line(15, sigLineY, 70, sigLineY);
		doc.line(140, sigLineY, 195, sigLineY);

		doc.setFontSize(9.5);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(30, 41, 59);
		doc.text("Authorized Representative", 15, sigTextY);
		doc.text("Customer Signature", 195, sigTextY, { align: "right" });

		doc.save(`MG_Agreement_${p?.plot_number || "Plot"}.pdf`);
		toast.success("Booking Agreement downloaded!");
	};

	const schedule = emiData?.schedule || [];
	const summary = emiData?.summary || { total_emis: 0, paid_emis: 0, overdue_emis: 0, pending_emis: 0, partial_emis: 0, total_emi_amount: 0, total_paid: 0, total_remaining: 0, total_penalty: 0 };
	const payments = paymentHistory?.data || [];

	return (
		<div className="space-y-6">
			{/* Top Bar with glassy controls */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-zinc-200/80 p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
				<div className="flex items-center gap-3">
					<Button 
						variant="outline" 
						size="sm" 
						onClick={() => router.push("/sales")}
						className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
					>
						<ChevronLeft className="h-4 w-4" /> Sales list
					</Button>
					
					<Badge className={cn(
						"text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs",
						sale.is_cancelled 
							? "bg-red-50 text-red-700 border-red-150" 
							: "bg-emerald-50 text-emerald-700 border-emerald-150"
					)}>
						{sale.is_cancelled ? "Revoked / Cancelled" : "Active Sale"}
					</Badge>
				</div>

				<div className="flex items-center gap-2">
					{!sale.is_cancelled && (
						<>
							<Button 
								size="sm" 
								variant="outline" 
								onClick={() => setCancelModalOpen(true)}
								className="h-9 px-4 text-xs font-black rounded-xl text-red-600 hover:text-red-700 border-red-200 bg-white shadow-2xs cursor-pointer hover:bg-red-50/20 active:scale-97 transition-all duration-200"
							>
								Cancel Booking
							</Button>
							<Button 
								size="sm" 
								onClick={generateAgreement}
								className="h-9 px-4.5 text-xs font-black rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs cursor-pointer active:scale-97 transition-all duration-200 flex items-center gap-1.5"
							>
								<FileText className="h-3.5 w-3.5" /> Generate Agreement
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Title Layout */}
			<div className="bg-gradient-to-r from-zinc-50 to-white border border-zinc-200/60 p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-xl sm:text-2xl font-black text-zinc-800 tracking-tight flex items-center gap-2">
						Plot {sale.plots?.plot_number}
						<span className="text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100/50 px-2 py-0.5 rounded-full shrink-0">
							Layout Unit
						</span>
					</h1>
					<p className="text-xs text-zinc-400 font-medium flex items-center gap-1">
						<Building2 className="h-3.5 w-3.5 text-zinc-400" /> {sale.plots?.projects?.name} &middot; {sale.plots?.projects?.location}
					</p>
				</div>
			</div>

			{/* Finance Overview row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-400/50" />
					<CardContent className="p-4 pl-5">
						<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
							Agreement Price {Number(sale.registry_amount || 0) > 0 ? "(incl. Registry)" : ""}
						</p>
						<p className="text-lg font-black text-zinc-800 font-mono mt-1">
							{formatCurrency(Number(sale.total_sale_amount || 0) + Number(sale.registry_amount || 0))}
						</p>
						{Number(sale.registry_amount || 0) > 0 && (
							<p className="text-[9px] font-bold text-zinc-400 font-mono mt-0.5">
								Plot: {formatCurrency(sale.total_sale_amount)} | Registry: {formatCurrency(sale.registry_amount)}
							</p>
						)}
					</CardContent>
				</Card>
				
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
					<CardContent className="p-4 pl-5">
						<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Amount Paid</p>
						<p className="text-lg font-black text-emerald-600 font-mono mt-1">{formatCurrency(sale.amount_paid || 0)}</p>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
					<CardContent className="p-4 pl-5">
						<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Outstanding Dues</p>
						<p className="text-lg font-black text-red-500 font-mono mt-1">{formatCurrency(sale.remaining_amount || 0)}</p>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500" />
					<CardContent className="p-4 pl-5">
						<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Next installment</p>
						<p className="text-sm font-black text-zinc-700 mt-2 truncate">
							{schedule.find((e: any) => e.status !== "paid")?.due_date 
								? formatDate(schedule.find((e: any) => e.status !== "paid")?.due_date) 
								: "Completed 🎉"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Header with premium glassy feel */}
			<div className="bg-zinc-50/50 p-1.5 rounded-2xl border border-zinc-200/60 flex flex-wrap gap-1.5 text-xs font-black">
				{(
					[
						["overview", "Booking Overview"],
						["emis", `EMI Plan (${summary.total_emis} Installments)`],
						["payments", "Payments Ledger"],
						["discount", "Discount Details"]
					] as const
				).map(([tabKey, tabLabel]) => {
					const isActive = activeTab === tabKey;
					return (
						<button
							key={tabKey}
							type="button"
							onClick={() => setActiveTab(tabKey)}
							className={cn(
								"px-4.5 py-2 rounded-xl transition-all duration-300 cursor-pointer text-xs font-black uppercase tracking-wider",
								isActive 
									? "bg-white text-teal-700 shadow-2xs border border-zinc-200/40" 
									: "text-zinc-450 hover:text-zinc-700 hover:bg-white/40"
							)}
						>
							{tabLabel}
						</button>
					);
				})}
			</div>

			{/* Tab Content area */}
			<div className="pt-1">
				{/* Tab 1: Overview */}
				{activeTab === "overview" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Customer info card */}
							<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
								<CardContent className="p-5 space-y-4">
									<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
										<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
											<User className="h-4 w-4" />
										</div>
										<h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Buyer Information</h3>
									</div>
									
									<div className="space-y-3.5 text-xs">
										<div className="flex items-center gap-3">
											<span className="text-[10px] font-black uppercase text-zinc-400 w-24">Full Name</span>
											<span className="font-bold text-zinc-800">{sale.customers?.name ?? "—"}</span>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-[10px] font-black uppercase text-zinc-400 w-24">Phone No</span>
											<span className="font-bold text-zinc-800 font-mono">{sale.customers?.phone ?? "—"}</span>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-[10px] font-black uppercase text-zinc-400 w-24">Email ID</span>
											<span className="font-bold text-zinc-800 flex items-center gap-1">
												<Mail className="h-3.5 w-3.5 text-zinc-400" />
												{sale.customers?.email || "No email active"}
											</span>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-[10px] font-black uppercase text-zinc-400 w-24">Location</span>
											<span className="font-bold text-zinc-850 flex items-center gap-1">
												<MapPin className="h-3.5 w-3.5 text-zinc-400" />
												{sale.customers?.address || "No address updated"}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Plot specs */}
							<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
								<CardContent className="p-5 space-y-4">
									<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
										<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
											<Compass className="h-4 w-4" />
										</div>
										<h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Unit Specifications</h3>
									</div>
									
									<div className="grid grid-cols-2 gap-5 text-xs">
										<div className="space-y-1">
											<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Plot Size</p>
											<p className="font-bold text-zinc-800">{sale.plots?.size_sqft} sqft</p>
										</div>
										<div className="space-y-1">
											<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Rate per sqft</p>
											<p className="font-bold text-zinc-800 font-mono">{formatCurrency(sale.plots?.rate_per_sqft)}/sqft</p>
										</div>
										<div className="space-y-1">
											<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Facing Direction</p>
											<p className="font-bold text-zinc-800 capitalize">{sale.plots?.facing || "—"}</p>
										</div>
										<div className="space-y-1">
											<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Sales Advisor</p>
											<p className="font-bold text-zinc-800">{sale.advisors?.name || "—"}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Registry Details section (only shows when all EMIs are paid / remaining is 0) */}
						{Number(sale.remaining_amount || 0) <= 0 && (
							<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
								<CardContent className="p-5 space-y-4">
									<div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
										<div className="flex items-center gap-2">
											<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
												<FileText className="h-4 w-4" />
											</div>
											<h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Registry Details</h3>
										</div>
										<Badge className="bg-emerald-50 text-emerald-700 border-emerald-150 uppercase text-[9px] font-black tracking-wider rounded-full px-2.5 py-0.5 border">
											Unlocked (Outstanding Balance is 0)
										</Badge>
									</div>

									<RegistryForm saleId={sale.id} initialRegistryAmount={Number(sale.registry_amount || 0)} refetchSale={refetchSale} />
								</CardContent>
							</Card>
						)}
					</div>
				)}

				{/* Tab 2: EMIs */}
				{activeTab === "emis" && (
					<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
						<CardContent className="p-0 overflow-x-auto">
							<Table>
								<TableHeader className="bg-zinc-50/70 border-b border-zinc-150">
									<TableRow>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">EMI #</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Due Date</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">EMI Amount</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">Paid Amount</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">Remaining</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Status</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right pr-5">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{schedule.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center text-zinc-400 py-10 font-bold text-xs">
												No EMI installments generated for this sale.
											</TableCell>
										</TableRow>
									) : (
										schedule.map((emi: any) => {
											let statusClass = "bg-zinc-100 text-zinc-650 border-zinc-200/50";
											if (emi.display_status === "paid") statusClass = "bg-emerald-50 text-emerald-700 border-emerald-100/50";
											else if (emi.display_status === "overdue") statusClass = "bg-red-50 text-red-700 border-red-100/50";
											else if (emi.display_status === "partial") statusClass = "bg-amber-50 text-amber-700 border-amber-100/50";
											else if (emi.display_status === "upcoming") statusClass = "bg-blue-50 text-blue-800 border-blue-100/50";

											return (
												<TableRow key={emi.id} className="hover:bg-zinc-50/50 transition-colors">
													<td className="px-4 py-3.5 font-bold text-xs text-zinc-800">EMI {emi.emi_number}</td>
													<td className="px-4 py-3.5 text-xs text-zinc-600 font-bold">{emi.due_date ? formatDate(emi.due_date) : "—"}</td>
													<td className="px-4 py-3.5 text-right text-xs font-mono font-bold text-zinc-800">{formatCurrency(emi.emi_amount)}</td>
													<td className="px-4 py-3.5 text-right text-xs font-mono font-bold text-emerald-600">{formatCurrency(emi.paid_amount)}</td>
													<td className="px-4 py-3.5 text-right text-xs font-mono font-bold text-zinc-650">{formatCurrency(emi.remaining_amount)}</td>
													<td className="px-4 py-3.5 text-xs">
														<Badge variant="outline" className={cn("font-black text-[9px] uppercase tracking-wider py-0.5 rounded-md shadow-2xs", statusClass)}>
															{emi.display_status}
														</Badge>
													</td>
													<td className="px-4 py-3.5 text-right pr-5">
														{emi.status !== "paid" && !sale.is_cancelled && (
															<Button 
																size="sm" 
																onClick={() => handlePayClick(emi)} 
																className="h-7 text-[10px] font-black rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 transition-all cursor-pointer shadow-xs active:scale-97"
															>
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
					<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
						<CardContent className="p-0 overflow-x-auto">
							<Table>
								<TableHeader className="bg-zinc-50/70 border-b border-zinc-150">
									<TableRow>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Receipt #</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Date</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Mode</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">Amount</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider">Status</TableHead>
										<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider pr-5">Notes</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{payments.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center text-zinc-400 py-10 font-bold text-xs">
												No payments collected yet.
											</TableCell>
										</TableRow>
									) : (
										payments.map((p: any) => (
											<TableRow key={p.id} className="hover:bg-zinc-50/50 transition-colors">
												<td className="px-4 py-3.5 font-mono text-xs font-black text-zinc-700">{p.slip_number || "—"}</td>
												<td className="px-4 py-3.5 text-xs text-zinc-650 font-bold">{p.payment_date ? formatDate(p.payment_date) : "—"}</td>
												<td className="px-4 py-3.5 text-xs font-bold capitalize text-zinc-700">{p.payment_mode}</td>
												<td className={cn("px-4 py-3.5 text-right text-xs font-mono font-black", Number(p.amount) < 0 ? "text-red-500" : "text-emerald-600")}>
													{formatCurrency(p.amount)}
												</td>
												<td className="px-4 py-3.5 text-xs">
													<Badge variant="outline" className={cn(
														"font-black text-[9px] uppercase tracking-wider py-0.5 rounded-md shadow-2xs",
														p.is_confirmed 
															? "bg-green-50 text-green-700 border-green-150" 
															: "bg-amber-50 text-amber-700 border-amber-150"
													)}>
														{p.is_confirmed ? "Confirmed" : "Pending"}
													</Badge>
												</td>
												<td className="px-4 py-3.5 text-xs text-zinc-500 italic max-w-[200px] truncate pr-5">{p.notes || "—"}</td>
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
					<Card className="rounded-2xl border-zinc-200/85 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
						<CardContent className="p-5 space-y-4">
							<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
								<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
									<Percent className="h-4 w-4" />
								</div>
								<h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Discount Audit Details</h3>
							</div>
							
							{sale.discount_amount > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs pt-1">
									<div className="space-y-1 bg-zinc-50 p-3 rounded-xl border border-zinc-200/40">
										<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Discount Amount</p>
										<p className="text-sm font-black text-red-500 font-mono mt-0.5">{formatCurrency(sale.discount_amount)}</p>
									</div>
									<div className="space-y-1 bg-zinc-50 p-3 rounded-xl border border-zinc-200/40">
										<p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Approved By Admin</p>
										<p className="text-xs font-black text-zinc-650 font-mono mt-1">{sale.discount_approved_by || "—"}</p>
									</div>
									<div className="col-span-1 sm:col-span-2 space-y-1.5 bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/40">
										<p className="text-[9px] text-amber-850 font-black uppercase tracking-wider">Discount Reason & Notes</p>
										<p className="italic font-bold text-zinc-700 leading-normal">"{sale.discount_reason || "None specified"}"</p>
									</div>
								</div>
							) : (
								<p className="text-xs text-zinc-450 italic py-4">No discount was applied to this booking.</p>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			{/* Record Payment Modal */}
			{payModalOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300" onClick={() => setPayModalOpen(false)} />
					<div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 max-w-sm w-full z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="px-6 py-4.5 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white font-black text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<Wallet className="h-3.5 w-3.5" />
							</div>
							Log Installment Payment
						</div>
						
						<form onSubmit={handleLogPayment} className="p-6 space-y-4">
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Payment Amount (₹)</label>
								<Input
									type="number"
									value={payAmount}
									onChange={(e) => setPayAmount(Number(e.target.value))}
									required
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>
							
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Payment Date</label>
									<Input
										type="date"
										value={payDate}
										onChange={(e) => setPayDate(e.target.value)}
										required
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>
								
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Payment Mode</label>
									<select
										value={payMode}
										onChange={(e) => setPayMode(e.target.value)}
										className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
									>
										<option value="cash">Cash</option>
										<option value="online">Online / UPI</option>
										<option value="cheque">Cheque</option>
									</select>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Slip / Transaction Number</label>
								<Input
									value={paySlip}
									onChange={(e) => setPaySlip(e.target.value)}
									placeholder="e.g. TXN1002345"
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Remarks / Notes</label>
								<Input
									value={payNotes}
									onChange={(e) => setPayNotes(e.target.value)}
									placeholder="Add special notes..."
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="flex justify-end gap-2.5 pt-3.5 border-t border-zinc-150/80">
								<Button 
									size="sm" 
									type="button" 
									variant="outline" 
									onClick={() => setPayModalOpen(false)}
									className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer"
								>
									Cancel
								</Button>
								<Button 
									size="sm" 
									type="submit" 
									disabled={recordPaymentMutation.isPending} 
									className="h-9 px-4.5 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center gap-1"
								>
									{recordPaymentMutation.isPending ? (
										<>
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
											Saving...
										</>
									) : (
										"Log Receipt"
									)}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Cancel Booking Modal */}
			{cancelModalOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300" onClick={() => setCancelModalOpen(false)} />
					<div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/85 max-w-sm w-full z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="px-6 py-4.5 border-b border-red-150 bg-gradient-to-r from-red-50/20 to-white font-black text-red-800 text-xs uppercase tracking-wider flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-red-50 flex items-center justify-center text-red-600 border border-red-100/50">
								<XCircle className="h-3.5 w-3.5" />
							</div>
							Cancel Plot Booking
						</div>
						
						<form onSubmit={handleCancelBookingSubmit} className="p-6 space-y-4">
							<div className="bg-red-50 border border-red-100/60 p-3.5 rounded-xl space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
								<p className="text-[10px] font-black uppercase text-red-700 tracking-wider flex items-center gap-1.5">
									<AlertTriangle className="h-3.5 w-3.5" />
									Warning Details
								</p>
								<p className="text-[10.5px] font-bold text-red-600 leading-normal">
									This sets plot status to Available, waives all upcoming EMIs, and logs negative refund logs in payment archives.
								</p>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Cancellation Reason</label>
								<Input
									value={cancelReason}
									onChange={(e) => setCancelReason(e.target.value)}
									required
									placeholder="Client requested refund / cancellation"
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Refund Amount (₹)</label>
									<Input
										type="number"
										value={refundAmount}
										onChange={(e) => setRefundAmount(Number(e.target.value))}
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Refund Date</label>
									<Input
										type="date"
										value={refundDate}
										onChange={(e) => setRefundDate(e.target.value)}
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-2.5 pt-3.5 border-t border-zinc-150/80">
								<Button 
									size="sm" 
									type="button" 
									variant="outline" 
									onClick={() => setCancelModalOpen(false)}
									className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer"
								>
									Go Back
								</Button>
								<Button 
									size="sm" 
									type="submit" 
									disabled={cancelBookingMutation.isPending} 
									className="h-9 px-4.5 text-xs font-black rounded-xl bg-red-600 hover:bg-red-700 text-white hover:shadow-[0_4px_12px_rgba(220,38,38,0.15)] transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center gap-1"
								>
									{cancelBookingMutation.isPending ? (
										<>
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
											Cancelling...
										</>
									) : (
										"Confirm"
									)}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function RegistryForm({ 
	saleId, 
	initialRegistryAmount, 
	refetchSale 
}: { 
	saleId: string; 
	initialRegistryAmount: number; 
	refetchSale: () => void 
}) {
	const [amount, setAmount] = useState(initialRegistryAmount ? String(initialRegistryAmount) : "");
	const [saving, setSaving] = useState(false);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await updateSaleRegistryAmount(saleId, Number(amount) || 0);
			if (res.success) {
				toast.success("Registry amount updated successfully!");
				refetchSale();
			} else {
				toast.error(res.error || "Failed to update registry amount");
			}
		} catch (err: any) {
			toast.error(err.message || "An error occurred");
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={handleSave} className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
			<div className="space-y-1.5 flex-1 w-full">
				<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Registry Fee Amount (₹)</label>
				<Input
					type="number"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					placeholder="Enter registry fee amount..."
					className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
				/>
			</div>
			<Button
				size="sm"
				type="submit"
				disabled={saving}
				className="h-10 px-5 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer active:scale-97 transition-all duration-200 shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5"
			>
				{saving ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
						Saving...
					</>
				) : (
					"Update Registry"
				)}
			</Button>
		</form>
	);
}
