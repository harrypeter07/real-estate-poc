"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
	{ href: "/superadmin", label: "Overview" },
	{ href: "/superadmin/admins", label: "Admins" },
	{ href: "/superadmin/modules", label: "Modules" },
	{ href: "/superadmin/audit-logs", label: "Audit logs" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

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
							<Link href="/dashboard" className="text-sm text-zinc-600 hover:underline">
								Go to app
							</Link>
						</div>
					</div>
				</header>
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}

