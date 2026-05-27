import { PaymentsDashboard } from "@/components/payments/payments-dashboard";
import { getCustomers } from "@/app/actions/customers";
import { getSales } from "@/app/actions/sales";
import { PageHeader } from "@/components/shared/page-header";

export default async function PaymentsPage() {
	const customers = await getCustomers();
	const sales = await getSales();

	const cleanCustomers = customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
	const cleanSales = sales.map((s: any) => ({
		id: s.id,
		customer_id: s.customer_id,
		plot_number: s.plots?.plot_number || "—",
		remaining_amount: s.remaining_amount,
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Collections Ledger"
				subtitle="Manage accounts receivable, confirm payments, and waive penalties"
			/>
			<PaymentsDashboard
				customers={cleanCustomers}
				sales={cleanSales}
			/>
		</div>
	);
}
