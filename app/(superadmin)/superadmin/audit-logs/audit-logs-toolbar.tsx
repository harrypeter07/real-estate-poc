"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Biz = { id: string; name: string };

export function AuditLogsToolbar({ businesses }: { businesses: Biz[] }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const selected = searchParams.get("business") ?? "all";

	function setBusiness(next: string) {
		startTransition(() => {
			if (next === "all") {
				router.push("/superadmin/audit-logs");
			} else {
				router.push(`/superadmin/audit-logs?business=${encodeURIComponent(next)}`);
			}
		});
	}

	function refresh() {
		startTransition(() => {
			router.refresh();
		});
	}

	const title =
		selected === "all"
			? "All businesses"
			: businesses.find((b) => b.id === selected)?.name ?? "Selected business";

	return (
		<div className="flex flex-wrap items-center gap-4 border-b border-zinc-100 pb-5">
			<div className="space-y-1 w-full sm:w-80">
				<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Filter by Business Scope</span>
				<Select value={selected} onValueChange={setBusiness} disabled={isPending}>
					<SelectTrigger className="rounded-xl border-zinc-200 h-10 bg-white focus:ring-teal-500/10 focus:border-teal-600 w-full">
						<SelectValue placeholder="Select business" />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
						<SelectItem value="all" className="rounded-lg">All businesses</SelectItem>
						{businesses.map((b) => (
							<SelectItem key={b.id} value={b.id} className="rounded-lg">
								{b.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			
			<div className="self-end pt-1">
				<Button 
					variant="outline" 
					size="sm" 
					disabled={isPending} 
					onClick={refresh} 
					type="button"
					className="rounded-xl h-10 px-5 font-bold border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
				>
					Refresh logs
				</Button>
			</div>

			<div className="self-end pt-1 pl-1 text-xs text-zinc-400 font-bold">
				Currently showing: <span className="text-zinc-700 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-150">{title}</span>
			</div>
		</div>
	);
}
