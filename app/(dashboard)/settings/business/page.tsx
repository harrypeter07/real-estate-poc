import { PageHeader } from "@/components/shared/page-header";
import { getBusinessProfileOrError } from "@/app/actions/business-settings";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";

export default async function BusinessSettingsPage() {
	const { profile, error } = await getBusinessProfileOrError();

	return (
		<div className="space-y-6">
			<PageHeader
				title={
					<div className="flex items-center gap-2.5">
						<span className="text-xl sm:text-2xl">🏢</span>
						<span className="font-black tracking-tight text-zinc-800">Business settings</span>
					</div>
				}
				subtitle={
					<span className="flex items-center gap-2 mt-1">
						<span className="text-xs text-zinc-400 font-medium">Shown on receipts and customer-facing PDFs. Separate from your login email.</span>
					</span>
				}
			/>
			<BusinessSettingsForm initial={profile} error={error} />
		</div>
	);
}
