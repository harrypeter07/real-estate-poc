import { redirect } from "next/navigation";
import { EnquiriesClient } from "@/components/enquiries/enquiries-client";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/app/actions/project-actions";
import { getEnquiryCustomers } from "@/app/actions/enquiries";
import { getAdvisors } from "@/app/actions/advisors";

export default async function EnquiriesPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	// Match RLS defaults: missing role = admin (only advisors are explicitly tagged).
	const role = (user.user_metadata as any)?.role ?? "admin";
	if (role === "advisor") redirect("/advisor");

	const [enqResponse, projects, advisors] = await Promise.all([
		getEnquiryCustomers({ page: 1, pageSize: 20, status: "all" }),
		getProjects(),
		getAdvisors(),
	]);

	return (
		<EnquiriesClient
			initialEnquiries={enqResponse.data}
			initialTotal={enqResponse.total}
			projects={projects}
			advisors={advisors}
		/>
	);
}

