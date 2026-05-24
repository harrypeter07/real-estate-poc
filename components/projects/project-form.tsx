"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
	Loader2,
	CheckCircle2,
	AlertCircle,
	MapPin,
	ExternalLink,
	DollarSign,
	Trash2,
	AlertTriangle,
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui";
import {
	projectSchema,
	type ProjectFormValues,
} from "@/lib/validations/project";
import { createProject, updateProject, deleteProject } from "@/app/actions/project-actions";
import { isDev } from "@/lib/is-dev";

interface ProjectFormProps {
	mode: "create" | "edit";
	initialData?: any;
}

export function ProjectForm({ mode, initialData }: ProjectFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");
	const [activeTab, setActiveTab] = useState("basic");

	const form = useForm<ProjectFormValues>({
		resolver: zodResolver(projectSchema) as any,
		defaultValues: {
			project_name: initialData?.project_name ?? initialData?.name ?? "",
			project_code: initialData?.project_code ?? initialData?.code ?? "",
			location: initialData?.location ?? "",
			google_maps_link: initialData?.google_maps_link ?? "",
			project_type: (initialData?.project_type as any) ?? "Plot",
			total_plots_count: initialData?.total_plots_count ?? 0,
			starting_plot_number: initialData?.starting_plot_number ?? 1,
			starting_price: initialData?.starting_price ? Number(initialData.starting_price) : 0,
			rate_per_sqft: initialData?.rate_per_sqft ? Number(initialData.rate_per_sqft) : 0,
			plc_charges: initialData?.plc_charges ? Number(initialData.plc_charges) : 0,
			registration_charges: initialData?.registration_charges ? Number(initialData.registration_charges) : 0,
			down_payment_percent: initialData?.down_payment_percent ?? initialData?.down_payment_percentage ? Number(initialData.down_payment_percent ?? initialData.down_payment_percentage) : 0,
			emi_months: initialData?.emi_months ? Number(initialData.emi_months) : 0,
			emi_type: (initialData?.emi_type as any) ?? "Fixed",
			offer_details: initialData?.offer_details ?? "",
			status: (initialData?.status as any) ?? "Active",
			description: initialData?.description ?? "",
			amenities: initialData?.amenities ?? "",
			nearby_locations: initialData?.nearby_locations ?? "",
			internal_notes: initialData?.internal_notes ?? "",
		},
	});

	const projectNameValue = form.watch("project_name");

	// Auto-suggest slug for code if name changes and code is not dirty
	useEffect(() => {
		if (mode === "create" && projectNameValue) {
			const isCodeDirty = form.getFieldState("project_code").isDirty;
			if (!isCodeDirty) {
				const generatedCode = projectNameValue
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/(^-|-$)/g, "");
				form.setValue("project_code", generatedCode);
			}
		}
	}, [projectNameValue, mode, form]);

	const fillMockData = () => {
		const nagpurLocations = [
			"Wardha Road",
			"Manish Nagar",
			"Mihan",
			"Besa-Pipla",
			"Jamtha",
			"Wadi",
			"Kamptee Road",
			"Hingna Road",
		];
		const projectNames = [
			"Nagpur Greens",
			"Orange City Layout",
			"Mihan Smart Township",
			"Wardha Road Residency",
			"Besa Premium Plots",
			"Zero Mile Heights",
		];
		const randomLoc = nagpurLocations[Math.floor(Math.random() * nagpurLocations.length)];
		const randomName = projectNames[Math.floor(Math.random() * projectNames.length)];
		const randomNum = Math.floor(Math.random() * 100);
		const project_name = `${randomName} Phase ${randomNum}`;
		const project_code = project_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

		form.reset({
			project_name,
			project_code,
			location: `${randomLoc}, Nagpur`,
			google_maps_link: "https://maps.google.com/?q=" + encodeURIComponent(`${randomLoc}, Nagpur`),
			project_type: "Plot",
			total_plots_count: Math.floor(Math.random() * 150) + 20,
			starting_plot_number: 1,
			starting_price: 2500000,
			rate_per_sqft: 1800,
			plc_charges: 150000,
			registration_charges: 75000,
			down_payment_percent: 20,
			emi_months: 36,
			emi_type: "Fixed",
			offer_details: "20% down payment, 36 months interest-free EMI",
			status: "Active",
			description: `Premium land project located in the fast-growing ${randomLoc} area of Nagpur. Excellent connectivity and future appreciation potential.`,
			amenities: "Gated Community, 24/7 Security, Water Supply, Tar Roads, Street Lights, Children's Play Area",
			nearby_locations: "Metro Station: 2km, Airport: 5km, School & Hospital: 1km",
			internal_notes: "Highly profitable project. Expecting fast sell-out.",
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
		} catch { }
	};

	const onSubmit: SubmitHandler<ProjectFormValues> = async (values) => {
		setLoading(true);
		setSubmitStatus("idle");
		setStatusText("");

		try {
			let result;

			if (mode === "edit" && initialData?.id) {
				result = await updateProject(initialData.id, values);
			} else {
				result = await createProject(values);
			}

			if (!result.success) {
				toast.error("Error", { description: result.error });
				setSubmitStatus("error");
				setStatusText(result.error ?? "Failed to save project");
				playSubmitTone("error");
				return;
			}

			toast.success(
				mode === "edit"
					? "Project updated successfully"
					: "Project created successfully"
			);
			setSubmitStatus("success");
			setStatusText(mode === "edit" ? "Project updated successfully." : "Project created successfully.");
			playSubmitTone("success");
			router.push("/projects");
			router.refresh();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Something went wrong";
			toast.error(errorMessage);
			setSubmitStatus("error");
			setStatusText(errorMessage);
			playSubmitTone("error");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteProject = async () => {
		if (!initialData?.id) return;
		setDeleting(true);
		try {
			const result = await deleteProject(initialData.id);
			if (result.success) {
				toast.success("Project deleted successfully");
				setShowDeleteModal(false);
				router.push("/projects");
				router.refresh();
			} else {
				toast.error("Delete failed", { description: result.error });
			}
		} catch (err) {
			toast.error("An error occurred during deletion");
		} finally {
			setDeleting(false);
		}
	};

	const tabs = [
		{ id: "basic", label: "Basic Info" },
		{ id: "pricing", label: "Pricing" },
		{ id: "scheme", label: "Scheme" },
		{ id: "status", label: "Status" },
		{ id: "notes", label: "Notes" },
	];

	return (
		<Card className="max-w-3xl">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-zinc-100 dark:border-zinc-900 pb-4">
				<div>
					<CardTitle>
						{mode === "edit" ? "Edit Project" : "New Project"}
					</CardTitle>
					<CardDescription>
						{mode === "edit"
							? "Update the project details across the tabs below"
							: "Fill in the details across the tabs to create a new land project"}
					</CardDescription>
				</div>
				{isDev ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={fillMockData}
						className="text-xs h-8"
					>
						Fill Mock Data
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="pt-6">
				{/* Tab Buttons */}
				<div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
					{tabs.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setActiveTab(t.id)}
							className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors duration-200 ${activeTab === t.id
									? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
									: "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
								}`}
						>
							{t.label}
						</button>
					))}
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Tab 1 – Basic Info */}
						{activeTab === "basic" && (
							<div className="space-y-4 animate-in fade-in duration-200">
								<FormField
									control={form.control}
									name="project_name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Project Name <span className="text-red-500">*</span>
											</FormLabel>
											<FormControl>
												<Input placeholder="e.g. Nagpur Greens Phase 2" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="project_code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Project Code <span className="text-red-500">*</span>
											</FormLabel>
											<FormControl>
												<Input placeholder="e.g. nagpur-greens-2" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="location"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Location <span className="text-red-500">*</span>
											</FormLabel>
											<FormControl>
												<Input placeholder="e.g. Wardha Road, Nagpur" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="google_maps_link"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Google Maps Link</FormLabel>
											<div className="flex gap-2">
												<FormControl className="flex-1">
													<Input placeholder="https://maps.google.com/..." {...field} />
												</FormControl>
												{field.value && (
													<Button
														type="button"
														variant="outline"
														size="icon"
														onClick={() => window.open(field.value, "_blank")}
														title="Open Map"
													>
														<ExternalLink className="h-4 w-4" />
													</Button>
												)}
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="project_type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Project Type <span className="text-red-500">*</span>
											</FormLabel>
											<FormControl>
												<select
													value={field.value}
													onChange={field.onChange}
													className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
												>
													<option value="Plot">Plot</option>
													<option value="Flat">Flat</option>
													<option value="Row House">Row House</option>
													<option value="Farm House">Farm House</option>
													<option value="Commercial">Commercial</option>
												</select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
									<FormField
										control={form.control}
										name="total_plots_count"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													Total Units / Plots <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														disabled={mode === "edit"}
														placeholder="e.g. 50"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 0 : parseInt(val) || 0);
														}}
													/>
												</FormControl>
												{mode === "edit" && (
													<p className="text-[11px] text-zinc-500">Unit count cannot be altered after creation.</p>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="starting_plot_number"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Starting Unit No.</FormLabel>
												<FormControl>
													<Input
														type="number"
														disabled={mode === "edit"}
														placeholder="e.g. 1"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 1 : parseInt(val) || 1);
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
						)}

						{/* Tab 2 – Pricing */}
						{activeTab === "pricing" && (
							<div className="space-y-4 animate-in fade-in duration-200">
								<FormField
									control={form.control}
									name="starting_price"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Starting Price (₹)</FormLabel>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">₹</span>
												<FormControl>
													<Input
														type="number"
														className="pl-7"
														placeholder="e.g. 2500000"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 0 : parseFloat(val) || 0);
														}}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="rate_per_sqft"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Rate per Sq Ft (₹)</FormLabel>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">₹</span>
												<FormControl>
													<Input
														type="number"
														className="pl-7"
														placeholder="e.g. 1800"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 0 : parseFloat(val) || 0);
														}}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="plc_charges"
									render={({ field }) => (
										<FormItem>
											<FormLabel>PLC (Preferential Location Charges) (₹)</FormLabel>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">₹</span>
												<FormControl>
													<Input
														type="number"
														className="pl-7"
														placeholder="e.g. 150000"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 0 : parseFloat(val) || 0);
														}}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="registration_charges"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Registration Charges (₹)</FormLabel>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">₹</span>
												<FormControl>
													<Input
														type="number"
														className="pl-7"
														placeholder="e.g. 75000"
														{...field}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? 0 : parseFloat(val) || 0);
														}}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Tab 3 – Scheme */}
						{activeTab === "scheme" && (
							<div className="space-y-4 animate-in fade-in duration-200">
								<FormField
									control={form.control}
									name="down_payment_percent"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Down Payment %</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="e.g. 20"
													{...field}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === "" ? 0 : parseFloat(val) || 0);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="emi_months"
									render={({ field }) => (
										<FormItem>
											<FormLabel>EMI Months</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="e.g. 36"
													{...field}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === "" ? 0 : parseInt(val) || 0);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="emi_type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>EMI Type</FormLabel>
											<FormControl>
												<select
													value={field.value}
													onChange={field.onChange}
													className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
												>
													<option value="Fixed">Fixed</option>
													<option value="Flexible">Flexible</option>
													<option value="Step-up">Step-up</option>
													<option value="Balloon">Balloon</option>
												</select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="offer_details"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Offer Details</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. 20% down payment, 36 months EMI, interest-free"
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Tab 4 – Status */}
						{activeTab === "status" && (
							<div className="space-y-4 animate-in fade-in duration-200">
								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Status</FormLabel>
											<FormControl>
												<select
													value={field.value}
													onChange={field.onChange}
													className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
												>
													<option value="Upcoming">Upcoming</option>
													<option value="Active">Active</option>
													<option value="Hold">Hold</option>
													<option value="Completed">Completed</option>
													<option value="Sold Out">Sold Out</option>
												</select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Tab 5 – Notes */}
						{activeTab === "notes" && (
							<div className="space-y-4 animate-in fade-in duration-200">
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Describe the project..."
													rows={4}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="amenities"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Amenities (comma-separated or bullet list)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. Security, Gated Community, Park, Jogging Track"
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="nearby_locations"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nearby Locations</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. Airport: 5km, School: 1km, Metro: 2km"
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="internal_notes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Internal Notes (Admins Only)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="These notes are private and not shared with clients..."
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Footer Actions */}
						<div className="flex justify-between items-center border-t border-zinc-150 dark:border-zinc-800 pt-5">
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.back()}
								>
									Cancel
								</Button>

								{/* Tab navigation helpers */}
								{activeTab !== "basic" && (
									<Button
										type="button"
										variant="ghost"
										onClick={() => {
											const currentIndex = tabs.findIndex((t) => t.id === activeTab);
											if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
										}}
									>
										Back
									</Button>
								)}
								{activeTab !== "notes" ? (
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											const currentIndex = tabs.findIndex((t) => t.id === activeTab);
											if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
										}}
									>
										Next
									</Button>
								) : (
									<Button
										type="submit"
										disabled={loading || (mode === "edit" && !form.formState.isDirty)}
										className={`transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}
									>
										{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										{loading ? "Saving..." : mode === "edit" ? "Update Project" : "Create Project"}
									</Button>
								)}
							</div>

							{mode === "edit" && (
								<Button
									type="button"
									variant="ghost"
									onClick={() => setShowDeleteModal(true)}
									className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Project
								</Button>
							)}
						</div>

						{submitStatus !== "idle" && (
							<div className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${submitStatus === "success"
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

			{/* Delete Confirmation Modal inside Form Card */}
			<Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-rose-600">
							<AlertTriangle className="h-5 w-5" />
							Confirm Project Deletion
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this project? This will permanently delete all plots and associated data for this project. This action is irreversible.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-4 flex gap-2 justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowDeleteModal(false)}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDeleteProject}
							disabled={deleting}
							className="bg-rose-600 text-white hover:bg-rose-700"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
