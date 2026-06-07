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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import {
	plotSchema,
	plotUpdateSchema,
	type PlotFormValues,
	type PlotUpdateFormValues,
} from "@/lib/validations/plot";
import { createPlot, updatePlot } from "@/app/actions/plots";
import { isDev } from "@/lib/is-dev";

/** Treat 0 as empty so numeric fields do not show leading/placeholder zeros. */
function initialPlotNumeric(n: number | undefined | null) {
	if (n == null || !Number.isFinite(Number(n)) || Number(n) <= 0) return undefined;
	return Number(n);
}

interface PlotFormProps {
	mode: "create" | "edit";
	projectId: string;
	projectType?: string | null;
	initialData?: {
		id: string;
		plot_number: string;
		size_sqft: number;
		rate_per_sqft: number;
		facing: string | null;
		type?: string | null;
		notes: string | null;
	};
}

export function PlotForm({ mode, projectId, projectType, initialData }: PlotFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
	const [statusText, setStatusText] = useState("");

	const getUnitLabels = (type?: string | null) => {
		const t = (type || "Plot").toLowerCase().trim();
		if (t === "flat") return { singular: "Flat", plural: "Flats" };
		if (t === "row house" || t === "row_house") return { singular: "Row House", plural: "Row Houses" };
		if (t === "farm house" || t === "farmhouse" || t === "farm_house") return { singular: "Farm House", plural: "Farm Houses" };
		if (t === "commercial") return { singular: "Commercial Unit", plural: "Commercial Units" };
		if (t === "mixed") return { singular: "Mixed Property", plural: "Mixed Properties" };
		return { singular: "Plot", plural: "Plots" };
	};

	const { singular, plural } = getUnitLabels(projectType);

	const getPlotTypeFromProject = (pType?: string | null) => {
		const t = (pType || "Plot").toLowerCase().trim();
		if (t === "flat") return "flat";
		if (t === "row house" || t === "row_house") return "villa";
		if (t === "farm house" || t === "farmhouse" || t === "farm_house") return "farmhouse";
		if (t === "commercial") return "commercial";
		return "plot";
	};

	const form = useForm<PlotFormValues | PlotUpdateFormValues>({
		resolver: zodResolver(mode === "edit" ? plotUpdateSchema : plotSchema) as any,
		defaultValues: {
			plot_number: initialData?.plot_number ?? "",
			size_sqft: initialPlotNumeric(initialData?.size_sqft) as any,
			rate_per_sqft: initialPlotNumeric(initialData?.rate_per_sqft) as any,
			facing: initialData?.facing ?? "",
			type: (initialData?.type || getPlotTypeFromProject(projectType)) as any,
			notes: initialData?.notes ?? "",
		},
	});

	const size = form.watch("size_sqft");
	const rate = form.watch("rate_per_sqft");
	const totalAmount = (size || 0) * (rate || 0);

	const fillMockData = () => {
		const facings = [
			"East",
			"West",
			"North",
			"South",
			"North-East",
			"North-West",
			"South-East",
			"South-West",
		];
		const types = ["plot", "flat", "villa", "farmhouse", "commercial", "other"];
		const randomNum = Math.floor(Math.random() * 200) + 1;
		const randomFacing = facings[Math.floor(Math.random() * facings.length)];
		const randomType = types[Math.floor(Math.random() * types.length)] as any;
		const randomSize = [1000, 1200, 1500, 1800, 2000, 2400, 3000, 5000][
			Math.floor(Math.random() * 8)
		];
		const randomRate = [1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000][
			Math.floor(Math.random() * 9)
		];

		form.reset({
			plot_number: `LT NO-${randomNum}`,
			size_sqft: randomSize,
			rate_per_sqft: randomRate,
			facing: randomFacing,
			type: randomType,
			notes: `This is a premium ${randomFacing} facing ${randomType} in a prime location. Excellent for residential development.`,
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

	async function onSubmit(values: PlotFormValues | PlotUpdateFormValues) {
		setLoading(true);
		setSubmitStatus("idle");
		setStatusText("");

		try {
			let result;

			if (mode === "edit" && initialData?.id) {
				result = await updatePlot(initialData.id, projectId, values as PlotUpdateFormValues);
			} else {
				result = await createPlot(projectId, values as PlotFormValues);
			}

			if (!result.success) {
				toast.error("Error", { description: result.error });
				setSubmitStatus("error");
				setStatusText(result.error ?? `Failed to save ${singular.toLowerCase()}`);
				playSubmitTone("error");
				return;
			}

			toast.success(
				mode === "edit"
					? `${singular} updated successfully`
					: `${singular} created successfully`
			);
			setSubmitStatus("success");
			setStatusText(mode === "edit" ? `${singular} updated successfully.` : `${singular} created successfully.`);
			playSubmitTone("success");
			router.push(`/projects/${projectId}`);
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
	}

	return (
		<Card className="max-w-2xl">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>{mode === "edit" ? `Edit ${singular}` : `New ${singular}`}</CardTitle>
					<CardDescription>
						{mode === "edit"
							? `Update the ${singular.toLowerCase()} details below`
							: `Fill in the details to add a new ${singular.toLowerCase()} to this project`}
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
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="plot_number"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{singular} Number <span className="text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<Input placeholder="e.g. LT NO-01" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="size_sqft"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
										Size (sqft){" "}
										{mode === "create" ? <span className="text-red-500">*</span> : null}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="any"
												placeholder="e.g. 1500"
												{...field}
												value={field.value ?? ""}
												min={0}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													if (sanitized === "") {
														field.onChange(undefined);
														return;
													}
													const n = parseFloat(sanitized);
													field.onChange(Number.isFinite(n) ? n : undefined);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="rate_per_sqft"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
										Rate per sqft{" "}
										{mode === "create" ? <span className="text-red-500">*</span> : null}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="any"
												placeholder="e.g. 1200"
												{...field}
												value={field.value ?? ""}
												min={0}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													if (sanitized === "") {
														field.onChange(undefined);
														return;
													}
													const n = parseFloat(sanitized);
													field.onChange(Number.isFinite(n) ? n : undefined);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{Number(size ?? 0) > 0 && Number(rate ?? 0) > 0 && (
							<div className="rounded-lg bg-zinc-50 p-4 border border-zinc-200">
								<div className="flex justify-between items-center">
									<span className="text-sm text-zinc-500 font-medium">
										Total {singular} Amount
									</span>
									<span className="text-lg font-bold text-zinc-900">
										{formatCurrency(totalAmount)}
									</span>
								</div>
							</div>
						)}

						{projectType?.toLowerCase().trim() === "mixed" && (
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Property Type</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select property type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="plot">Plot</SelectItem>
												<SelectItem value="flat">Flat</SelectItem>
												<SelectItem value="villa">Villa</SelectItem>
												<SelectItem value="farmhouse">Farmhouse</SelectItem>
												<SelectItem value="commercial">Commercial</SelectItem>
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="facing"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Facing</FormLabel>
									<FormControl>
										<Input placeholder="e.g. East" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea
											placeholder={`Add any additional details about this ${singular.toLowerCase()}`}
											className="resize-none"
											rows={4}
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									loading || (mode === "edit" && !form.formState.isDirty)
								}
								className={`transition-all duration-300 ${loading ? "scale-[1.02] shadow-md" : ""}`}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{loading ? "Submitting..." : mode === "edit" ? `Update ${singular}` : `Create ${singular}`}
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
