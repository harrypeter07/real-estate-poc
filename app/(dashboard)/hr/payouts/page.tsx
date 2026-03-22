import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { listHrPayoutBatches } from "@/app/actions/hr";
import { HrPayoutsClient } from "@/components/hr/hr-payouts-client";

export default async function HrPayoutsPage() {
	const batches = await listHrPayoutBatches();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payouts"
				subtitle="Generate payroll for a calendar month (YYYY-MM)"
				action={
					<Button asChild variant="ghost" size="sm">
						<Link href="/hr">Back</Link>
					</Button>
				}
			/>
			<HrPayoutsClient initialBatches={batches} />
		</div>
	);
}
