"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
			notes: initialData?.notes ?? "",
			is_active: initialData?.is_active ?? true,
		},
	});

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
		<Card className="max-w-4xl w-full mx-auto">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>
						{mode === "edit"
							? "Edit Advisor"
							: variant === "sub"
								? "New Sub-advisor"
								: "New Advisor"}
					</CardTitle>
					<CardDescription>
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
					>
						Fill Mock Data
					</Button>
				) : null}
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{variant === "sub" && mode === "create" ? (
							<div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3">
								<p className="text-xs font-semibold text-zinc-700 mb-2">Mode</p>
								<div className="flex flex-wrap gap-2 mb-3">
									<Button
										type="button"
										size="sm"
										variant={subMode === "new" ? "default" : "outline"}
										onClick={() => setSubMode("new")}
									>
										Create New Sub-advisor
									</Button>
									<Button
										type="button"
										size="sm"
										variant={subMode === "existing" ? "default" : "outline"}
										onClick={() => setSubMode("existing")}
									>
										Use Existing Advisor
									</Button>
								</div>
								<p className="text-xs font-semibold text-zinc-700 mb-2">Parent advisor *</p>
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
								{subMode === "existing" ? (
									<>
										<p className="text-xs font-semibold text-zinc-700 mb-2">Existing advisor *</p>
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
										{existingAdvisorIds.length > 0 ? (
											<div className="mt-2 flex flex-wrap gap-1.5">
												{existingAdvisorIds.map((id) => {
													const item = existingAdvisorOptions.find((x) => x.id === id);
													return (
														<button
															key={id}
															type="button"
															className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px]"
															onClick={() =>
																setExistingAdvisorIds((prev) => prev.filter((x) => x !== id))
															}
														>
															{item?.name ?? id.slice(0, 8)}
															<span className="text-zinc-400">×</span>
														</button>
													);
												})}
											</div>
										) : null}
									</>
								) : null}
								{subMode === "existing" && existingAdvisorIds.length > 0 && parentAdvisorId ? (
									<p className="mt-2 text-xs text-zinc-700">
										<strong>{selectedExistingNames.join(", ")}</strong>{" "}
										{selectedExistingNames.length === 1 ? "will become sub-advisor of" : "will become sub-advisors of"}{" "}
										<strong>{parentName}</strong>.
									</p>
								) : null}
							</div>
						) : null}
						{subMode !== "existing" ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Full Name *</FormLabel>
										<FormControl>
											<Input placeholder="e.g. Rajesh Kumar" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="code"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Advisor Code *</FormLabel>
										<FormControl>
											<Input placeholder="e.g. MG101" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Phone Number *</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g. 9876543210"
												inputMode="numeric"
												pattern="[0-9]*"
												maxLength={10}
												{...field}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value.replace(/\D/g, "").slice(0, 10)
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email (optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g. advisor@gmail.com"
												type="email"
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<p className="text-[10px] text-zinc-500">
											If empty, a system email will be generated for login.
										</p>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="birth_date"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Birth Date</FormLabel>
										<FormControl>
											<Input type="date" {...field} value={field.value || ""} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						) : null}

						{mode === "create" && subMode !== "existing" && (
							<div className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50/50">
								<h3 className="text-sm font-semibold">Login Credentials</h3>
								<p className="text-xs text-zinc-500">
									Advisor can log in with email + password. Default password is derived from name plus
									the last 10 digits of phone (same formula as the advisors list &quot;Default
									password&quot; column).
								</p>
								<FormField
									control={form.control}
									name="use_phone_as_password"
									render={({ field }) => (
										<FormItem className="flex items-center gap-2 space-y-0">
											<FormControl>
												<input
													type="checkbox"
													checked={field.value}
													onChange={(e) => field.onChange(e.target.checked)}
													className="rounded border-zinc-300"
												/>
											</FormControl>
											<FormLabel className="!mt-0 cursor-pointer font-normal">
												Use default password (name + phone)
											</FormLabel>
										</FormItem>
									)}
								/>
								{!form.watch("use_phone_as_password") && (
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Custom Password</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="Min 6 characters"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

						{subMode !== "existing" ? (
						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Address</FormLabel>
									<FormControl>
										<Input
											placeholder="Full residential/office address"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						) : null}

						{subMode !== "existing" ? (
						<div className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/50">
							<p className="text-sm font-semibold text-zinc-900">
								Commission (Project-wise)
							</p>
							<p className="text-xs text-zinc-500 mt-1">
								Commission is set per project when assigning an advisor.
							</p>
						</div>
						) : null}

						{subMode !== "existing" ? (
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea
											rows={2}
											placeholder="Additional info about advisor"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						) : null}

						<div className="flex gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									onCancel?.();
									if (redirectToList) router.back();
								}}
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
								className={`transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}
								onClick={
									variant === "sub" && subMode === "existing"
										? () => void handleExistingSubmit()
										: undefined
								}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{loading
									? "Submitting..."
									: mode === "edit"
										? "Update Advisor"
										: variant === "sub" && subMode === "existing"
											? "Make Sub-advisor"
											: "Create Advisor"}
							</Button>
						</div>
						{submitStatus !== "idle" && (
							<div className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
								submitStatus === "success"
									? "border-green-200 bg-green-50 text-green-700"
									: "border-red-200 bg-red-50 text-red-700"
							}`}>
								{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
								<span>{statusText}</span>
							</div>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
