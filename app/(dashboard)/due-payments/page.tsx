import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DuePaymentsClient } from "@/components/due-payments/due-payments-client";
import { getAdvisors } from "@/app/actions/advisors";

export default async function DuePaymentsPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const advisors = await getAdvisors();
	const cleanAdvisors = advisors.map((a) => ({ id: a.id, name: a.name }));

	return (
		<div className="space-y-6">
			<DuePaymentsClient advisors={cleanAdvisors} />
		</div>
	);
}
