import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DuePaymentsClient } from "@/components/due-payments/due-payments-client";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export default async function DuePaymentsPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const businessId = await getCurrentBusinessId();
	if (!businessId) redirect("/login");

	const { data: admins } = await supabase
		.from("business_admins")
		.select("id, name")
		.eq("business_id", businessId)
		.eq("is_active", true);

	const cleanAdvisors = (admins || []).map((a) => ({ id: a.id, name: a.name || "Unnamed Admin" }));

	return (
		<div className="space-y-6">
			<DuePaymentsClient advisors={cleanAdvisors} />
		</div>
	);
}
