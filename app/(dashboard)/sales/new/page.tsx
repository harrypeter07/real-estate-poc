import { PageHeader } from "@/components/shared/page-header";
import { CreateBookingWizard } from "@/components/sales/create-booking-wizard";
import { getAdvisors } from "@/app/actions/advisors";
import { getCustomers } from "@/app/actions/customers";

export default async function NewSalePage() {
	const advisors = await getAdvisors();
	const customers = await getCustomers();

	const cleanAdvisors = advisors.map((a) => ({ id: a.id, name: a.name }));
	const cleanCustomers = customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Record New Booking"
				subtitle="Book a plot and generate its customized installment schedule"
				showBackButton
			/>
			<div className="flex justify-center">
				<CreateBookingWizard
					customers={cleanCustomers}
					advisors={cleanAdvisors}
				/>
			</div>
		</div>
	);
}
