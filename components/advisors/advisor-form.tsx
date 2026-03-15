"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
	advisorSchema,
	type AdvisorFormValues,
} from "@/lib/validations/advisor";
import { createAdvisor, updateAdvisor } from "@/app/actions/advisors";

interface AdvisorFormProps {
	mode: "create" | "edit";
	initialData?: any;
}

export function AdvisorForm({ mode, initialData }: AdvisorFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const form = useForm<AdvisorFormValues>({
		resolver: zodResolver(advisorSchema) as any,
		defaultValues: {
			name: initialData?.name ?? "",
			code: initialData?.code ?? "",
			phone: initialData?.phone ?? "",
			address: initialData?.address ?? "",
			birth_date: initialData?.birth_date ?? "",
			commission_face1: initialData?.commission_face1 ?? 2,
			commission_face2: initialData?.commission_face2 ?? 2,
			commission_face3: initialData?.commission_face3 ?? 2,
			commission_face4: initialData?.commission_face4 ?? 2,
			commission_face5: initialData?.commission_face5 ?? 2,
			commission_face6: initialData?.commission_face6 ?? 2,
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

		form.reset({
			name: randomName,
			code: randomCode,
			phone: `98${Math.floor(Math.random() * 90000000) + 10000000}`,
			address: `${
				Math.floor(Math.random() * 100) + 1
			}, Main Road, ${randomArea}, Nagpur`,
			birth_date: "1985-05-15",
			commission_face1: 2.5,
			commission_face2: 2.5,
			commission_face3: 2.0,
			commission_face4: 2.0,
			commission_face5: 1.5,
			commission_face6: 1.5,
			notes: `Experienced advisor specialized in ${randomArea} area of Nagpur.`,
			is_active: true,
		});
	};

	async function onSubmit(values: AdvisorFormValues) {
		setLoading(true);
		try {
			let result;
			if (mode === "edit" && initialData?.id) {
				result = await updateAdvisor(initialData.id, values);
			} else {
				result = await createAdvisor(values);
			}

			if (!result.success) {
				toast.error("Error", { description: result.error });
				return;
			}

			toast.success(mode === "edit" ? "Advisor updated" : "Advisor created");
			router.push("/advisors");
			router.refresh();
		} catch (err) {
			toast.error("Something went wrong");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card className="max-w-4xl w-full">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>
						{mode === "edit" ? "Edit Advisor" : "New Advisor"}
					</CardTitle>
					<CardDescription>
						Enter details for the channel partner
					</CardDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={fillMockData}
				>
					Fill Mock Data
				</Button>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
											<Input placeholder="e.g. 9876543210" {...field} />
										</FormControl>
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

						<div className="space-y-3">
							<h3 className="text-sm font-semibold border-b pb-2">
								Commission Percentages (%)
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-6 gap-3">
								{[1, 2, 3, 4, 5, 6].map((num) => (
									<FormField
										key={num}
										control={form.control}
										name={`commission_face${num}` as any}
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-xs text-zinc-500 uppercase font-bold">
													Face {num}
												</FormLabel>
												<FormControl>
													<Input type="number" step="0.1" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}
							</div>
						</div>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea
											rows={3}
											placeholder="Additional info about advisor"
											{...field}
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
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{mode === "edit" ? "Update Advisor" : "Create Advisor"}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
