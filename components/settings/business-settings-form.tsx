"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { updateBusinessProfile, type BusinessProfile } from "@/app/actions/business-settings";
import { useRouter } from "next/navigation";
import { BusinessLogoUpload } from "@/components/settings/business-logo-upload";

const NOT_SET = "Not set";

function displayOrNotSet(v: string | null | undefined, fallback?: string) {
	const s = String(v ?? "").trim();
	if (s) return s;
	const f = String(fallback ?? "").trim();
	return f || NOT_SET;
}

function toNullableFromUi(v: string) {
	const s = String(v ?? "").trim();
	if (!s) return null;
	if (s.toLowerCase() === NOT_SET.toLowerCase()) return null;
	return s;
}

export function BusinessSettingsForm({
	initial,
	error,
}: {
	initial: BusinessProfile | null;
	error?: string;
}) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(false);
	const [saved, setSaved] = useState<BusinessProfile | null>(initial);

	const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_path ?? null);
	const [displayName, setDisplayName] = useState(
		displayOrNotSet(initial?.display_name, initial?.name)
	);
	const [tagline, setTagline] = useState(displayOrNotSet(initial?.tagline));
	const [address, setAddress] = useState(displayOrNotSet(initial?.address));
	const [phone, setPhone] = useState(displayOrNotSet(initial?.phone));
	const [email, setEmail] = useState(displayOrNotSet(initial?.email));
	const [gst, setGst] = useState(displayOrNotSet(initial?.gst_number));
	const [pan, setPan] = useState(displayOrNotSet(initial?.pan_number));
	const [footer, setFooter] = useState(
		displayOrNotSet(initial?.receipt_footer, "Thank you for your payment.")
	);

	useEffect(() => {
		setSaved(initial);
		setLogoPath(initial?.logo_path ?? null);
		setDisplayName(displayOrNotSet(initial?.display_name, initial?.name));
		setTagline(displayOrNotSet(initial?.tagline));
		setAddress(displayOrNotSet(initial?.address));
		setPhone(displayOrNotSet(initial?.phone));
		setEmail(displayOrNotSet(initial?.email));
		setGst(displayOrNotSet(initial?.gst_number));
		setPan(displayOrNotSet(initial?.pan_number));
		setFooter(displayOrNotSet(initial?.receipt_footer, "Thank you for your payment."));
	}, [initial?.id]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const payload = {
			display_name: toNullableFromUi(displayName),
			tagline: toNullableFromUi(tagline),
			logo_path: logoPath || null,
			address: toNullableFromUi(address),
			phone: toNullableFromUi(phone),
			email: toNullableFromUi(email),
			gst_number: toNullableFromUi(gst),
			pan_number: toNullableFromUi(pan),
			receipt_footer: toNullableFromUi(footer),
		} as const;
		const res = await updateBusinessProfile(payload);
		setLoading(false);
		if (!res.success) {
			toast.error(res.error ?? "Save failed");
			return;
		}
		toast.success("Business profile saved");
		setSaved((prev) =>
			prev
				? {
						...prev,
						display_name: payload.display_name,
						tagline: payload.tagline,
						logo_path: payload.logo_path,
						address: payload.address,
						phone: payload.phone,
						email: payload.email,
						gst_number: payload.gst_number,
						pan_number: payload.pan_number,
						receipt_footer: payload.receipt_footer,
				  }
				: prev,
		);
		setEditing(false);
		try {
			const display = toNullableFromUi(displayName) || (initial?.name ?? "");
			const tag = toNullableFromUi(tagline) ?? "";
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

	const shown = saved ?? initial;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{shown.name}</CardTitle>
				<CardDescription>
					Legal / system name: <span className="font-medium text-zinc-700">{shown.name}</span>
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!editing ? (
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">Display name (receipts)</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.display_name, shown.name)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">Tagline</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.tagline)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3 sm:col-span-2">
								<div className="text-[11px] font-semibold text-zinc-500">Address</div>
								<div className="mt-1 whitespace-pre-wrap font-medium text-zinc-900">
									{displayOrNotSet(shown.address)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">Phone</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.phone)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">Email</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.email)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">GST</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.gst_number)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3">
								<div className="text-[11px] font-semibold text-zinc-500">PAN</div>
								<div className="mt-1 font-semibold text-zinc-900">
									{displayOrNotSet(shown.pan_number)}
								</div>
							</div>
							<div className="rounded-lg border border-zinc-200 bg-white p-3 sm:col-span-2">
								<div className="text-[11px] font-semibold text-zinc-500">Receipt footer</div>
								<div className="mt-1 whitespace-pre-wrap font-medium text-zinc-900">
									{displayOrNotSet(shown.receipt_footer, "Thank you for your payment.")}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button type="button" onClick={() => setEditing(true)}>
								Edit
							</Button>
						</div>
					</div>
				) : (
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
								<Input
									name="phone"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									className="mt-1"
								/>
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
								<Input
									name="gst_number"
									value={gst}
									onChange={(e) => setGst(e.target.value)}
									className="mt-1"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-zinc-600">PAN (optional)</label>
								<Input
									name="pan_number"
									value={pan}
									onChange={(e) => setPan(e.target.value)}
									className="mt-1"
								/>
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
						<div className="flex items-center gap-2">
							<Button type="submit" disabled={loading}>
								{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
								Save
							</Button>
							<Button type="button" variant="outline" disabled={loading} onClick={() => setEditing(false)}>
								Cancel
							</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
