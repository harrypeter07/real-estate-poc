import { PageHeader } from "@/components/shared/page-header";
import { getBusinessProfile } from "@/app/actions/business-settings";
import { BusinessSettingsForm } from "@/components/settings/business-settings-form";

export default async function BusinessSettingsPage() {
	const profile = await getBusinessProfile();

	return (
		<div className="space-y-6 max-w-2xl">
			<PageHeader
				title="Business profile"
				subtitle="Shown on receipts and customer-facing PDFs. Separate from your login email."
			/>
			<BusinessSettingsForm initial={profile} />
		</div>
	);
}
