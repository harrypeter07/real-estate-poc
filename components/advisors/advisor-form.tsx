"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { extractPasswordAndNotes } from "@/lib/auth/advisor-password";
import { toast } from "sonner";
import {
	Loader2,
	CheckCircle2,
	AlertCircle,
	User,
	Users,
	Sparkles,
	Phone,
	Mail,
	Calendar,
	MapPin,
	FileText,
	Lock,
	Award,
} from "lucide-react";
import {
	Button,
	Input,
	Textarea,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	SearchableCombobox,
} from "@/components/ui";
import {
	advisorSchema,
	type AdvisorFormValues,
} from "@/lib/validations/advisor";
import {
	createAdvisor,
	createSubAdvisor,
	updateAdvisor,
	setAdvisorParent,
	getNextAdvisorCode,
} from "@/app/actions/advisors";
import { isDev } from "@/lib/is-dev";

interface AdvisorFormProps {
	mode: "create" | "edit";
	/** Sub-advisor flow: pick a main advisor, then same fields as create. */
	variant?: "default" | "sub";
	parentOptions?: { id: string; name: string; code: string; phone?: string }[];
	existingAdvisorOptions?: { id: string; name: string; code: string; phone?: string }[];
	initialData?: any;
	onSuccess?: () => void;
	onCancel?: () => void;
	redirectToList?: boolean;
}

