"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { updateBusinessProfile, type BusinessProfile } from "@/app/actions/business-settings";
import { useRouter } from "next/navigation";
import { BusinessLogoUpload } from "@/components/settings/business-logo-upload";

export function BusinessSettingsForm({ initial }: { initial: BusinessProfile | null }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_path ?? null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const fd = new FormData(e.currentTarget);
		const res = await updateBusinessProfile({
			display_name: String(fd.get("display_name") ?? "").trim() || null,
			tagline: String(fd.get("tagline") ?? "").trim() || null,
			logo_path: logoPath || null,
			address: String(fd.get("address") ?? "").trim() || null,
			phone: String(fd.get("phone") ?? "").trim() || null,
			email: String(fd.get("email") ?? "").trim() || null,
			gst_number: String(fd.get("gst_number") ?? "").trim() || null,
			pan_number: String(fd.get("pan_number") ?? "").trim() || null,
			receipt_footer: String(fd.get("receipt_footer") ?? "").trim() || null,
		});
		setLoading(false);
		if (!res.success) {
			toast.error(res.error ?? "Save failed");
			return;
		}
		toast.success("Business profile saved");
		try {
			const display = String(fd.get("display_name") ?? "").trim() || (initial?.name ?? "S-INFRA");
			const tag = String(fd.get("tagline") ?? "").trim();
			localStorage.setItem("app_business_display_name", display);
			localStorage.setItem("app_business_tagline", tag);
		} catch {
			// ignore
		}
		router.refresh();
	}

	if (!initial) {
		return (
			<p className="text-sm text-zinc-500">Could not load business. Check business context.</p>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{initial.name}</CardTitle>
				<CardDescription>
					Legal / system name: <span className="font-medium text-zinc-700">{initial.name}</span>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="space-y-4">
					<BusinessLogoUpload
						businessId={initial.id}
						value={logoPath}
						onChange={(p) => setLogoPath(p)}
					/>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Display name (receipts)</label>
						<Input
							name="display_name"
							defaultValue={initial.display_name ?? ""}
							placeholder={initial.name}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Tagline</label>
						<Input
							name="tagline"
							defaultValue={initial.tagline ?? ""}
							placeholder="e.g. Land & plot development"
							className="mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Address</label>
						<Textarea name="address" defaultValue={initial.address ?? ""} rows={2} className="mt-1" />
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-semibold text-zinc-600">Phone</label>
							<Input name="phone" defaultValue={initial.phone ?? ""} className="mt-1" />
						</div>
						<div>
							<label className="text-xs font-semibold text-zinc-600">Email</label>
							<Input name="email" type="email" defaultValue={initial.email ?? ""} className="mt-1" />
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-semibold text-zinc-600">GST (optional)</label>
							<Input name="gst_number" defaultValue={initial.gst_number ?? ""} className="mt-1" />
						</div>
						<div>
							<label className="text-xs font-semibold text-zinc-600">PAN (optional)</label>
							<Input name="pan_number" defaultValue={initial.pan_number ?? ""} className="mt-1" />
						</div>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Receipt footer</label>
						<Textarea
							name="receipt_footer"
							defaultValue={initial.receipt_footer ?? ""}
							rows={2}
							placeholder="Thank you for your payment."
							className="mt-1"
						/>
					</div>
					<Button type="submit" disabled={loading}>
						{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
						Save
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
