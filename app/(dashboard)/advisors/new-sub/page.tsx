import { PageHeader } from "@/components/shared/page-header";
import { AdvisorForm } from "@/components/advisors/advisor-form";
import { getAdvisors, getTopLevelAdvisors } from "@/app/actions/advisors";

export default async function NewSubAdvisorPage() {
	const parents = await getTopLevelAdvisors();
	const all = await getAdvisors();
	const childCount = new Map<string, number>();
	for (const a of all as any[]) {
		const pid = String(a.parent_advisor_id ?? "").trim();
		if (!pid) continue;
		childCount.set(pid, (childCount.get(pid) ?? 0) + 1);
	}
	const parentOptions = (parents ?? []).map((p: any) => ({
		id: p.id,
		name: p.name,
		code: p.code,
		phone: p.phone ?? "",
	}));
	const existingAdvisorOptions = (parents ?? [])
		.filter((p: any) => (childCount.get(p.id) ?? 0) === 0)
		.map((p: any) => ({
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
					existingAdvisorOptions={existingAdvisorOptions}
				/>
			</div>
		</div>
	);
}
