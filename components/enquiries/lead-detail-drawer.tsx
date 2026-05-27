"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	X,
	Calendar,
	User,
	Phone,
	Mail,
	MapPin,
	DollarSign,
	Clock,
	Briefcase,
	MessageSquare,
	Eye,
	CheckCircle,
	AlertCircle,
	Trash2,
	Plus,
	Loader2,
	TrendingUp,
	CheckCircle2,
	Sparkles,
	UserCheck,
	XCircle,
} from "lucide-react";
import { Button, Input, Textarea, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

type LeadDetailDrawerProps = {
	open: boolean;
	onClose: () => void;
	enquiry: any;
	projects: Array<{ id: string; name: string }>;
	advisors: Array<{ id: string; name: string }>;
	onUpdated?: () => void;
};

const getInitials = (name: string) => {
	const parts = (name || "").trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return "👤";
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
	return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarGradient = (name: string) => {
	const code = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const gradients = [
		"from-blue-500 to-indigo-500 text-blue-100",
		"from-emerald-500 to-teal-500 text-emerald-100",
		"from-violet-500 to-purple-500 text-violet-100",
		"from-amber-500 to-orange-500 text-amber-100",
		"from-rose-500 to-pink-500 text-rose-100",
		"from-sky-500 to-cyan-500 text-sky-100",
	];
	return gradients[code % gradients.length];
};

export function LeadDetailDrawer({
	open,
	onClose,
	enquiry,
	projects,
	advisors,
	onUpdated,
}: LeadDetailDrawerProps) {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"history" | "visits" | "notes">("history");

	// State for adding follow-up
	const [fuType, setFuType] = useState("call");
	const [fuOutcome, setFuOutcome] = useState("");
	const [fuNotes, setFuNotes] = useState("");
	const [nextFuDate, setNextFuDate] = useState("");

	// State for scheduling site visit
	const [svProject, setSvProject] = useState("");
	const [svDate, setSvDate] = useState("");
	const [svTime, setSvTime] = useState("");
	const [svConductedBy, setSvConductedBy] = useState("");
	const [svAccompaniedBy, setSvAccompaniedBy] = useState("");
	const [svNotes, setSvNotes] = useState("");

	// State for completing site visit
	const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
	const [svFeedback, setSvFeedback] = useState("");
	const [svInterest, setSvInterest] = useState(3);
	const [svFollowUpReq, setSvFollowUpReq] = useState(true);

	// Fetch follow-up history
	const { data: followUps, isLoading: loadingFollowUps, refetch: refetchFollowUps } = useQuery({
		queryKey: ["enquiry-follow-ups", enquiry?.id],
		queryFn: async () => {
			if (!enquiry?.id) return [];
			const res = await fetch(`/api/enquiries/${enquiry.id}/follow-ups`);
			if (!res.ok) throw new Error("Failed to fetch follow-ups");
			return res.json();
		},
		enabled: !!enquiry?.id,
	});

	// Fetch site visit history
	const { data: siteVisits, isLoading: loadingSiteVisits, refetch: refetchSiteVisits } = useQuery({
		queryKey: ["enquiry-site-visits", enquiry?.id],
		queryFn: async () => {
			if (!enquiry?.id) return [];
			const res = await fetch(`/api/enquiries/${enquiry.id}/site-visits`);
			if (!res.ok) throw new Error("Failed to fetch site visits");
			return res.json();
		},
		enabled: !!enquiry?.id,
	});

	// Mutations
	const updateStageMutation = useMutation({
		mutationFn: async ({ stage, lostReason }: { stage: string; lostReason?: string }) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/stage`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pipeline_stage: stage, lost_reason: lostReason }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to update stage");
			}
			return res.json();
		},
		onSuccess: () => {
			toast.success("Lead stage updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			queryClient.invalidateQueries({ queryKey: ["enquiry-pipeline"] });
			if (onUpdated) onUpdated();
		},
		onError: (err: any) => {
			toast.error(err.message);
		},
	});

	const assignAdvisorMutation = useMutation({
		mutationFn: async (advisorId: string) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/assign`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ advisor_id: advisorId }),
			});
			if (!res.ok) throw new Error("Failed to assign advisor");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Advisor assigned successfully!");
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			if (onUpdated) onUpdated();
		},
	});

	const addFollowUpMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/follow-ups`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to record follow-up");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Follow-up recorded!");
			refetchFollowUps();
			setFuOutcome("");
			setFuNotes("");
			setNextFuDate("");
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			if (onUpdated) onUpdated();
		},
	});

	const scheduleSiteVisitMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/site-visits`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to schedule site visit");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Site visit scheduled successfully!");
			refetchSiteVisits();
			setSvDate("");
			setSvTime("");
			setSvConductedBy("");
			setSvAccompaniedBy("");
			setSvNotes("");
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			if (onUpdated) onUpdated();
		},
	});

	const completeSiteVisitMutation = useMutation({
		mutationFn: async ({ visitId, payload }: { visitId: string; payload: any }) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/site-visits/${visitId}/complete`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error("Failed to complete site visit");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Site visit marked complete!");
			refetchSiteVisits();
			setCompletingVisitId(null);
			setSvFeedback("");
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			if (onUpdated) onUpdated();
		},
	});

	const cancelSiteVisitMutation = useMutation({
		mutationFn: async ({ visitId, notes }: { visitId: string; notes: string }) => {
			const res = await fetch(`/api/enquiries/${enquiry.id}/site-visits/${visitId}/cancel`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes }),
			});
			if (!res.ok) throw new Error("Failed to cancel site visit");
			return res.json();
		},
		onSuccess: () => {
			toast.success("Site visit cancelled.");
			refetchSiteVisits();
			queryClient.invalidateQueries({ queryKey: ["enquiries"] });
			if (onUpdated) onUpdated();
		},
	});

	if (!open || !enquiry) return null;

	const handleLogFollowUp = (e: React.FormEvent) => {
		e.preventDefault();
		addFollowUpMutation.mutate({
			follow_up_date: new Date().toISOString().split("T")[0],
			follow_up_type: fuType,
			outcome: fuOutcome,
			notes: fuNotes,
			next_follow_up_date: nextFuDate || null,
		});
	};

	const handleScheduleSiteVisit = (e: React.FormEvent) => {
		e.preventDefault();
		scheduleSiteVisitMutation.mutate({
			project_id: svProject || null,
			scheduled_date: svDate,
			scheduled_time: svTime || null,
			conducted_by: svConductedBy || null,
			accompanied_by: svAccompaniedBy || null,
			notes: svNotes || null,
		});
	};

	const handleCompleteVisit = (visitId: string) => {
		completeSiteVisitMutation.mutate({
			visitId,
			payload: {
				actual_visit_date: new Date().toISOString().split("T")[0],
				customer_feedback: svFeedback,
				interest_level: svInterest,
				follow_up_required: svFollowUpReq,
				notes: "Completed site visit.",
			},
		});
	};

	const handleCancelVisit = (visitId: string) => {
		const reason = prompt("Enter cancellation/no-show reason:");
		if (reason !== null) {
			cancelSiteVisitMutation.mutate({ visitId, notes: reason });
		}
	};

	const handleConvertLead = () => {
		if (confirm(`Are you sure you want to promote ${enquiry.name} to a Customer?`)) {
			updateStageMutation.mutate({ stage: "converted" });
		}
	};

	const handleMarkLost = () => {
		const reason = prompt("Enter the reason for closing this lead as lost:");
		if (reason) {
			updateStageMutation.mutate({ stage: "lost", lostReason: reason });
		}
	};

	return (
		<div className="fixed inset-0 z-50 overflow-hidden">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

			{/* Drawer Panel */}
			<div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col h-full border-l border-zinc-200">
				{/* Header */}
				<div className="px-6 py-5 border-b border-zinc-200/80 flex items-center justify-between bg-gradient-to-r from-zinc-50 to-white">
					<div className="flex items-center gap-3">
						<div className={cn(
							"h-10 w-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-sm font-black shadow-md shrink-0",
							getAvatarGradient(enquiry.name)
						)}>
							{getInitials(enquiry.name)}
						</div>
						<div className="min-w-0">
							<h2 className="text-base font-extrabold text-zinc-900 truncate tracking-tight">{enquiry.name}</h2>
							<div className="flex items-center gap-2 mt-0.5">
								<p className="text-xs font-bold font-mono text-zinc-400 tabular-nums">{enquiry.phone}</p>
								{!enquiry.is_active && (
									<span className="bg-red-50 text-red-700 text-[8px] px-1.5 py-0.2 rounded-full font-black border border-red-100 uppercase">
										Inactive
									</span>
								)}
							</div>
						</div>
					</div>
					<button className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-zinc-100 active:scale-95 transition-all text-zinc-400 hover:text-zinc-700 cursor-pointer" onClick={onClose}>
						<X className="h-4.5 w-4.5" />
					</button>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto p-5 space-y-6">
					{/* Stage & Advisor Controls */}
					<div className="grid grid-cols-2 gap-4 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/60">
						<div className="space-y-1.5">
							<span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Stage</span>
							<select
								value={enquiry.pipeline_stage}
								onChange={(e) => updateStageMutation.mutate({ stage: e.target.value })}
								className="w-full text-xs h-9 rounded-xl border border-zinc-200/80 bg-white px-2.5 font-bold text-zinc-700 shadow-sm outline-none hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all duration-300 cursor-pointer"
							>
								<option value="new">🆕 New</option>
								<option value="contacted">📞 Contacted</option>
								<option value="follow_up">⏰ Follow Up</option>
								<option value="site_visit">📍 Site Visit</option>
								<option value="negotiation">🤝 Negotiation</option>
								<option value="converted">🎉 Converted</option>
								<option value="lost">❌ Lost</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Advisor</span>
							<select
								value={enquiry.assigned_advisor_id || ""}
								onChange={(e) => assignAdvisorMutation.mutate(e.target.value)}
								className="w-full text-xs h-9 rounded-xl border border-zinc-200/80 bg-white px-2.5 font-bold text-zinc-700 shadow-sm outline-none hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all duration-300 cursor-pointer"
							>
								<option value="">👤 Unassigned</option>
								{advisors.map((adv) => (
									<option key={adv.id} value={adv.id}>
										👥 {adv.name}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Lead Metrics summary */}
					<div className="grid grid-cols-2 gap-3.5">
						<div className="border border-zinc-200/70 p-3 rounded-xl flex items-center gap-3 bg-white">
							<div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center shrink-0 border border-teal-100/50">
								<DollarSign className="h-4.5 w-4.5" />
							</div>
							<div>
								<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Budget Limit</p>
								<p className="text-xs font-black text-zinc-900 mt-0.5">
									{enquiry.budget_max ? formatCurrency(enquiry.budget_max) : "—"}
								</p>
							</div>
						</div>
						<div className="border border-zinc-200/70 p-3 rounded-xl flex items-center gap-3 bg-white">
							<div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0 border border-indigo-100/50">
								<Briefcase className="h-4.5 w-4.5" />
							</div>
							<div>
								<p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider">Source</p>
								<p className="text-xs font-black text-zinc-900 capitalize mt-0.5">
									{enquiry.lead_source || "Other"}
								</p>
							</div>
						</div>
					</div>

					{/* Action bar */}
					{enquiry.is_active && (
						<div className="flex gap-3 justify-stretch pt-1">
							<Button 
								size="sm" 
								variant="outline" 
								className="flex-1 text-xs font-bold rounded-2xl h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm active:scale-98 transition-all cursor-pointer" 
								onClick={handleMarkLost}
							>
								Mark as Lost
							</Button>
							<Button 
								size="sm" 
								className="flex-1 text-xs font-black rounded-2xl h-10 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-sm hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)] active:scale-98 transition-all border border-emerald-500/20 cursor-pointer" 
								onClick={handleConvertLead}
							>
								Convert to Customer
							</Button>
						</div>
					)}

					{/* Tabs header */}
					<div className="border-b border-zinc-200/80 flex gap-5 text-xs font-black pt-2">
						<button
							onClick={() => setActiveTab("history")}
							className={cn(
								"pb-3.5 border-b-2 transition-all relative font-extrabold cursor-pointer text-xs",
								activeTab === "history"
									? "border-teal-500 text-teal-655 font-black"
									: "border-transparent text-zinc-400 hover:text-zinc-650"
							)}
						>
							Follow-ups
						</button>
						<button
							onClick={() => setActiveTab("visits")}
							className={cn(
								"pb-3.5 border-b-2 transition-all relative font-extrabold cursor-pointer text-xs",
								activeTab === "visits"
									? "border-teal-500 text-teal-655 font-black"
									: "border-transparent text-zinc-400 hover:text-zinc-650"
							)}
						>
							Site Visits
						</button>
						<button
							onClick={() => setActiveTab("notes")}
							className={cn(
								"pb-3.5 border-b-2 transition-all relative font-extrabold cursor-pointer text-xs",
								activeTab === "notes"
									? "border-teal-500 text-teal-655 font-black"
									: "border-transparent text-zinc-400 hover:text-zinc-650"
							)}
						>
							Details & Notes
						</button>
					</div>

					{/* Tab: Follow Ups */}
					{activeTab === "history" && (
						<div className="space-y-5">
							{/* Form */}
							{enquiry.is_active && (
								<form onSubmit={handleLogFollowUp} className="bg-zinc-50/50 border border-zinc-200/70 rounded-2xl p-4 space-y-3.5 shadow-xs">
									<h4 className="text-xs font-black text-zinc-700 flex items-center gap-1.5 uppercase tracking-wide">
										<Plus className="h-4 w-4 text-teal-500" /> Log Follow-up Action
									</h4>
									<div className="grid grid-cols-2 gap-3">
										<select
											value={fuType}
											onChange={(e) => setFuType(e.target.value)}
											className="text-xs h-9 border border-zinc-200/80 bg-white rounded-xl px-2.5 font-bold outline-none cursor-pointer hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all"
										>
											<option value="call">📞 Call</option>
											<option value="whatsapp">💬 WhatsApp</option>
											<option value="email">✉️ Email</option>
											<option value="meeting">🤝 Meeting</option>
										</select>
										<Input
											type="date"
											value={nextFuDate}
											onChange={(e) => setNextFuDate(e.target.value)}
											className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
											placeholder="Next follow-up date"
										/>
									</div>
									<Input
										value={fuOutcome}
										onChange={(e) => setFuOutcome(e.target.value)}
										placeholder="Outcome / status (e.g. Call connected)"
										className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
									/>
									<Textarea
										value={fuNotes}
										onChange={(e) => setFuNotes(e.target.value)}
										placeholder="Conversation details..."
										rows={2}
										className="text-xs border-zinc-200/80 rounded-xl font-medium bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
									/>
									<Button 
										size="sm" 
										type="submit" 
										disabled={addFollowUpMutation.isPending} 
										className="w-full text-xs font-black bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-9.5 cursor-pointer shadow-xs active:scale-98 transition-all"
									>
										{addFollowUpMutation.isPending ? "Logging..." : "Log Follow-Up Action"}
									</Button>
								</form>
							)}

							{/* History list */}
							<div className="space-y-4 pt-1">
								<h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Log History</h4>
								{loadingFollowUps ? (
									<div className="flex justify-center py-6">
										<Loader2 className="h-5 w-5 animate-spin text-teal-500" />
									</div>
								) : !followUps || followUps.length === 0 ? (
									<div className="border border-dashed border-zinc-200 rounded-2xl p-8 text-center bg-zinc-50/20">
										<Clock className="h-7 w-7 text-zinc-300 mx-auto mb-2" />
										<p className="text-xs font-black text-zinc-600 uppercase tracking-wide">No follow-ups logged</p>
										<p className="text-[10px] text-zinc-400 mt-1">Record the customer interactions to view progress.</p>
									</div>
								) : (
									<div className="relative pl-5 border-l-2 border-zinc-200/80 space-y-5">
										{followUps.map((fu: any) => (
											<div key={fu.id} className="relative space-y-1.5 group">
												<div className="absolute -left-[27px] top-0.5 bg-white border-2 border-zinc-200 rounded-full p-1 group-hover:border-teal-500 group-hover:bg-teal-50 transition-all duration-300">
													<Clock className="h-3 w-3 text-zinc-400 group-hover:text-teal-650 transition-colors" />
												</div>
												<div className="flex items-center justify-between">
													<Badge variant="outline" className="text-[9px] font-black tracking-wide bg-zinc-50 border-zinc-200 text-zinc-655 px-2 py-0">
														{fu.follow_up_type.toUpperCase()}
													</Badge>
													<span className="text-[10px] text-zinc-400 font-bold font-mono">{fu.follow_up_date}</span>
												</div>
												<p className="text-xs font-bold text-zinc-800">{fu.outcome}</p>
												{fu.notes && (
													<p className="text-xs text-zinc-500 italic bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-100 font-medium">
														"{fu.notes}"
													</p>
												)}
												<div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
													<span>Logged by {fu.followed_by_name}</span>
													<span>Stage: {fu.pipeline_stage_at_time || "new"}</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Tab: Site Visits */}
					{activeTab === "visits" && (
						<div className="space-y-5">
							{/* Form */}
							{enquiry.is_active && (
								<form onSubmit={handleScheduleSiteVisit} className="bg-zinc-50/50 border border-zinc-200/70 rounded-2xl p-4 space-y-3.5 shadow-xs">
									<h4 className="text-xs font-black text-zinc-700 flex items-center gap-1.5 uppercase tracking-wide">
										<Plus className="h-4 w-4 text-teal-500" /> Schedule Site Visit
									</h4>
									<div className="grid grid-cols-2 gap-3">
										<select
											value={svProject}
											onChange={(e) => setSvProject(e.target.value)}
											className="text-xs h-9 border border-zinc-200/80 bg-white rounded-xl px-2.5 font-bold outline-none cursor-pointer hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all"
											required
										>
											<option value="">🏢 Select Project</option>
											{projects.map((p) => (
												<option key={p.id} value={p.id}>
													🏢 {p.name}
												</option>
											))}
										</select>
										<Input
											type="date"
											value={svDate}
											onChange={(e) => setSvDate(e.target.value)}
											className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
											required
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<Input
											type="time"
											value={svTime}
											onChange={(e) => setSvTime(e.target.value)}
											className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
										/>
										<select
											value={svConductedBy}
											onChange={(e) => setSvConductedBy(e.target.value)}
											className="text-xs h-9 border border-zinc-200/80 bg-white rounded-xl px-2.5 font-bold outline-none cursor-pointer hover:border-zinc-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/8 transition-all"
										>
											<option value="">👤 Conducted By</option>
											{advisors.map((adv) => (
												<option key={adv.id} value={adv.id}>
													👤 {adv.name}
												</option>
											))}
										</select>
									</div>
									<Input
										value={svAccompaniedBy}
										onChange={(e) => setSvAccompaniedBy(e.target.value)}
										placeholder="Accompanied by (e.g. Spouse)"
										className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
									/>
									<Textarea
										value={svNotes}
										onChange={(e) => setSvNotes(e.target.value)}
										placeholder="Specific plot requests or notes..."
										rows={2}
										className="text-xs border-zinc-200/80 rounded-xl font-medium bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
									/>
									<Button 
										size="sm" 
										type="submit" 
										disabled={scheduleSiteVisitMutation.isPending} 
										className="w-full text-xs font-black bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-9.5 cursor-pointer shadow-xs active:scale-98 transition-all"
									>
										{scheduleSiteVisitMutation.isPending ? "Scheduling..." : "Schedule Site Visit"}
									</Button>
								</form>
							)}

							{/* Site Visits list */}
							<div className="space-y-4 pt-1">
								<h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Site Visits History</h4>
								{loadingSiteVisits ? (
									<div className="flex justify-center py-6">
										<Loader2 className="h-5 w-5 animate-spin text-teal-500" />
									</div>
								) : !siteVisits || siteVisits.length === 0 ? (
									<div className="border border-dashed border-zinc-200 rounded-2xl p-8 text-center bg-zinc-50/20">
										<Calendar className="h-7 w-7 text-zinc-300 mx-auto mb-2" />
										<p className="text-xs font-black text-zinc-605 uppercase tracking-wide">No visits scheduled</p>
										<p className="text-[10px] text-zinc-400 mt-1">Schedule a site visit to manage client interest.</p>
									</div>
								) : (
									<div className="space-y-3.5">
										{siteVisits.map((v: any) => (
											<div key={v.id} className="border border-zinc-200/85 rounded-2xl p-4 space-y-3.5 bg-white hover:border-zinc-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all duration-200">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100/50">
															<Calendar className="h-4 w-4" />
														</div>
														<span className="text-xs font-extrabold text-zinc-800">
															{v.scheduled_date} {v.scheduled_time || ""}
														</span>
													</div>
													<Badge
														variant="outline"
														className={cn(
															"text-[9px] font-extrabold px-2 py-0 rounded-full border shadow-inner",
															v.status === "completed"
																? "bg-green-50 text-green-700 border-green-200/50"
																: v.status === "cancelled" || v.status === "no_show"
																? "bg-red-50 text-red-700 border-red-200/50"
																: "bg-blue-50 text-blue-700 border-blue-200/50"
														)}
													>
														{v.status.toUpperCase()}
													</Badge>
												</div>

												<div className="text-xs font-medium text-zinc-650 bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 space-y-1">
													<p>🏢 Project: <span className="font-bold text-zinc-800">{v.project_name || "—"}</span></p>
													{v.conducted_by_name && (
														<p>👤 Conducted By: <span className="font-bold text-zinc-800">{v.conducted_by_name}</span></p>
													)}
													{v.accompanied_by && (
														<p>👥 Accompanied By: <span className="font-bold text-zinc-800">{v.accompanied_by}</span></p>
													)}
													{v.notes && (
														<p className="italic text-zinc-500 border-t border-zinc-200/50 pt-1.5 mt-1.5">
															"{v.notes}"
														</p>
													)}
												</div>

												{v.status === "scheduled" && enquiry.is_active && (
													<div className="space-y-3 pt-2.5 border-t border-zinc-100">
														{completingVisitId === v.id ? (
															<div className="space-y-3 pt-1">
																<Input
																	value={svFeedback}
																	onChange={(e) => setSvFeedback(e.target.value)}
																	placeholder="Feedback from customer..."
																	className="h-9 text-xs border-zinc-200/80 rounded-xl font-bold bg-white focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500"
																/>
																<div className="flex items-center justify-between text-xs font-bold text-zinc-700">
																	<span>Interest Level (1-5):</span>
																	<select
																		value={svInterest}
																		onChange={(e) => setSvInterest(Number(e.target.value))}
																		className="h-8 border border-zinc-200/80 rounded-xl px-2 font-extrabold outline-none bg-white cursor-pointer"
																	>
																		{[1, 2, 3, 4, 5].map((n) => (
																			<option key={n} value={n}>
																				⭐ {n} Star{n > 1 ? "s" : ""}
																			</option>
																		))}
																	</select>
																</div>
																<div className="flex gap-2 justify-end">
																	<Button size="xs" variant="outline" className="rounded-xl border-zinc-250 font-bold text-xs h-8 cursor-pointer" onClick={() => setCompletingVisitId(null)}>
																		Cancel
																	</Button>
																	<Button size="xs" className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs h-8 cursor-pointer shadow-xs" onClick={() => handleCompleteVisit(v.id)}>
																		Submit Completion
																	</Button>
																</div>
															</div>
														) : (
															<div className="flex gap-3">
																<Button size="xs" variant="outline" className="flex-1 text-[10px] font-black border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl h-8 cursor-pointer" onClick={() => handleCancelVisit(v.id)}>
																	Cancel / No Show
																</Button>
																<Button size="xs" className="flex-1 text-[10px] font-black bg-green-650 hover:bg-green-700 text-white rounded-xl h-8 cursor-pointer shadow-xs" onClick={() => setCompletingVisitId(v.id)}>
																	Mark Complete
																</Button>
															</div>
														)}
													</div>
												)}

												{v.status === "completed" && (
													<div className="text-[11px] text-zinc-550 bg-green-50/30 p-3 rounded-xl border border-green-100/50 space-y-1.5">
														<div className="flex items-center gap-1 font-bold text-zinc-800 text-[11px]">
															<span>Interest Rating:</span>
															<span className="text-amber-500 font-mono">{"★".repeat(v.interest_level || 3)}</span>
															<span className="text-zinc-300 font-mono">{"★".repeat(5 - (v.interest_level || 3))}</span>
														</div>
														{v.customer_feedback && (
															<p className="italic font-medium">Customer Feedback: "{v.customer_feedback}"</p>
														)}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Tab: Details & Notes */}
					{activeTab === "notes" && (
						<div className="space-y-5 text-xs text-zinc-700">
							<div className="space-y-3 border-b border-zinc-200/80 pb-4">
								<h4 className="font-black text-zinc-400 uppercase text-[9px] tracking-wider">Lead Requirements</h4>
								<div className="grid grid-cols-2 gap-4 bg-zinc-50/40 p-3.5 rounded-2xl border border-zinc-200/50">
									<div>
										<span className="text-[10px] text-zinc-405 font-bold block">Property Type</span>
										<span className="font-extrabold text-zinc-800">{enquiry.property_type || "—"}</span>
									</div>
									<div>
										<span className="text-[10px] text-zinc-405 font-bold block">Segment</span>
										<span className="font-extrabold text-zinc-800">{enquiry.segment || "—"}</span>
									</div>
									<div className="col-span-2 border-t border-zinc-150 pt-2.5 mt-1.5">
										<span className="text-[10px] text-zinc-405 font-bold block">Preferred Location</span>
										<span className="font-extrabold text-zinc-800">{enquiry.preferred_location || "—"}</span>
									</div>
									<div className="col-span-2 border-t border-zinc-150 pt-2.5">
										<span className="text-[10px] text-zinc-405 font-bold block">BHK / Size Requirement</span>
										<span className="font-extrabold text-zinc-800">{enquiry.bhk_size_requirement || "—"}</span>
									</div>
								</div>
							</div>

							<div className="space-y-3 border-b border-zinc-200/80 pb-4">
								<h4 className="font-black text-zinc-400 uppercase text-[9px] tracking-wider">Personal Info</h4>
								<div className="space-y-3 bg-zinc-50/40 p-3.5 rounded-2xl border border-zinc-200/50">
									<div className="flex items-center gap-3">
										<div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
											<Mail className="h-4 w-4 text-zinc-550" />
										</div>
										<div className="min-w-0">
											<span className="text-[9px] text-zinc-450 font-bold block">Email ID</span>
											<span className="font-bold text-zinc-850 truncate block">{enquiry.email_id || "No email provided"}</span>
										</div>
									</div>
									<div className="flex items-center gap-3 border-t border-zinc-150 pt-2.5">
										<div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
											<MapPin className="h-4 w-4 text-zinc-550" />
										</div>
										<div className="min-w-0">
											<span className="text-[9px] text-zinc-455 font-bold block">Address</span>
											<span className="font-bold text-zinc-855 break-words block">{enquiry.address || "No address provided"}</span>
										</div>
									</div>
									<div className="flex items-center gap-3 border-t border-zinc-150 pt-2.5">
										<div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
											<Calendar className="h-4 w-4 text-zinc-550" />
										</div>
										<div className="min-w-0">
											<span className="text-[9px] text-zinc-455 font-bold block">Birthdate</span>
											<span className="font-bold text-zinc-855 block">{enquiry.birth_date || "—"}</span>
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="font-black text-zinc-400 uppercase text-[9px] tracking-wider">Notes & Remarks</h4>
								<div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/70 italic text-zinc-650 font-medium leading-relaxed shadow-inner">
									"{enquiry.details || "No notes logged for this lead."}"
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
