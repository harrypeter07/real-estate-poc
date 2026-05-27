import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-3">
			<Skeleton className="h-8 w-full" />
			{Array.from({ length: rows }).map((_, i) => (
				<Skeleton key={i} className="h-12 w-full" />
			))}
		</div>
	);
}

export function StatsSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{Array.from({ length: 4 }).map((_, i) => (
				<div key={i} className="p-6 border rounded-xl space-y-3">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-3 w-40" />
				</div>
			))}
		</div>
	);
}

export function ChartSkeleton() {
	return (
		<div className="p-6 border rounded-xl space-y-4">
			<Skeleton className="h-6 w-48" />
			<Skeleton className="h-[300px] w-full" />
		</div>
	);
}
