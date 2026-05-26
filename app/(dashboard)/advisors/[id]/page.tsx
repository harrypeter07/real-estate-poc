import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { getAdvisorById } from "@/app/actions/advisors";
import { AdvisorProfileClient } from "./advisor-profile-client";

export default async function AdvisorDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
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

	// 1. Fetch advisor details
	const advisor = await getAdvisorById(id);
	if (!advisor || advisor.business_id !== businessId) {
		notFound();
	}

	// 2. Fetch list of all advisors for parent selection
	const { data: advisorsData } = await supabase
		.from("advisors")
		.select("id, name, code, phone")
		.eq("business_id", businessId)
		.neq("id", id) // Exclude self
		.order("name", { ascending: true });

	// 3. Fetch list of active projects for assignment selection
	const { data: projectsData } = await supabase
		.from("projects")
		.select("id, name")
		.eq("is_active", true)
		.order("name", { ascending: true });

	// 4. Fetch list of customers assigned to this advisor (for recovery creation selection)
	const { data: customersData } = await supabase
		.from("customers")
		.select("id, name, phone")
		.eq("business_id", businessId)
		.eq("advisor_id", id)
		.order("name", { ascending: true });

	const initialAdvisor = {
		...advisor,
		customers: customersData || [],
	};

	return (
		<AdvisorProfileClient
			advisorId={id}
			businessId={businessId}
			initialAdvisor={initialAdvisor}
			parentOptions={advisorsData || []}
			projectsOptions={projectsData || []}
		/>
	);
}
