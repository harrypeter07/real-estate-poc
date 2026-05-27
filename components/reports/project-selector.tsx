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

import { Building2 } from "lucide-react";

interface ProjectSelectorProps {
	projects: { id: string; name: string }[];
}

export function ProjectSelector({ projects }: ProjectSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const projectId = searchParams.get("project") ?? "";
	const [isPending, startTransition] = useTransition();

	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] w-full sm:w-auto sm:inline-flex">
			<div className="flex items-center gap-2 shrink-0">
				<div className="h-8 w-8 rounded-xl bg-teal-50 dark:bg-zinc-800 border border-teal-150/50 dark:border-zinc-700/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
					<Building2 className="h-4 w-4" />
				</div>
				<span className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Project:</span>
			</div>
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
				<SelectTrigger className="w-full sm:w-[240px] h-9.5 rounded-xl border-zinc-200/85 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 focus:ring-teal-500/8 focus:border-teal-500 transition-all font-bold text-xs shadow-xs text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white cursor-pointer">
					<SelectValue placeholder="Select project for analytics" />
				</SelectTrigger>
				<SelectContent className="rounded-xl border border-zinc-200 bg-white dark:bg-zinc-950 text-xs font-bold shadow-lg">
					<SelectItem value="all" className="rounded-lg py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">All projects (overview)</SelectItem>
					{projects.map((p) => (
						<SelectItem key={p.id} value={p.id} className="rounded-lg py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
							{p.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isPending ? (
				<span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1 whitespace-nowrap animate-pulse font-bold">Loading...</span>
			) : null}
		</div>
	);
}
