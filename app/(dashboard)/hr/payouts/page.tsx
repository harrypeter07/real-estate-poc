import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui";
import { listHrPayoutBatches } from "@/app/actions/hr";
import { HrPayoutsClient } from "@/components/hr/hr-payouts-client";
import { ArrowLeft } from "lucide-react";

export default async function HrPayoutsPage() {
	const batches = await listHrPayoutBatches();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payouts"
				subtitle="Select a calendar month, calculate from attendance, then review hours, rates, deductions, and weekly breakdown per employee."
				action={
					<Button asChild variant="outline" size="sm" className="h-9 rounded-xl font-extrabold text-xs text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800 hover:border-zinc-300 transition-all shadow-3xs flex items-center gap-1.5 px-3">
						<Link href="/hr">
							<ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
							Back
						</Link>
					</Button>
				}
			/>
			<HrPayoutsClient initialBatches={batches} />
		</div>
	);
}
