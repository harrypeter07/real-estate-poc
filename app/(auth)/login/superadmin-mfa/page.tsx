"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Loader2, Shield } from "lucide-react";
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
import { completeSuperAdminMfa } from "@/app/actions/auth";

const schema = z.object({
	code: z.string().trim().min(1, "Enter your security code"),
});

type FormValues = z.infer<typeof schema>;

export default function SuperAdminMfaPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { code: "" },
	});

	async function onSubmit(values: FormValues) {
		setLoading(true);
		try {
			const result = await completeSuperAdminMfa(values.code);
			if (!result.success) {
				toast.error("Verification failed", { description: result.error });
				return;
			}
		} finally {
			setLoading(false);
		}
	}

	async function onCancel() {
		if (cancelling) return;
		setCancelling(true);
		try {
			const res = await fetch("/api/auth/superadmin-signout", {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) throw new Error("signout");
			router.push("/login");
			router.refresh();
		} catch {
			toast.error("Could not cancel", { description: "Try again or clear cookies." });
		} finally {
			setCancelling(false);
		}
	}

	return (
		<div
			suppressHydrationWarning
			className="relative min-h-screen overflow-hidden"
		>
			<div
				suppressHydrationWarning
				aria-hidden
				className="absolute inset-0 bg-cover bg-center"
				style={{ backgroundImage: "url('/bg.png')" }}
			/>
			<div className="relative z-10 min-h-screen flex justify-center sm:justify-center lg:justify-start px-4 sm:px-12 lg:px-20">
				<div className="w-full sm:max-w-md sm:pt-0 sm:-translate-y-6 pt-20 sm:flex sm:items-center">
					<Card
						suppressHydrationWarning
						className="w-full max-w-md bg-zinc-100/90 border border-zinc-200/70 shadow-xl"
					>
						<CardHeader className="text-center space-y-4">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
								<Building2 className="h-8 w-8 text-white dark:text-zinc-900" />
							</div>
							<div>
								<CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
									<Shield className="h-6 w-6 text-zinc-700" />
									Super admin
								</CardTitle>
								<CardDescription className="text-sm mt-1">
									Second step — enter your authenticator code or security passphrase
								</CardDescription>
							</div>
						</CardHeader>
						<CardContent>
							<Form {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
									<FormField
										control={form.control}
										name="code"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Security code</FormLabel>
												<FormControl>
													<Input
														placeholder="6-digit code or passphrase"
														type="text"
														autoComplete="one-time-code"
														inputMode="numeric"
														className="font-mono tracking-widest"
														autoFocus
														{...field}
													/>
												</FormControl>
												<p className="text-[10px] text-zinc-500">
													Use the same second factor configured for this environment (TOTP or
													SUPERADMIN_SECOND_PASSWORD).
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button type="submit" className="w-full" disabled={loading}>
										{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										Continue to console
									</Button>
									<Button
										type="button"
										variant="ghost"
										className="w-full"
										disabled={cancelling}
										onClick={() => void onCancel()}
									>
										{cancelling ? "Signing out…" : "Cancel and use a different account"}
									</Button>
								</form>
							</Form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
