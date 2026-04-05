import Link from "next/link";
import { Plus, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { AdvisorsManager } from "@/components/advisors/advisors-manager";
import { getAdvisors } from "@/app/actions/advisors";
import { buildAdvisorPasswordFromNameAndPhone } from "@/lib/auth/advisor-password";

function mapAdvisorRow(a: any) {
	return {
		id: a.id,
		name: a.name,
		code: a.code,
		phone: a.phone,
		email: a.email ?? null,
		is_active: a.is_active ?? true,
		derived_password: buildAdvisorPasswordFromNameAndPhone(a.name ?? "", a.phone ?? ""),
	};
}

export default async function AdvisorsPage() {
	const advisors = await getAdvisors();
	const subsByParent = new Map<string, any[]>();
	for (const a of advisors) {
		const pid = (a as any).parent_advisor_id as string | null | undefined;
		if (pid) {
			if (!subsByParent.has(pid)) subsByParent.set(pid, []);
			subsByParent.get(pid)!.push(a);
		}
	}

	const mains = (advisors ?? []).filter((a: any) => !a.parent_advisor_id);
	const rows = mains.map((a: any) => ({
		...mapAdvisorRow(a),
		sub_count: (subsByParent.get(a.id) ?? []).length,
		subs: (subsByParent.get(a.id) ?? []).map(mapAdvisorRow),
	}));

	return (
		<div className="space-y-6">
			<PageHeader
				title="Advisors"
				subtitle={`${mains.length} main advisor${mains.length === 1 ? "" : "s"} · ${advisors.length} total`}
				action={
					<div className="flex flex-wrap gap-2">
						<Link href="/advisors/new-sub">
							<Button size="sm" variant="outline">
								<UserPlus className="h-4 w-4 mr-2" />
								New Sub-advisor
							</Button>
						</Link>
						<Link href="/advisors/new">
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								New Advisor
							</Button>
						</Link>
					</div>
				}
			/>

			{advisors.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<Users className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">No advisors yet</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						Start by adding your first channel partner
					</p>
					<div className="flex flex-wrap gap-2 justify-center">
						<Link href="/advisors/new-sub">
							<Button size="sm" variant="outline">
								New Sub-advisor
							</Button>
						</Link>
						<Link href="/advisors/new">
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Create Advisor
							</Button>
						</Link>
					</div>
				</div>
			) : (
				<AdvisorsManager advisors={rows} />
			)}
		</div>
	);
}
