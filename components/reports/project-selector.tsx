"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";

interface ProjectSelectorProps {
	projects: { id: string; name: string }[];
}

export function ProjectSelector({ projects }: ProjectSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const projectId = searchParams.get("project") ?? "";
	const [isPending, startTransition] = useTransition();

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium text-zinc-600">Project:</span>
			<Select
				value={projectId || "all"}
				disabled={isPending}
				onValueChange={(v) => {
					const params = new URLSearchParams(searchParams.toString());
					if (v && v !== "all") params.set("project", v);
					else params.delete("project");
					startTransition(() => {
						router.push(`/reports?${params.toString()}`);
					});
				}}
			>
				<SelectTrigger className="w-[220px]">
					<SelectValue placeholder="Select project for analytics" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All projects (overview)</SelectItem>
					{projects.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isPending ? (
				<span className="text-xs text-zinc-500 ml-1 whitespace-nowrap">Loading...</span>
			) : null}
		</div>
	);
}
