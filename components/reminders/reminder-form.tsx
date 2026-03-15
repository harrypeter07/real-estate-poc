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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Checkbox,
} from "@/components/ui";
import {
	reminderSchema,
	type ReminderFormValues,
} from "@/lib/validations/reminder";
import { createReminder, updateReminder } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";

interface ReminderFormProps {
	customers: any[];
	initialData?: any;
	mode?: "create" | "edit";
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ReminderForm({
	customers,
	initialData,
	mode = "create",
	onSuccess,
	onCancel,
}: ReminderFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const form = useForm<ReminderFormValues>({
		resolver: zodResolver(reminderSchema) as any,
		defaultValues: {
			title: initialData?.title || "",
			description: initialData?.description || "",
			phone: initialData?.phone || "",
			reminder_date:
				initialData?.reminder_date || new Date().toISOString().split("T")[0],
			reminder_time: initialData?.reminder_time || "10:00",
			customer_id: initialData?.customer_id || null,
			type: initialData?.type || "other",
			is_completed: initialData?.is_completed || false,
		},
	});

	const customerId = form.watch("customer_id");
	const isSelfReminder = form.watch("phone") === "self";

	const fillMockData = () => {
		const titles = [
			"Follow up for Token Payment",
			"Agreement Signing Meeting",
			"Site Visit with Family",
			"Registry Documentation Check",
			"Next Installment Reminder",
			"Birthday Wish - Client",
		];
		const types: any[] = [
			"payment",
			"agreement_expiry",
			"crm_followup",
			"token_expiry",
			"installment_due",
			"birthday_customer",
		];
		const randomIndex = Math.floor(Math.random() * titles.length);
		const randomTitle = titles[randomIndex];
		const randomType = types[randomIndex];
		const randomCustomer =
			customers.length > 0
				? customers[Math.floor(Math.random() * customers.length)].id
				: null;

		form.reset({
			title: randomTitle,
			description:
				"Meeting scheduled at office regarding Nagpur Wardha Road project.",
			reminder_date: new Date(Date.now() + 86400000)
				.toISOString()
				.split("T")[0], // Tomorrow
			reminder_time: "11:30",
			customer_id: randomCustomer,
			type: randomType,
			is_completed: false,
		});
	};

	async function onSubmit(values: ReminderFormValues) {
		setLoading(true);
		try {
			const result =
				mode === "edit"
					? await updateReminder(initialData.id, values)
					: await createReminder(values);

			if (!result.success) {
				toast.error("Error", { description: result.error });
				return;
			}

			toast.success(
				mode === "edit"
					? "Reminder updated successfully"
					: "Reminder set successfully"
			);

			if (onSuccess) {
				onSuccess();
			} else {
				router.push("/reminders");
				router.refresh();
			}
		} catch (err) {
			toast.error("Something went wrong");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card
			className={cn(
				"max-w-2xl w-full",
				mode === "edit" && "border-none shadow-none"
			)}
		>
			<CardHeader
				className={cn(
					"flex flex-row items-center justify-between space-y-0",
					mode === "edit" && "p-0 pb-4"
				)}
			>
				<div>
					<CardTitle>
						{mode === "edit" ? "Edit Reminder" : "Set Reminder"}
					</CardTitle>
					<CardDescription>
						{mode === "edit"
							? "Modify your follow-up or task"
							: "Schedule a follow-up or task"}
					</CardDescription>
				</div>
				{mode === "create" && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={fillMockData}
					>
						Fill Mock Data
					</Button>
				)}
			</CardHeader>
			<CardContent className={cn(mode === "edit" && "p-0")}>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Task / Title *</FormLabel>
									<FormControl>
										<Input placeholder="e.g. Call for payment" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="reminder_date"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date *</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="reminder_time"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} value={field.value || ""} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Reminder Type *</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="birthday_customer">
													Birthday (Customer)
												</SelectItem>
												<SelectItem value="birthday_advisor">
													Birthday (Advisor)
												</SelectItem>
												<SelectItem value="payment">
													Payment Follow-up
												</SelectItem>
												<SelectItem value="token_expiry">
													Token Expiry
												</SelectItem>
												<SelectItem value="agreement_expiry">
													Agreement Expiry
												</SelectItem>
												<SelectItem value="installment_due">
													Installment Due
												</SelectItem>
												<SelectItem value="crm_followup">
													CRM Follow-up
												</SelectItem>
												<SelectItem value="calling">Calling</SelectItem>
												<SelectItem value="other">Other Task</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="customer_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Related Customer</FormLabel>
										<Select
											onValueChange={(value) =>
												field.onChange(value === "none" ? null : value)
											}
											value={field.value || "none"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a customer (optional)" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">
													None / Manual / Self
												</SelectItem>
												{customers.map((customer) => (
													<SelectItem key={customer.id} value={customer.id}>
														{customer.name} ({customer.phone})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{(!customerId || customerId === "none") && (
							<div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-4">
								<div className="flex items-center gap-2">
									<Checkbox
										id="self-reminder"
										checked={isSelfReminder}
										onCheckedChange={(checked) => {
											form.setValue("phone", checked ? "self" : "");
										}}
									/>
									<label
										htmlFor="self-reminder"
										className="text-sm font-medium leading-none cursor-pointer"
									>
										This is a self-reminder (no WhatsApp needed)
									</label>
								</div>

								{!isSelfReminder && (
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Manual Phone Number (WhatsApp)</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter 10-digit phone number"
														{...field}
														value={
															field.value === "self" ? "" : field.value || ""
														}
													/>
												</FormControl>
												<FormDescription>
													If you don't select a customer, enter a phone number
													to send WhatsApp.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</div>
						)}

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Details</FormLabel>
									<FormControl>
										<Textarea
											rows={3}
											placeholder="Additional notes about the task"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-3 pt-4 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => (onCancel ? onCancel() : router.back())}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									loading || (mode === "edit" && !form.formState.isDirty)
								}
								className="min-w-[120px]"
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{mode === "edit" ? "Update Reminder" : "Save Reminder"}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
