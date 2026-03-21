"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
} from "@/components/ui";
import {
	projectSchema,
	type ProjectFormValues,
} from "@/lib/validations/project";
import { createProject, updateProject } from "@/app/actions/project-actions";

interface ProjectFormProps {
	mode: "create" | "edit";
	initialData?: {
		id: string;
		name: string;
		location: string | null;
		total_plots_count: number;
		layout_expense: number | null;
		min_plot_rate?: number | null;
		starting_plot_number?: number | null;
		description: string | null;
	};
}

export function ProjectForm({ mode, initialData }: ProjectFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const form = useForm<ProjectFormValues>({
		// `zodResolver` infers optional inputs due to `.default(...)`.
		// Cast to `any` to satisfy RHF generic without changing runtime behavior.
		resolver: zodResolver(projectSchema) as any,
		defaultValues: {
			name: initialData?.name ?? "",
			location: initialData?.location ?? "",
			total_plots_count: initialData?.total_plots_count ?? 0,
			min_plot_rate: initialData?.min_plot_rate ?? 0,
			starting_plot_number: initialData?.starting_plot_number ?? 1,
			description: initialData?.description ?? "",
		},
	});

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
		const randomLoc =
			nagpurLocations[Math.floor(Math.random() * nagpurLocations.length)];
		const randomName =
			projectNames[Math.floor(Math.random() * projectNames.length)];
		const randomNum = Math.floor(Math.random() * 100);

		form.reset({
			name: `${randomName} Phase ${randomNum}`,
			location: `${randomLoc}, Nagpur`,
			total_plots_count: Math.floor(Math.random() * 150) + 20,
			min_plot_rate: Math.floor(Math.random() * 500) + 200,
			starting_plot_number: 1,
			description: `Premium land project located in the fast-growing ${randomLoc} area of Nagpur. Excellent connectivity and future appreciation potential.`,
		});
	};

	const onSubmit: SubmitHandler<ProjectFormValues> = async (values) => {
		setLoading(true);

		try {
			let result;

			if (mode === "edit" && initialData?.id) {
				result = await updateProject(initialData.id, values);
			} else {
				result = await createProject(values);
			}

			if (!result.success) {
				toast.error("Error", { description: result.error });
				return;
			}

			toast.success(
				mode === "edit"
					? "Project updated successfully"
					: "Project created successfully"
			);
			router.push("/projects");
			router.refresh();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Something went wrong";
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="max-w-2xl">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>
						{mode === "edit" ? "Edit Project" : "New Project"}
					</CardTitle>
					<CardDescription>
						{mode === "edit"
							? "Update the project details below"
							: "Fill in the details to create a new land project"}
					</CardDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={fillMockData}
					className="text-xs h-8"
				>
					Fill Mock Data
				</Button>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Project Name <span className="text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Tanfal Layout 29" {...field} />
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
										<Input placeholder="e.g. Nashik Road, Nashik" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="total_plots_count"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Total Plots <span className="text-red-500">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="e.g. 50"
												{...field}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													field.onChange(
														sanitized === ""
															? 0
															: parseInt(sanitized) || 0
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="min_plot_rate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Min Rate (₹/sqft)</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="e.g. 300"
												{...field}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													field.onChange(
														sanitized === ""
															? 0
															: parseFloat(sanitized) || 0
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="starting_plot_number"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Starting Plot No.</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="e.g. 1"
												{...field}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													field.onChange(
														sanitized === ""
															? 1
															: parseInt(sanitized) || 1
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Add any additional details about this project"
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
								disabled={loading || (mode === "edit" && !form.formState.isDirty)}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{mode === "edit" ? "Update Project" : "Create Project"}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
