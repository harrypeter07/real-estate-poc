"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, Input, Textarea, Card, CardContent } from "@/components/ui";
import { updateBusinessProfile, type BusinessProfile } from "@/app/actions/business-settings";
import { useRouter } from "next/navigation";
import { BusinessLogoUpload } from "@/components/settings/business-logo-upload";
import { createClient } from "@/lib/supabase/client";

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
		initial?.display_name ?? initial?.name ?? ""
	);
	const [tagline, setTagline] = useState(initial?.tagline ?? "");
	const [address, setAddress] = useState(initial?.address ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [gst, setGst] = useState(initial?.gst_number ?? "");
	const [pan, setPan] = useState(initial?.pan_number ?? "");
	const [footer, setFooter] = useState(
		initial?.receipt_footer ?? "Thank you for your payment."
	);

	const [formErrors, setFormErrors] = useState<{
		phone?: string;
		email?: string;
		gst?: string;
		pan?: string;
	}>({});

	const shown = saved ?? initial;

	const logoUrl = useMemo(() => {
		if (!shown) return null;
		if (!shown.logo_path) return null;
		if (shown.logo_path.startsWith("http://") || shown.logo_path.startsWith("https://")) {
			return shown.logo_path;
		}
		try {
			const supabase = createClient();
			return supabase.storage.from("receipts").getPublicUrl(shown.logo_path).data.publicUrl;
		} catch (err) {
			console.error("Error resolving logo URL:", err);
			return null;
		}
	}, [shown?.logo_path]);

	function validateForm(currentPhone: string, currentEmail: string, currentGst: string, currentPan: string) {
		const errors: typeof formErrors = {};

		if (currentPhone && currentPhone.trim() !== "") {
			const cleanPhone = currentPhone.trim();
			if (!/^\d{10}$/.test(cleanPhone)) {
				errors.phone = "Phone number must be exactly 10 digits (e.g., 9876543210)";
			}
		}

		if (currentEmail && currentEmail.trim() !== "") {
			const cleanEmail = currentEmail.trim();
			const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
			if (!emailRegex.test(cleanEmail)) {
				errors.email = "Please enter a valid email address (e.g., info@company.com)";
			}
		}

		if (currentGst && currentGst.trim() !== "") {
			const cleanGst = currentGst.trim().toUpperCase();
			const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
			if (!gstRegex.test(cleanGst)) {
				errors.gst = "GST must be a 15-digit code (e.g., 27ABCDE1234F1Z5)";
			}
		}

		if (currentPan && currentPan.trim() !== "") {
			const cleanPan = currentPan.trim().toUpperCase();
			const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
			if (!panRegex.test(cleanPan)) {
				errors.pan = "PAN must be a 10-character alphanumeric code (e.g., ABCDE1234F)";
			}
		}

		setFormErrors(errors);
		return errors;
	}

	useEffect(() => {
		setSaved(initial);
		setLogoPath(initial?.logo_path ?? null);
		setDisplayName(initial?.display_name ?? initial?.name ?? "");
		setTagline(initial?.tagline ?? "");
		setAddress(initial?.address ?? "");
		setPhone(initial?.phone ?? "");
		setEmail(initial?.email ?? "");
		setGst(initial?.gst_number ?? "");
		setPan(initial?.pan_number ?? "");
		setFooter(initial?.receipt_footer ?? "Thank you for your payment.");
		setFormErrors({});
	}, [initial?.id]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const errors = validateForm(phone, email, gst, pan);
		if (Object.keys(errors).length > 0) {
			const errorsList = Object.entries(errors).map(([field, msg]) => {
				const fieldLabel = {
					phone: "Phone Number",
					email: "Email Address",
					gst: "GST Number",
					pan: "PAN Number"
				}[field] || field;
				return `${fieldLabel}: ${msg}`;
			}).join(", ");

			toast.error("Form Validation Failed", {
				description: `Please correct the following fields: ${errorsList}`,
				duration: 6000,
			});
			setLoading(false);
			return;
		}

		const legalName = String(initial?.name ?? "").trim();
		const dn = String(displayName ?? "").trim();
		const displayNameToSave = dn ? (legalName && dn === legalName ? null : dn) : null;
		
		const payload = {
			display_name: displayNameToSave,
			tagline: tagline ? tagline.trim() : null,
			logo_path: logoPath || null,
			address: address ? address.trim() : null,
			phone: phone ? phone.trim() : null,
			email: email ? email.trim() : null,
			gst_number: gst ? gst.trim().toUpperCase() : null,
			pan_number: pan ? pan.trim().toUpperCase() : null,
			receipt_footer: footer ? footer.trim() : null,
		} as const;

		try {
			if (process.env.NODE_ENV !== "production") {
				// eslint-disable-next-line no-console
				console.debug("[business-settings-form] submit", {
					businessId: initial?.id,
					legalName,
					payload,
				});
			}
		} catch {
			// ignore
		}

		const res = await updateBusinessProfile(payload);
		setLoading(false);
		if (!res.success) {
			toast.error(res.error ?? "Save failed");
			return;
		}

		toast.success("Business profile saved successfully!");
		if (res.profile) {
			setSaved(res.profile);
		} else {
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
					: prev
			);
		}
		setEditing(false);
		try {
			const display = displayNameToSave || (initial?.name ?? "");
			const tag = tagline ? tagline.trim() : "";
			if (display) localStorage.setItem("app_business_display_name", display);
			if (tag) localStorage.setItem("app_business_tagline", tag);
			else localStorage.removeItem("app_business_tagline");
		} catch {
			// ignore
		}
	}

	if (!initial) {
		return (
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
				<div className="font-semibold text-base">Could not load business context.</div>
				<div className="mt-1.5 text-sm text-amber-900/85">
					{error ?? "Check business context / mapping for this user."}
				</div>
			</div>
		);
	}

	if (!shown) return null;

	const getInitials = (name: string) => {
		const parts = (name || "").trim().split(/\s+/);
		if (parts.length === 0 || !parts[0]) return "🏢";
		if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
		return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
	};

	const fieldsConfig = [
		{
			label: "Display Name (Receipts)",
			value: shown.display_name || shown.name,
			icon: "🏢",
			placeholder: "No display name set. Defaults to legal name.",
		},
		{
			label: "Tagline",
			value: shown.tagline,
			icon: "✨",
			placeholder: "No tagline configured for customer PDFs.",
		},
		{
			label: "Address",
			value: shown.address,
			icon: "📍",
			placeholder: "No office address added yet.",
			fullWidth: true,
		},
		{
			label: "Phone Number",
			value: shown.phone,
			icon: "📞",
			placeholder: "No company phone contact set.",
		},
		{
			label: "Email Address",
			value: shown.email,
			icon: "📧",
			placeholder: "No business email configured.",
		},
		{
			label: "GST Number",
			value: shown.gst_number,
			icon: "🧾",
			placeholder: "Pending GST tax ID setup.",
		},
		{
			label: "PAN Number",
			value: shown.pan_number,
			icon: "🪪",
			placeholder: "Pending PAN number registration.",
		},
		{
			label: "Receipt Footer",
			value: shown.receipt_footer || "Thank you for your payment.",
			icon: "📝",
			placeholder: "No custom receipt footer configured.",
			fullWidth: true,
		},
	];

	return (
		<div className="space-y-8">
			{/* Clean, Premium and Compact Business Profile Banner */}
			<div className="relative overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-gradient-to-r from-zinc-900 to-slate-900 p-5 sm:p-7 text-white shadow-sm transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
				<div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left justify-between w-full">
					<div className="flex flex-col sm:flex-row items-center gap-5 min-w-0 w-full sm:w-auto">
						{logoUrl ? (
							<div className="h-14 w-14 rounded-xl bg-white p-1 shadow-sm shrink-0 border border-zinc-700/40 flex items-center justify-center overflow-hidden">
								<img src={logoUrl} alt="Logo" className="object-contain max-h-full max-w-full" />
							</div>
						) : (
							<div className="h-14 w-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-lg font-bold shadow-sm shrink-0 text-white uppercase border border-teal-500/20">
								{getInitials(shown.name)}
							</div>
						)}
						<div className="space-y-1 min-w-0">
							<div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
								<h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none truncate text-white">
									{shown.display_name || shown.name}
								</h2>
								<span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] uppercase font-bold tracking-widest border border-emerald-500/20">
									✓ Active
								</span>
							</div>
							<p className="text-xs sm:text-sm text-zinc-300 font-medium italic">
								{shown.tagline || "No company tagline set yet"}
							</p>
							<div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-1.5">
								Legal Entity: <span className="font-mono text-zinc-300 font-medium">{shown.name}</span>
							</div>
						</div>
					</div>

					{!editing && (
						<div className="shrink-0 mt-2 sm:mt-0 self-center sm:self-start">
							<Button 
								type="button" 
								onClick={() => setEditing(true)}
								className="h-9 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
							>
								✏️ Edit Profile
							</Button>
						</div>
					)}
				</div>
			</div>

			<Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden">
				<CardContent className="p-6 sm:p-10">
					{!editing ? (
						<div className="space-y-8">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
								{fieldsConfig.map((field, idx) => (
									<div 
										key={idx} 
										className={`rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 p-5 sm:p-6 hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all duration-300 space-y-2.5 ${
											field.fullWidth ? "sm:col-span-2" : ""
										}`}
									>
										<div className="flex items-center gap-2.5">
											<span className="text-base sm:text-lg leading-none">{field.icon}</span>
											<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
												{field.label}
											</span>
										</div>
										{field.value ? (
											<div className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
												{field.value}
											</div>
										) : (
											<div className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-550 italic flex items-center gap-2">
												<span className="text-xs sm:text-sm">⚠️</span> {field.placeholder}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					) : (
						<form onSubmit={onSubmit} className="space-y-8">
							{/* Section 1: Company Identity & Branding */}
							<div className="bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-905 p-6 sm:p-8 rounded-2xl space-y-6">
								<div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-850 pb-3">
									<span className="text-lg">🖼️</span>
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
										Company Identity & Branding
									</h4>
								</div>

								<BusinessLogoUpload
									businessId={initial.id}
									value={logoPath}
									onChange={(p) => setLogoPath(p)}
								/>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											🏢 Display Name (Receipts)
										</label>
										<Input
											name="display_name"
											value={displayName}
											onChange={(e) => setDisplayName(e.target.value)}
											placeholder={initial.name}
											className="h-11 sm:h-12 px-4 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											✨ Tagline
										</label>
										<Input
											name="tagline"
											value={tagline}
											onChange={(e) => setTagline(e.target.value)}
											placeholder="e.g. Land & plot development"
											className="h-11 sm:h-12 px-4 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
										📍 Office Address
									</label>
									<Textarea
										name="address"
										value={address}
										onChange={(e) => setAddress(e.target.value)}
										rows={2}
										className="p-4 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
									/>
								</div>
							</div>

							{/* Section 2: Contact Information */}
							<div className="bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-905 p-6 sm:p-8 rounded-2xl space-y-6">
								<div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-850 pb-3">
									<span className="text-lg">📞</span>
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
										Contact Information
									</h4>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											📞 Phone Number {formErrors.phone && <span className="text-red-500 text-[10px] lowercase font-normal">({formErrors.phone})</span>}
										</label>
										<Input
											name="phone"
											value={phone}
											maxLength={10}
											onChange={(e) => {
												let val = e.target.value.replace(/\D/g, ""); // Restrict to numbers only
												while (val.startsWith("0")) {
													val = val.substring(1);
												}
												setPhone(val.slice(0, 10));
												if (formErrors.phone) {
													setFormErrors(prev => ({ ...prev, phone: undefined }));
												}
											}}
											placeholder="10-digit mobile number"
											className={`h-11 sm:h-12 px-4 rounded-xl text-sm bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-mono font-bold ${
												formErrors.phone ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500" : ""
											}`}
										/>
										{formErrors.phone && (
											<p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
												⚠️ {formErrors.phone}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											📧 Email Address {formErrors.email && <span className="text-red-500 text-[10px] lowercase font-normal">({formErrors.email})</span>}
										</label>
										<Input
											name="email"
											type="email"
											value={email}
											onChange={(e) => {
												setEmail(e.target.value);
												if (formErrors.email) {
													setFormErrors(prev => ({ ...prev, email: undefined }));
												}
											}}
											className={`h-11 sm:h-12 px-4 rounded-xl text-sm bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-bold ${
												formErrors.email ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500" : ""
											}`}
										/>
										{formErrors.email && (
											<p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
												⚠️ {formErrors.email}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Section 3: Taxation and Footer Details */}
							<div className="bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-905 p-6 sm:p-8 rounded-2xl space-y-6">
								<div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-850 pb-3">
									<span className="text-lg">🧾</span>
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
										Taxation and Footer Details
									</h4>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											🧾 GST Number (Optional) {formErrors.gst && <span className="text-red-500 text-[10px] lowercase font-normal">({formErrors.gst})</span>}
										</label>
										<Input
											name="gst_number"
											value={gst}
											maxLength={15}
											onChange={(e) => {
												const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
												setGst(val);
												if (formErrors.gst) {
													setFormErrors(prev => ({ ...prev, gst: undefined }));
												}
											}}
											placeholder="e.g. 27ABCDE1234F1Z5"
											className={`h-11 sm:h-12 px-4 rounded-xl text-sm bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-mono font-bold ${
												formErrors.gst ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500" : ""
											}`}
										/>
										{formErrors.gst && (
											<p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
												⚠️ {formErrors.gst}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
											🪪 PAN Number (Optional) {formErrors.pan && <span className="text-red-500 text-[10px] lowercase font-normal">({formErrors.pan})</span>}
										</label>
										<Input
											name="pan_number"
											value={pan}
											maxLength={10}
											onChange={(e) => {
												const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
												setPan(val);
												if (formErrors.pan) {
													setFormErrors(prev => ({ ...prev, pan: undefined }));
												}
											}}
											placeholder="e.g. ABCDE1234F"
											className={`h-11 sm:h-12 px-4 rounded-xl text-sm bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-mono font-bold ${
												formErrors.pan ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500" : ""
											}`}
										/>
										{formErrors.pan && (
											<p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1">
												⚠️ {formErrors.pan}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
										📝 Receipt Footer
									</label>
									<Textarea
										name="receipt_footer"
										value={footer}
										onChange={(e) => setFooter(e.target.value)}
										rows={2}
										placeholder="Thank you for your payment."
										className="p-4 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
									/>
								</div>
							</div>

							<div className="flex items-center gap-4 justify-end pt-6 border-t border-zinc-100 dark:border-zinc-850">
								<Button 
									type="button" 
									variant="outline" 
									disabled={loading} 
									onClick={() => setEditing(false)}
									className="h-11 px-6 rounded-xl text-xs sm:text-sm font-bold text-zinc-550 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all duration-300 cursor-pointer"
								>
									Cancel
								</Button>
								<Button 
									type="submit" 
									disabled={loading}
									className="h-11 px-6 rounded-xl text-xs sm:text-sm font-black bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 text-white shadow-[0_4px_12px_rgba(13,148,136,0.2)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] min-w-[120px] cursor-pointer"
								>
									{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
									Save Settings
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
