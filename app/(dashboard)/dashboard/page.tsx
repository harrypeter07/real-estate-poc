import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsFilters } from "@/components/reports/reports-filters";
import DashboardContent from "./dashboard-content";

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string; trend?: "week" | "month" }>;
}) {
	const params = await searchParams;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				subtitle="Revenue, projects, advisors, commissions & financial analytics"
			/>

			<Suspense fallback={<div className="h-9 w-64 bg-zinc-100 rounded animate-pulse" />}>
				<ReportsFilters basePath="/dashboard" />
			</Suspense>

			<Suspense fallback={<div className="h-40 bg-zinc-100 rounded animate-pulse" />}>
				<DashboardContent from={params.from} to={params.to} trend={params.trend} />
			</Suspense>
		</div>
	);
}
