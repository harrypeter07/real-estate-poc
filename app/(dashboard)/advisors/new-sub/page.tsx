import { PageHeader } from "@/components/shared/page-header";
import { AdvisorForm } from "@/components/advisors/advisor-form";
import { getTopLevelAdvisors } from "@/app/actions/advisors";

export default async function NewSubAdvisorPage() {
	const parents = await getTopLevelAdvisors();
	const parentOptions = (parents ?? []).map((p: any) => ({
		id: p.id,
		name: p.name,
		code: p.code,
		phone: p.phone ?? "",
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Sub-advisor"
				subtitle="Register a partner under a main advisor"
				showBackButton
			/>
			<div className="flex justify-center">
				<AdvisorForm
					mode="create"
					variant="sub"
					parentOptions={parentOptions}
				/>
			</div>
		</div>
	);
}
