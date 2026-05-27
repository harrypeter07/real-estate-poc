import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SaleDetailClient } from "@/components/sales/sale-detail-client";
import { getAdvisors } from "@/app/actions/advisors";

export default async function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const { saleId } = await params;

	// Fetch plot sale
	const { data: sale, error } = await supabase
		.from("plot_sales")
		.select(`
			*,
			customers(id, name, phone, email, address),
			advisors(id, name, code, phone),
			plots(id, plot_number, facing, size_sqft, rate_per_sqft, total_amount, projects(id, name, location))
		`)
		.eq("id", saleId)
		.single();

	if (error || !sale) {
		redirect("/sales");
	}

	const advisors = await getAdvisors();
	const cleanAdvisors = advisors.map((a) => ({ id: a.id, name: a.name }));

	return (
		<div className="space-y-6">
			<SaleDetailClient
				initialSale={sale}
				advisors={cleanAdvisors}
			/>
		</div>
	);
}
