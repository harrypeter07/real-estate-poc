import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui";
import { CustomersTableClient } from "@/components/customers/customers-table-client";

export default async function AdvisorCustomersPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: customers } = await supabase
		.from("customers")
		.select("id, name, phone, route, birth_date, created_at")
		.eq("advisor_id", advisorId)
		.eq("is_active", true)
		.order("created_at", { ascending: false });

	const rows = customers ?? [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Customers"
				subtitle={`${rows.length} customers assigned to you`}
				action={
					<Link href="/advisor/customers/new">
						<Button size="sm" variant="outline">
							Add Customer
						</Button>
					</Link>
				}
			/>

			{rows.length === 0 ? (
				<p className="text-sm text-zinc-500">No customers assigned yet.</p>
			) : (
				<CustomersTableClient
					customers={rows as any}
					basePath="/advisor/customers"
					variant="advisor"
				/>
			)}
		</div>
	);
}

