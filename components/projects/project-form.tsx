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
	FileText,
	Calendar,
	Sliders,
	ClipboardList,
	ChevronDown,
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
	const [showErrorDialog, setShowErrorDialog] = useState(false);
	const [errorDialogMsg, setErrorDialogMsg] = useState("");

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
			down_payment_amount: initialData?.down_payment_amount ?? initialData?.down_payment_percent ?? initialData?.down_payment_percentage ? Number(initialData.down_payment_amount ?? initialData.down_payment_percent ?? initialData.down_payment_percentage) : 0,
			emi_months: initialData?.emi_months ? Number(initialData.emi_months) : 0,
			emi_type: (initialData?.emi_type as any) ?? "Flexible",
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
			down_payment_amount: 150000,
			emi_months: 36,
			emi_type: "Flexible",
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

	const onInvalid = (errors: any) => {
		const errorKeys = Object.keys(errors);
		if (errorKeys.length > 0) {
			const basicFields = ["project_name", "project_code", "location", "project_type", "total_plots_count", "starting_plot_number"];
			const pricingFields = ["starting_price", "rate_per_sqft", "plc_charges", "registration_charges"];
			const schemeFields = ["down_payment_amount", "emi_months", "emi_type", "offer_details"];
			const statusFields = ["status"];
			const notesFields = ["description", "amenities", "nearby_locations", "internal_notes"];

			let firstErrorTab = "";
			for (const key of errorKeys) {
				if (basicFields.includes(key)) {
					firstErrorTab = "basic";
					break;
				} else if (pricingFields.includes(key)) {
					firstErrorTab = "pricing";
					break;
				} else if (schemeFields.includes(key)) {
					firstErrorTab = "scheme";
					break;
				} else if (statusFields.includes(key)) {
					firstErrorTab = "status";
					break;
				} else if (notesFields.includes(key)) {
					firstErrorTab = "notes";
					break;
				}
			}

			if (firstErrorTab) {
				setActiveTab(firstErrorTab);
			}

			const tabLabel = firstErrorTab === "basic"
				? "Basic Info"
				: firstErrorTab.charAt(0).toUpperCase() + firstErrorTab.slice(1);

			setErrorDialogMsg(`Please fill in all required fields. Some required fields in the '${tabLabel}' tab have errors or are missing.`);
			setShowErrorDialog(true);
			playSubmitTone("error");
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
		{ id: "basic", label: "Basic Info", icon: FileText },
		{ id: "pricing", label: "Pricing", icon: DollarSign },
		{ id: "scheme", label: "Scheme", icon: Calendar },
		{ id: "status", label: "Status", icon: Sliders },
		{ id: "notes", label: "Notes", icon: ClipboardList },
	];

	return (
		<Card className="mx-auto w-full max-w-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl bg-gradient-to-tr from-white to-zinc-50/10 dark:from-zinc-950 dark:to-zinc-900/10 transition-all duration-300 overflow-hidden">
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-900/60 pb-5 p-5 sm:p-6 bg-zinc-50/[0.15] dark:bg-zinc-900/[0.05]">
				<div>
					<CardTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						{mode === "edit" ? "Edit Project" : "New Project"}
					</CardTitle>
					<CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
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
						className="text-[10px] h-8 font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 border border-teal-500/20 hover:bg-teal-500/20 hover:border-teal-500/30 transition-all duration-200"
					>
						Fill Mock Data
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="p-5 sm:p-6 pt-5">
				{/* Tab Buttons */}
				<div className="flex border-b border-zinc-200 dark:border-zinc-855 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2 pb-1.5">
					{tabs.map((t) => {
						const Icon = t.icon;
						const isActive = activeTab === t.id;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => setActiveTab(t.id)}
								className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border-b-2 -mb-px flex items-center gap-2 transition-all duration-200 cursor-pointer ${
									isActive
										? "border-teal-500 text-teal-600 bg-teal-500/[0.04] dark:text-teal-400 dark:bg-teal-500/[0.02]"
										: "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
								}`}
							>
								<Icon className={`h-3.5 w-3.5 transition-transform duration-200 ${isActive ? "scale-110 text-teal-500" : "text-zinc-400"}`} />
								<span>{t.label}</span>
							</button>
						);
					})}
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
						{/* Tab 1 – Basic Info */}
						{activeTab === "basic" && (
							<div className="space-y-5 animate-in fade-in duration-200 slide-in-from-bottom-2">
								<FormField
									control={form.control}
									name="project_name"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
												Project Name <span className="text-rose-500 font-bold ml-0.5">*</span>
											</FormLabel>
											<FormControl>
												<Input 
													placeholder="e.g. Nagpur Greens Phase 2" 
													className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
													{...field} 
												/>
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
												Project Code <span className="text-rose-500 font-bold ml-0.5">*</span>
											</FormLabel>
											<FormControl>
												<Input 
													placeholder="e.g. nagpur-greens-2" 
													className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
													{...field} 
												/>
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
												Location <span className="text-rose-500 font-bold ml-0.5">*</span>
											</FormLabel>
											<FormControl>
												<Input 
													placeholder="e.g. Wardha Road, Nagpur" 
													className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
													{...field} 
												/>
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Google Maps Link</FormLabel>
											<div className="flex gap-2">
												<FormControl className="flex-1">
													<Input 
														placeholder="https://maps.google.com/..." 
														className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
														{...field} 
													/>
												</FormControl>
												{field.value && (
													<Button
														type="button"
														variant="outline"
														size="icon"
														onClick={() => window.open(field.value, "_blank")}
														title="Open Map"
														className="h-10 w-10 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-xl dark:border-zinc-800 dark:hover:bg-zinc-900/40 transition-colors"
													>
														<ExternalLink className="h-4 w-4 text-zinc-500" />
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
												Project Type <span className="text-rose-500 font-bold ml-0.5">*</span>
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<select
														value={field.value}
														onChange={field.onChange}
														className="w-full h-10 pl-3.5 pr-10 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 transition-all duration-200 cursor-pointer appearance-none"
													>
														<option value="Plot">Plot</option>
														<option value="Flat">Flat</option>
														<option value="Row House">Row House</option>
														<option value="Farm House">Farm House</option>
														<option value="Commercial">Commercial</option>
														<option value="Mixed">Mixed Property</option>
													</select>
													<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none group-hover:text-teal-500 transition-colors" />
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
									<FormField
										control={form.control}
										name="total_plots_count"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
													Total Units / Plots <span className="text-rose-500 font-bold ml-0.5">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														disabled={mode === "edit"}
														placeholder="e.g. 50"
														className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseInt(val) || 0);
														}}
													/>
												</FormControl>
												{mode === "edit" && (
													<p className="text-[10px] text-zinc-400/80 mt-1.5 font-medium">Unit count cannot be altered after creation.</p>
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
												<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Starting Unit No.</FormLabel>
												<FormControl>
													<Input
														type="number"
														disabled={mode === "edit"}
														placeholder="e.g. 1"
														className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseInt(val) || 1);
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
							<div className="space-y-5 animate-in fade-in duration-200 slide-in-from-bottom-2">
								<FormField
									control={form.control}
									name="starting_price"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Starting Price (₹)</FormLabel>
											<div className="relative flex items-center group">
												<div className="absolute left-0 pl-3.5 flex items-center pointer-events-none border-r border-zinc-200 dark:border-zinc-800 pr-2.5 h-5 top-1/2 -translate-y-1/2">
													<span className="text-zinc-400 group-focus-within:text-teal-500 font-bold text-xs transition-colors">₹</span>
												</div>
												<FormControl>
													<Input
														type="number"
														className="pl-12 sm:pl-12 h-10 w-full bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
														placeholder="e.g. 2500000"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseFloat(val) || 0);
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Rate per Sq Ft (₹)</FormLabel>
											<div className="relative flex items-center group">
												<div className="absolute left-0 pl-3.5 flex items-center pointer-events-none border-r border-zinc-200 dark:border-zinc-800 pr-2.5 h-5 top-1/2 -translate-y-1/2">
													<span className="text-zinc-400 group-focus-within:text-teal-500 font-bold text-xs transition-colors">₹</span>
												</div>
												<FormControl>
													<Input
														type="number"
														className="pl-12 sm:pl-12 h-10 w-full bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
														placeholder="e.g. 1800"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseFloat(val) || 0);
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">PLC (Preferential Location Charges) (₹)</FormLabel>
											<div className="relative flex items-center group">
												<div className="absolute left-0 pl-3.5 flex items-center pointer-events-none border-r border-zinc-200 dark:border-zinc-800 pr-2.5 h-5 top-1/2 -translate-y-1/2">
													<span className="text-zinc-400 group-focus-within:text-teal-500 font-bold text-xs transition-colors">₹</span>
												</div>
												<FormControl>
													<Input
														type="number"
														className="pl-12 sm:pl-12 h-10 w-full bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
														placeholder="e.g. 150000"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseFloat(val) || 0);
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Registration Charges (₹)</FormLabel>
											<div className="relative flex items-center group">
												<div className="absolute left-0 pl-3.5 flex items-center pointer-events-none border-r border-zinc-200 dark:border-zinc-800 pr-2.5 h-5 top-1/2 -translate-y-1/2">
													<span className="text-zinc-400 group-focus-within:text-teal-500 font-bold text-xs transition-colors">₹</span>
												</div>
												<FormControl>
													<Input
														type="number"
														className="pl-12 sm:pl-12 h-10 w-full bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
														placeholder="e.g. 75000"
														{...field}
														value={field.value ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															field.onChange(val === "" ? "" : parseFloat(val) || 0);
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
							<div className="space-y-5 animate-in fade-in duration-200 slide-in-from-bottom-2">
								<FormField
									control={form.control}
									name="down_payment_amount"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Down Payment (₹)</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="e.g. 150000"
													className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
													{...field}
													value={field.value ?? ""}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === "" ? "" : parseFloat(val) || 0);
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">EMI Months</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="e.g. 36"
													className="h-10 bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
													{...field}
													value={field.value ?? ""}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === "" ? "" : parseInt(val) || 0);
													}}
												/>
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Offer Details</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. 20% down payment, 36 months EMI, interest-free"
													rows={3}
													className="bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[90px] resize-y"
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
							<div className="space-y-5 animate-in fade-in duration-200 slide-in-from-bottom-2">
								<FormField
									control={form.control}
									name="status"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Status</FormLabel>
											<FormControl>
												<div className="relative group">
													<select
														value={field.value}
														onChange={field.onChange}
														className="w-full h-10 pl-3.5 pr-10 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 transition-all duration-200 cursor-pointer appearance-none"
													>
														<option value="Upcoming">Upcoming</option>
														<option value="Active">Active</option>
														<option value="Hold">Hold</option>
														<option value="Completed">Completed</option>
														<option value="Sold Out">Sold Out</option>
													</select>
													<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none group-hover:text-teal-500 transition-colors" />
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Tab 5 – Notes */}
						{activeTab === "notes" && (
							<div className="space-y-5 animate-in fade-in duration-200 slide-in-from-bottom-2">
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Description</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Describe the project layout, size, and details..."
													rows={4}
													className="bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[110px] resize-y"
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Amenities (comma-separated or bullet list)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. Security, Gated Community, Park, Jogging Track"
													rows={3}
													className="bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[90px] resize-y"
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Nearby Locations</FormLabel>
											<FormControl>
												<Textarea
													placeholder="e.g. Airport: 5km, School: 1km, Metro: 2km"
													rows={3}
													className="bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[90px] resize-y"
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
											<FormLabel className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">Internal Notes (Admins Only)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="These notes are private and not shared with clients..."
													rows={3}
													className="bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-h-[90px] resize-y"
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
						<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-zinc-150 dark:border-zinc-800 pt-5 gap-4">
							<div className="flex flex-wrap gap-2.5">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.back()}
									className="rounded-xl h-10 px-5 font-bold border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40 transition-all duration-200 active:scale-[0.98] cursor-pointer"
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
										className="rounded-xl h-10 px-5 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all duration-200 active:scale-[0.98] cursor-pointer text-zinc-500"
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
										className="rounded-xl h-10 px-5 font-bold border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40 text-teal-600 dark:text-teal-400 hover:border-teal-500/20 transition-all duration-200 active:scale-[0.98] cursor-pointer"
									>
										Next
									</Button>
								) : (
									<Button
										type="submit"
										disabled={loading || (mode === "edit" && !form.formState.isDirty)}
										className={`rounded-xl h-10 px-6 font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 text-white disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed`}
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
									className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl h-10 px-4 transition-colors font-bold flex items-center justify-center cursor-pointer"
								>
									<Trash2 className="h-4 w-4 mr-2 shrink-0" />
									Delete Project
								</Button>
							)}
						</div>

						{submitStatus !== "idle" && (
							<div className={`mt-4 flex items-center gap-2.5 rounded-xl border p-3.5 text-xs font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.01)] animate-in fade-in-0 zoom-in-95 duration-300 ${
								submitStatus === "success"
									? "border-emerald-100 bg-emerald-50/70 text-emerald-800 dark:border-emerald-950/20 dark:bg-emerald-950/20 dark:text-emerald-400"
									: "border-rose-100 bg-rose-50/70 text-rose-800 dark:border-rose-950/20 dark:bg-rose-950/20 dark:text-rose-400"
								}`}>
								{submitStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />}
								<span>{statusText}</span>
							</div>
						)}
					</form>
				</Form>
			</CardContent>

			{/* Delete Confirmation Modal inside Form Card */}
			<Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
				<DialogContent className="sm:max-w-md rounded-2xl border-zinc-200 dark:border-zinc-800">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2.5 text-rose-600 font-bold text-lg">
							<AlertTriangle className="h-5.5 w-5.5" />
							Confirm Project Deletion
						</DialogTitle>
						<DialogDescription className="text-zinc-500 text-sm mt-1">
							Are you sure you want to delete this project? This will permanently delete all plots and associated data for this project. This action is irreversible.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-4 flex gap-2 justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowDeleteModal(false)}
							disabled={deleting}
							className="rounded-xl h-10 px-5 font-bold transition-all"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDeleteProject}
							disabled={deleting}
							className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 px-5 font-bold transition-all active:scale-[0.98]"
						>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete Project
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Simple & Premium Validation Error Dialog in the Center */}
			<Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
				<DialogContent className="rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-950 p-6 max-w-sm mx-auto shadow-2xl z-50 overflow-hidden text-center">
					<DialogHeader className="flex flex-col items-center gap-3">
						<div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center shadow-xs shrink-0 mb-1">
							<AlertTriangle className="h-6 w-6" />
						</div>
						<DialogTitle className="font-bold text-zinc-900 dark:text-zinc-50 text-base m-0">
							Form Validation Failed
						</DialogTitle>
						<DialogDescription className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">
							{errorDialogMsg}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-5 flex justify-center sm:justify-center w-full">
						<Button
							type="button"
							onClick={() => setShowErrorDialog(false)}
							className="h-9 px-6 text-xs font-black rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
						>
							Got it
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
