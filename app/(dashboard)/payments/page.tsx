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

export default async function PaymentsPage() {
	const payments = await getPayments();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payments"
				subtitle={`${payments.length} transactions processed`}
				action={
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				}
			/>

			{payments.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<CreditCard className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">No payments yet</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						Record your first payment installment
					</p>
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				</div>
			) : (
				<PaymentsTable payments={payments as any[]} />
			)}
		</div>
	);
}
