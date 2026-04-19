"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

const items = [
	{ href: "/superadmin", label: "Overview" },
	{ href: "/superadmin/admins", label: "Admins" },
	{ href: "/superadmin/modules", label: "Modules" },
	{ href: "/superadmin/audit-logs", label: "Audit logs" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);
	const pathname = usePathname();
	const router = useRouter();

	async function handleSignOut() {
		if (signingOut) return;
		setSigningOut(true);
		try {
			const res = await fetch("/api/auth/superadmin-signout", {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) throw new Error("Sign out failed");
			toast.success("Signed out");
			router.push("/login");
			router.refresh();
		} catch {
			toast.error("Could not sign out", { description: "Try again or clear site cookies." });
		} finally {
			setSigningOut(false);
		}
	}

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<aside className={cn("hidden md:flex w-64 border-r bg-white", open ? "block" : "")}>
				<div className="p-4 w-full">
					<div className="text-sm font-bold tracking-tight">Super Admin</div>
					<div className="mt-4 flex flex-col gap-1">
						{items.map((it) => {
							const active = pathname === it.href;
							return (
								<Link
									key={it.href}
									href={it.href}
									className={cn(
										"rounded-md px-3 py-2 text-sm",
										active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
									)}
								>
									{it.label}
								</Link>
							);
						})}
					</div>
				</div>
			</aside>

			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="border-b bg-white">
					<div className="flex items-center justify-between p-4">
						<div className="text-sm font-semibold">Super Admin</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="md:hidden"
								onClick={() => setOpen((v) => !v)}
							>
								Menu
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleSignOut()}
								disabled={signingOut}
								className="text-zinc-700"
							>
								{signingOut ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<LogOut className="h-4 w-4 mr-2" />
								)}
								{signingOut ? "Signing out…" : "Sign out"}
							</Button>
						</div>
					</div>
				</header>
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}

