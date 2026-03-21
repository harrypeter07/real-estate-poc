"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { createEnquiryCustomer, getTempCustomersByPhone } from "@/app/actions/enquiries";

const CATEGORY_OPTIONS = [
	"General",
	"Site Visit",
	"WhatsApp",
	"Booking",
	"Follow-up",
	"Referral",
	"Other",
] as const;

export function EnquiryCreateModal({
	open,
	onOpenChange,
	projects,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);

	const emptyForm: Omit<EnquiryCustomerFormValues, "is_active"> & { is_active: boolean } = {
		name: "",
		phone: "",
		alternate_phone: "",
		address: "",
		birth_date: null,
		project_id: null,
		category: "General",
		details: "",
		is_active: true,
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
		try {
			const res = await createEnquiryCustomer({
				...form,
				birth_date: form.birth_date || null,
				// allow blank project
				project_id: form.project_id || null,
				alternate_phone: form.alternate_phone || "",
				details: form.details || "",
			} as any);

			if (!res.success) {
				toast.error("Enquiry creation failed", { description: res.error });
				return;
			}

			toast.success("Enquiry created");
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
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-2xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 flex flex-row flex-wrap items-center justify-between gap-3 text-left">
					<DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
						<Plus className="h-4 w-4 shrink-0" />
						New Enquiry
					</DialogTitle>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Name
							</div>
							<Input
								value={form.name}
								onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
								placeholder="e.g. Rahul Gupta"
							/>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Phone
							</div>
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
							/>

							{tempCustomers.length > 0 && (
								<div className="space-y-2 pt-1">
									<div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
										Match temp customer
									</div>
									<Select
										value={selectedTempCustomerId}
										onValueChange={(v) => setSelectedTempCustomerId(v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select customer" />
										</SelectTrigger>
										<SelectContent>
											{tempCustomers.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													{c.name} ({c.phone})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Alternate Phone
							</div>
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
							/>
						</div>
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Birth Date
							</div>
							<Input
								type="date"
								value={form.birth_date ?? ""}
								onChange={(e) =>
									setForm((s) => ({
										...s,
										birth_date: e.target.value || null,
									}))
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Project
							</div>
							<Select
								value={form.project_id ?? "none"}
								onValueChange={(v) =>
									setForm((s) => ({
										...s,
										project_id: v === "none" ? null : v,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select project (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No project</SelectItem>
									{projectOptions.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Enquiry Category
							</div>
							<Select
								value={form.category}
								onValueChange={(v) => setForm((s) => ({ ...s, category: v }))}
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

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Address
						</div>
						<Textarea
							rows={2}
							value={form.address ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
						/>
					</div>

					<div className="space-y-2">
						<div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
							Enquiry Details
						</div>
						<Textarea
							rows={4}
							value={form.details}
							onChange={(e) => setForm((s) => ({ ...s, details: e.target.value }))}
							placeholder="What are they looking for? Any notes / follow-up info."
						/>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={onSubmit}
							disabled={saving}
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								"SAVE ENQUIRY"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

