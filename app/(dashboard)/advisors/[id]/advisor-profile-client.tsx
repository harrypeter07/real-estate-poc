"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	User as UserIcon,
	Phone,
	MapPin,
	Handshake,
	IndianRupee,
	TrendingUp,
	Clock,
	Pencil,
	Plus,
	Trash2,
	Check,
	X,
	Upload,
	Download,
	FileText,
	ArrowRight,
	Calendar,
	Loader2,
	ShieldAlert,
	Lock,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	Button,
	Badge,
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
	Input,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { AdvisorForm } from "@/components/advisors/advisor-form";

interface AdvisorProfileClientProps {
	advisorId: string;
	businessId: string;
	initialAdvisor: any;
	parentOptions: any[];
	projectsOptions: any[];
}

export function AdvisorProfileClient({
	advisorId,
	businessId,
	initialAdvisor,
	parentOptions,
	projectsOptions,
}: AdvisorProfileClientProps) {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState("personal-details");

	// Modals States
	const [editProfileOpen, setEditProfileOpen] = useState(false);
	const [assignProjectOpen, setAssignProjectOpen] = useState(false);
	const [uploadKycOpen, setUploadKycOpen] = useState(false);
	const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
	const [addRecoveryOpen, setAddRecoveryOpen] = useState(false);
	const [updateRecoveryOpen, setUpdateRecoveryOpen] = useState(false);

	// Active Item States for Modals
	const [activeCommissionId, setActiveCommissionId] = useState<string | null>(null);
	const [activeRecovery, setActiveRecovery] = useState<any | null>(null);

	// Filter States
	const [salesStatus, setSalesStatus] = useState("all");
	const [salesDateFrom, setSalesDateFrom] = useState("");
	const [salesDateTo, setSalesDateTo] = useState("");
	const [salesPage, setSalesPage] = useState(1);

	const [recoveryStatus, setRecoveryStatus] = useState("all");
	const [recoveryDateFrom, setRecoveryDateFrom] = useState("");
	const [recoveryDateTo, setRecoveryDateTo] = useState("");

	// Forms Loading States
	const [savingProject, setSavingProject] = useState(false);
	const [savingPayment, setSavingPayment] = useState(false);
	const [savingRecovery, setSavingRecovery] = useState(false);
	const [updatingRecovery, setUpdatingRecovery] = useState(false);
	const [uploadingKyc, setUploadingKyc] = useState(false);
	const [savingGlobalComms, setSavingGlobalComms] = useState(false);

	// Queries
	const { data: advisor, refetch: refetchAdvisor } = useQuery({
		queryKey: ["advisors", advisorId],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/commission-settings`);
			if (!res.ok) throw new Error("Failed to load settings");
			// To keep it simple, we also load advisor details
			const detailsRes = await fetch(`/api/advisors/${advisorId}/sales/summary?business_id=${businessId}`);
			const details = await detailsRes.json();
			return {
				...initialAdvisor,
				salesSummary: details,
			};
		},
		initialData: {
			...initialAdvisor,
			salesSummary: {
				total_sales: 0,
				total_commission_earned: 0,
				commission_paid: 0,
				commission_pending: 0,
				active_customers: 0,
			},
		},
	});

	const { data: projectsData, isLoading: loadingProjects } = useQuery({
		queryKey: ["advisors", advisorId, "projects"],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/projects`);
			if (!res.ok) throw new Error("Failed to load projects");
			return res.json();
		},
	});

	const { data: kycData, isLoading: loadingKyc } = useQuery({
		queryKey: ["advisors", advisorId, "kyc"],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/kyc?business_id=${businessId}`);
			if (!res.ok) throw new Error("Failed to load KYC");
			return res.json();
		},
	});

	const { data: commissionSettings, isLoading: loadingSettings } = useQuery({
		queryKey: ["advisors", advisorId, "commission-settings"],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/commission-settings`);
			if (!res.ok) throw new Error("Failed to load settings");
			return res.json();
		},
	});

	const { data: salesData, isLoading: loadingSales } = useQuery({
		queryKey: ["advisors", advisorId, "sales", salesPage, salesStatus, salesDateFrom, salesDateTo],
		queryFn: async () => {
			let url = `/api/advisors/${advisorId}/sales?business_id=${businessId}&page=${salesPage}&limit=10`;
			if (salesStatus !== "all") url += `&status=${salesStatus}`;
			if (salesDateFrom) url += `&date_from=${salesDateFrom}`;
			if (salesDateTo) url += `&date_to=${salesDateTo}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load sales");
			return res.json();
		},
	});

	const { data: salesSummary } = useQuery({
		queryKey: ["advisors", advisorId, "sales-summary"],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/sales/summary?business_id=${businessId}`);
			if (!res.ok) throw new Error("Failed to load summary");
			return res.json();
		},
	});

	const { data: recoveryData, isLoading: loadingRecovery } = useQuery({
		queryKey: ["advisors", advisorId, "recovery", recoveryStatus, recoveryDateFrom, recoveryDateTo],
		queryFn: async () => {
			let url = `/api/advisors/${advisorId}/recovery?business_id=${businessId}`;
			if (recoveryStatus !== "all") url += `&status=${recoveryStatus}`;
			if (recoveryDateFrom) url += `&date_from=${recoveryDateFrom}`;
			if (recoveryDateTo) url += `&date_to=${recoveryDateTo}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to load recovery");
			return res.json();
		},
	});

	const { data: recoverySummary } = useQuery({
		queryKey: ["advisors", advisorId, "recovery-summary"],
		queryFn: async () => {
			const res = await fetch(`/api/advisors/${advisorId}/recovery/summary?business_id=${businessId}`);
			if (!res.ok) throw new Error("Failed to load recovery summary");
			return res.json();
		},
	});

	// Personal Details Edit Success
	const handleEditProfileSuccess = () => {
		setEditProfileOpen(false);
		refetchAdvisor();
		queryClient.invalidateQueries({ queryKey: ["advisors", advisorId] });
		toast.success("Profile updated successfully");
	};

	// Actions implementations
	const handleAssignProject = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSavingProject(true);
		const form = e.currentTarget;
		const formData = new FormData(form);

		const projectId = formData.get("project_id") as string;
		const token = formData.get("commission_token") as string;
		const agreement = formData.get("commission_agreement") as string;
		const registry = formData.get("commission_registry") as string;
		const fullPayment = formData.get("commission_full_payment") as string;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/projects`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					project_id: projectId,
					commission_token: token,
					commission_agreement: agreement,
					commission_registry: registry,
					commission_full_payment: fullPayment,
					business_id: businessId,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to assign project");
			}

			toast.success("Project assigned successfully");
			setAssignProjectOpen(false);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "projects"] });
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "commission-settings"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setSavingProject(false);
		}
	};

	const handleUpdateGlobalSettings = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSavingGlobalComms(true);
		const form = e.currentTarget;
		const formData = new FormData(form);

		const token = formData.get("commission_token") as string;
		const agreement = formData.get("commission_agreement") as string;
		const registry = formData.get("commission_registry") as string;
		const fullPayment = formData.get("commission_full_payment") as string;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/commission-settings`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					commission_token: token,
					commission_agreement: agreement,
					commission_registry: registry,
					commission_full_payment: fullPayment,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to update settings");
			}

			toast.success("Global commission settings updated");
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "commission-settings"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setSavingGlobalComms(false);
		}
	};

	const handleUploadKyc = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setUploadingKyc(true);
		const form = e.currentTarget;
		const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
		const file = fileInput?.files?.[0];

		if (!file) {
			toast.error("Please select a file to upload");
			setUploadingKyc(false);
			return;
		}

		const formData = new FormData(form);
		formData.append("business_id", businessId);

		try {
			const res = await fetch(`/api/advisors/${advisorId}/kyc`, {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to upload KYC");
			}

			toast.success("KYC Document uploaded successfully");
			setUploadKycOpen(false);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "kyc"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setUploadingKyc(false);
		}
	};

	const handleDeleteKyc = async (docId: string) => {
		if (!confirm("Are you sure you want to delete this document?")) return;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/kyc/${docId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to delete document");
			}

			toast.success("Document deleted");
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "kyc"] });
		} catch (err: any) {
			toast.error(err.message);
		}
	};

	const handleVerifyKyc = async (docId: string, status: "verified" | "rejected", reason?: string) => {
		try {
			const res = await fetch(`/api/advisors/${advisorId}/kyc/${docId}/verify`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status,
					rejection_reason: reason,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Verification failed");
			}

			toast.success(`Document marked as ${status}`);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "kyc"] });
		} catch (err: any) {
			toast.error(err.message);
		}
	};

	const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!activeCommissionId) return;

		setSavingPayment(true);
		const form = e.currentTarget;
		const formData = new FormData(form);

		const amount = formData.get("amount") as string;
		const extra = formData.get("extra_paid_amount") as string;
		const mode = formData.get("payment_mode") as string;
		const refNum = formData.get("reference_number") as string;
		const note = formData.get("note") as string;
		const date = formData.get("paid_date") as string;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/sales/${activeCommissionId}/payments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount,
					extra_paid_amount: extra,
					payment_mode: mode,
					reference_number: refNum,
					note,
					paid_date: date,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to record payment");
			}

			toast.success("Commission payment recorded");
			setRecordPaymentOpen(false);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "sales"] });
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "sales-summary"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setSavingPayment(false);
		}
	};

	const handleAddRecovery = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSavingRecovery(true);
		const form = e.currentTarget;
		const formData = new FormData(form);

		const customerId = formData.get("customer_id") as string;
		const saleId = formData.get("sale_id") as string;
		const totalDue = formData.get("total_due_amount") as string;
		const dueDate = formData.get("due_date") as string;
		const nextFollowUp = formData.get("next_follow_up_date") as string;
		const notes = formData.get("recovery_notes") as string;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/recovery`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					customer_id: customerId,
					sale_id: saleId || null,
					total_due_amount: totalDue,
					due_date: dueDate,
					next_follow_up_date: nextFollowUp,
					recovery_notes: notes,
					business_id: businessId,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to create recovery tracking");
			}

			toast.success("Recovery tracking added");
			setAddRecoveryOpen(false);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "recovery"] });
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "recovery-summary"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setSavingRecovery(false);
		}
	};

	const handleUpdateRecovery = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!activeRecovery) return;

		setUpdatingRecovery(true);
		const form = e.currentTarget;
		const formData = new FormData(form);

		const recovered = formData.get("recovered_amount") as string;
		const status = formData.get("recovery_status") as string;
		const nextFollowUp = formData.get("next_follow_up_date") as string;
		const notes = formData.get("recovery_notes") as string;

		try {
			const res = await fetch(`/api/advisors/${advisorId}/recovery/${activeRecovery.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					recovered_amount: recovered,
					recovery_status: status,
					next_follow_up_date: nextFollowUp,
					recovery_notes: notes,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to update recovery");
			}

			toast.success("Recovery performance updated");
			setUpdateRecoveryOpen(false);
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "recovery"] });
			queryClient.invalidateQueries({ queryKey: ["advisors", advisorId, "recovery-summary"] });
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			setUpdatingRecovery(false);
		}
	};

	const initials = (advisor.name || "")
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	// KPI Stats row definitions
	const summaryData = salesSummary || {
		active_customers: 0,
		total_sales: 0,
		total_commission_earned: 0,
		commission_paid: 0,
		commission_pending: 0,
	};

	return (
		<div className="space-y-6">
			{/* PROFILE HEADER CARD */}
			<Card className="overflow-hidden bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-xl border-none">
				<CardContent className="p-6 md:p-8">
					<div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
						<div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700/80 text-2xl font-bold border-2 border-zinc-500 shadow-md">
								{initials || <UserIcon className="h-10 w-10 text-zinc-400" />}
							</div>
							<div className="space-y-1.5">
								<div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
									<h2 className="text-2xl font-extrabold tracking-tight">{advisor.name}</h2>
									<Badge className={advisor.is_active ? "bg-emerald-500 text-white hover:bg-emerald-600 border-none" : "bg-zinc-500 text-white border-none"}>
										{advisor.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								<p className="text-zinc-300 font-medium text-sm">
									Code: <span className="font-mono bg-zinc-700/60 px-2 py-0.5 rounded text-white text-xs">{advisor.code}</span>
								</p>
								<div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
									<span className="flex items-center gap-1.5 justify-center sm:justify-start">
										<Phone className="h-3.5 w-3.5 text-zinc-400" /> {advisor.phone}
									</span>
									<span className="hidden sm:inline text-zinc-500">|</span>
									<span className="text-zinc-400 font-mono text-xs">{advisor.email}</span>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Button variant="secondary" size="sm" onClick={() => setEditProfileOpen(true)} className="bg-white/10 text-white hover:bg-white/20 border-none">
								<Pencil className="h-4 w-4 mr-2" />
								Edit Details
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* STATS ROW */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="hover:-translate-y-1 transition-all duration-300 shadow-sm border border-zinc-200">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Customers</p>
							<p className="text-2xl font-extrabold text-zinc-900">{summaryData.active_customers}</p>
						</div>
						<div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
							<UserIcon className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="hover:-translate-y-1 transition-all duration-300 shadow-sm border border-zinc-200">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Sales</p>
							<p className="text-2xl font-extrabold text-zinc-900">{summaryData.total_sales}</p>
						</div>
						<div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
							<Handshake className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="hover:-translate-y-1 transition-all duration-300 shadow-sm border border-zinc-200">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Commission Earned</p>
							<p className="text-2xl font-extrabold text-emerald-600">{formatCurrency(summaryData.total_commission_earned)}</p>
						</div>
						<div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
							<TrendingUp className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="hover:-translate-y-1 transition-all duration-300 shadow-sm border border-zinc-200">
					<CardContent className="p-5 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pending Commission</p>
							<p className="text-2xl font-extrabold text-amber-600">{formatCurrency(summaryData.commission_pending)}</p>
						</div>
						<div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
							<Clock className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* NAVIGATION TABS */}
			<div className="border-b border-zinc-200">
				<nav className="flex flex-wrap gap-2 -mb-px">
					{[
						{ id: "personal-details", label: "Personal Details" },
						{ id: "assigned-projects", label: "Assigned Projects" },
						{ id: "commission-settings", label: "Commission Settings" },
						{ id: "kyc-documents", label: "KYC Documents" },
						{ id: "sales-tracking", label: "Sales Tracking" },
						{ id: "recovery-performance", label: "Recovery Performance" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
								activeTab === tab.id
									? "border-zinc-900 text-zinc-900"
									: "border-transparent text-zinc-500 hover:text-zinc-700"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* TABS PAGES CONTENT */}
			<div className="space-y-6">
				{/* TAB 1: PERSONAL DETAILS */}
				{activeTab === "personal-details" && (
					<Card className="border border-zinc-200">
						<CardHeader>
							<CardTitle className="text-lg">Personal Details</CardTitle>
							<CardDescription>Verify the profile information and configuration details.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Name</span>
										<span className="text-sm font-semibold text-zinc-800">{advisor.name}</span>
									</div>
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Phone</span>
										<span className="text-sm font-semibold text-zinc-800">{advisor.phone}</span>
									</div>
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Email / Login ID</span>
										<span className="text-sm font-semibold text-zinc-800 font-mono">{advisor.email}</span>
									</div>
								</div>
								<div className="space-y-4">
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Address</span>
										<span className="text-sm text-zinc-700 flex items-start gap-1">
											<MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
											{advisor.address || "—"}
										</span>
									</div>
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Birth Date</span>
										<span className="text-sm text-zinc-700 flex items-center gap-1.5">
											<Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
											{advisor.birth_date ? formatDate(advisor.birth_date) : "—"}
										</span>
									</div>
									<div>
										<span className="text-xs uppercase font-bold text-zinc-400 block mb-0.5">Parent Advisor</span>
										<span className="text-sm text-zinc-700">
											{advisor.parent_advisor_id ? (
												(() => {
													const parent = parentOptions.find((p) => p.id === advisor.parent_advisor_id);
													return parent ? `${parent.name} (${parent.code})` : "Sub-advisor assigned";
												})()
											) : (
												"Main Channel Partner (No Parent)"
											)}
										</span>
									</div>
								</div>
							</div>
							{advisor.notes && (
								<div className="pt-4 border-t border-zinc-100">
									<span className="text-xs uppercase font-bold text-zinc-400 block mb-1">Internal Notes</span>
									<p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-md border border-zinc-100">{advisor.notes}</p>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* TAB 2: ASSIGNED PROJECTS */}
				{activeTab === "assigned-projects" && (
					<Card className="border border-zinc-200">
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle className="text-lg">Project Assignments</CardTitle>
								<CardDescription>Custom commission rates configured for specific projects.</CardDescription>
							</div>
							<Button size="sm" onClick={() => setAssignProjectOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Assign Project
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{loadingProjects ? (
								<div className="p-6 text-center text-zinc-500">Loading assignments...</div>
							) : !projectsData || projectsData.length === 0 ? (
								<div className="p-12 text-center text-zinc-400 text-sm">
									No project-specific commission rates configured. Default global settings will apply.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Project Name</TableHead>
											<TableHead className="text-center">Token Phase (%)</TableHead>
											<TableHead className="text-center">Agreement Phase (%)</TableHead>
											<TableHead className="text-center">Registry Phase (%)</TableHead>
											<TableHead className="text-center">Full Payment Phase (%)</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{projectsData.map((proj: any) => (
											<TableRow key={proj.id}>
												<TableCell className="font-semibold">{proj.project_name}</TableCell>
												<TableCell className="text-center">{proj.commission_token || 0}%</TableCell>
												<TableCell className="text-center">{proj.commission_agreement || 0}%</TableCell>
												<TableCell className="text-center">{proj.commission_registry || 0}%</TableCell>
												<TableCell className="text-center">{proj.commission_full_payment || 0}%</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				)}

				{/* TAB 3: COMMISSION SETTINGS */}
				{activeTab === "commission-settings" && (
					<div className="space-y-6">
						{/* Global Form */}
						<Card className="border border-zinc-200">
							<CardHeader>
								<CardTitle className="text-lg">Global Commission Settings</CardTitle>
								<CardDescription>Define default commission rates for each sale phase. These apply unless a project override exists.</CardDescription>
							</CardHeader>
							<CardContent>
								{loadingSettings ? (
									<div className="text-zinc-500">Loading settings...</div>
								) : (
									<form onSubmit={handleUpdateGlobalSettings} className="space-y-4">
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											<div>
												<label className="text-xs font-bold text-zinc-500 block mb-1.5">Token Phase (%)</label>
												<Input
													name="commission_token"
													type="number"
													step="0.01"
													min="0"
													max="100"
													defaultValue={commissionSettings?.global?.commission_token || 0}
													required
												/>
											</div>
											<div>
												<label className="text-xs font-bold text-zinc-500 block mb-1.5">Agreement Phase (%)</label>
												<Input
													name="commission_agreement"
													type="number"
													step="0.01"
													min="0"
													max="100"
													defaultValue={commissionSettings?.global?.commission_agreement || 0}
													required
												/>
											</div>
											<div>
												<label className="text-xs font-bold text-zinc-500 block mb-1.5">Registry Phase (%)</label>
												<Input
													name="commission_registry"
													type="number"
													step="0.01"
													min="0"
													max="100"
													defaultValue={commissionSettings?.global?.commission_registry || 0}
													required
												/>
											</div>
											<div>
												<label className="text-xs font-bold text-zinc-500 block mb-1.5">Full Payment Phase (%)</label>
												<Input
													name="commission_full_payment"
													type="number"
													step="0.01"
													min="0"
													max="100"
													defaultValue={commissionSettings?.global?.commission_full_payment || 0}
													required
												/>
											</div>
										</div>
										<Button type="submit" disabled={savingGlobalComms} className="mt-2">
											{savingGlobalComms && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
											Update Global Settings
										</Button>
									</form>
								)}
							</CardContent>
						</Card>

						{/* Overrides Table */}
						<Card className="border border-zinc-200">
							<CardHeader>
								<CardTitle className="text-lg">Project overrides</CardTitle>
								<CardDescription>A list of project rates overrides that override default global settings.</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								{loadingSettings ? (
									<div className="p-6 text-center text-zinc-500">Loading overrides...</div>
								) : !commissionSettings?.project_overrides || commissionSettings.project_overrides.length === 0 ? (
									<div className="p-12 text-center text-zinc-400 text-sm">No overrides configured.</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Project Name</TableHead>
												<TableHead className="text-center">Token (%)</TableHead>
												<TableHead className="text-center">Agreement (%)</TableHead>
												<TableHead className="text-center">Registry (%)</TableHead>
												<TableHead className="text-center">Full Payment (%)</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{commissionSettings.project_overrides.map((ovr: any) => (
												<TableRow key={ovr.id}>
													<TableCell className="font-semibold">{ovr.project_name}</TableCell>
													<TableCell className="text-center">{ovr.commission_token || 0}%</TableCell>
													<TableCell className="text-center">{ovr.commission_agreement || 0}%</TableCell>
													<TableCell className="text-center">{ovr.commission_registry || 0}%</TableCell>
													<TableCell className="text-center">{ovr.commission_full_payment || 0}%</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* TAB 4: KYC DOCUMENTS */}
				{activeTab === "kyc-documents" && (
					<Card className="border border-zinc-200">
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle className="text-lg">KYC Documents</CardTitle>
								<CardDescription>Manage, verify, and review identity proofs and agreement files.</CardDescription>
							</div>
							<Button size="sm" onClick={() => setUploadKycOpen(true)}>
								<Upload className="h-4 w-4 mr-2" />
								Upload Document
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{loadingKyc ? (
								<div className="p-6 text-center text-zinc-500">Loading documents...</div>
							) : !kycData || kycData.length === 0 ? (
								<div className="p-12 text-center text-zinc-400 text-sm">
									No KYC documents uploaded yet. Start by uploading an Aadhaar, PAN card, or agreement.
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Type</TableHead>
											<TableHead>Doc Number</TableHead>
											<TableHead>Expiry Date</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Uploaded On</TableHead>
											<TableHead>Verified By</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{kycData.map((doc: any) => (
											<TableRow key={doc.id}>
												<TableCell className="font-semibold capitalize">{doc.document_type.replace("_", " ")}</TableCell>
												<TableCell>{doc.document_number || "—"}</TableCell>
												<TableCell>{doc.expiry_date ? formatDate(doc.expiry_date) : "—"}</TableCell>
												<TableCell>
													<Badge
														className={
															doc.status === "verified"
																? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
																: doc.status === "rejected"
																	? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
																	: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
														}
														variant="outline"
													>
														{doc.status}
													</Badge>
													{doc.status === "rejected" && doc.rejection_reason && (
														<span className="block text-[10px] text-red-500 mt-0.5 truncate max-w-[150px]" title={doc.rejection_reason}>
															{doc.rejection_reason}
														</span>
													)}
												</TableCell>
												<TableCell>{formatDate(doc.created_at)}</TableCell>
												<TableCell>{doc.verified_by_name || "—"}</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1.5">
														<a href={`/api/advisors/${advisorId}/kyc/${doc.id}/download`} target="_blank" rel="noreferrer">
															<Button size="sm" variant="outline" title="Download Document">
																<Download className="h-3.5 w-3.5" />
															</Button>
														</a>
														{doc.status === "pending" && (
															<>
																<Button
																	size="sm"
																	variant="outline"
																	className="border-green-200 hover:bg-green-50 text-green-600 hover:text-green-700"
																	onClick={() => handleVerifyKyc(doc.id, "verified")}
																	title="Verify"
																>
																	<Check className="h-3.5 w-3.5" />
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
																	onClick={() => {
																		const reason = prompt("Enter rejection reason:");
																		if (reason !== null) {
																			handleVerifyKyc(doc.id, "rejected", reason);
																		}
																	}}
																	title="Reject"
																>
																	<X className="h-3.5 w-3.5" />
																</Button>
															</>
														)}
														<Button
															size="sm"
															variant="outline"
															className="border-red-100 text-red-500 hover:bg-red-50"
															onClick={() => handleDeleteKyc(doc.id)}
															title="Delete"
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				)}

				{/* TAB 5: SALES TRACKING */}
				{activeTab === "sales-tracking" && (
					<Card className="border border-zinc-200">
						<CardHeader>
							<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
								<div>
									<CardTitle className="text-lg">Commission Ledger (Sales)</CardTitle>
									<CardDescription>Track sales and payments registered under this advisor.</CardDescription>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<select
										className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs"
										value={salesStatus}
										onChange={(e) => {
											setSalesStatus(e.target.value);
											setSalesPage(1);
										}}
									>
										<option value="all">All Status</option>
										<option value="paid">Paid</option>
										<option value="pending">Pending</option>
										<option value="partial">Partial</option>
									</select>
									<Input
										type="date"
										placeholder="From"
										className="h-9 text-xs w-32"
										value={salesDateFrom}
										onChange={(e) => {
											setSalesDateFrom(e.target.value);
											setSalesPage(1);
										}}
									/>
									<Input
										type="date"
										placeholder="To"
										className="h-9 text-xs w-32"
										value={salesDateTo}
										onChange={(e) => {
											setSalesDateTo(e.target.value);
											setSalesPage(1);
										}}
									/>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{loadingSales ? (
								<div className="p-6 text-center text-zinc-500">Loading ledger...</div>
							) : !salesData || salesData.data.length === 0 ? (
								<div className="p-12 text-center text-zinc-400 text-sm">No sales matching criteria.</div>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Plot Info</TableHead>
												<TableHead>Customer</TableHead>
												<TableHead>Phase</TableHead>
												<TableHead className="text-right">Rate %</TableHead>
												<TableHead className="text-right">Total Commission</TableHead>
												<TableHead className="text-right">Paid</TableHead>
												<TableHead className="text-right">Pending</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{salesData.data.map((sale: any) => (
												<TableRow key={sale.id}>
													<TableCell>
														<div className="font-semibold">{sale.plot_number}</div>
														<div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{sale.project_name}</div>
													</TableCell>
													<TableCell className="text-sm font-medium">{sale.customer_name}</TableCell>
													<TableCell className="capitalize text-xs font-medium text-zinc-600">{sale.sale_phase.replace("_", " ")}</TableCell>
													<TableCell className="text-right font-mono text-xs">{sale.commission_percentage}%</TableCell>
													<TableCell className="text-right font-semibold text-zinc-800">{formatCurrency(sale.total_commission_amount)}</TableCell>
													<TableCell className="text-right font-medium text-emerald-600">{formatCurrency(sale.amount_paid)}</TableCell>
													<TableCell className="text-right font-medium text-amber-600">{formatCurrency(sale.remaining_commission)}</TableCell>
													<TableCell>
														<Badge
															className={
																sale.status === "paid"
																	? "bg-green-100 text-green-800 border-green-200"
																	: sale.status === "partial"
																		? "bg-blue-100 text-blue-800 border-blue-200"
																		: "bg-amber-100 text-amber-800 border-amber-200"
															}
															variant="outline"
														>
															{sale.status}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														{sale.status !== "paid" && (
															<Button
																size="sm"
																onClick={() => {
																	setActiveCommissionId(sale.id);
																	setRecordPaymentOpen(true);
																}}
															>
																Record Payment
															</Button>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>

									{/* Sales Pagination */}
									{salesData.pagination.pages > 1 && (
										<div className="flex items-center justify-between border-t border-zinc-100 p-4">
											<span className="text-xs text-zinc-500">
												Page {salesData.pagination.page} of {salesData.pagination.pages}
											</span>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
													disabled={salesPage === 1}
												>
													Prev
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setSalesPage((p) => Math.min(salesData.pagination.pages, p + 1))}
													disabled={salesPage === salesData.pagination.pages}
												>
													Next
												</Button>
											</div>
										</div>
									)}
								</>
							)}
						</CardContent>
					</Card>
				)}

				{/* TAB 6: RECOVERY PERFORMANCE */}
				{activeTab === "recovery-performance" && (
					<div className="space-y-6">
						{/* Recovery Summary Cards */}
						{recoverySummary && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<Card className="bg-zinc-50 border border-zinc-200">
									<CardContent className="p-4">
										<p className="text-[10px] uppercase font-bold text-zinc-400">Total Dues</p>
										<p className="text-lg font-extrabold text-zinc-900 mt-1">{formatCurrency(recoverySummary.total_due)}</p>
									</CardContent>
								</Card>
								<Card className="bg-emerald-50/40 border border-emerald-100">
									<CardContent className="p-4">
										<p className="text-[10px] uppercase font-bold text-emerald-500">Total Recovered</p>
										<p className="text-lg font-extrabold text-emerald-600 mt-1">{formatCurrency(recoverySummary.total_recovered)}</p>
									</CardContent>
								</Card>
								<Card className="bg-amber-50/40 border border-amber-100">
									<CardContent className="p-4">
										<p className="text-[10px] uppercase font-bold text-amber-500">Pending Dues</p>
										<p className="text-lg font-extrabold text-amber-600 mt-1">{formatCurrency(recoverySummary.total_pending)}</p>
									</CardContent>
								</Card>
								<Card className="bg-blue-50/40 border border-blue-100">
									<CardContent className="p-4">
										<p className="text-[10px] uppercase font-bold text-blue-500">Recovery Rate</p>
										<p className="text-lg font-extrabold text-blue-600 mt-1">{recoverySummary.recovery_rate_pct}%</p>
									</CardContent>
								</Card>
							</div>
						)}

						{/* Recovery Table */}
						<Card className="border border-zinc-200">
							<CardHeader className="flex flex-row items-center justify-between">
								<div>
									<CardTitle className="text-lg">Recovery Tracking</CardTitle>
									<CardDescription>Log and track pending client dues follow-ups.</CardDescription>
								</div>
								<div className="flex items-center gap-2">
									<select
										className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs"
										value={recoveryStatus}
										onChange={(e) => setRecoveryStatus(e.target.value)}
									>
										<option value="all">All status</option>
										<option value="pending">Pending</option>
										<option value="in_progress">In Progress</option>
										<option value="recovered">Recovered</option>
										<option value="failed">Failed</option>
									</select>
									<Button size="sm" onClick={() => setAddRecoveryOpen(true)}>
										<Plus className="h-4 w-4 mr-2" />
										Add Entry
									</Button>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{loadingRecovery ? (
									<div className="p-6 text-center text-zinc-500">Loading recoveries...</div>
								) : !recoveryData || recoveryData.length === 0 ? (
									<div className="p-12 text-center text-zinc-400 text-sm">No recovery tracking records.</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Customer Name</TableHead>
												<TableHead className="text-right">Total Due</TableHead>
												<TableHead className="text-right">Recovered</TableHead>
												<TableHead className="text-right">Pending</TableHead>
												<TableHead className="text-center">Due Date</TableHead>
												<TableHead className="text-center">Next Follow-up</TableHead>
												<TableHead className="text-center">Count</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{recoveryData.map((rec: any) => (
												<TableRow key={rec.id}>
													<TableCell>
														<div className="font-semibold text-zinc-800">{rec.customer_name}</div>
														<div className="text-[10px] text-zinc-500 font-mono">{rec.customer_phone}</div>
													</TableCell>
													<TableCell className="text-right font-semibold text-zinc-700">{formatCurrency(rec.total_due_amount)}</TableCell>
													<TableCell className="text-right font-semibold text-green-600">{formatCurrency(rec.recovered_amount)}</TableCell>
													<TableCell className="text-right font-semibold text-amber-600">{formatCurrency(rec.pending_amount)}</TableCell>
													<TableCell className="text-center text-xs">{rec.due_date ? formatDate(rec.due_date) : "—"}</TableCell>
													<TableCell className="text-center text-xs font-medium text-blue-600">{rec.next_follow_up_date ? formatDate(rec.next_follow_up_date) : "—"}</TableCell>
													<TableCell className="text-center font-mono text-xs">{rec.follow_up_count}</TableCell>
													<TableCell>
														<Badge
															className={
																rec.recovery_status === "recovered"
																	? "bg-green-100 text-green-800 border-green-200"
																	: rec.recovery_status === "in_progress"
																		? "bg-blue-100 text-blue-800 border-blue-200"
																		: rec.recovery_status === "failed"
																			? "bg-red-100 text-red-800 border-red-200"
																			: "bg-amber-100 text-amber-800 border-amber-200"
															}
															variant="outline"
														>
															{rec.recovery_status}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														{rec.recovery_status !== "recovered" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() => {
																	setActiveRecovery(rec);
																	setUpdateRecoveryOpen(true);
																}}
															>
																Update
															</Button>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			{/* ========================================================
			    DIALOG MODALS SECTION
			   ======================================================== */}

			{/* 1. EDIT PROFILE MODAL */}
			<Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
				<DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Advisor Details</DialogTitle>
						<DialogDescription>Update the personal and contact info of the advisor.</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<AdvisorForm
							mode="edit"
							initialData={advisor}
							parentOptions={parentOptions}
							onSuccess={handleEditProfileSuccess}
							onCancel={() => setEditProfileOpen(false)}
							redirectToList={false}
						/>
					</div>
				</DialogContent>
			</Dialog>

			{/* 2. ASSIGN PROJECT MODAL */}
			<Dialog open={assignProjectOpen} onOpenChange={setAssignProjectOpen}>
				<DialogContent className="max-w-md w-full">
					<DialogHeader>
						<DialogTitle>Assign Project & Commissions</DialogTitle>
						<DialogDescription>Assign a new real estate project and set custom per-phase commission percentages.</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleAssignProject} className="space-y-4">
						<div className="space-y-3">
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Select Project *</label>
								<select name="project_id" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" required>
									<option value="">-- Choose Project --</option>
									{projectsOptions.map((p: any) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Token Phase (%)</label>
									<Input name="commission_token" type="number" step="0.01" min="0" max="100" defaultValue="0" required />
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Agreement Phase (%)</label>
									<Input name="commission_agreement" type="number" step="0.01" min="0" max="100" defaultValue="0" required />
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Registry Phase (%)</label>
									<Input name="commission_registry" type="number" step="0.01" min="0" max="100" defaultValue="0" required />
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Full Payment Phase (%)</label>
									<Input name="commission_full_payment" type="number" step="0.01" min="0" max="100" defaultValue="0" required />
								</div>
							</div>
						</div>
						<DialogFooter className="pt-4 border-t border-zinc-100">
							<Button type="button" variant="outline" onClick={() => setAssignProjectOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={savingProject}>
								{savingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Assign Project
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* 3. UPLOAD KYC MODAL */}
			<Dialog open={uploadKycOpen} onOpenChange={setUploadKycOpen}>
				<DialogContent className="max-w-md w-full">
					<DialogHeader>
						<DialogTitle>Upload KYC Document</DialogTitle>
						<DialogDescription>Submit proof of identity or agreement files. Allowed formats: JPG, PNG, PDF (Max 5MB).</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleUploadKyc} className="space-y-4">
						<div className="space-y-3">
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Document Type *</label>
								<select name="document_type" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" required>
									<option value="aadhaar">Aadhaar Card</option>
									<option value="pan">PAN Card</option>
									<option value="passport">Passport</option>
									<option value="voter_id">Voter ID</option>
									<option value="driving_license">Driving License</option>
									<option value="bank_passbook">Bank Passbook</option>
									<option value="photo">Photograph</option>
									<option value="agreement">Partnership Agreement</option>
									<option value="other">Other document</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Document Number</label>
								<Input name="document_number" placeholder="e.g. 1234-5678-9012" />
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Expiry Date (if applicable)</label>
								<Input name="expiry_date" type="date" />
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Select Document File *</label>
								<Input name="file" type="file" accept=".jpg,.jpeg,.png,.pdf" required />
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Notes</label>
								<Input name="notes" placeholder="Any additional comments..." />
							</div>
						</div>
						<DialogFooter className="pt-4 border-t border-zinc-100">
							<Button type="button" variant="outline" onClick={() => setUploadKycOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={uploadingKyc}>
								{uploadingKyc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Upload Document
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* 4. RECORD PAYMENT MODAL */}
			<Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
				<DialogContent className="max-w-md w-full">
					<DialogHeader>
						<DialogTitle>Record Commission Payment</DialogTitle>
						<DialogDescription>Add a commission payment installment paid to this channel partner.</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleRecordPayment} className="space-y-4">
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Payment Amount (₹) *</label>
									<Input name="amount" type="number" min="1" step="0.01" required />
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Extra Paid Amount (₹)</label>
									<Input name="extra_paid_amount" type="number" min="0" step="0.01" defaultValue="0" />
								</div>
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Payment Mode *</label>
								<select name="payment_mode" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" required>
									<option value="cash">Cash</option>
									<option value="online">Online Transfer</option>
									<option value="cheque">Cheque</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Reference Number</label>
								<Input name="reference_number" placeholder="Txn ID, Cheque number, etc." />
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Payment Date *</label>
								<Input name="paid_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Notes</label>
								<Input name="note" placeholder="Write any transaction description..." />
							</div>
						</div>
						<DialogFooter className="pt-4 border-t border-zinc-100">
							<Button type="button" variant="outline" onClick={() => setRecordPaymentOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={savingPayment}>
								{savingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Record Payment
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* 5. ADD RECOVERY MODAL */}
			<Dialog open={addRecoveryOpen} onOpenChange={setAddRecoveryOpen}>
				<DialogContent className="max-w-md w-full">
					<DialogHeader>
						<DialogTitle>Add Recovery Tracking</DialogTitle>
						<DialogDescription>Start follow-up tracking for outstanding client payments under this advisor.</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleAddRecovery} className="space-y-4">
						<div className="space-y-3">
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Select Customer *</label>
								{/* Ideally search and select, we'll render a simple text input or select if we have list */}
								<select name="customer_id" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" required>
									<option value="">-- Choose Customer --</option>
									{advisor.salesSummary?.active_customers > 0 ? (
										// fallback options or lookup customers. Since they are fetched via advisor, we can select from them.
										// To keep it simple and generic, we allow selecting from any customer or enter details.
										// We can fetch customers in the parent component and pass them.
										// For now, let's render a basic select showing some mock options or let it load.
										<option value="" disabled>Please contact customer relations</option>
									) : null}
									{/* Let's lookup advisor's customers */}
									{initialAdvisor.customers?.map((c: any) => (
										<option key={c.id} value={c.id}>
											{c.name} ({c.phone})
										</option>
									)) || <option value="">No advisor-assigned customers found</option>}
								</select>
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Total Outstanding Due (₹) *</label>
								<Input name="total_due_amount" type="number" min="1" step="0.01" required />
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Due Date</label>
									<Input name="due_date" type="date" />
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Next Follow-up</label>
									<Input name="next_follow_up_date" type="date" />
								</div>
							</div>
							<div>
								<label className="text-xs font-bold text-zinc-500 block mb-1.5">Follow-up Notes</label>
								<Input name="recovery_notes" placeholder="Plan of action, call details, etc." />
							</div>
						</div>
						<DialogFooter className="pt-4 border-t border-zinc-100">
							<Button type="button" variant="outline" onClick={() => setAddRecoveryOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={savingRecovery}>
								{savingRecovery && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Add Recovery Tracking
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* 6. UPDATE RECOVERY MODAL */}
			<Dialog open={updateRecoveryOpen} onOpenChange={setUpdateRecoveryOpen}>
				<DialogContent className="max-w-md w-full">
					<DialogHeader>
						<DialogTitle>Update Recovery Status</DialogTitle>
						<DialogDescription>Update recovery progress, collection amounts, and log the latest follow-up note.</DialogDescription>
					</DialogHeader>
					{activeRecovery && (
						<form onSubmit={handleUpdateRecovery} className="space-y-4">
							<div className="space-y-3">
								<div className="bg-zinc-50 p-3 rounded-md border border-zinc-100 text-xs space-y-1">
									<div className="flex justify-between">
										<span className="font-bold text-zinc-500">Customer:</span>
										<span className="font-semibold text-zinc-800">{activeRecovery.customer_name}</span>
									</div>
									<div className="flex justify-between">
										<span className="font-bold text-zinc-500">Total Outstanding:</span>
										<span className="font-semibold text-zinc-800">{formatCurrency(activeRecovery.total_due_amount)}</span>
									</div>
									<div className="flex justify-between">
										<span className="font-bold text-zinc-500">Current Recovered:</span>
										<span className="font-semibold text-zinc-800">{formatCurrency(activeRecovery.recovered_amount)}</span>
									</div>
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Cumulative Recovered Amount (₹)</label>
									<Input
										name="recovered_amount"
										type="number"
										min="0"
										step="0.01"
										max={activeRecovery.total_due_amount}
										defaultValue={activeRecovery.recovered_amount || 0}
										required
									/>
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Recovery Status</label>
									<select
										name="recovery_status"
										className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
										defaultValue={activeRecovery.recovery_status || "pending"}
										required
									>
										<option value="pending">Pending</option>
										<option value="in_progress">In Progress</option>
										<option value="recovered">Recovered</option>
										<option value="failed">Failed</option>
									</select>
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Next Follow-up Date</label>
									<Input
										name="next_follow_up_date"
										type="date"
										defaultValue={activeRecovery.next_follow_up_date || ""}
									/>
								</div>
								<div>
									<label className="text-xs font-bold text-zinc-500 block mb-1.5">Update Notes</label>
									<Input
										name="recovery_notes"
										placeholder="e.g. Promised payment on next Monday."
										defaultValue={activeRecovery.recovery_notes || ""}
									/>
								</div>
							</div>
							<DialogFooter className="pt-4 border-t border-zinc-100">
								<Button type="button" variant="outline" onClick={() => setUpdateRecoveryOpen(false)}>
									Cancel
								</Button>
								<Button type="submit" disabled={updatingRecovery}>
									{updatingRecovery && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Update Recovery
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
