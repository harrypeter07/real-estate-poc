"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { updateBusinessProfile, type BusinessProfile } from "@/app/actions/business-settings";
import { useRouter } from "next/navigation";
import { BusinessLogoUpload } from "@/components/settings/business-logo-upload";

export function BusinessSettingsForm({
	initial,
	error,
}: {
	initial: BusinessProfile | null;
	error?: string;
}) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_path ?? null);
	const [displayName, setDisplayName] = useState(initial?.display_name ?? initial?.name ?? "");
	const [tagline, setTagline] = useState(initial?.tagline ?? "");
	const [address, setAddress] = useState(initial?.address ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [gst, setGst] = useState(initial?.gst_number ?? "");
	const [pan, setPan] = useState(initial?.pan_number ?? "");
	const [footer, setFooter] = useState(
		initial?.receipt_footer ?? "Thank you for your payment."
	);

	useEffect(() => {
		setLogoPath(initial?.logo_path ?? null);
		setDisplayName(initial?.display_name ?? initial?.name ?? "");
		setTagline(initial?.tagline ?? "");
		setAddress(initial?.address ?? "");
		setPhone(initial?.phone ?? "");
		setEmail(initial?.email ?? "");
		setGst(initial?.gst_number ?? "");
		setPan(initial?.pan_number ?? "");
		setFooter(initial?.receipt_footer ?? "Thank you for your payment.");
	}, [initial?.id]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const res = await updateBusinessProfile({
			display_name: displayName.trim() || null,
			tagline: tagline.trim() || null,
			logo_path: logoPath || null,
			address: address.trim() || null,
			phone: phone.trim() || null,
			email: email.trim() || null,
			gst_number: gst.trim() || null,
			pan_number: pan.trim() || null,
			receipt_footer: footer.trim() || null,
		});
		setLoading(false);
		if (!res.success) {
			toast.error(res.error ?? "Save failed");
			return;
		}
		toast.success("Business profile saved");
		try {
			const display = displayName.trim() || (initial?.name ?? "");
			const tag = tagline.trim();
			if (display) localStorage.setItem("app_business_display_name", display);
			if (tag) localStorage.setItem("app_business_tagline", tag);
			else localStorage.removeItem("app_business_tagline");
		} catch {
			// ignore
		}
		// Do not refresh; keep form state visible for edits.
	}

	if (!initial) {
		return (
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
				<div className="font-semibold">Could not load business.</div>
				<div className="mt-1 text-amber-900/80">
					{error ?? "Check business context / mapping for this user."}
				</div>
			</div>
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
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder={initial.name}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Tagline</label>
						<Input
							name="tagline"
							value={tagline}
							onChange={(e) => setTagline(e.target.value)}
							placeholder="e.g. Land & plot development"
							className="mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Address</label>
						<Textarea
							name="address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							rows={2}
							className="mt-1"
						/>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-semibold text-zinc-600">Phone</label>
							<Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
						</div>
						<div>
							<label className="text-xs font-semibold text-zinc-600">Email</label>
							<Input
								name="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="mt-1"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-semibold text-zinc-600">GST (optional)</label>
							<Input name="gst_number" value={gst} onChange={(e) => setGst(e.target.value)} className="mt-1" />
						</div>
						<div>
							<label className="text-xs font-semibold text-zinc-600">PAN (optional)</label>
							<Input name="pan_number" value={pan} onChange={(e) => setPan(e.target.value)} className="mt-1" />
						</div>
					</div>
					<div>
						<label className="text-xs font-semibold text-zinc-600">Receipt footer</label>
						<Textarea
							name="receipt_footer"
							value={footer}
							onChange={(e) => setFooter(e.target.value)}
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
