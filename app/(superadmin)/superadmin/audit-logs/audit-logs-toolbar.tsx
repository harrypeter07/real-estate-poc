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
		<div className="flex flex-wrap items-center gap-3">
			<div className="text-xs font-semibold text-zinc-600">Business</div>
			<Select value={selected} onValueChange={setBusiness} disabled={isPending}>
				<SelectTrigger className="w-72">
					<SelectValue placeholder="Select business" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All</SelectItem>
					{businesses.map((b) => (
						<SelectItem key={b.id} value={b.id}>
							{b.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button variant="outline" size="sm" disabled={isPending} onClick={refresh} type="button">
				Refresh
			</Button>
			<span className="text-xs text-zinc-500">{title}</span>
		</div>
	);
}
