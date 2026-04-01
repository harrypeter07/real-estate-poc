import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getPayments } from "@/app/actions/payments";
import { PaymentsTable } from "@/components/payments/payments-table";
import { PaymentsFilters } from "@/components/payments/payments-filters";
import { PaymentsPageActions } from "@/components/payments/payments-page-actions";
import { PaymentsAsOfDate } from "@/components/payments/payments-asof-date";
import { getEmiDueRows } from "@/app/actions/payment-due";
import { PaymentsEmiDueSection } from "@/components/payments/payments-emi-due-section";
import { PaymentsEmiDuePageClient } from "@/components/payments/payments-emi-due-page-client";

export default async function PaymentsPage({
	searchParams,
}: {
	searchParams: Promise<{
		from?: string;
		to?: string;
		status?: string;
		mode?: string;
		asOf?: string;
		q?: string;
	}>;
}) {
	const params = await searchParams;

	const from = params.from ?? "";
	const to = params.to ?? "";
	const asOf =
		typeof params.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.asOf)
			? params.asOf
			: "";
	const status =
		typeof params.status === "string" && params.status !== "all"
			? params.status
			: "";
	const mode =
		typeof params.mode === "string" && params.mode !== "all"
			? params.mode
			: "";
	const q = typeof params.q === "string" ? params.q : "";

	const filteredPayments = await getPayments({
		from: from || undefined,
		to: to || undefined,
		status:
			status === "confirmed" || status === "pending"
				? status
				: "",
		mode: mode || undefined,
		asOf: asOf || undefined,
	});

	const emiDueRows = await getEmiDueRows({ asOf: asOf || undefined });

	const hasFilters = Boolean(from || to || status || mode || asOf);
	const isPendingDueView = status === "pending";

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payments"
				subtitle={`${filteredPayments.length} transactions processed`}
				action={<PaymentsPageActions />}
			/>

			<PaymentsAsOfDate />

			<PaymentsFilters />

			{isPendingDueView ? (
				<PaymentsEmiDuePageClient
					rows={emiDueRows as any}
					initialQuery={q}
					asOf={asOf || undefined}
				/>
			) : (
				<PaymentsEmiDueSection rows={emiDueRows as any} asOf={asOf || undefined} />
			)}

			{isPendingDueView ? null : filteredPayments.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<CreditCard className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">
						{hasFilters ? "No payments match these filters" : "No payments yet"}
					</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						{hasFilters
							? "Try adjusting your filter criteria"
							: "Record your first payment installment"}
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
