import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	icon: LucideIcon;
	color?: "green" | "blue" | "orange" | "red" | "zinc" | "teal";
	trend?: string;
}

// Highly stylized dynamic card theme configuration maps
const themeMap = {
	green: {
		bg: "from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04]",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)] dark:hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.04)]",
		badgeBg: "from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10",
	},
	blue: {
		bg: "from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04]",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.08)] dark:hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.04)]",
		badgeBg: "from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10",
	},
	orange: {
		bg: "from-white to-amber-50/[0.12] dark:from-zinc-950 dark:to-amber-950/[0.04]",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-200 dark:hover:border-amber-900/30",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.08)] dark:hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.04)]",
		badgeBg: "from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10",
	},
	red: {
		bg: "from-white to-rose-50/[0.12] dark:from-zinc-950 dark:to-rose-950/[0.04]",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-rose-200 dark:hover:border-rose-900/30",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.08)] dark:hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.04)]",
		badgeBg: "from-rose-500/10 to-pink-500/5 text-rose-600 dark:text-rose-400 border border-rose-500/10",
	},
	teal: {
		bg: "from-white to-teal-50/[0.12] dark:from-zinc-950 dark:to-teal-950/[0.04]",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-teal-200 dark:hover:border-teal-900/30",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(20,184,166,0.08)] dark:hover:shadow-[0_12px_32px_-4px_rgba(20,184,166,0.04)]",
		badgeBg: "from-teal-500/10 to-cyan-500/5 text-teal-600 dark:text-teal-400 border border-teal-500/10",
	},
	zinc: {
		bg: "from-white to-zinc-50/40 dark:from-zinc-950 dark:to-zinc-900/10",
		border: "border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700",
		glow: "hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.05)] dark:hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.03)]",
		badgeBg: "from-zinc-500/10 to-slate-500/5 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10",
	},
};

export function StatCard({
	title,
	value,
	icon: Icon,
	color = "zinc",
	trend,
}: StatCardProps) {
	// Fallback UI helper for empty/missing/invalid values
	const displayValue = (value === null || value === undefined || value === "")
		? "—"
		: String(value).toLowerCase() === "nan"
		? "—"
		: String(value);

	const activeTheme = themeMap[color] || themeMap.zinc;

	return (
		<Card
			className={cn(
				"group bg-gradient-to-br border rounded-2xl p-0.5 shadow-sm hover:-translate-y-1 select-none transition-all duration-300 ease-out cursor-default overflow-hidden flex flex-col justify-between h-full",
				activeTheme.bg,
				activeTheme.border,
				activeTheme.glow
			)}
		>
			<CardContent className="p-6 flex flex-col justify-between h-full w-full">
				{/* Top Row: Icon Container + Label */}
				<div className="flex items-center gap-3.5 w-full">
					{/* Stylized Accent Icon Container */}
					<div
						className={cn(
							"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm group-hover:scale-105 transition-transform duration-300 ease-out",
							activeTheme.badgeBg
						)}
					>
						<Icon className="h-5 w-5" />
					</div>
					
					<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 leading-normal truncate flex-1">
						{title}
					</p>
				</div>

				{/* Bottom Area: Value and optional badge/trend */}
				<div className="mt-4 flex flex-col justify-end">
					<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">
						{displayValue}
					</p>
					
					{trend && (
						<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-normal mt-1.5 flex items-center gap-1.5">
							{trend}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
