import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EnquiriesClient } from "@/components/enquiries/enquiries-client";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/app/actions/project-actions";
import { getEnquiryCustomers } from "@/app/actions/enquiries";

export default async function EnquiriesPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	if (role !== "admin") redirect("/dashboard");

	const [enquiries, projects] = await Promise.all([
		getEnquiryCustomers(),
		getProjects(),
	]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Enquiries"
				subtitle={`${enquiries.length} temporary leads`}
			/>
			<EnquiriesClient initialEnquiries={enquiries} projects={projects} />
		</div>
	);
}

