"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	User,
	Building2,
	Calculator,
	Calendar,
	CheckCircle,
	ArrowRight,
	ArrowLeft,
	Search,
	Plus,
	Loader2,
	Compass,
	Percent,
	Tag,
	HelpCircle,
	AlertCircle,
	Briefcase,
	CheckCircle2
} from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

type WizardProps = {
	customers: Array<{ id: string; name: string; phone: string }>;
	advisors: Array<{ id: string; name: string }>;
};

export function CreateBookingWizard({ customers, advisors }: WizardProps) {
	const router = useRouter();
	const [step, setStep] = useState(1);

	// Step 1: Customer State
	const [custSearch, setCustSearch] = useState("");
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");
	const [newCustomerEmail, setNewCustomerEmail] = useState("");
	const [isNewCust, setIsNewCust] = useState(false);

	// Step 2: Plot State
	const [selectedPlotId, setSelectedPlotId] = useState("");
	const [selectedPlotDetails, setSelectedPlotDetails] = useState<any>(null);

	// Step 3: Booking Info
	const [salePhase, setSalePhase] = useState("token");
	const [totalSaleAmount, setTotalSaleAmount] = useState(0);
	const [downPayment, setDownPayment] = useState(0);
	const [discountAmount, setDiscountAmount] = useState(0);
	const [discountReason, setDiscountReason] = useState("");
	const [discountApprovedBy, setDiscountApprovedBy] = useState("");
	const [leadSource, setLeadSource] = useState("other");
	const [advisorId, setAdvisorId] = useState("");
	const [notes, setNotes] = useState("");

	// Step 4: EMI Plan
	const [monthlyEmi, setMonthlyEmi] = useState(0);
	const [emiDay, setEmiDay] = useState(5);
	const [emiStartDate, setEmiStartDate] = useState("");
	const [emiMonths, setEmiMonths] = useState(12);
	const [previewEmis, setPreviewEmis] = useState<any[]>([]);

	// Queries
	const { data: plots, isLoading: loadingPlots } = useQuery({
		queryKey: ["available-plots"],
		queryFn: async () => {
			const res = await fetch("/api/sales/units/available");
			if (!res.ok) throw new Error("Failed to fetch plots");
			return res.json();
		},
	});

	// Mutations
	const createBookingMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch("/api/sales/booking", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to create booking");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Plot booked successfully!");
			router.push("/sales");
			router.refresh();
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	// Filter customers
	const filteredCustomers = useMemo(() => {
		if (!custSearch) return [];
		return customers.filter(
			(c) =>
				c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
				c.phone.includes(custSearch)
		);
	}, [customers, custSearch]);

	// Set initial sale amount when plot changes
	useEffect(() => {
		if (selectedPlotDetails) {
			setTotalSaleAmount(Number(selectedPlotDetails.total_amount));
		}
	}, [selectedPlotDetails]);

	// Calculate and generate EMI schedule preview
	const calculateEmiPreview = () => {
		const netAmount = totalSaleAmount - discountAmount - downPayment;
		if (netAmount <= 0 || monthlyEmi <= 0) {
			setPreviewEmis([]);
			return;
		}

		const count = emiMonths || Math.ceil(netAmount / monthlyEmi);
		const baseStartDate = emiStartDate ? new Date(emiStartDate) : new Date();
		const list = [];

		for (let i = 1; i <= count; i++) {
			const dueDate = new Date(baseStartDate);
			dueDate.setMonth(dueDate.getMonth() + (i - 1));
			if (emiDay) {
				dueDate.setDate(Math.min(Number(emiDay), new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()));
			}

			let amount = Number(monthlyEmi);
			if (emiMonths) {
				amount = Number((netAmount / count).toFixed(2));
			} else if (i === count) {
				amount = Number((netAmount - (monthlyEmi * (count - 1))).toFixed(2));
			}

			list.push({
				number: i,
				dueDate: dueDate.toISOString().split("T")[0],
				amount,
			});
		}
		setPreviewEmis(list);
	};

	useEffect(() => {
		calculateEmiPreview();
	}, [totalSaleAmount, discountAmount, downPayment, monthlyEmi, emiDay, emiStartDate, emiMonths]);

	const handleSelectCustomer = (c: any) => {
		setSelectedCustomerId(c.id);
		setCustSearch(`${c.name} (${c.phone})`);
	};

	const handleNext = () => {
		if (step === 1 && !selectedCustomerId && !isNewCust) {
			toast.error("Please select a customer or select 'Add New Customer'");
			return;
		}
		if (step === 1 && isNewCust && (!newCustomerName || !newCustomerPhone)) {
			toast.error("Customer name and phone are required");
			return;
		}
		if (step === 2 && !selectedPlotId) {
			toast.error("Please pick a plot unit");
			return;
		}
		if (step === 3 && totalSaleAmount <= 0) {
			toast.error("Sale amount must be greater than zero");
			return;
		}
		setStep((s) => s + 1);
	};

	const handleBack = () => {
		setStep((s) => Math.max(1, s - 1));
	};

	const handleConfirm = async () => {
		let customerIdToUse = selectedCustomerId;

		if (isNewCust) {
			const res = await fetch("/api/enquiries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newCustomerName,
					phone: newCustomerPhone,
					email_id: newCustomerEmail,
					category: "Booking",
					business_id: "resolve",
				}),
			});
			if (!res.ok) {
				const err = await res.json();
				toast.error(`Customer registration failed: ${err.error}`);
				return;
			}
			const newLead = await res.json();
			customerIdToUse = newLead.id;
		}

		createBookingMutation.mutate({
			plot_id: selectedPlotId,
			customer_id: customerIdToUse,
			advisor_id: advisorId || advisors[0]?.id,
			sale_phase: salePhase,
			token_date: new Date().toISOString().split("T")[0],
			total_sale_amount: Number(totalSaleAmount),
			discount_amount: Number(discountAmount),
			discount_reason: discountReason,
			discount_approved_by: discountApprovedBy || null,
			down_payment: Number(downPayment),
			monthly_emi: Number(monthlyEmi),
			emi_day: Number(emiDay),
			lead_source: leadSource,
			notes,
			generate_emi: true,
			emi_start_date: emiStartDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
			emi_months: Number(emiMonths),
		});
	};

	return (
		<div className="max-w-3xl w-full bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden flex flex-col min-h-[520px] transition-all duration-300">
			{/* High-End Wizard Steps Indicator */}
			<div className="bg-zinc-50 border-b border-zinc-200/80 px-6 py-4.5 flex flex-wrap justify-between items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
				{(
					[
						[1, "Customer"],
						[2, "Select Unit"],
						[3, "Booking Details"],
						[4, "Dues Planner"],
						[5, "Confirm"]
					] as const
				).map(([stepNum, label], idx) => {
					const isActive = step >= stepNum;
					const isCurrent = step === stepNum;
					return (
						<div key={stepNum} className="flex items-center gap-2">
							<div className="flex items-center gap-1.5">
								<span className={cn(
									"h-6 w-6 rounded-full flex items-center justify-center font-black border transition-all duration-300 shadow-2xs text-[10px]",
									isActive 
										? stepNum === 5 
											? "bg-emerald-600 border-emerald-600 text-white" 
											: "bg-zinc-800 border-zinc-800 text-white" 
										: "border-zinc-200 bg-white text-zinc-400"
								)}>
									{stepNum}
								</span> 
								<span className={cn(
									"font-black tracking-wider transition-colors duration-250",
									isCurrent 
										? stepNum === 5 
											? "text-emerald-700" 
											: "text-zinc-800 font-black" 
										: isActive 
											? "text-zinc-500 font-semibold" 
											: "text-zinc-400 font-medium"
								)}>
									{label}
								</span>
							</div>
							{idx < 4 && <ArrowRight className="h-3.5 w-3.5 text-zinc-300 hidden md:block" />}
						</div>
					);
				})}
			</div>

			{/* Step Content Area */}
			<div className="flex-1 p-6 sm:p-7 overflow-y-auto">
				{/* Step 1: Select Customer */}
				{step === 1 && (
					<div className="space-y-5">
						<div className="pb-1">
							<h3 className="text-xs font-black text-zinc-450 uppercase tracking-wider">Step 1: Customer Selection</h3>
							<p className="text-[11px] text-zinc-400 font-medium mt-1">Locate existing record details or create a fast client profile.</p>
						</div>

						{/* Custom Radix style Segment selection buttons */}
						<div className="bg-zinc-100/80 p-1 rounded-xl flex gap-1 border border-zinc-200/40 w-fit">
							<button
								type="button"
								onClick={() => setIsNewCust(false)}
								className={cn(
									"px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer",
									!isNewCust
										? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
										: "text-zinc-500 hover:text-zinc-700"
								)}
							>
								Search Existing
							</button>
							<button
								type="button"
								onClick={() => setIsNewCust(true)}
								className={cn(
									"px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer",
									isNewCust
										? "bg-white text-teal-700 shadow-2xs border border-zinc-200/50"
										: "text-zinc-500 hover:text-zinc-700"
								)}
							>
								Create Fast Lead
							</button>
						</div>

						{!isNewCust ? (
							<div className="relative space-y-3">
								<div className="relative">
									<Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
									<Input
										value={custSearch}
										onChange={(e) => {
											setCustSearch(e.target.value);
											setSelectedCustomerId("");
										}}
										style={{ paddingLeft: "2.6rem" }}
										placeholder="Search customer by name or phone..."
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
									/>
								</div>
								
								{filteredCustomers.length > 0 && !selectedCustomerId && (
									<div className="absolute z-20 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1 border-t-0 p-1.5 space-y-0.5">
										{filteredCustomers.map((c) => (
											<div
												key={c.id}
												onClick={() => handleSelectCustomer(c)}
												className="px-3.5 py-2.5 text-xs font-semibold rounded-lg hover:bg-zinc-50 hover:text-teal-750 cursor-pointer flex justify-between items-center transition-colors"
											>
												<span className="font-bold text-zinc-750">{c.name}</span>
												<span className="text-zinc-400 font-mono text-[11px]">{c.phone}</span>
											</div>
										))}
									</div>
								)}

								{selectedCustomerId && (
									<div className="bg-emerald-50 text-emerald-800 border border-emerald-100/50 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
										<CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
										<span>Customer linked successfully! Press Next to proceed.</span>
									</div>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Full Name</label>
									<Input
										value={newCustomerName}
										onChange={(e) => setNewCustomerName(e.target.value)}
										placeholder="e.g. Rahul Sharma"
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Phone</label>
									<Input
										value={newCustomerPhone}
										onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, ""))}
										placeholder="10-Digit Mobile"
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
										maxLength={10}
									/>
								</div>
								<div className="space-y-1.5 sm:col-span-2">
									<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Email (Optional)</label>
									<Input
										value={newCustomerEmail}
										onChange={(e) => setNewCustomerEmail(e.target.value)}
										placeholder="customer@email.com"
										className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									/>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Step 2: Select Unit */}
				{step === 2 && (
					<div className="space-y-5">
						<div className="pb-1">
							<h3 className="text-xs font-black text-zinc-450 uppercase tracking-wider">Step 2: Choose Unit</h3>
							<p className="text-[11px] text-zinc-400 font-medium mt-1">Select available real estate plots from your central inventory.</p>
						</div>

						{loadingPlots ? (
							<div className="flex flex-col justify-center items-center py-16 space-y-2">
								<Loader2 className="h-7 w-7 animate-spin text-teal-650" />
								<span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Loading Units...</span>
							</div>
						) : !plots || plots.length === 0 ? (
							<div className="border border-dashed border-zinc-200 rounded-2xl p-12 text-center bg-white">
								<Building2 className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
								<p className="text-xs font-bold text-zinc-650">No available plots found</p>
								<p className="text-[11px] text-zinc-400 mt-1">All plots in the system are currently booked or sold.</p>
							</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
								{plots.map((p: any) => {
									const isSelected = selectedPlotId === p.id;
									return (
										<div
											key={p.id}
											onClick={() => {
												setSelectedPlotId(p.id);
												setSelectedPlotDetails(p);
											}}
											className={cn(
												"p-4 rounded-2xl border-2 text-center cursor-pointer transition-all duration-350 relative shadow-2xs hover:shadow-xs",
												isSelected
													? "border-teal-600 bg-teal-50/10 scale-98 ring-4 ring-teal-500/8"
													: "border-zinc-150 bg-white hover:border-zinc-300"
											)}
										>
											{/* Selected Glow badge icon */}
											{isSelected && (
												<span className="absolute top-2 right-2 text-teal-600 text-xs">
													<CheckCircle2 className="h-4.5 w-4.5 fill-teal-50 text-white border-teal-600" />
												</span>
											)}

											<div className={cn(
												"h-9 w-9 rounded-xl flex items-center justify-center mx-auto mb-2.5 border shadow-2xs transition-colors",
												isSelected ? "bg-teal-50 border-teal-100 text-teal-600" : "bg-zinc-50 border-zinc-100 text-zinc-450"
											)}>
												<Building2 className="h-4.5 w-4.5" />
											</div>
											<p className="text-xs font-black text-zinc-800">{p.plot_number}</p>
											<p className="text-[10px] text-zinc-400 font-bold tracking-tight truncate mt-0.5">{p.project_name}</p>
											<p className="text-xs text-teal-700 font-black font-mono mt-2">{formatCurrency(p.total_amount)}</p>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Step 3: Booking Details */}
				{step === 3 && (
					<div className="space-y-5">
						<div className="pb-1">
							<h3 className="text-xs font-black text-zinc-450 uppercase tracking-wider">Step 3: Booking Ledger Details</h3>
							<p className="text-[11px] text-zinc-400 font-medium mt-1">Specify financial parameters, commission, and lead metadata details.</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Total Sale Amount (₹)</label>
								<Input
									type="number"
									value={totalSaleAmount}
									onChange={(e) => setTotalSaleAmount(Number(e.target.value))}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>
							
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Down Payment (Token) (₹)</label>
								<Input
									type="number"
									value={downPayment}
									onChange={(e) => setDownPayment(Number(e.target.value))}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Discount Amount (₹)</label>
								<Input
									type="number"
									value={discountAmount}
									onChange={(e) => setDiscountAmount(Number(e.target.value))}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Lead Source</label>
								<select
									value={leadSource}
									onChange={(e) => setLeadSource(e.target.value)}
									className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
								>
									<option value="website">Website</option>
									<option value="referral">Referral</option>
									<option value="social_media">Social Media</option>
									<option value="walk_in">Walk In</option>
									<option value="phone_call">Phone Call</option>
									<option value="advisor">Advisor</option>
									<option value="other">Other</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Sale Phase</label>
								<select
									value={salePhase}
									onChange={(e) => setSalePhase(e.target.value)}
									className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
								>
									<option value="token">Token</option>
									<option value="agreement">Agreement</option>
									<option value="registry">Registry</option>
									<option value="full_payment">Full Payment</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Assigned Advisor</label>
								<select
									value={advisorId}
									onChange={(e) => setAdvisorId(e.target.value)}
									className="text-xs h-10 border border-zinc-200 bg-white rounded-xl px-3 w-full font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all"
								>
									<option value="">Select Advisor</option>
									{advisors.map((a) => (
										<option key={a.id} value={a.id}>
											{a.name}
										</option>
									))}
								</select>
							</div>

							{discountAmount > 0 && (
								<div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-amber-50/20 border border-amber-100/50 p-4.5 rounded-2xl shadow-2xs">
									<div className="space-y-1.5">
										<label className="text-[9px] uppercase font-black text-amber-800 tracking-wider">Discount Approved By (Admin ID)</label>
										<Input
											value={discountApprovedBy}
											onChange={(e) => setDiscountApprovedBy(e.target.value)}
											placeholder="Admin UUID"
											className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="text-[9px] uppercase font-black text-amber-800 tracking-wider">Approved Discount Reason</label>
										<Input
											value={discountReason}
											onChange={(e) => setDiscountReason(e.target.value)}
											placeholder="Special price approval"
											className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
										/>
									</div>
								</div>
							)}

							<div className="sm:col-span-2 space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-400 tracking-wider">Notes & Remarks</label>
								<Textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Add specific notes related to plot deal allocation..."
									rows={2}
									className="text-xs font-semibold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Step 4: Dues Planner */}
				{step === 4 && (
					<div className="space-y-5">
						<div className="pb-1">
							<h3 className="text-xs font-black text-zinc-450 uppercase tracking-wider">Step 4: Installment Dues Planner</h3>
							<p className="text-[11px] text-zinc-400 font-medium mt-1">Configure installment counts, monthly pricing values, and cycle days.</p>
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 border border-zinc-150 p-4.5 rounded-2xl shadow-2xs">
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Total Installments</label>
								<Input
									type="number"
									value={emiMonths}
									onChange={(e) => setEmiMonths(Number(e.target.value))}
									className="h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>
							
							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-455 tracking-wider">Monthly Amount</label>
								<Input
									type="number"
									value={monthlyEmi}
									onChange={(e) => setMonthlyEmi(Number(e.target.value))}
									className="h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									disabled={!!emiMonths}
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Collection Day</label>
								<Input
									type="number"
									value={emiDay}
									onChange={(e) => setEmiDay(Number(e.target.value))}
									className="h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
									max={31}
									min={1}
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">EMI Start Date</label>
								<Input
									type="date"
									value={emiStartDate}
									onChange={(e) => setEmiStartDate(e.target.value)}
									className="h-9.5 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
							</div>
						</div>

						{/* Preview EMI table */}
						{previewEmis.length > 0 && (
							<div className="space-y-2.5 pt-2">
								<h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Installments Schedule Preview</h4>
								<div className="max-h-52 overflow-y-auto border border-zinc-200/80 rounded-xl shadow-2xs">
									<table className="w-full text-xs text-zinc-700">
										<thead className="bg-zinc-50/80 border-b border-zinc-150 text-[9px] uppercase font-black text-zinc-450 sticky top-0 backdrop-blur-sm">
											<tr>
												<th className="px-3.5 py-3 text-left">EMI #</th>
												<th className="px-3.5 py-3 text-left">Due Date</th>
												<th className="px-3.5 py-3 text-right pr-4">Amount</th>
											</tr>
										</thead>
										<tbody>
											{previewEmis.map((emi) => (
												<tr key={emi.number} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
													<td className="px-3.5 py-2.5 font-bold text-zinc-800">EMI {emi.number}</td>
													<td className="px-3.5 py-2.5 font-semibold text-zinc-500">{emi.dueDate}</td>
													<td className="px-3.5 py-2.5 text-right font-black font-mono text-zinc-900 pr-4">{formatCurrency(emi.amount)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Step 5: Review & Confirm */}
				{step === 5 && (
					<div className="space-y-5">
						<div className="pb-1">
							<h3 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
								<CheckCircle className="h-5 w-5" /> Step 5: Review and Confirm Booking
							</h3>
							<p className="text-[11px] text-zinc-400 font-medium mt-1">Review critical client and plot settlement attributes before creating records.</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-zinc-200/80 p-5 rounded-2xl bg-zinc-50 shadow-2xs text-xs">
							<div className="space-y-1">
								<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Customer Profile</p>
								<p className="font-black text-zinc-850 text-sm">
									{isNewCust ? newCustomerName : custSearch.split(" (")[0]}
								</p>
								<p className="font-bold font-mono text-zinc-450">
									{isNewCust ? newCustomerPhone : customers.find((c) => c.id === selectedCustomerId)?.phone}
								</p>
							</div>
							
							<div className="space-y-1">
								<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Unit details</p>
								<p className="font-black text-zinc-850 text-sm">Plot {selectedPlotDetails?.plot_number}</p>
								<p className="font-bold text-zinc-450 leading-tight">{selectedPlotDetails?.project_name}</p>
							</div>
							
							<div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-4.5">
								<div className="space-y-0.5">
									<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Agreement Price</p>
									<p className="font-black text-zinc-800 text-sm font-mono">{formatCurrency(totalSaleAmount)}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Down Payment</p>
									<p className="font-black text-zinc-800 text-sm font-mono">{formatCurrency(downPayment)}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Remaining Dues</p>
									<p className="font-black text-emerald-600 text-sm font-mono">
										{formatCurrency(totalSaleAmount - discountAmount - downPayment)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Footer Navigation Panel */}
			<div className="bg-zinc-50 border-t border-zinc-200/80 px-6 py-4 flex justify-between items-center">
				<Button
					variant="outline"
					size="sm"
					onClick={handleBack}
					disabled={step === 1}
					className="h-9 px-4 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
				>
					<ArrowLeft className="h-4 w-4" /> Back
				</Button>

				{step < 5 ? (
					<Button
						size="sm"
						onClick={handleNext}
						className="h-9 px-4.5 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white active:scale-[0.98] flex items-center gap-1"
					>
						Next <ArrowRight className="h-4 w-4" />
					</Button>
				) : (
					<Button
						size="sm"
						onClick={handleConfirm}
						disabled={createBookingMutation.isPending}
						className="h-9 px-5 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)] active:scale-[0.98] flex items-center gap-1"
					>
						{createBookingMutation.isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" /> Booking Plot...
							</>
						) : (
							"Book & Confirm Dues"
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
