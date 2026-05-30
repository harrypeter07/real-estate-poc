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
	Wallet,
	Coins,
	FileText,
	CheckCircle2,
	XCircle,
	Building2,
	User,
	Receipt,
	ShieldAlert,
	Sparkles,
	Clock,
	Banknote,
	TrendingUp,
	FileSpreadsheet
} from "lucide-react";
import { Button, Input, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

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
			const res = await fetch(`/api/penalties?limit=100`);
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
		
		// Load builder display name from settings
		const savedBizName = typeof window !== "undefined" ? localStorage.getItem("app_business_display_name") : null;
		const bizName = savedBizName || "M.G. Infrastructure Developers";

		doc.setFont("helvetica", "bold");
		doc.setFontSize(16);
		doc.text("PAYMENT COLLECTION RECEIPT", 105, 20, { align: "center" });

		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text(bizName, 105, 26, { align: "center" });
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
			headStyles: { fillColor: [30, 41, 59] },
		});

		const finalY = (doc as any).lastAutoTable.finalY || 120;
		
		// Draw notes
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text("Remarks / Notes:", 15, finalY + 12);
		
		doc.setFont("helvetica", "italic");
		const notesText = pay.notes || "No remarks logged.";
		const splitNotes = doc.splitTextToSize(notesText, 175);
		doc.text(splitNotes, 15, finalY + 18);
		
		// Calculate Y offset based on notes height
		const notesHeight = splitNotes.length * 5;
		const sigLineY = finalY + 18 + notesHeight + 15;
		const sigTextY = sigLineY + 5;

		doc.setFont("helvetica", "bold");
		doc.text("Authorized Signature", 195, sigTextY, { align: "right" });
		doc.line(140, sigLineY, 195, sigLineY);

		doc.save(`Receipt_${pay.slip_number}.pdf`);
	};

	const ledger = paymentsRes?.data || [];
	const totalItems = paymentsRes?.total || 0;
	const totalPages = Math.ceil(totalItems / limit);
	const selectedCustSales = sales.filter((s) => s.customer_id === selectedCustId && !s.is_cancelled);

	return (
		<div className="space-y-6">
			{/* Stats Grid - Glassmorphism Finance Style */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
				{/* Card 1: Total Collected */}
				<Card className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/95 to-zinc-50/90 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1.5">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Total Collected (This Month)</p>
							<p className="text-xl font-black text-emerald-600 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
								{formatCurrency(summary?.total_collected || 0)}
							</p>
						</div>
						<div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 shadow-2xs group-hover:scale-110 transition-all">
							<Wallet className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
				
				{/* Card 2: Cash Ledger */}
				<Card className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/95 to-zinc-50/90 shadow-[0_4px_20px_-4px_rgba(9,9,11,0.03)] hover:shadow-[0_8px_30px_rgba(9,9,11,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1.5">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Cash Ledger</p>
							<p className="text-xl font-black text-zinc-800 font-mono tracking-tight group-hover:text-zinc-950 transition-colors">
								{formatCurrency(summary?.breakdown?.cash || 0)}
							</p>
						</div>
						<div className="h-10 w-10 rounded-full bg-zinc-50 text-zinc-650 flex items-center justify-center border border-zinc-150 shadow-2xs group-hover:scale-110 transition-all">
							<Coins className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				{/* Card 3: Online / UPI Volume */}
				<Card className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/95 to-zinc-50/90 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.03)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1.5">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Online / UPI Volume</p>
							<p className="text-xl font-black text-blue-650 font-mono tracking-tight group-hover:text-blue-750 transition-colors">
								{formatCurrency(summary?.breakdown?.online || 0)}
							</p>
						</div>
						<div className="h-10 w-10 rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center border border-blue-100/50 shadow-2xs group-hover:scale-110 transition-all">
							<CreditCard className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				{/* Card 4: Cheque Clearance */}
				<Card className="rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-white/95 to-zinc-50/90 shadow-[0_4px_20px_-4px_rgba(13,148,136,0.03)] hover:shadow-[0_8px_30px_rgba(13,148,136,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1.5">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Cheque Clearance</p>
							<p className="text-xl font-black text-teal-650 font-mono tracking-tight group-hover:text-teal-750 transition-colors">
								{formatCurrency(summary?.breakdown?.cheque || 0)}
							</p>
						</div>
						<div className="h-10 w-10 rounded-full bg-teal-50/80 text-teal-650 flex items-center justify-center border border-teal-100/50 shadow-2xs group-hover:scale-110 transition-all">
							<Banknote className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filter & Sub Tabs Segment Action Bar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-zinc-200/80 p-3.5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
				<div className="bg-zinc-100/70 p-1 rounded-xl flex gap-1 border border-zinc-200/40 w-fit">
					<button
						type="button"
						onClick={() => setActiveSubTab("ledger")}
						className={cn(
							"px-4.5 py-2 text-xs font-black rounded-lg transition-all duration-200 cursor-pointer uppercase tracking-wider",
							activeSubTab === "ledger"
								? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
								: "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50/50"
						)}
					>
						Payment Ledger
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("penalties")}
						className={cn(
							"px-4.5 py-2 text-xs font-black rounded-lg transition-all duration-200 cursor-pointer uppercase tracking-wider",
							activeSubTab === "penalties"
								? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
								: "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50/50"
						)}
					>
						Penalties Archive
					</button>
				</div>

				<Button 
					size="sm" 
					onClick={() => setAddOpen(true)} 
					className="h-10 px-5 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] active:scale-[0.98] flex items-center gap-1.5 self-end sm:self-auto w-full sm:w-auto justify-center"
				>
					<Plus className="h-4 w-4" /> Log Payment
				</Button>
			</div>

			{/* Tab 1: Ledger Table with Premium Styling & Row Hover Glows */}
			{activeSubTab === "ledger" && (
				<Card className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
					<div className="overflow-x-auto">
						<Table className="min-w-full">
							<TableHeader className="bg-zinc-50/70 border-b border-zinc-150 sticky top-0 z-10 backdrop-blur-md">
								<TableRow>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 pl-5">
										<div className="flex items-center gap-1.5">
											<Receipt className="h-3.5 w-3.5 text-zinc-400" />
											Receipt #
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<User className="h-3.5 w-3.5 text-zinc-400" />
											Customer
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<Building2 className="h-3.5 w-3.5 text-zinc-400" />
											Plot/Project
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 text-right">
										<div className="flex items-center gap-1.5 justify-end">
											<Coins className="h-3.5 w-3.5 text-zinc-400" />
											Amount
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<CreditCard className="h-3.5 w-3.5 text-zinc-400" />
											Mode
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-3.5 w-3.5 text-zinc-400" />
											Date
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<FileText className="h-3.5 w-3.5 text-zinc-400" />
											EMI #
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
											Status
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 text-right pr-5">
										<div className="flex items-center gap-1.5 justify-end">
											<Printer className="h-3.5 w-3.5 text-zinc-400" />
											Print
										</div>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loadingPayments ? (
									<TableRow>
										<TableCell colSpan={9} className="text-center py-12 bg-white">
											<div className="flex flex-col items-center justify-center gap-2">
												<Loader2 className="h-8 w-8 animate-spin text-teal-650" />
												<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Loading entries...</span>
											</div>
										</TableCell>
									</TableRow>
								) : ledger.length === 0 ? (
									<TableRow>
										<TableCell colSpan={9} className="bg-white">
											{/* Premium Empty State */}
											<div className="py-14 text-center max-w-sm mx-auto flex flex-col items-center">
												<div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3.5 shadow-2xs">
													<CreditCard className="h-5 w-5 text-zinc-450" />
												</div>
												<h4 className="text-xs font-black text-zinc-750 uppercase tracking-wider">No payments recorded yet</h4>
												<p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed font-semibold">
													Transactions and customer collections will appear here once saved in the platform ledger database.
												</p>
												<Button
													size="sm"
													onClick={() => setAddOpen(true)}
													className="mt-4.5 h-8 px-4 text-[10px] font-black rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
												>
													<Plus className="h-3.5 w-3.5" /> Log First Payment
												</Button>
											</div>
										</TableCell>
									</TableRow>
								) : (
									ledger.map((pay: any) => (
										<TableRow 
											key={pay.id} 
											className="hover:bg-teal-50/15 relative transition-all duration-200 group border-b border-zinc-100 hover:shadow-[inset_4px_0_0_0_#0d9488]"
										>
											<td className="px-4 py-4 font-mono text-xs font-black text-zinc-700 pl-5">{pay.slip_number || "—"}</td>
											<td className="px-4 py-4 text-xs font-black text-zinc-800">{pay.customer_name}</td>
											
											{/* Upgrade Plot/Project Cell */}
											<td className="px-4 py-4 text-xs">
												<div className="flex items-center gap-2">
													<div className="h-7 w-7 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-center text-zinc-400 group-hover:text-teal-600 transition-colors shadow-3xs">
														<Building2 className="h-3.5 w-3.5" />
													</div>
													<div className="flex flex-col">
														<span className="font-black text-zinc-800">Plot {pay.plot_number}</span>
														<span className="text-[10px] text-zinc-400 font-bold tracking-tight">{pay.project_name}</span>
													</div>
												</div>
											</td>

											{/* Glow text on Hover */}
											<td className={cn(
												"px-4 py-4 text-right text-xs font-mono font-black transition-all group-hover:scale-[1.02]", 
												Number(pay.amount) < 0 ? "text-red-500" : "text-emerald-600 group-hover:text-emerald-700"
											)}>
												{formatCurrency(pay.amount)}
											</td>
											<td className="px-4 py-4 text-xs font-bold capitalize text-zinc-650">{pay.payment_mode}</td>
											<td className="px-4 py-4 text-xs font-bold text-zinc-450 font-mono">{pay.payment_date ? formatDate(pay.payment_date) : "—"}</td>
											<td className="px-4 py-4 text-xs font-black text-zinc-800">
												{pay.emi_number ? (
													<Badge variant="outline" className="bg-zinc-50/50 text-zinc-700 border-zinc-200 font-bold text-[10px] uppercase py-0.5 rounded shadow-3xs">
														EMI {pay.emi_number}
													</Badge>
												) : (
													<span className="text-zinc-400 font-medium font-mono text-[10px]">Token / Down</span>
												)}
											</td>
											<td className="px-4 py-4 text-xs">
												{pay.is_confirmed ? (
													<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100/50 font-black text-[9px] uppercase tracking-wider py-0.5 rounded-md shadow-3xs">
														Confirmed
													</Badge>
												) : (
													<div className="flex items-center gap-1.5">
														<Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100/50 font-black text-[9px] uppercase tracking-wider py-0.5 rounded-md shadow-3xs">
															Unconfirmed
														</Badge>
														<Button 
															size="xs" 
															className="h-6 text-[9px] font-black rounded-md bg-teal-600 hover:bg-teal-700 text-white px-2 cursor-pointer shadow-2xs"
															onClick={() => confirmPaymentMutation.mutate(pay.id)}
														>
															Confirm
														</Button>
													</div>
												)}
											</td>
											<td className="px-4 py-4 text-right pr-5">
												{/* Tooltip circular button */}
												<Button 
													size="sm" 
													variant="outline" 
													className="h-7.5 w-7.5 p-0 rounded-full border-zinc-200 hover:border-teal-500 text-zinc-450 hover:text-teal-650 bg-white transition-all cursor-pointer shadow-3xs hover:-translate-y-0.5 hover:shadow-xs group-hover:border-zinc-300"
													onClick={() => handlePrintPDF(pay)}
													title="Print Receipt PDF"
												>
													<Printer className="h-3.5 w-3.5" />
												</Button>
											</td>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-between items-center p-4 border-t border-zinc-150 bg-zinc-50/30">
							<span className="text-xs text-zinc-450 font-semibold">Page {page} of {totalPages}</span>
							<div className="flex gap-2">
								<Button 
									size="sm" 
									variant="outline" 
									onClick={() => setPage((p) => Math.max(1, p - 1))} 
									disabled={page === 1}
									className="h-8.5 text-xs font-black rounded-lg border-zinc-200 text-zinc-650 bg-white shadow-2xs cursor-pointer disabled:opacity-50"
								>
									<ChevronLeft className="h-3.5 w-3.5" /> Previous
								</Button>
								<Button 
									size="sm" 
									variant="outline" 
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
									disabled={page === totalPages}
									className="h-8.5 text-xs font-black rounded-lg border-zinc-200 text-zinc-650 bg-white shadow-2xs cursor-pointer disabled:opacity-50"
								>
									Next <ChevronRight className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					)}
				</Card>
			)}

			{/* Tab 2: Penalties Table */}
			{activeSubTab === "penalties" && (
				<Card className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
					<div className="overflow-x-auto">
						<Table className="min-w-full">
							<TableHeader className="bg-zinc-50/70 border-b border-zinc-150 sticky top-0 z-10 backdrop-blur-md">
								<TableRow>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 pl-5">
										<div className="flex items-center gap-1.5">
											<User className="h-3.5 w-3.5 text-zinc-400" />
											Customer
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<Building2 className="h-3.5 w-3.5 text-zinc-400" />
											Unit / Plot
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<FileText className="h-3.5 w-3.5 text-zinc-400" />
											EMI #
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<Sparkles className="h-3.5 w-3.5 text-zinc-400" />
											Penalty Type
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 text-right">
										<div className="flex items-center gap-1.5 justify-end">
											<Coins className="h-3.5 w-3.5 text-zinc-400" />
											Amount
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5">
										<div className="flex items-center gap-1.5">
											<CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
											Status
										</div>
									</TableHead>
									<TableHead className="font-black text-[10px] uppercase text-zinc-450 tracking-wider py-3.5 text-right pr-5">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{!penaltiesRes?.data || penaltiesRes.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="bg-white">
											{/* Premium Empty State */}
											<div className="py-14 text-center max-w-sm mx-auto flex flex-col items-center">
												<div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3.5 shadow-2xs">
													<ShieldAlert className="h-5 w-5 text-zinc-455" />
												</div>
												<h4 className="text-xs font-black text-zinc-750 uppercase tracking-wider">No unpaid penalties raised</h4>
												<p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed font-semibold">
													No late payment penalties or accounts receivable warnings are active in the database system.
												</p>
											</div>
										</TableCell>
									</TableRow>
								) : (
									penaltiesRes.data.map((pen: any) => (
										<TableRow 
											key={pen.id} 
											className="hover:bg-teal-50/15 relative transition-all duration-200 group border-b border-zinc-100 hover:shadow-[inset_4px_0_0_0_#0d9488]"
										>
											<td className="px-4 py-4 text-xs font-black text-zinc-800 pl-5">{pen.customer_name}</td>
											<td className="px-4 py-4 text-xs font-bold text-zinc-450">Plot {pen.plot_number}</td>
											<td className="px-4 py-4 text-xs font-black text-zinc-850">{pen.emi_number ? `EMI ${pen.emi_number}` : "General"}</td>
											<td className="px-4 py-4 text-xs capitalize font-bold text-zinc-600">{pen.penalty_type.replace(/_/g, " ")}</td>
											<td className="px-4 py-4 text-right text-xs font-mono font-black text-red-500 transition-all group-hover:scale-[1.02]">{formatCurrency(pen.penalty_amount)}</td>
											<td className="px-4 py-4 text-xs">
												<Badge variant="outline" className={cn(
													"font-black text-[9px] uppercase tracking-wider py-0.5 rounded-md shadow-3xs",
													pen.is_paid 
														? "bg-emerald-50 text-emerald-700 border-emerald-100/50" 
														: pen.is_waived 
															? "bg-zinc-50 text-zinc-500 border-zinc-200/50" 
															: "bg-red-50 text-red-700 border-red-100/50"
												)}>
													{pen.is_paid ? "Paid" : pen.is_waived ? "Waived" : "Outstanding"}
												</Badge>
											</td>
											<td className="px-4 py-4 text-right pr-5">
												{!pen.is_paid && !pen.is_waived && (
													<div className="flex gap-1.5 justify-end">
														<Button 
															size="sm" 
															variant="outline" 
															className="h-7.5 text-[10px] font-black rounded-lg text-red-650 hover:text-red-700 border-red-200 bg-white transition-all cursor-pointer shadow-3xs hover:bg-red-50/10"
															onClick={() => {
																setWaivingPenaltyId(pen.id);
																setWaiveOpen(true);
															}}
														>
															Waive
														</Button>
														<Button 
															size="sm" 
															className="h-7.5 text-[10px] font-black rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 transition-all cursor-pointer shadow-xs active:scale-97"
															onClick={() => {
																const confirmPay = confirm("Are you sure you want to mark this penalty as paid?");
																if (confirmPay) {
																	payPenaltyMutation.mutate({ id: pen.id, payId: pen.payment_id || "direct" });
																}
															}}
														>
															Mark Paid
														</Button>
													</div>
												)}
											</td>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</Card>
			)}

			{/* Add Payment Modal */}
			{addOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300" onClick={() => setAddOpen(false)} />
					<div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 max-w-sm w-full z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="px-6 py-4.5 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white font-black text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<Wallet className="h-3.5 w-3.5" />
							</div>
							Record Receipt Transaction
						</div>
						
						<form onSubmit={handleAddPaymentSubmit} className="p-6 space-y-4">
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Select Customer</label>
								<select
									value={selectedCustId}
									onChange={(e) => {
										setSelectedCustId(e.target.value);
										setSelectedSaleId("");
										setSelectedEmiId("");
									}}
									required
									className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
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
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Select Booking / Plot</label>
									<select
										value={selectedSaleId}
										onChange={(e) => {
											setSelectedSaleId(e.target.value);
											setSelectedEmiId("");
										}}
										required
										className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
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
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Link to EMI Installment</label>
									<select
										value={selectedEmiId}
										onChange={(e) => {
											setSelectedEmiId(e.target.value);
											const emi = saleEmis.find((x: any) => x.id === e.target.value);
											if (emi) {
												setPaymentAmount(Number(emi.remaining_amount));
											}
										}}
										className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
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

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Amount (₹)</label>
								<Input
									type="number"
									value={paymentAmount}
									onChange={(e) => setPaymentAmount(Number(e.target.value))}
									required
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Date</label>
									<Input
										type="date"
										value={paymentDate}
										onChange={(e) => setPaymentDate(e.target.value)}
										required
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Mode</label>
									<select
										value={paymentMode}
										onChange={(e) => setPaymentMode(e.target.value)}
										className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
									>
										<option value="cash">Cash</option>
										<option value="online">Online / UPI</option>
										<option value="cheque">Cheque</option>
									</select>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Transaction Slip Number</label>
								<Input
									value={slipNumber}
									onChange={(e) => setSlipNumber(e.target.value)}
									placeholder="Optional slip number"
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="flex flex-row items-center justify-end gap-2.5 pt-3.5 border-t border-zinc-150/80 w-full">
								<Button 
									size="sm" 
									type="button" 
									variant="outline" 
									onClick={() => setAddOpen(false)}
									className="flex-1 sm:flex-initial h-10 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center"
								>
									Cancel
								</Button>
								<Button 
									size="sm" 
									type="submit" 
									disabled={createPaymentMutation.isPending} 
									className="flex-1 sm:flex-initial h-10 px-4 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center gap-1 shrink-0"
								>
									{createPaymentMutation.isPending ? (
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

			{/* Waive Penalty Modal */}
			{waiveOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300" onClick={() => setWaiveOpen(false)} />
					<div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="px-6 py-4.5 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white font-black text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<Percent className="h-3.5 w-3.5" />
							</div>
							Waive Payment Penalty
						</div>
						
						<form onSubmit={(e) => {
							e.preventDefault();
							waivePenaltyMutation.mutate({ id: waivingPenaltyId, reason: waverReason });
						}} className="p-6 space-y-4">
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Waiver Justification / Reason</label>
								<Input
									value={waverReason}
									onChange={(e) => setWaverReason(e.target.value)}
									required
									placeholder="Reason for waiver approval"
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
							<div className="flex justify-end gap-2.5 pt-3.5 border-t border-zinc-150/80">
								<Button 
									size="sm" 
									type="button" 
									variant="outline" 
									onClick={() => setWaiveOpen(false)}
									className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer"
								>
									Cancel
								</Button>
								<Button 
									size="sm" 
									type="submit" 
									className="h-9 px-4.5 text-xs font-black rounded-xl bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
								>
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
