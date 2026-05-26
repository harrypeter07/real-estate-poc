"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	MessageSquare,
	Phone,
	Search,
	User,
	Loader2,
	Plus,
	X,
} from "lucide-react";
import { Button, Input, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

type Props = {
	advisors: Array<{ id: string; name: string }>;
};

export function DuePaymentsClient({ advisors }: Props) {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState("all"); // all, 1_emi_overdue, 3_emi_overdue, high_risk, due_today, due_this_week

	// Drawer State
	const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
	const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

	// Log Follow-Up Modal State
	const [followUpOpen, setFollowUpOpen] = useState(false);
	const [targetReminderId, setTargetReminderId] = useState("");
	const [fuNotes, setFuNotes] = useState("");
	const [nextReminderDate, setNextReminderDate] = useState("");
	const [assignedTo, setAssignedTo] = useState("");

	// Add Payment Modal State
	const [payOpen, setPayOpen] = useState(false);
	const [paySaleId, setPaySaleId] = useState("");
	const [payAmount, setPayAmount] = useState(0);
	const [payMode, setPayMode] = useState("cash");
	const [paySlip, setPaySlip] = useState("");
	const [payNotes, setPayNotes] = useState("");

	// Queries
	const { data: dashboardList, isLoading: loadingList, refetch: refetchList } = useQuery({
		queryKey: ["dues-dashboard", activeFilter, search],
		queryFn: async () => {
			let url = "/api/due-payments/dashboard";
			const params = new URLSearchParams();
			if (search) params.append("search", search);

			// Map active filter to query params
			if (activeFilter === "high_risk") {
				params.append("risk_level", "critical");
			} else if (activeFilter === "1_emi_overdue") {
				params.append("overdue_count_filter", "1");
			} else if (activeFilter === "3_emi_overdue") {
				params.append("overdue_count_filter", "3+");
			}

			if (activeFilter === "due_today" || activeFilter === "due_this_week") {
				// Use filter endpoint directly
				url = `/api/due-payments/filters?filter_type=${activeFilter}`;
			} else {
				url = `/api/due-payments/dashboard?${params.toString()}`;
			}

			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to fetch dues dashboard");
			return res.json();
		},
	});

	const { data: summary } = useQuery({
		queryKey: ["dues-summary"],
		queryFn: async () => {
			const res = await fetch("/api/due-payments/summary");
			if (!res.ok) throw new Error("Failed to fetch dues summary");
			return res.json();
		},
	});

	const { data: customerDetail, refetch: refetchDetail } = useQuery({
		queryKey: ["dues-customer-detail", selectedCustId],
		queryFn: async () => {
			if (!selectedCustId) return null;
			const res = await fetch(`/api/due-payments/${selectedCustId}/detail`);
			if (!res.ok) throw new Error("Failed to fetch customer detail");
			return res.json();
		},
		enabled: !!selectedCustId,
	});

	// Mutations
	const logFollowUpMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch(`/api/due-payments/${targetReminderId}/follow-up`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to log follow-up");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Recovery action logged!");
			setFollowUpOpen(false);
			setFuNotes("");
			setNextReminderDate("");
			refetchList();
			if (selectedCustId) refetchDetail();
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const recordPaymentMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to log payment");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Installment payment recorded successfully!");
			setPayOpen(false);
			setPayAmount(0);
			setPayNotes("");
			setPaySlip("");
			refetchList();
			queryClient.invalidateQueries({ queryKey: ["dues-summary"] });
			if (selectedCustId) refetchDetail();
		},
	});

	const handleLogFollowUpSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		logFollowUpMutation.mutate({
			notes: fuNotes,
			next_reminder_date: nextReminderDate || null,
			assigned_to: assignedTo || null,
		});
	};

	const handleRecordPaymentSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		recordPaymentMutation.mutate({
			sale_id: paySaleId,
			customer_id: selectedCustId,
			amount: payAmount,
			payment_date: new Date().toISOString().split("T")[0],
			payment_mode: payMode,
			slip_number: paySlip || null,
			notes: payNotes,
		});
	};

	const handleRowClick = (cust: any) => {
		setSelectedCustId(cust.customer_id);
		setDetailDrawerOpen(true);
	};

	const handleActionFollowUp = (e: React.MouseEvent, item: any) => {
		e.stopPropagation();
		// Resolve the active reminder ID or create default
		const rId = item.id || "resolve";
		setTargetReminderId(rId);
		setFollowUpOpen(true);
	};

	const handleActionPayment = (e: React.MouseEvent, item: any) => {
		e.stopPropagation();
		setSelectedCustId(item.customer_id);
		setPaySaleId(item.sale_id);
		setPayAmount(item.total_overdue_amount);
		setPayOpen(true);
	};

	const list = dashboardList || [];

	return (
		<div className="space-y-6">
			{/* Summary stats row */}
			<div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
				<Card className="bg-white border-zinc-100 shadow-sm border-l-4 border-l-zinc-500">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Overdue Clients</p>
						<p className="text-xl font-bold text-zinc-800">{summary?.total_overdue_customers || 0}</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm border-l-4 border-l-red-500">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">Total Overdue Dues</p>
						<p className="text-xl font-bold text-red-600">{formatCurrency(summary?.total_overdue_amount || 0)}</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm border-l-4 border-l-red-400">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">🔴 Critical (&gt;90d / 3+ EMIs)</p>
						<p className="text-xl font-bold text-red-700">{summary?.critical_count || 0}</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm border-l-4 border-l-orange-400">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">🟠 Delayed (30-90d / 1-2 EMIs)</p>
						<p className="text-xl font-bold text-orange-700">{summary?.delayed_count || 0}</p>
					</CardContent>
				</Card>
				<Card className="bg-white border-zinc-100 shadow-sm border-l-4 border-l-yellow-400">
					<CardContent className="p-4">
						<p className="text-[10px] text-zinc-400 font-bold uppercase">🟡 Upcoming (&lt;7 days)</p>
						<p className="text-xl font-bold text-yellow-700">{summary?.upcoming_count || 0}</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters & Search */}
			<div className="flex flex-wrap gap-3 justify-between items-center bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
				<div className="flex flex-wrap gap-1">
					{[
						{ value: "all", label: "All Dues" },
						{ value: "1_emi_overdue", label: "1 EMI Overdue" },
						{ value: "3_emi_overdue", label: "3+ EMIs Overdue" },
						{ value: "high_risk", label: "High Risk (Critical)" },
						{ value: "due_today", label: "Due Today" },
						{ value: "due_this_week", label: "Due This Week" },
					].map((f) => (
						<button
							key={f.value}
							onClick={() => setActiveFilter(f.value)}
							className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
								activeFilter === f.value
									? "bg-zinc-900 border-zinc-900 text-white"
									: "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>

				<div className="relative w-64">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search customer name..."
						className="pl-9 h-9 text-xs border-zinc-200 bg-white"
					/>
				</div>
			</div>

			{/* Dues Table */}
			<Card className="border-zinc-100 bg-white">
				<CardContent className="p-0 overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Customer</TableHead>
								<TableHead>Plot Number</TableHead>
								<TableHead className="text-center">Overdue count</TableHead>
								<TableHead className="text-right">Total Overdue Amount</TableHead>
								<TableHead className="text-center">Max Overdue Days</TableHead>
								<TableHead>Risk Category</TableHead>
								<TableHead>Next Due Date</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loadingList ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-zinc-400 mx-auto" />
									</TableCell>
								</TableRow>
							) : list.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center text-zinc-400 py-8">
										No overdue accounts found matching criteria.
									</TableCell>
								</TableRow>
							) : (
								list.map((item: any) => {
									let rowStyle = "";
									let riskBadge = "bg-zinc-50 text-zinc-600 border-zinc-200";
									if (item.risk_level === "critical") {
										rowStyle = "border-l-4 border-l-red-500 bg-red-50/10";
										riskBadge = "bg-red-50 text-red-700 border-red-200";
									} else if (item.risk_level === "delayed") {
										rowStyle = "border-l-4 border-l-orange-400 bg-orange-50/10";
										riskBadge = "bg-orange-50 text-orange-700 border-orange-200";
									} else if (item.risk_level === "upcoming") {
										rowStyle = "border-l-4 border-l-yellow-400 bg-yellow-50/10";
										riskBadge = "bg-yellow-50 text-yellow-800 border-yellow-200";
									}

									return (
										<TableRow
											key={item.sale_id}
											className={`hover:bg-zinc-50 cursor-pointer ${rowStyle}`}
											onClick={() => handleRowClick(item)}
										>
											<td className="px-4 py-3">
												<div className="font-semibold text-xs text-zinc-800">{item.customer_name}</div>
												<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.customer_phone}</div>
											</td>
											<td className="px-4 py-3 text-xs text-zinc-700">
												Plot {item.plot_number} <span className="text-[10px] text-zinc-400 block">{item.project_name}</span>
											</td>
											<td className="px-4 py-3 text-center text-xs">
												<Badge variant="outline" className="font-mono">
													{item.overdue_emi_count} EMIs
												</Badge>
											</td>
											<td className="px-4 py-3 text-right text-xs font-mono font-bold text-red-600">
												{formatCurrency(item.total_overdue_amount)}
											</td>
											<td className="px-4 py-3 text-center text-xs font-mono font-semibold text-zinc-700">
												{item.max_overdue_days} days
											</td>
											<td className="px-4 py-3 text-xs">
												<Badge variant="outline" className={`font-normal uppercase ${riskBadge}`}>
													{item.risk_level}
												</Badge>
											</td>
											<td className="px-4 py-3 text-xs font-mono text-zinc-500">{item.next_due_date || "—"}</td>
											<td className="px-4 py-3 text-right flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
												<Button size="xs" variant="outline" onClick={(e) => handleActionFollowUp(e, item)}>
													Log Call
												</Button>
												<Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={(e) => handleActionPayment(e, item)}>
													Pay Dues
												</Button>
											</td>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Customer Dues Detail Drawer */}
			{detailDrawerOpen && customerDetail && (
				<div className="fixed inset-0 z-50 overflow-hidden">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailDrawerOpen(false)} />
					<div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col h-full border-l border-zinc-200">
						<div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
							<div>
								<h2 className="text-sm font-bold text-zinc-900">{customerDetail.customer?.name}</h2>
								<p className="text-[11px] font-mono text-zinc-500">{customerDetail.customer?.phone}</p>
							</div>
							<button className="p-1 rounded-full hover:bg-zinc-200 text-zinc-500" onClick={() => setDetailDrawerOpen(false)}>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-5 space-y-6">
							{/* Financial balances */}
							<div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100 space-y-2 text-xs">
								<h3 className="font-bold text-[10px] text-zinc-400 uppercase">Recovery Status</h3>
								{customerDetail.sales?.map((s: any) => (
									<div key={s.id} className="flex justify-between items-center py-1">
										<span>Plot {s.plot_number} Dues:</span>
										<span className="font-bold text-red-600 font-mono">{formatCurrency(s.remaining_amount)}</span>
									</div>
								))}
							</div>

							{/* EMI checklist */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold text-zinc-500 uppercase">Installments schedule</h4>
								<div className="border border-zinc-100 rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
									<table className="w-full text-xs">
										<thead className="bg-zinc-50 border-b border-zinc-100 font-semibold text-zinc-600">
											<tr>
												<th className="px-3 py-1.5 text-left">EMI #</th>
												<th className="px-3 py-1.5 text-left">Due Date</th>
												<th className="px-3 py-1.5 text-right">Remaining</th>
												<th className="px-3 py-1.5 text-center">Status</th>
											</tr>
										</thead>
										<tbody>
											{customerDetail.emi_schedule?.map((emi: any) => (
												<tr key={emi.id} className="border-b border-zinc-50">
													<td className="px-3 py-2 font-mono">EMI {emi.emi_number}</td>
													<td className="px-3 py-2 text-zinc-500">{emi.due_date}</td>
													<td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(emi.remaining_amount)}</td>
													<td className="px-3 py-2 text-center">
														<span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
															emi.status === "paid" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
														}`}>
															{emi.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Penalties list */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold text-zinc-500 uppercase">Outstanding Penalties</h4>
								{customerDetail.penalties?.length === 0 ? (
									<p className="text-xs text-zinc-400 italic">No outstanding penalties.</p>
								) : (
									<div className="space-y-2">
										{customerDetail.penalties?.map((p: any) => (
											<div key={p.id} className="border border-red-100 bg-red-50/10 rounded p-2.5 text-xs flex justify-between items-center">
												<div>
													<p className="font-semibold text-zinc-800 capitalize">{p.penalty_type.replace(/_/g, " ")}</p>
													<p className="text-[10px] text-zinc-400 font-mono mt-0.5">EMI {p.emi_number || "General"} • {p.penalty_date}</p>
												</div>
												<span className="font-bold text-red-600 font-mono">{formatCurrency(p.penalty_amount)}</span>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Follow-up reminder timeline */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold text-zinc-500 uppercase">Recovery logs timeline</h4>
								{customerDetail.reminders?.length === 0 ? (
									<p className="text-xs text-zinc-400 italic">No logs recorded yet.</p>
								) : (
									<div className="relative pl-3 border-l border-zinc-200 space-y-3 text-xs">
										{customerDetail.reminders?.map((r: any) => (
											<div key={r.id} className="relative space-y-0.5">
												<div className="absolute -left-[16px] top-1 h-2 w-2 rounded-full bg-zinc-400 border border-white" />
												<div className="flex justify-between items-center text-[10px] text-zinc-400">
													<span>Count: {r.reminder_count} reminders</span>
													<span>{r.last_reminder_sent ? String(r.last_reminder_sent).slice(0, 10) : ""}</span>
												</div>
												<p className="font-medium text-zinc-700">Follow-up Notes: "{r.resolution_notes || "none"}"</p>
												<p className="text-[9px] text-zinc-400">Assigned To: {r.assigned_to_name}</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Log Follow-Up Modal */}
			{followUpOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFollowUpOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 font-bold text-zinc-800 text-sm">
							Log Recovery Call
						</div>
						<form onSubmit={handleLogFollowUpSubmit} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Follow-up details / Conversation notes</label>
								<Textarea
									value={fuNotes}
									onChange={(e) => setFuNotes(e.target.value)}
									required
									placeholder="e.g. Promised payment by next Friday"
									rows={3}
									className="text-xs border-zinc-200"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Next reminder date</label>
									<Input
										type="date"
										value={nextReminderDate}
										onChange={(e) => setNextReminderDate(e.target.value)}
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Assign To Agent</label>
									<select
										value={assignedTo}
										onChange={(e) => setAssignedTo(e.target.value)}
										className="text-xs h-9 border border-zinc-200 rounded px-2 w-full"
									>
										<option value="">Choose Agent</option>
										{advisors.map((a) => (
											<option key={a.id} value={a.id}>
												{a.name}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setFollowUpOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" disabled={logFollowUpMutation.isPending} className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold">
									{logFollowUpMutation.isPending ? "Logging..." : "Log Action"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Record Payment Modal */}
			{payOpen && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayOpen(false)} />
					<div className="bg-white rounded-lg shadow-xl border border-zinc-200 max-w-sm w-full z-10 overflow-hidden">
						<div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50 font-bold text-zinc-800 text-sm">
							Log Recovery Payment
						</div>
						<form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4">
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Amount (₹)</label>
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
								<div className="space-y-1">
									<label className="text-[10px] uppercase font-bold text-zinc-400">Slip Number</label>
									<Input
										value={paySlip}
										onChange={(e) => setPaySlip(e.target.value)}
										placeholder="Optional"
										className="h-9 text-xs border-zinc-200"
									/>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-400">Remarks</label>
								<Input
									value={payNotes}
									onChange={(e) => setPayNotes(e.target.value)}
									placeholder="Payment remarks"
									className="h-9 text-xs border-zinc-200"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
								<Button size="sm" type="button" variant="outline" onClick={() => setPayOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" disabled={recordPaymentMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
									{recordPaymentMutation.isPending ? "Logging..." : "Confirm Payment"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
