"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ADVISOR_NAV_ITEMS } from "@/components/layout/nav-items";

export function AdvisorAppShell({
	children,
	mainAdvisorBanner,
}: {
	children: React.ReactNode;
	mainAdvisorBanner?: { name: string; code: string | null } | null;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<Sidebar
				open={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
				items={ADVISOR_NAV_ITEMS}
			/>

			<div className="flex flex-1 flex-col overflow-hidden">
				<Header onMenuClick={() => setSidebarOpen(true)} />
				{mainAdvisorBanner ? (
					<div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-950">
						<span className="font-semibold">Your main advisor: </span>
						{mainAdvisorBanner.name}
						{mainAdvisorBanner.code ? (
							<span className="ml-2 font-mono text-amber-900/85">
								{mainAdvisorBanner.code}
							</span>
						) : null}
					</div>
				) : null}
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
			</div>
		</div>
	);
}
