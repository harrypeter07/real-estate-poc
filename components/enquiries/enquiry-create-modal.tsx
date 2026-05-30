"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, AlertCircle, User, Building, FileText, Calendar, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	SearchableCombobox,
	Textarea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import type { EnquiryCustomerFormValues } from "@/lib/validations/enquiry";
import { createEnquiryCustomer, getTempCustomersByPhone } from "@/app/actions/enquiries";
import { cn } from "@/lib/utils";
import { isDev } from "@/lib/is-dev";

const CATEGORY_OPTIONS = [
	"General",
	"Site Visit",
	"WhatsApp",
	"Website",
	"Instagram",
	"Booking",
	"Follow-up",
	"Referral",
	"Other",
] as const;

export function EnquiryCreateModal({
	open,
	onOpenChange,
	projects,
	advisors,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: Array<{ id: string; name: string }>;
	advisors: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");

	const emptyForm: Omit<EnquiryCustomerFormValues, "is_active"> & { is_active: boolean } = {
		name: "",
		phone: "",
		alternate_phone: "",
		address: "",
		email_id: null,
		birth_date: null,
		project_id: null,
		category: "General",
		property_type: null,
		segment: null,
		budget_min: null,
		budget_max: null,
		preferred_location: null,
		bhk_size_requirement: null,
		assigned_advisor_id: null,
		details: "",
		is_active: true,
		follow_up_date: null,
		enquiry_status: "new",
	};

	const [form, setForm] = useState<Omit<EnquiryCustomerFormValues, "is_active"> & { is_active: boolean }>({
		...emptyForm,
	});

	const [tempCustomers, setTempCustomers] = useState<
		Array<{
			id: string;
			name: string;
			phone: string;
			alternate_phone: string | null;
			address: string | null;
			birth_date: string | null;
		}>
	>([]);
	const [selectedTempCustomerId, setSelectedTempCustomerId] = useState<string>("none");

	// When user clicks "New Enquiry" again, ensure we start with a fresh form.
	useEffect(() => {
		if (!open) return;
		setForm({ ...emptyForm });
		setTempCustomers([]);
		setSelectedTempCustomerId("none");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const projectOptions = useMemo(
		() =>
			projects.map((p) => ({
				id: p.id,
				name: p.name,
			})),
		[projects]
	);

	// When phone becomes 10 digits, load matching temporary customers.
	useEffect(() => {
		const phone = form.phone.replace(/\D/g, "");
		if (phone.length !== 10) {
			setTempCustomers([]);
			setSelectedTempCustomerId("none");
			return;
		}

		void (async () => {
			try {
				const rows = await getTempCustomersByPhone(phone);
				setTempCustomers(rows);

				if (rows.length > 0) {
					const first = rows[0];
					setSelectedTempCustomerId(first.id);
					setForm((s) => ({
						...s,
						// Fill ONLY customer fields.
						name: first.name ?? s.name,
						alternate_phone: first.alternate_phone ?? "",
						address: first.address ?? "",
						birth_date: (first.birth_date ?? null) as any,
						phone: first.phone ?? s.phone,
					}));
				} else {
					setSelectedTempCustomerId("none");
				}
			} catch {
				setTempCustomers([]);
				setSelectedTempCustomerId("none");
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.phone]);

	// If user manually picks a temp customer, fill customer-related fields only.
	useEffect(() => {
		if (selectedTempCustomerId === "none") return;
		const found = tempCustomers.find((c) => c.id === selectedTempCustomerId);
		if (!found) return;

		setForm((s) => ({
			...s,
			name: found.name ?? s.name,
			alternate_phone: found.alternate_phone ?? "",
			address: found.address ?? "",
			birth_date: (found.birth_date ?? null) as any,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTempCustomerId]);

	async function onSubmit() {
		setSaving(true);
		setSubmitStatus("idle");
		setStatusText("");
		const playSubmitTone = (kind: "success" | "error") => {
			if (typeof window === "undefined") return;
			try {
				const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
				if (!AudioCtx) return;
				const ctx = new AudioCtx();
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.value = kind === "success" ? 740 : 220;
				gain.gain.value = 0.0001;
				osc.connect(gain);
				gain.connect(ctx.destination);
				const now = ctx.currentTime;
				gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.15));
				osc.start(now);
				osc.stop(now + (kind === "success" ? 0.22 : 0.17));
				setTimeout(() => void ctx.close(), 300);
			} catch {}
		};
		try {
			const res = await createEnquiryCustomer({
				...form,
				email_id: form.email_id || null,
				birth_date: form.birth_date || null,
				project_id: form.project_id || null,
				property_type: form.property_type || null,
				segment: form.segment || null,
				budget_min: form.budget_min ?? null,
				budget_max: form.budget_max ?? null,
				preferred_location: form.preferred_location || null,
				bhk_size_requirement: form.bhk_size_requirement || null,
				assigned_advisor_id: form.assigned_advisor_id || null,
				alternate_phone: form.alternate_phone || "",
				details: form.details || "",
				follow_up_date: form.follow_up_date || null,
				enquiry_status: form.enquiry_status ?? "new",
			} as any);

			if (!res.success) {
				toast.error("Enquiry creation failed", { description: res.error });
				setSubmitStatus("error");
				setStatusText(res.error ?? "Failed to create enquiry");
				playSubmitTone("error");
				return;
			}

			toast.success("Enquiry created successfully!");
			setSubmitStatus("success");
			setStatusText("Enquiry created successfully.");
			playSubmitTone("success");
			// Clear local form so next open starts empty.
			setForm({ ...emptyForm });
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0 border border-zinc-200/80 shadow-2xl rounded-2xl bg-white backdrop-blur-md">
				{/* Modal Header */}
				<DialogHeader className="shrink-0 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white px-6 py-5 flex flex-row items-center justify-between gap-3 text-left relative">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center text-teal-600 shadow-xs">
							<Plus className="h-5 w-5" />
						</div>
						<div>
							<DialogTitle className="text-base font-black text-zinc-800 tracking-tight flex items-center gap-2">
								New Enquiry
							</DialogTitle>
							<p className="text-[11px] text-zinc-400 font-medium mt-0.5">Create a prospective customer enquiry into CRM pipeline.</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isDev ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									const names = [
										"Vijay Sharma",
										"Rahul Gupta",
										"Sunita Bai",
										"Ganesh Raut",
										"Deepak Tighare",
										"Manisha Kolhe",
										"Arjun Patil",
										"Priya Nair",
									];
									const routes = ["Wardha Road", "Hingna", "Besa", "Manish Nagar", "MIHAN", "Koradi"];
									const routesPick = routes[Math.floor(Math.random() * routes.length)];
									const name = names[Math.floor(Math.random() * names.length)];
									const phone = String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10);
									const altPhone = String(Math.floor(Math.random() * 9000000000) + 1000000000).slice(0, 10);
									const category = CATEGORY_OPTIONS[Math.floor(Math.random() * CATEGORY_OPTIONS.length)];
									const details = `Interested in plots near ${routesPick}. Preferred contact time: Evening.`;
									const projectPick = projects.length
										? projects[Math.floor(Math.random() * projects.length)].id
										: null;

									// Force dropdown to reload on phone change.
									setTempCustomers([]);
									setSelectedTempCustomerId("none");
									setForm({
										name,
										phone,
										alternate_phone: altPhone,
										address: `Plot No ${Math.floor(Math.random() * 500) + 1}, ${routesPick}, Nagpur`,
										email_id: null,
										birth_date: "1990-08-20",
										project_id: projectPick,
										category,
										property_type: null,
										segment: null,
										budget_min: null,
										budget_max: null,
										preferred_location: routesPick,
										bhk_size_requirement: null,
										assigned_advisor_id: null,
										details,
										is_active: true,
										follow_up_date: null,
										enquiry_status: "new",
									});
								}}
								className="h-8.5 text-[11px] font-black border-teal-200/80 hover:border-teal-300 text-teal-700 bg-teal-50/30 hover:bg-teal-50/50 rounded-xl shadow-xs transition-all cursor-pointer px-3"
							>
								<Sparkles className="h-3.5 w-3.5 mr-1 text-teal-600" />
								Fill Mock Data
							</Button>
						) : null}
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-8.5 text-[11px] font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer px-4"
						>
							Close
						</Button>
					</div>
				</DialogHeader>

				{/* Modal Body */}
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 bg-zinc-50/30 space-y-6">
					
					{/* Section 1: 👤 Personal Information */}
					<div className="bg-white border border-zinc-200/60 rounded-2xl p-4.5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
						<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
							<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<User className="h-4 w-4" />
							</div>
							<h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Personal Information</h4>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Name</label>
								<Input
									value={form.name}
									onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
									placeholder="e.g. Rahul Gupta"
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Phone</label>
								<Input
									value={form.phone}
									inputMode="numeric"
									placeholder="10 digits"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											phone: e.target.value.replace(/\D/g, "").slice(0, 10),
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>

								{tempCustomers.length > 0 && (
									<div className="space-y-1.5 pt-2 border-t border-dashed border-zinc-100 mt-2">
										<label className="text-[9px] font-black uppercase tracking-wider text-teal-650 block">Match Temporary Customer</label>
										<SearchableCombobox
											value={selectedTempCustomerId}
											onChange={(v) => setSelectedTempCustomerId(v || "none")}
											placeholder="Search temp customer by name/phone"
											options={tempCustomers.map((c) => ({
												value: c.id,
												label: c.name,
												subtitle: c.phone,
												keywords: `${c.name} ${c.phone}`,
											}))}
										/>
									</div>
								)}
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Alternate Phone</label>
								<Input
									value={form.alternate_phone}
									inputMode="numeric"
									placeholder="optional"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											alternate_phone: e.target.value.replace(/\D/g, "").slice(0, 10),
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Email ID</label>
								<Input
									value={form.email_id ?? ""}
									placeholder="customer@email.com"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											email_id: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Birth Date</label>
								<Input
									type="date"
									value={form.birth_date ?? ""}
									onChange={(e) =>
										setForm((s) => ({
											...s,
											birth_date: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">City / Location</label>
								<Input
									value={form.address ?? ""}
									placeholder="e.g. Besa, Nagpur"
									onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
						</div>
					</div>

					{/* Section 2: 🏠 Requirement Details */}
					<div className="bg-white border border-zinc-200/60 rounded-2xl p-4.5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
						<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
							<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<Building className="h-4 w-4" />
							</div>
							<h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Requirement Details</h4>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Project</label>
								<SearchableCombobox
									value={form.project_id ?? ""}
									onChange={(v) =>
										setForm((s) => ({
											...s,
											project_id: v || null,
										}))
									}
									placeholder="Search project (optional)"
									options={[
										{ value: "", label: "No project", subtitle: "Optional" },
										...projectOptions.map((p) => ({
											value: p.id,
											label: p.name,
											keywords: p.name,
										})),
									]}
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">How did they find us?</label>
								<Select
									value={form.category}
									onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}
								>
									<SelectTrigger className="h-10 rounded-xl border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 transition-all cursor-pointer">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl border border-zinc-200 bg-white text-xs font-bold shadow-lg">
										{CATEGORY_OPTIONS.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Property Type</label>
								<Input
									value={form.property_type ?? ""}
									placeholder="e.g. Flats"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											property_type: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Segment</label>
								<Input
									value={form.segment ?? ""}
									placeholder="e.g. Mid"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											segment: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Budget Min (₹)</label>
								<Input
									type="number"
									value={form.budget_min ?? ""}
									placeholder="e.g. 2000000"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											budget_min:
												e.target.value === "" ? null : Number(e.target.value),
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Budget Max (₹)</label>
								<Input
									type="number"
									value={form.budget_max ?? ""}
									placeholder="e.g. 5000000"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											budget_max:
												e.target.value === "" ? null : Number(e.target.value),
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Preferred Location</label>
								<Input
									value={form.preferred_location ?? ""}
									placeholder="e.g. Besa"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											preferred_location: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">BHK / Size Requirement</label>
								<Input
									value={form.bhk_size_requirement ?? ""}
									placeholder="e.g. 2BHK, 1200 sqft"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											bhk_size_requirement: e.target.value || null,
										}))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0"
								/>
							</div>
						</div>
					</div>

					{/* Section 3: 📝 Enquiry details & notes */}
					<div className="bg-white border border-zinc-200/60 rounded-2xl p-4.5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
						<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
							<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<FileText className="h-4 w-4" />
							</div>
							<h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Enquiry Details</h4>
						</div>

						<div className="space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Notes / Requirements details</label>
							<Textarea
								rows={3}
								value={form.details}
								onChange={(e) => setForm((s) => ({ ...s, details: e.target.value }))}
								placeholder="What are they looking for? Any notes / follow-up info."
								className="text-xs font-medium border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all placeholder:text-zinc-400 focus-visible:ring-offset-0 resize-none"
							/>
						</div>
					</div>

					{/* Section 4: 📅 Follow-up & Assignment */}
					<div className="bg-white border border-zinc-200/60 rounded-2xl p-4.5 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
						<div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100">
							<div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50">
								<Calendar className="h-4 w-4" />
							</div>
							<h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Follow-Up & Assignment</h4>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Follow-up date</label>
								<Input
									type="date"
									value={form.follow_up_date ?? ""}
									onChange={(e) =>
										setForm((s) => ({ ...s, follow_up_date: e.target.value || null }))
									}
									className="h-10 text-xs font-bold border-zinc-200 bg-white rounded-xl focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 transition-all focus-visible:ring-offset-0"
								/>
								<p className="text-[10px] text-zinc-400 font-medium leading-normal mt-1">Must be on or after visit date (if applicable).</p>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Assigned Advisor (Admin)</label>
								<SearchableCombobox
									value={form.assigned_advisor_id ?? ""}
									onChange={(v) =>
										setForm((s) => ({ ...s, assigned_advisor_id: v || null }))
									}
									placeholder="Search advisor (optional)"
									options={[
										{ value: "", label: "Unassigned", subtitle: "No advisor" },
										...advisors.map((a) => ({
											value: a.id,
											label: a.name,
											keywords: a.name,
										})),
									]}
								/>
							</div>
						</div>

						{/* Segmented status buttons/chips group */}
						<div className="space-y-2 pt-2 border-t border-zinc-100">
							<label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Pipeline Status</label>
							<div className="flex flex-wrap gap-2.5">
								{(
									[
										["new", "New", "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60", "bg-emerald-600 text-white border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.2)]"],
										["contacted", "Contacted", "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200/60", "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.2)]"],
										["follow_up", "Follow-Up", "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200/60", "bg-amber-600 text-white border-amber-600 shadow-[0_2px_8px_rgba(217,119,6,0.2)]"],
										["joined", "Joined", "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200/60", "bg-purple-600 text-white border-purple-600 shadow-[0_2px_8px_rgba(147,51,234,0.2)]"],
										["not_interested", "Not Interested", "bg-red-50 text-red-700 hover:bg-red-100 border-red-200/60", "bg-red-600 text-white border-red-600 shadow-[0_2px_8px_rgba(220,38,38,0.2)]"],
									] as const
								).map(([value, label, inactiveClasses, activeClasses]) => {
									const isActive = form.enquiry_status === value;
									return (
										<button
											key={value}
											type="button"
											onClick={() =>
												setForm((s) => ({
													...s,
													enquiry_status: value,
												}))
											}
											className={cn(
												"rounded-full border px-4 py-1.5 text-[11px] font-black transition-all duration-300 cursor-pointer shadow-2xs hover:scale-[1.03] active:scale-97",
												isActive ? activeClasses : inactiveClasses
											)}
										>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{/* Modal Footer Actions */}
					<div className="flex justify-end gap-3 pt-3 border-t border-zinc-150/80">
						<Button 
							type="button" 
							variant="outline" 
							onClick={() => onOpenChange(false)}
							className="h-10 text-xs font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs cursor-pointer px-4.5"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={onSubmit}
							disabled={saving}
							className={cn(
								"h-10 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs px-5.5 active:scale-[0.98]",
								saving 
									? "bg-zinc-100 text-zinc-400 border border-zinc-200"
									: "bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)]"
							)}
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin animate-spin" />
									Submitting...
								</>
							) : (
								"SAVE ENQUIRY"
							)}
						</Button>
					</div>

					{submitStatus !== "idle" && (
						<div className={`mt-2 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs animate-in fade-in zoom-in-95 duration-300 ${
							submitStatus === "success"
								? "border-green-200 bg-green-50 text-green-700 font-bold"
								: "border-red-200 bg-red-50 text-red-700 font-bold"
						}`}>
							{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
							<span>{statusText}</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
