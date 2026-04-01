import Link from "next/link";
import { CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentsAsOfDate } from "@/components/payments/payments-asof-date";
import { getEmiDueRows } from "@/app/actions/payment-due";
import { PaymentsEmiDuePageClient } from "../../../../components/payments/payments-emi-due-page-client";

export default async function PaymentsDuePage({
	searchParams,
}: {
	searchParams: Promise<{ asOf?: string; q?: string }>;
}) {
	const sp = await searchParams;
	const asOf =
		typeof sp.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.asOf)
			? sp.asOf
			: "";
	const q = typeof sp.q === "string" ? sp.q : "";

	const rows = await getEmiDueRows({ asOf: asOf || undefined });

	return (
		<div className="space-y-6">
			<PageHeader
				title="Due Payments (EMI)"
				subtitle={`${rows.length} EMI accounts have missed payments`}
				action={
					<div className="flex items-center gap-2">
						<Link href="/payments">
							<Button size="sm" variant="outline" className="gap-2">
								<ArrowLeft className="h-4 w-4" />
								Payments
							</Button>
						</Link>
						<Link href="/payments/new">
							<Button size="sm" className="gap-2">
								<CreditCard className="h-4 w-4" />
								Collect Payment
							</Button>
						</Link>
					</div>
				}
			/>

			<PaymentsAsOfDate />

			<PaymentsEmiDuePageClient rows={rows as any} initialQuery={q} asOf={asOf || undefined} />
		</div>
	);
}

