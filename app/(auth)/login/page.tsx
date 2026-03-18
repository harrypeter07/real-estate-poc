"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Building2, Loader2, UserCheck, Shield } from "lucide-react";
import {
	Button,
	Input,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui";
import { signInWithEmailOrPhone } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const adminSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

const advisorSchema = z.object({
	phone: z.string().min(10, "Valid phone number required"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

type AdminFormValues = z.infer<typeof adminSchema>;
type AdvisorFormValues = z.infer<typeof advisorSchema>;

export default function LoginPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [mode, setMode] = useState<"admin" | "advisor">("admin");

	const adminForm = useForm<AdminFormValues>({
		resolver: zodResolver(adminSchema),
		defaultValues: { email: "", password: "" },
	});

	const advisorForm = useForm<AdvisorFormValues>({
		resolver: zodResolver(advisorSchema),
		defaultValues: { phone: "", password: "" },
	});

	async function onAdminSubmit(values: AdminFormValues) {
		setLoading(true);
		const supabase = createClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: values.email,
			password: values.password,
		});
		if (error) {
			toast.error("Login failed", { description: error.message });
			setLoading(false);
			return;
		}
		toast.success("Welcome back!");
		router.push("/dashboard");
		router.refresh();
	}

	async function onAdvisorSubmit(values: AdvisorFormValues) {
		setLoading(true);
		const result = await signInWithEmailOrPhone(
			values.phone,
			values.password
		);
		if (!result.success) {
			toast.error("Login failed", { description: result.error });
			setLoading(false);
			return;
		}
		toast.success("Welcome!");
		router.refresh();
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
						<Building2 className="h-8 w-8 text-white dark:text-zinc-900" />
					</div>
					<div>
						<CardTitle className="text-2xl font-bold">MG INFRA</CardTitle>
						<CardDescription className="text-sm mt-1">
							Estate Management + CRM
						</CardDescription>
					</div>
					<div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100/50">
						<button
							type="button"
							onClick={() => setMode("admin")}
							className={cn(
								"flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
								mode === "admin"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-600 hover:text-zinc-900"
							)}
						>
							<Shield className="h-4 w-4" />
							Admin
						</button>
						<button
							type="button"
							onClick={() => setMode("advisor")}
							className={cn(
								"flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
								mode === "advisor"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-600 hover:text-zinc-900"
							)}
						>
							<UserCheck className="h-4 w-4" />
							Advisor
						</button>
					</div>
				</CardHeader>
				<CardContent>
					{mode === "admin" ? (
						<Form {...adminForm}>
							<form
								onSubmit={adminForm.handleSubmit(onAdminSubmit)}
								className="space-y-4"
							>
								<FormField
									control={adminForm.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													placeholder="admin@mginfra.com"
													type="email"
													autoComplete="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={adminForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input
													placeholder="••••••••"
													type="password"
													autoComplete="current-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" className="w-full" disabled={loading}>
									{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Sign In
								</Button>
							</form>
						</Form>
					) : (
						<Form {...advisorForm}>
							<form
								onSubmit={advisorForm.handleSubmit(onAdvisorSubmit)}
								className="space-y-4"
							>
								<FormField
									control={advisorForm.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Phone Number</FormLabel>
											<FormControl>
												<Input
													placeholder="9876543210"
													type="tel"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={advisorForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input
													placeholder="••••••••"
													type="password"
													autoComplete="current-password"
													{...field}
												/>
											</FormControl>
											<p className="text-[10px] text-zinc-500">
												Default: your phone number (set by admin)
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type="submit" className="w-full" disabled={loading}>
									{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Sign In
								</Button>
							</form>
						</Form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