export function AdvisorForm({
	mode,
	variant = "default",
	parentOptions = [],
	existingAdvisorOptions = [],
	initialData,
	onSuccess,
	onCancel,
	redirectToList = true,
}: AdvisorFormProps) {
	const router = useRouter();
	const [parentAdvisorId, setParentAdvisorId] = useState("");
	const [existingAdvisorIds, setExistingAdvisorIds] = useState<string[]>([]);
	const [existingComboKey, setExistingComboKey] = useState(0);
	const [subMode, setSubMode] = useState<"new" | "existing">("new");
	const [loading, setLoading] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");

	const { notes: initialCleanNotes } = extractPasswordAndNotes(initialData?.notes);

	const form = useForm<AdvisorFormValues>({
		resolver: zodResolver(advisorSchema) as any,
		defaultValues: {
			name: initialData?.name ?? "",
			code: initialData?.code ?? "",
			phone: initialData?.phone ?? "",
			email: initialData?.email ?? "",
			address: initialData?.address ?? "",
			birth_date: initialData?.birth_date ?? "",
			password: "",
			use_phone_as_password: true,
			notes: initialCleanNotes,
			is_active: initialData?.is_active ?? true,
		},
	});

	const loadNextCode = () => {
		if (mode === "create" && !initialData?.code) {
			getNextAdvisorCode()
				.then((code) => {
					form.setValue("code", code);
				})
				.catch((err) => {
					console.error("Failed to generate advisor code:", err);
				});
		}
	};

	// Auto-generate advisor code on mount for new registrations
	useEffect(() => {
		loadNextCode();
	}, [mode, initialData, form]);

	const fillMockData = () => {
		const names = [
			"Rajesh Kumar",
			"Sanjay Deshmukh",
			"Amit Patil",
			"Priya Sharma",
			"Sunil Verma",
			"Kiran Joshi",
		];
		const randomName = names[Math.floor(Math.random() * names.length)];
		const randomCode = `MG${Math.floor(Math.random() * 900) + 100}`;
		const areas = [
			"Dharampeth",
			"Ramdaspeth",
			"Sadar",
			"Civil Lines",
			"Trimurti Nagar",
			"Manish Nagar",
		];
		const randomArea = areas[Math.floor(Math.random() * areas.length)];

		const phone = `98${Math.floor(Math.random() * 90000000) + 10000000}`;
		form.reset({
			name: randomName,
			code: randomCode,
			phone,
			email: "",
			address: `${
				Math.floor(Math.random() * 100) + 1
			}, Main Road, ${randomArea}, Nagpur`,
			birth_date: "1985-05-15",
			password: "",
			use_phone_as_password: true,
			notes: `Experienced advisor specialized in ${randomArea} area of Nagpur.`,
			is_active: true,
		});
	};

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
			gain.gain.exponentialRampToValueAtTime(
				0.0001,
				now + (kind === "success" ? 0.2 : 0.15)
			);
			osc.start(now);
			osc.stop(now + (kind === "success" ? 0.22 : 0.17));
			setTimeout(() => void ctx.close(), 300);
		} catch {}
	};

	async function assignExistingAdvisorsAsSubAdvisors() {
		if (!parentAdvisorId) {
			toast.error("Select parent advisor");
			return { success: false, error: "Parent advisor is required." };
		}
		if (existingAdvisorIds.length === 0) {
			toast.error("Select at least one existing advisor");
			return { success: false, error: "Existing advisor is required." };
		}
		let ok = 0;
		let lastErr = "";
		for (const aid of existingAdvisorIds) {
			const r = await setAdvisorParent(aid, parentAdvisorId);
			if (r.success) ok += 1;
			else lastErr = r.error ?? "Failed";
		}
		return ok === existingAdvisorIds.length
			? { success: true as const }
			: {
					success: false as const,
					error: `Updated ${ok}/${existingAdvisorIds.length}. ${lastErr}`,
			  };
	}

	async function onSubmit(values: AdvisorFormValues) {
		setLoading(true);
		setSubmitStatus("idle");
		setStatusText("");
		try {
			let result;
			if (mode === "edit" && initialData?.id) {
				result = await updateAdvisor(initialData.id, values);
			} else if (variant === "sub") {
				if (subMode === "existing") {
					result = await assignExistingAdvisorsAsSubAdvisors();
				} else {
					if (!parentAdvisorId) {
						toast.error("Select parent advisor");
						setLoading(false);
						return;
					}
					result = await createSubAdvisor({
						...values,
						parent_advisor_id: parentAdvisorId,
					});
				}
			} else {
				result = await createAdvisor(values);
			}

			if (!result.success) {
				toast.error("Error", { description: result.error });
				setSubmitStatus("error");
				setStatusText(result.error ?? "Failed to save advisor");
				playSubmitTone("error");
				return;
			}

			toast.success(
				mode === "edit"
					? "Advisor updated"
					: variant === "sub"
						? subMode === "existing"
							? "Sub-advisor assignment updated"
							: "Sub-advisor created"
						: "Advisor created",
			);
			setSubmitStatus("success");
			setStatusText(
				mode === "edit"
					? "Advisor updated successfully."
					: variant === "sub"
						? subMode === "existing"
							? "Sub-advisor assignment saved successfully."
							: "Sub-advisor created successfully."
						: "Advisor created successfully.",
			);
			playSubmitTone("success");
			if (variant === "sub" && mode === "create" && !redirectToList) {
				setExistingAdvisorIds([]);
				setExistingComboKey((k) => k + 1);
				if (subMode === "new") {
					form.reset({
						name: "",
						code: "",
						phone: "",
						email: "",
						address: "",
						birth_date: "",
						password: "",
						use_phone_as_password: true,
						notes: "",
						is_active: true,
					});
					loadNextCode();
				}
			}
			onSuccess?.();
			if (redirectToList) router.push("/advisors");
			router.refresh();
		} catch (err) {
			toast.error("Something went wrong");
			setSubmitStatus("error");
			setStatusText("Something went wrong while saving advisor.");
			playSubmitTone("error");
		} finally {
			setLoading(false);
		}
	}

	async function handleExistingSubmit() {
		setLoading(true);
		setSubmitStatus("idle");
		setStatusText("");
		try {
			const result = await assignExistingAdvisorsAsSubAdvisors();
			if (!result.success) {
				toast.error("Error", { description: result.error });
				setSubmitStatus("error");
				setStatusText(result.error ?? "Failed to save advisor");
				playSubmitTone("error");
				return;
			}
			toast.success("Sub-advisor assignment updated");
			setSubmitStatus("success");
			setStatusText("Sub-advisor assignment saved successfully.");
			playSubmitTone("success");
			if (variant === "sub" && mode === "create" && !redirectToList) {
				setExistingAdvisorIds([]);
				setExistingComboKey((k) => k + 1);
			}
			onSuccess?.();
			if (redirectToList) router.push("/advisors");
			router.refresh();
		} catch {
			toast.error("Something went wrong");
			setSubmitStatus("error");
			setStatusText("Something went wrong while saving advisor.");
			playSubmitTone("error");
		} finally {
			setLoading(false);
		}
	}

	const parentName =
		parentOptions.find((p) => p.id === parentAdvisorId)?.name ?? "selected main advisor";
	const canPickExisting = Boolean(parentAdvisorId);
	const selectedExistingNames = existingAdvisorIds
		.map((id) => existingAdvisorOptions.find((p) => p.id === id)?.name)
		.filter(Boolean) as string[];

	return (
		<Card className="max-w-3xl w-full mx-auto border border-zinc-200/80 bg-white/70 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-zinc-300/80">
			<CardHeader className="relative border-b border-zinc-150 bg-zinc-50/50 p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div className="space-y-1.5">
					<CardTitle className="text-xl sm:text-2xl font-bold text-zinc-950 flex items-center gap-2.5">
						<span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-sm shrink-0">
							{variant === "sub" ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
						</span>
						<span>
							{mode === "edit"
								? "Edit Advisor Details"
								: variant === "sub"
									? "New Sub-advisor Registration"
									: "New Advisor Registration"}
						</span>
					</CardTitle>
					<CardDescription className="text-sm text-zinc-500 font-medium pl-[46px]">
						{variant === "sub"
							? "Register a partner under a main advisor"
							: "Enter details for the channel partner"}
					</CardDescription>
				</div>
				{isDev ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={fillMockData}
						className="relative w-full sm:w-auto h-9 px-4 rounded-xl border-zinc-200 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700 text-zinc-700 text-xs font-bold transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-1.5"
					>
						<Sparkles className="h-3.5 w-3.5 text-teal-500 animate-pulse animate-duration-1000 shrink-0" />
						Fill Mock Data
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="p-4 sm:p-8">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{variant === "sub" && mode === "create" ? (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-inner">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<Users className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Sub-advisor Mode Selection</h4>
								</div>
								
								<div className="space-y-3.5">
									<div>
										<label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Registration Mode</label>
										<div className="flex flex-col sm:inline-flex sm:flex-row p-1 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl border border-zinc-200 w-full sm:w-auto gap-1 sm:gap-0">
											<button
												type="button"
												onClick={() => setSubMode("new")}
												className={`w-full sm:w-auto sm:flex-none h-9 sm:h-8 px-4 text-xs font-bold rounded-lg transition-all duration-250 flex items-center justify-center gap-1.5 select-none cursor-pointer ${
													subMode === "new"
														? "bg-teal-600 text-white shadow-sm font-extrabold"
														: "text-zinc-600 hover:text-zinc-900 hover:bg-white/40"
												}`}
											>
												<User className="h-3.5 w-3.5 shrink-0" />
												Create New Sub-advisor
											</button>
											<button
												type="button"
												onClick={() => setSubMode("existing")}
												className={`w-full sm:w-auto sm:flex-none h-9 sm:h-8 px-4 text-xs font-bold rounded-lg transition-all duration-250 flex items-center justify-center gap-1.5 select-none cursor-pointer ${
													subMode === "existing"
														? "bg-teal-600 text-white shadow-sm font-extrabold"
														: "text-zinc-600 hover:text-zinc-900 hover:bg-white/40"
												}`}
											>
												<Users className="h-3.5 w-3.5 shrink-0" />
												Use Existing Advisor
											</button>
										</div>
									</div>

									<div className="space-y-1.5">
										<label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Parent Advisor *</label>
										<div className="relative">
											<SearchableCombobox
												options={parentOptions
													.filter((p) => !existingAdvisorIds.includes(p.id))
													.map((p) => ({
														value: p.id,
														label: p.name,
														subtitle: p.code,
														keywords: p.phone ?? "",
													}))}
												value={parentAdvisorId}
												onChange={(id) => {
													setParentAdvisorId(id);
													if (id && existingAdvisorIds.includes(id)) {
														setExistingAdvisorIds((prev) => prev.filter((x) => x !== id));
													}
												}}
												placeholder="Search main advisor…"
												emptyMessage="No advisor matches."
											/>
										</div>
									</div>

									{subMode === "existing" ? (
										<div className="space-y-3 pt-1 border-t border-dashed border-zinc-200/80">
											<div className="space-y-1.5">
												<label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Select Existing Advisor *</label>
												<SearchableCombobox
													key={existingComboKey}
													options={existingAdvisorOptions
														.filter((p) => !existingAdvisorIds.includes(p.id) && p.id !== parentAdvisorId)
														.map((p) => ({
															value: p.id,
															label: p.name,
															subtitle: p.code,
															keywords: p.phone ?? "",
														}))}
													value=""
													onChange={(id) => {
														if (!canPickExisting) return;
														if (id && !existingAdvisorIds.includes(id)) {
															setExistingAdvisorIds((prev) => [...prev, id]);
															setExistingComboKey((k) => k + 1);
														}
													}}
													placeholder={
														canPickExisting
															? "Search advisor with no sub-advisors…"
															: "Select parent advisor first"
													}
													emptyMessage={
														canPickExisting
															? "No eligible advisors."
															: "Choose parent advisor first."
													}
													disabled={!canPickExisting}
												/>
											</div>

											{existingAdvisorIds.length > 0 ? (
												<div className="mt-2 flex flex-wrap gap-2">
													{existingAdvisorIds.map((id) => {
														const item = existingAdvisorOptions.find((x) => x.id === id);
														return (
															<button
																key={id}
																type="button"
																className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white hover:border-rose-250 hover:bg-rose-50/50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-rose-700 transition-all duration-200 shadow-sm cursor-pointer"
																onClick={() =>
																	setExistingAdvisorIds((prev) => prev.filter((x) => x !== id))
																}
															>
																<span>{item?.name ?? id.slice(0, 8)}</span>
																<span className="text-zinc-400 hover:text-rose-500 font-bold text-sm shrink-0">×</span>
															</button>
														);
													})}
												</div>
											) : null}
										</div>
									) : null}

									{subMode === "existing" && existingAdvisorIds.length > 0 && parentAdvisorId ? (
										<div className="mt-2.5 p-3 rounded-xl bg-teal-50/60 border border-teal-100/85 text-xs text-teal-900 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
											<div className="h-4.5 w-4.5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] shrink-0 font-bold">✓</div>
											<p className="leading-relaxed">
												<strong>{selectedExistingNames.join(", ")}</strong>{" "}
												{selectedExistingNames.length === 1 ? "will become a sub-advisor of" : "will become sub-advisors of"}{" "}
												<strong>{parentName}</strong>.
											</p>
										</div>
									) : null}
								</div>
							</div>
						) : null}

						{subMode !== "existing" ? (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/20 p-4 sm:p-5 space-y-4 shadow-sm">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<User className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Basic Information</h4>
								</div>
								
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Full Name *</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input 
															placeholder="e.g. Rajesh Kumar" 
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
															{...field} 
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="code"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Advisor Code *</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input 
															placeholder="e.g. MG101" 
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
															{...field} 
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Phone Number *</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input
															placeholder="e.g. 9876543210"
															inputMode="numeric"
															pattern="[0-9]*"
															maxLength={10}
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
															{...field}
															value={field.value ?? ""}
															onChange={(e) => {
																let val = e.target.value.replace(/\D/g, "");
																while (val.startsWith("0")) {
																	val = val.substring(1);
																}
																field.onChange(val.slice(0, 10));
															}}
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Email (optional)</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input
															placeholder="e.g. advisor@gmail.com"
															type="email"
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
															{...field}
															value={field.value || ""}
														/>
													</div>
												</FormControl>
												<p className="text-[10px] text-zinc-450 font-semibold pl-1">
													💡 If empty, a system email will be generated for login.
												</p>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="birth_date"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Birth Date</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input 
															type="date" 
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm text-zinc-800"
															{...field} 
															value={field.value || ""} 
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
								</div>
							</div>
						) : null}

						{mode === "create" && subMode !== "existing" && (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<Lock className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Login Credentials</h4>
								</div>
								
								<div className="rounded-xl border border-amber-100 bg-amber-50/45 p-3.5 text-xs text-amber-900 leading-relaxed font-semibold space-y-1">
									<p className="flex items-center gap-1.5 font-bold">
										<span>🔐 Autogenerated Login Access</span>
									</p>
									<p className="font-medium text-amber-800">
										Advisor can log in with email + password. Default password is securely generated using the first 3 letters of their name, a special symbol, and a random mix of digits (e.g. kir@8954).
									</p>
								</div>

								<FormField
									control={form.control}
									name="use_phone_as_password"
									render={({ field }) => (
										<FormItem className="flex items-center gap-3 space-y-0 p-3.5 bg-white border border-zinc-200/70 rounded-xl shadow-sm hover:border-zinc-300 transition-colors">
											<FormControl>
												<input
													type="checkbox"
													checked={field.value}
													onChange={(e) => field.onChange(e.target.checked)}
													className="h-4.5 w-4.5 rounded border-zinc-350 text-teal-600 focus:ring-teal-500/30 cursor-pointer accent-teal-600"
												/>
											</FormControl>
											<FormLabel className="!mt-0 cursor-pointer font-bold text-xs text-zinc-700 select-none">
												Use default password (3 letters of name + random characters)
											</FormLabel>
										</FormItem>
									)}
								/>

								{!form.watch("use_phone_as_password") && (
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
												<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Custom Password</FormLabel>
												<FormControl>
													<div className="relative group/input">
														<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
														<Input
															type="password"
															placeholder="Min 6 characters"
															className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
															{...field}
														/>
													</div>
												</FormControl>
												<FormMessage className="text-[11px] text-red-500" />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

						{subMode !== "existing" ? (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/20 p-4 sm:p-5 space-y-4 shadow-sm">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<MapPin className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Residential/Office Address</h4>
								</div>
								
								<FormField
									control={form.control}
									name="address"
									render={({ field }) => (
										<FormItem className="space-y-1.5">
											<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Address</FormLabel>
											<FormControl>
												<div className="relative group/input">
													<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
													<Input
														placeholder="Full residential/office address"
														className="pl-10 sm:pl-10 h-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-[11px] text-red-500" />
										</FormItem>
									)}
								/>
							</div>
						) : null}

						{subMode !== "existing" ? (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 sm:p-5 space-y-3.5 shadow-sm">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<Award className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Commission (Project-wise)</h4>
								</div>
								
								<div className="p-3 bg-white border border-zinc-200/60 rounded-xl leading-relaxed text-zinc-500 text-xs font-semibold shadow-inner">
									💡 Commission is set per project when assigning an advisor to a specific project layout.
								</div>
							</div>
						) : null}

						{subMode !== "existing" ? (
							<div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/20 p-4 sm:p-5 space-y-4 shadow-sm">
								<div className="flex items-center gap-2 border-b border-zinc-200/60 pb-3">
									<div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
										<FileText className="h-4 w-4" />
									</div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Additional Notes</h4>
								</div>
								
								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem className="space-y-1.5">
											<FormLabel className="text-xs font-bold text-zinc-700 tracking-wide uppercase">Notes</FormLabel>
											<FormControl>
												<div className="relative group/input">
													<FileText className="absolute left-3 top-3 h-4 w-4 text-zinc-400 group-focus-within/input:text-teal-500 transition-colors pointer-events-none" />
													<Textarea
														rows={3}
														placeholder="Additional info about advisor, performance remarks..."
														className="pl-10 sm:pl-10 bg-white border-zinc-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 rounded-xl transition-all duration-200 text-sm placeholder:text-zinc-400 min-h-[80px] resize-y"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-[11px] text-red-500" />
										</FormItem>
									)}
								/>
							</div>
						) : null}

						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-zinc-150 bg-zinc-50/50 p-4 sm:p-6 -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									onCancel?.();
									if (redirectToList) router.back();
								}}
								className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold border-zinc-250 bg-white hover:bg-zinc-50 hover:text-zinc-900 shadow-sm active:scale-98 transition-all shrink-0 cursor-pointer"
							>
								Cancel
							</Button>
							<Button
								type={variant === "sub" && subMode === "existing" ? "button" : "submit"}
								disabled={
									loading ||
									(mode === "edit" && !form.formState.isDirty) ||
									(variant === "sub" && subMode === "existing" && (existingAdvisorIds.length === 0 || !parentAdvisorId))
								}
								className="w-full sm:w-auto h-10 sm:min-w-[150px] rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
								onClick={
									variant === "sub" && subMode === "existing"
										? () => void handleExistingSubmit()
										: undefined
								}
							>
								{loading ? (
									<Loader2 className="h-4 w-4 animate-spin shrink-0" />
								) : null}
								<span>
									{loading
										? "Submitting..."
										: mode === "edit"
											? "Update Advisor"
											: variant === "sub" && subMode === "existing"
												? "Make Sub-advisor"
												: "Create Advisor"}
								</span>
							</Button>
						</div>
						{submitStatus !== "idle" && (
							<div className={`mt-4 flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-300 ${
								submitStatus === "success"
									? "border-green-200 bg-green-50 text-green-700 shadow-sm shadow-green-500/5"
									: "border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-500/5"
							}`}>
								{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
								<span>{statusText}</span>
							</div>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
