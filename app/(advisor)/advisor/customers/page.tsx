import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils/formatters";

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

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Customers"
				subtitle={`${customers?.length ?? 0} customers assigned to you`}
				action={
					<Link href="/customers/new">
						<Button size="sm" variant="outline">
							Add Customer (Admin)
						</Button>
					</Link>
				}
			/>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Route</TableHead>
								<TableHead>Birth Date</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(customers ?? []).length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="text-sm text-zinc-500 py-10 text-center">
										No customers assigned yet.
									</TableCell>
								</TableRow>
							) : (
								(customers ?? []).map((c: any) => (
									<TableRow key={c.id}>
										<TableCell className="font-medium">{c.name}</TableCell>
										<TableCell>{c.phone}</TableCell>
										<TableCell>{c.route || "—"}</TableCell>
										<TableCell>{c.birth_date ? formatDate(c.birth_date) : "—"}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

