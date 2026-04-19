"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import type { EnquiryRow } from "@/app/actions/enquiries";
import { updateEnquiryCustomer } from "@/app/actions/enquiries";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
	"General",
	"Site Visit",
	"WhatsApp",
	"Booking",
	"Follow-up",
	"Referral",
	"Other",
] as const;

const STATUS_OPTIONS = [
	{ value: "new", label: "New" },
	{ value: "contacted", label: "Contacted" },
	{ value: "follow_up", label: "Follow-Up" },
	{ value: "joined", label: "Joined" },
	{ value: "not_interested", label: "Not Interested" },
] as const;

export function EnquiryEditModal({
	open,
	onOpenChange,
	enquiry,
	projects,
	advisors,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enquiry: EnquiryRow | null;
	projects: Array<{ id: string; name: string }>;
	advisors: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<EnquiryCustomerFormValues | null>(null);

	useEffect(() => {
		if (!open || !enquiry) {
			setForm(null);
			return;
		}
		setForm({
			name: enquiry.name,
			phone: enquiry.phone,
			alternate_phone: enquiry.alternate_phone ?? "",
			address: enquiry.address ?? "",
			email_id: enquiry.email_id ?? null,
			birth_date: enquiry.birth_date,
			project_id: enquiry.project_id,
			category: enquiry.category,
			property_type: enquiry.property_type ?? null,
			segment: enquiry.segment ?? null,
			budget_min: enquiry.budget_min,
			budget_max: enquiry.budget_max,
			preferred_location: enquiry.preferred_location ?? null,
			bhk_size_requirement: enquiry.bhk_size_requirement ?? null,
			assigned_advisor_id: enquiry.assigned_advisor_id ?? null,
			details: enquiry.details ?? "",
			is_active: enquiry.is_active,
			follow_up_date: enquiry.follow_up_date,
			enquiry_status: (enquiry.enquiry_status as EnquiryCustomerFormValues["enquiry_status"]) ?? "new",
		});
	}, [open, enquiry]);

	async function onSubmit() {
		if (!form || !enquiry) return;
		setSaving(true);
		try {
			const res = await updateEnquiryCustomer(enquiry.id, {
				...form,
				birth_date: form.birth_date || null,
				project_id: form.project_id || null,
				email_id: form.email_id || null,
				alternate_phone: form.alternate_phone || "",
				property_type: form.property_type || null,
				segment: form.segment || null,
				budget_min: form.budget_min ?? null,
				budget_max: form.budget_max ?? null,
				preferred_location: form.preferred_location || null,
				bhk_size_requirement: form.bhk_size_requirement || null,
				assigned_advisor_id: form.assigned_advisor_id || null,
				details: form.details || "",
				follow_up_date: form.follow_up_date || null,
			});
			if (!res.success) {
				toast.error(res.error ?? "Update failed");
				return;
			}
			toast.success("Enquiry updated");
			onOpenChange(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit enquiry</DialogTitle>
				</DialogHeader>
				{!form || !enquiry ? (
					<div className="flex justify-center py-10">
						<Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
					</div>
				) : (
				<div className="space-y-4 pt-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Name</div>
							<Input value={form.name} onChange={(e) => setForm((s) => s && { ...s, name: e.target.value })} />
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Phone</div>
							<Input
								value={form.phone}
								inputMode="numeric"
								onChange={(e) =>
									setForm(
										(s) => s && { ...s, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }
									)
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Email ID</div>
							<Input
								value={form.email_id ?? ""}
								placeholder="customer@email.com"
								onChange={(e) => setForm((s) => s && { ...s, email_id: e.target.value || null })}
							/>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">City / Location</div>
							<Input
								value={form.address ?? ""}
								placeholder="e.g. Besa, Nagpur"
								onChange={(e) => setForm((s) => s && { ...s, address: e.target.value })}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Date of Birth</div>
							<Input
								type="date"
								value={form.birth_date ?? ""}
								onChange={(e) => setForm((s) => s && { ...s, birth_date: e.target.value || null })}
							/>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Assigned Advisor (Admin)</div>
							<SearchableCombobox
								value={form.assigned_advisor_id ?? ""}
								onChange={(v) =>
									setForm((s) => (s ? { ...s, assigned_advisor_id: v || null } : s))
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

					<div className="space-y-1">
						<div className="text-xs font-semibold uppercase text-zinc-500">Follow-up date</div>
						<Input
							type="date"
							value={form.follow_up_date ?? ""}
							onChange={(e) =>
								setForm((s) => s && { ...s, follow_up_date: e.target.value || null })
							}
						/>
						<p className="text-[11px] text-muted-foreground">Must be on or after visit / enquiry date if you track visits.</p>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase text-zinc-500">Requirement Details</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">Property Type</div>
								<Input
									value={form.property_type ?? ""}
									placeholder="e.g. Flats"
									onChange={(e) => setForm((s) => s && { ...s, property_type: e.target.value || null })}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">Segment</div>
								<Input
									value={form.segment ?? ""}
									placeholder="e.g. Mid"
									onChange={(e) => setForm((s) => s && { ...s, segment: e.target.value || null })}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">Budget Min (₹)</div>
								<Input
									type="number"
									value={form.budget_min ?? ""}
									placeholder="e.g. 2000000"
									onChange={(e) =>
										setForm((s) => s && { ...s, budget_min: e.target.value === "" ? null : Number(e.target.value) })
									}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">Budget Max (₹)</div>
								<Input
									type="number"
									value={form.budget_max ?? ""}
									placeholder="e.g. 5000000"
									onChange={(e) =>
										setForm((s) => s && { ...s, budget_max: e.target.value === "" ? null : Number(e.target.value) })
									}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">Preferred Location</div>
								<Input
									value={form.preferred_location ?? ""}
									placeholder="e.g. Besa"
									onChange={(e) =>
										setForm((s) => s && { ...s, preferred_location: e.target.value || null })
									}
								/>
							</div>
							<div className="space-y-1">
								<div className="text-xs font-semibold uppercase text-zinc-500">BHK / Size Requirement</div>
								<Input
									value={form.bhk_size_requirement ?? ""}
									placeholder="e.g. 2BHK, 1200 sqft"
									onChange={(e) =>
										setForm((s) => s && { ...s, bhk_size_requirement: e.target.value || null })
									}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase text-zinc-500">Status</div>
						<div className="flex flex-wrap gap-2">
							{STATUS_OPTIONS.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									onClick={() =>
										setForm((s) =>
											s
												? {
														...s,
														enquiry_status: value as EnquiryCustomerFormValues["enquiry_status"],
													}
												: s
										)
									}
									className={cn(
										"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
										form.enquiry_status === value
											? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
											: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Project</div>
							<SearchableCombobox
								value={form.project_id ?? ""}
								onChange={(v) => setForm((s) => (s ? { ...s, project_id: v || null } : s))}
								placeholder="Search project (optional)"
								options={[
									{ value: "", label: "No project", subtitle: "Optional" },
									...projects.map((p) => ({
										value: p.id,
										label: p.name,
										keywords: p.name,
									})),
								]}
							/>
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold uppercase text-zinc-500">Category</div>
							<Select
								value={form.category}
								onValueChange={(v) => setForm((s) => s && { ...s, category: v })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORY_OPTIONS.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-1">
						<div className="text-xs font-semibold uppercase text-zinc-500">Notes / remarks</div>
						<Textarea
							rows={4}
							value={form.details}
							onChange={(e) => setForm((s) => s && { ...s, details: e.target.value })}
							placeholder="Additional notes…"
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="button" onClick={onSubmit} disabled={saving}>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save enquiry"}
						</Button>
					</div>
				</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
