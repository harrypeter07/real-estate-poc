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
	Textarea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import type { EnquiryCustomerFormValues } from "@/lib/validations/enquiry";
import { ENQUIRY_PLAN_OPTIONS } from "@/lib/validations/enquiry";
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
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enquiry: EnquiryRow | null;
	projects: Array<{ id: string; name: string }>;
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
			birth_date: enquiry.birth_date,
			project_id: enquiry.project_id,
			category: enquiry.category,
			details: enquiry.details ?? "",
			is_active: enquiry.is_active,
			follow_up_date: enquiry.follow_up_date,
			interested_plan: enquiry.interested_plan,
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
				alternate_phone: form.alternate_phone || "",
				details: form.details || "",
				follow_up_date: form.follow_up_date || null,
				interested_plan: form.interested_plan || null,
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
						<div className="text-xs font-semibold uppercase text-zinc-500">Interested plan</div>
						<div className="flex flex-wrap gap-2">
							{ENQUIRY_PLAN_OPTIONS.map((plan) => (
								<button
									key={plan}
									type="button"
									onClick={() => setForm((s) => s && { ...s, interested_plan: plan })}
									className={cn(
										"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
										form.interested_plan === plan
											? "border-blue-600 bg-blue-600 text-white"
											: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
									)}
								>
									{plan}
								</button>
							))}
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
							<Select
								value={form.project_id ?? "none"}
								onValueChange={(v) =>
									setForm((s) => s && { ...s, project_id: v === "none" ? null : v })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Project" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No project</SelectItem>
									{projects.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
