"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
	LogOut, 
	Loader2, 
	LayoutDashboard, 
	Users, 
	Blocks, 
	History, 
	Menu, 
	X, 
	Shield 
} from "lucide-react";
import { toast } from "sonner";

const items = [
	{ href: "/superadmin", label: "Overview", icon: LayoutDashboard },
	{ href: "/superadmin/admins", label: "Admins", icon: Users },
	{ href: "/superadmin/modules", label: "Modules", icon: Blocks },
	{ href: "/superadmin/audit-logs", label: "Audit logs", icon: History },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const [mobileOpen, setMobileOpen] = useState(false);
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
			toast.success("Signed out successfully");
			router.push("/superadmin-login");
			router.refresh();
		} catch {
			toast.error("Could not sign out", { description: "Try again or clear site cookies." });
		} finally {
			setSigningOut(false);
		}
	}

	return (
		<div className="flex h-screen overflow-hidden bg-gradient-to-br from-teal-50/20 via-zinc-50/30 to-teal-100/10">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex flex-col w-64 border-r border-zinc-200/80 bg-white/75 backdrop-blur-md shadow-sm">
				<div className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-100">
					<div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
						<Shield className="h-5 w-5" />
					</div>
					<div>
						<div className="text-sm font-black text-zinc-800 tracking-tight">Super Admin</div>
						<div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Control Panel</div>
					</div>
				</div>
				<div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
					{items.map((it) => {
						const active = pathname === it.href;
						const Icon = it.icon;
						return (
							<Link
								key={it.href}
								href={it.href}
								className={cn(
									"flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 relative group",
									active 
										? "bg-teal-600 text-white shadow-md shadow-teal-600/15" 
										: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60"
								)}
							>
								<Icon className={cn("h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-600")} />
								{it.label}
							</Link>
						);
					})}
				</div>
			</aside>

			{/* Mobile Side Drawer Overlay */}
			{mobileOpen && (
				<div 
					className="md:hidden fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-xs transition-opacity duration-300"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			{/* Mobile Drawer */}
			<aside className={cn(
				"md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-lg border-r border-zinc-200 shadow-xl transition-transform duration-350 ease-out flex flex-col",
				mobileOpen ? "translate-x-0" : "-translate-x-full"
			)}>
				<div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
					<div className="flex items-center gap-2.5">
						<div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
							<Shield className="h-5 w-5" />
						</div>
						<div>
							<div className="text-sm font-black text-zinc-800 tracking-tight">Super Admin</div>
							<div className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Control Panel</div>
						</div>
					</div>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 rounded-lg"
						onClick={() => setMobileOpen(false)}
					>
						<X className="h-5 w-5" />
					</Button>
				</div>
				<div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
					{items.map((it) => {
						const active = pathname === it.href;
						const Icon = it.icon;
						return (
							<Link
								key={it.href}
								href={it.href}
								onClick={() => setMobileOpen(false)}
								className={cn(
									"flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
									active 
										? "bg-teal-600 text-white shadow-md shadow-teal-600/15" 
										: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-150"
								)}
							>
								<Icon className={cn("h-4.5 w-4.5", active ? "text-white" : "text-zinc-400")} />
								{it.label}
							</Link>
						);
					})}
				</div>
			</aside>

			{/* Main Workspace Area */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="border-b border-zinc-200/80 bg-white/75 backdrop-blur-md shadow-2xs">
					<div className="flex items-center justify-between px-4 py-3.5 lg:px-6">
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="icon"
								className="md:hidden h-9 w-9 text-zinc-600 hover:bg-zinc-100 rounded-lg"
								onClick={() => setMobileOpen(true)}
							>
								<Menu className="h-5 w-5" />
							</Button>
							<div className="text-sm font-bold text-zinc-800 md:block hidden">Super Admin Board</div>
							<div className="text-sm font-bold text-zinc-800 md:hidden block">Super Admin</div>
						</div>
						
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void handleSignOut()}
								disabled={signingOut}
								className="text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950 font-bold rounded-xl h-9.5"
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
				<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7.5xl mx-auto w-full">
					{children}
				</main>
			</div>
		</div>
	);
}

