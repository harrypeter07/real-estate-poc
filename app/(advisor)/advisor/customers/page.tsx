import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
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
		.select("id, name, phone, route, birth_date, created_at, kyc_status")
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
						<Button size="sm" className="shadow-sm hover:shadow transition-all duration-300">
							<Plus className="h-4 w-4 mr-2" />
							Add Customer
						</Button>
					</Link>
				}
			/>

			{rows.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-16 text-center bg-white shadow-sm max-w-xl mx-auto mt-8">
					<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 mb-5 shadow-inner text-zinc-500">
						<Users className="h-8 w-8 text-zinc-500" />
					</div>
					<h3 className="text-lg font-semibold text-zinc-900">👥 No customers assigned yet</h3>
					<p className="text-sm text-zinc-500 mt-2 mb-6 max-w-sm">
						Once you are assigned customers, they will appear here. You can also add a new customer manually.
					</p>
					<Link href="/advisor/customers/new">
						<Button size="default" className="shadow-sm hover:shadow-md transition-all duration-300">
							<Plus className="h-4 w-4 mr-2" />
							Add Customer
						</Button>
					</Link>
				</div>
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

