import Link from "next/link";
import {
	Plus,
	CreditCard,
} from "lucide-react";
import {
	Button,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getPayments } from "@/app/actions/payments";
import { PaymentsTable } from "@/components/payments/payments-table";
import { PaymentsFilters } from "@/components/payments/payments-filters";

export default async function PaymentsPage({
	searchParams,
}: {
	searchParams: Promise<{
		from?: string;
		to?: string;
		status?: string;
		mode?: string;
	}>;
}) {
	const params = await searchParams;
	const payments = await getPayments();

	// Extract filter parameters
	const from = params.from ?? "";
	const to = params.to ?? "";
	const status =
		typeof params.status === "string" && params.status !== "all"
			? params.status
			: "";
	const mode =
		typeof params.mode === "string" && params.mode !== "all" ? params.mode : "";

	// Filter payments based on criteria
	const filteredPayments = payments.filter((payment) => {
		// Date range filter
		const paymentDateStr = String(payment.payment_date ?? "").slice(0, 10); // YYYY-MM-DD
		if (from) {
			if (!paymentDateStr || paymentDateStr < from) return false;
		}
		if (to) {
			if (!paymentDateStr || paymentDateStr > to) return false;
		}

		// Status filter
		if (status) {
			if (status === "confirmed" && !payment.is_confirmed) return false;
			if (status === "pending" && payment.is_confirmed) return false;
		}

		// Payment mode filter (case-insensitive)
		if (mode) {
			const paymentMode = String(payment.payment_mode ?? "").toLowerCase().trim();
			const filterMode = mode.toLowerCase().trim();
			if (paymentMode !== filterMode) return false;
		}

		return true;
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payments"
				subtitle={`${filteredPayments.length} transactions processed`}
				action={
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				}
			/>

			<PaymentsFilters />

			{filteredPayments.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<CreditCard className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">{payments.length === 0 ? "No payments yet" : "No payments match these filters"}</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						{payments.length === 0 ? "Record your first payment installment" : "Try adjusting your filter criteria"}
					</p>
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				</div>
			) : (
				<PaymentsTable payments={filteredPayments as any[]} />
			)}
		</div>
	);
}
