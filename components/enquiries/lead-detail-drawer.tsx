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
} from "lucide-react";
import { Button, Input, Textarea, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";

type LeadDetailDrawerProps = {
	open: boolean;
	onClose: () => void;
	enquiry: any;
	projects: Array<{ id: string; name: string }>;
	advisors: Array<{ id: string; name: string }>;
	onUpdated?: () => void;
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
				<div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
					<div>
						<h2 className="text-base font-bold text-zinc-900">{enquiry.name}</h2>
						<p className="text-xs font-mono text-zinc-500">{enquiry.phone}</p>
					</div>
					<button className="p-1 rounded-full hover:bg-zinc-200 text-zinc-500" onClick={onClose}>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto p-5 space-y-6">
					{/* Stage & Advisor Controls */}
					<div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
						<div className="space-y-1">
							<span className="text-[10px] font-bold uppercase text-zinc-400">Stage</span>
							<select
								value={enquiry.pipeline_stage}
								onChange={(e) => updateStageMutation.mutate({ stage: e.target.value })}
								className="w-full text-xs h-8 rounded border border-zinc-200 bg-white px-2 font-medium"
							>
								<option value="new">New</option>
								<option value="contacted">Contacted</option>
								<option value="follow_up">Follow Up</option>
								<option value="site_visit">Site Visit</option>
								<option value="negotiation">Negotiation</option>
								<option value="converted">Converted</option>
								<option value="lost">Lost</option>
							</select>
						</div>

						<div className="space-y-1">
							<span className="text-[10px] font-bold uppercase text-zinc-400">Advisor</span>
							<select
								value={enquiry.assigned_advisor_id || ""}
								onChange={(e) => assignAdvisorMutation.mutate(e.target.value)}
								className="w-full text-xs h-8 rounded border border-zinc-200 bg-white px-2"
							>
								<option value="">Unassigned</option>
								{advisors.map((adv) => (
									<option key={adv.id} value={adv.id}>
										{adv.name}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Lead Metrics summary */}
					<div className="grid grid-cols-2 gap-3">
						<div className="border border-zinc-100 p-2.5 rounded-md flex items-center gap-2">
							<DollarSign className="h-4 w-4 text-zinc-400" />
							<div>
								<p className="text-[10px] text-zinc-400 uppercase font-semibold">Budget Limit</p>
								<p className="text-xs font-bold text-zinc-700">
									{enquiry.budget_max ? formatCurrency(enquiry.budget_max) : "—"}
								</p>
							</div>
						</div>
						<div className="border border-zinc-100 p-2.5 rounded-md flex items-center gap-2">
							<Briefcase className="h-4 w-4 text-zinc-400" />
							<div>
								<p className="text-[10px] text-zinc-400 uppercase font-semibold">Source</p>
								<p className="text-xs font-bold text-zinc-700 capitalize">
									{enquiry.lead_source || "Other"}
								</p>
							</div>
						</div>
					</div>

					{/* Action bar */}
					{enquiry.is_active && (
						<div className="flex gap-2 justify-stretch">
							<Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleMarkLost}>
								Mark as Lost
							</Button>
							<Button size="sm" className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConvertLead}>
								Convert to Customer
							</Button>
						</div>
					)}

					{/* Tabs header */}
					<div className="border-b border-zinc-100 flex gap-4 text-xs font-semibold">
						<button
							onClick={() => setActiveTab("history")}
							className={`pb-2 border-b-2 transition-all ${
								activeTab === "history" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
							}`}
						>
							Follow-ups
						</button>
						<button
							onClick={() => setActiveTab("visits")}
							className={`pb-2 border-b-2 transition-all ${
								activeTab === "visits" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
							}`}
						>
							Site Visits
						</button>
						<button
							onClick={() => setActiveTab("notes")}
							className={`pb-2 border-b-2 transition-all ${
								activeTab === "notes" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
							}`}
						>
							Details & Notes
						</button>
					</div>

					{/* Tab: Follow Ups */}
					{activeTab === "history" && (
						<div className="space-y-4">
							{/* Form */}
							{enquiry.is_active && (
								<form onSubmit={handleLogFollowUp} className="bg-zinc-50 border border-zinc-100 rounded-md p-3 space-y-3">
									<h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1">
										<Plus className="h-3.5 w-3.5" /> Log Follow-up Action
									</h4>
									<div className="grid grid-cols-2 gap-2">
										<select
											value={fuType}
											onChange={(e) => setFuType(e.target.value)}
											className="text-xs h-8 border border-zinc-200 bg-white rounded px-2 w-full"
										>
											<option value="call">Call</option>
											<option value="whatsapp">WhatsApp</option>
											<option value="email">Email</option>
											<option value="meeting">Meeting</option>
										</select>
										<Input
											type="date"
											value={nextFuDate}
											onChange={(e) => setNextFuDate(e.target.value)}
											className="h-8 text-xs border-zinc-200"
											placeholder="Next follow-up date"
										/>
									</div>
									<Input
										value={fuOutcome}
										onChange={(e) => setFuOutcome(e.target.value)}
										placeholder="Outcome / status (e.g. Call connected)"
										className="h-8 text-xs border-zinc-200"
									/>
									<Textarea
										value={fuNotes}
										onChange={(e) => setFuNotes(e.target.value)}
										placeholder="Conversation details..."
										rows={2}
										className="text-xs border-zinc-200"
									/>
									<Button size="sm" type="submit" disabled={addFollowUpMutation.isPending} className="w-full text-xs">
										{addFollowUpMutation.isPending ? "Logging..." : "Log Follow-Up"}
									</Button>
								</form>
							)}

							{/* History list */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold text-zinc-500 uppercase">Log History</h4>
								{loadingFollowUps ? (
									<Loader2 className="h-4 w-4 animate-spin text-zinc-400 mx-auto" />
								) : !followUps || followUps.length === 0 ? (
									<p className="text-xs text-zinc-400 text-center py-4">No follow-ups recorded yet.</p>
								) : (
									<div className="relative pl-4 border-l-2 border-zinc-100 space-y-4">
										{followUps.map((fu: any) => (
											<div key={fu.id} className="relative space-y-1">
												<div className="absolute -left-[21px] top-1 bg-white border-2 border-zinc-200 rounded-full p-0.5">
													<Clock className="h-2.5 w-2.5 text-zinc-400" />
												</div>
												<div className="flex items-center justify-between">
													<Badge variant="outline" className="text-[10px] font-normal font-mono capitalize">
														{fu.follow_up_type}
													</Badge>
													<span className="text-[10px] text-zinc-400">{fu.follow_up_date}</span>
												</div>
												<p className="text-xs font-semibold text-zinc-800">{fu.outcome}</p>
												{fu.notes && <p className="text-xs text-zinc-500 italic">"{fu.notes}"</p>}
												<p className="text-[10px] text-zinc-400">
													Logged by {fu.followed_by_name} • Stage: {fu.pipeline_stage_at_time || "new"}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Tab: Site Visits */}
					{activeTab === "visits" && (
						<div className="space-y-4">
							{/* Form */}
							{enquiry.is_active && (
								<form onSubmit={handleScheduleSiteVisit} className="bg-zinc-50 border border-zinc-100 rounded-md p-3 space-y-3">
									<h4 className="text-xs font-bold text-zinc-700 flex items-center gap-1">
										<Plus className="h-3.5 w-3.5" /> Schedule Site Visit
									</h4>
									<div className="grid grid-cols-2 gap-2">
										<select
											value={svProject}
											onChange={(e) => setSvProject(e.target.value)}
											className="text-xs h-8 border border-zinc-200 bg-white rounded px-2 w-full"
											required
										>
											<option value="">Select Project</option>
											{projects.map((p) => (
												<option key={p.id} value={p.id}>
													{p.name}
												</option>
											))}
										</select>
										<Input
											type="date"
											value={svDate}
											onChange={(e) => setSvDate(e.target.value)}
											className="h-8 text-xs border-zinc-200"
											required
										/>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<Input
											type="time"
											value={svTime}
											onChange={(e) => setSvTime(e.target.value)}
											className="h-8 text-xs border-zinc-200"
										/>
										<select
											value={svConductedBy}
											onChange={(e) => setSvConductedBy(e.target.value)}
											className="text-xs h-8 border border-zinc-200 bg-white rounded px-2 w-full"
										>
											<option value="">Conducted By</option>
											{advisors.map((adv) => (
												<option key={adv.id} value={adv.id}>
													{adv.name}
												</option>
											))}
										</select>
									</div>
									<Input
										value={svAccompaniedBy}
										onChange={(e) => setSvAccompaniedBy(e.target.value)}
										placeholder="Accompanied by (e.g. Spouse)"
										className="h-8 text-xs border-zinc-200"
									/>
									<Textarea
										value={svNotes}
										onChange={(e) => setSvNotes(e.target.value)}
										placeholder="Specific plot requests or notes..."
										rows={2}
										className="text-xs border-zinc-200"
									/>
									<Button size="sm" type="submit" disabled={scheduleSiteVisitMutation.isPending} className="w-full text-xs">
										{scheduleSiteVisitMutation.isPending ? "Scheduling..." : "Schedule Visit"}
									</Button>
								</form>
							)}

							{/* Site Visits list */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold text-zinc-500 uppercase">Site Visits</h4>
								{loadingSiteVisits ? (
									<Loader2 className="h-4 w-4 animate-spin text-zinc-400 mx-auto" />
								) : !siteVisits || siteVisits.length === 0 ? (
									<p className="text-xs text-zinc-400 text-center py-4">No visits scheduled yet.</p>
								) : (
									<div className="space-y-3">
										{siteVisits.map((v: any) => (
											<div key={v.id} className="border border-zinc-100 rounded p-3 space-y-2 bg-white">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-1.5">
														<Calendar className="h-4 w-4 text-zinc-400" />
														<span className="text-xs font-semibold text-zinc-700">
															{v.scheduled_date} {v.scheduled_time || ""}
														</span>
													</div>
													<Badge
														variant="outline"
														className={`text-[10px] font-normal uppercase ${
															v.status === "completed"
																? "bg-green-50 text-green-700 border-green-200"
																: v.status === "cancelled" || v.status === "no_show"
																? "bg-red-50 text-red-700 border-red-200"
																: "bg-blue-50 text-blue-700 border-blue-200"
														}`}
													>
														{v.status}
													</Badge>
												</div>

												<p className="text-xs text-zinc-600">
													Project: <span className="font-semibold">{v.project_name || "—"}</span>
												</p>

												{v.status === "scheduled" && enquiry.is_active && (
													<div className="space-y-2 pt-1 border-t border-zinc-50">
														{completingVisitId === v.id ? (
															<div className="space-y-2 pt-1">
																<Input
																	value={svFeedback}
																	onChange={(e) => setSvFeedback(e.target.value)}
																	placeholder="Feedback from customer"
																	className="h-8 text-xs border-zinc-200"
																/>
																<div className="flex items-center justify-between text-xs">
																	<span>Interest Level (1-5):</span>
																	<select
																		value={svInterest}
																		onChange={(e) => setSvInterest(Number(e.target.value))}
																		className="h-7 border border-zinc-200 rounded px-1"
																	>
																		{[1, 2, 3, 4, 5].map((n) => (
																			<option key={n} value={n}>
																				{n}
																			</option>
																		))}
																	</select>
																</div>
																<div className="flex gap-1.5 justify-end">
																	<Button size="xs" variant="outline" onClick={() => setCompletingVisitId(null)}>
																		Cancel
																	</Button>
																	<Button size="xs" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCompleteVisit(v.id)}>
																		Submit Completion
																	</Button>
																</div>
															</div>
														) : (
															<div className="flex gap-2">
																<Button size="xs" variant="outline" className="flex-1 text-[10px] text-red-600 hover:text-red-700" onClick={() => handleCancelVisit(v.id)}>
																	Cancel / No Show
																</Button>
																<Button size="xs" className="flex-1 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => setCompletingVisitId(v.id)}>
																	Mark Complete
																</Button>
															</div>
														)}
													</div>
												)}

												{v.status === "completed" && (
													<div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded space-y-1">
														<p>Interest Rating: {"★".repeat(v.interest_level || 3)}</p>
														{v.customer_feedback && <p>Feedback: "{v.customer_feedback}"</p>}
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
						<div className="space-y-4 text-xs text-zinc-700">
							<div className="space-y-2 border-b border-zinc-100 pb-3">
								<h4 className="font-bold text-zinc-500 uppercase text-[10px]">Lead Requirements</h4>
								<div className="grid grid-cols-2 gap-2">
									<p>Property Type: <span className="font-semibold">{enquiry.property_type || "—"}</span></p>
									<p>Segment: <span className="font-semibold">{enquiry.segment || "—"}</span></p>
									<p>Preferred Location: <span className="font-semibold">{enquiry.preferred_location || "—"}</span></p>
									<p>BHK / Size: <span className="font-semibold">{enquiry.bhk_size_requirement || "—"}</span></p>
								</div>
							</div>

							<div className="space-y-2 border-b border-zinc-100 pb-3">
								<h4 className="font-bold text-zinc-500 uppercase text-[10px]">Personal Info</h4>
								<div className="space-y-1.5">
									<p className="flex items-center gap-1.5">
										<Mail className="h-3.5 w-3.5 text-zinc-400" /> {enquiry.email_id || "No email"}
									</p>
									<p className="flex items-center gap-1.5">
										<MapPin className="h-3.5 w-3.5 text-zinc-400" /> {enquiry.address || "No address"}
									</p>
									<p className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5 text-zinc-400" /> Birthdate: {enquiry.birth_date || "—"}
									</p>
								</div>
							</div>

							<div className="space-y-2">
								<h4 className="font-bold text-zinc-500 uppercase text-[10px]">Notes</h4>
								<div className="bg-zinc-50 p-3 rounded-md border border-zinc-100 italic text-zinc-600">
									{enquiry.details || "No notes logged for this lead."}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
