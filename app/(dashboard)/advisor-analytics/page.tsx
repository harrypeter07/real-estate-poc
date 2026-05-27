import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { AdvisorAnalyticsClient } from "./advisor-analytics-client";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
	title: "Advisor Analytics Dashboard",
	description: "Track bookings, conversion rates, and payouts performance for channel partners.",
};

export default async function AdvisorAnalyticsPage() {
	const businessId = await getCurrentBusinessId();

	if (!businessId) {
		return (
			<div className="p-8 text-center text-zinc-500">
				Business context is missing. Sign out and sign in again.
			</div>
		);
	}

	const supabase = await createClient();
	if (!supabase) {
		return (
			<div className="p-8 text-center text-zinc-500">
				Database connection failed.
			</div>
		);
	}

	// 1. Fetch list of all advisors in the business
	const { data: advisorsData } = await supabase
		.from("advisors")
		.select("id, name, code")
		.eq("business_id", businessId)
		.order("name", { ascending: true });

	// 2. Fetch list of active projects in the business
	const { data: projectsData } = await supabase
		.from("projects")
		.select("id, name")
		.eq("is_active", true)
		.order("name", { ascending: true });

	return (
		<div className="space-y-6">
			<PageHeader
				title="Advisors Analytics Dashboard"
				subtitle="Interactive review of sales conversion, collections efficiency, and commissions payouts."
			/>
			<AdvisorAnalyticsClient
				businessId={businessId}
				advisors={advisorsData || []}
				projects={projectsData || []}
			/>
		</div>
	);
}
