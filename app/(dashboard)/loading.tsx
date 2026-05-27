import { Skeleton } from "@/components/ui";

export default function Loading() {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
			{/* Navigation Progress Bar - Secondary fallback in case global bar is delayed */}
			<div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden bg-zinc-100/10">
				<div className="h-full w-full bg-primary origin-left animate-progress" />
			</div>

			{/* Page Header Skeleton */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-3">
					<Skeleton className="h-9 w-64 bg-zinc-200/60 animate-pulse" />
					<Skeleton className="h-4 w-80 bg-zinc-200/40 animate-pulse" />
				</div>
				<Skeleton className="h-11 w-36 rounded-lg bg-zinc-200/60 animate-pulse" />
			</div>

			{/* Stats Cards Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="rounded-xl border border-zinc-200/60 bg-white/50 backdrop-blur-sm p-6 space-y-4 shadow-sm animate-pulse"
					>
						<Skeleton className="h-4 w-24 bg-zinc-200/40" />
						<Skeleton className="h-10 w-32 bg-zinc-200/60" />
					</div>
				))}
			</div>

			{/* Main Content Skeleton */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 rounded-xl border border-zinc-200/60 bg-white/50 backdrop-blur-sm p-6 shadow-sm">
					<div className="flex items-center justify-between mb-8">
						<Skeleton className="h-7 w-48 bg-zinc-200/60 animate-pulse" />
						<Skeleton className="h-9 w-28 bg-zinc-200/40 animate-pulse" />
					</div>
					<div className="space-y-5">
						{Array.from({ length: 6 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between py-4 border-b border-zinc-100/80 last:border-0"
							>
								<div className="space-y-2">
									<Skeleton className="h-5 w-40 bg-zinc-200/50 animate-pulse" />
									<Skeleton className="h-3 w-28 bg-zinc-200/30 animate-pulse" />
								</div>
								<div className="space-y-1 text-right">
									<Skeleton className="h-5 w-24 bg-zinc-200/50 animate-pulse" />
									<Skeleton className="h-3 w-16 ml-auto bg-zinc-200/30 animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-xl border border-zinc-200/60 bg-white/50 backdrop-blur-sm p-6 shadow-sm animate-pulse">
					<Skeleton className="h-7 w-36 mb-8 bg-zinc-200/60" />
					<div className="grid grid-cols-1 gap-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="space-y-3 p-4 rounded-lg border border-zinc-100 bg-white/30">
								<Skeleton className="h-4 w-full bg-zinc-200/40" />
								<Skeleton className="h-4 w-2/3 bg-zinc-200/40" />
								<Skeleton className="h-8 w-20 ml-auto bg-zinc-200/50 rounded" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
