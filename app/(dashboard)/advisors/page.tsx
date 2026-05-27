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
		parent_advisor_id: a.parent_advisor_id ?? null,
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
					<div className="flex flex-row items-center gap-2.5 w-full sm:w-auto">
						<Link href="/advisors/new-sub" className="flex-1 sm:flex-initial">
							<Button size="sm" variant="outline" className="w-full sm:w-auto h-10 px-3 bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 active:scale-95 rounded-xl font-bold shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-[11px] min-[360px]:text-xs cursor-pointer">
								<UserPlus className="h-4 w-4 text-zinc-500 shrink-0" />
								New Sub-advisor
							</Button>
						</Link>
						<Link href="/advisors/new" className="flex-1 sm:flex-initial">
							<Button size="sm" className="w-full sm:w-auto h-10 px-3 bg-teal-600 hover:bg-teal-700 text-white active:scale-95 border-none rounded-xl font-bold shadow-md shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-200 flex items-center justify-center gap-1.5 text-[11px] min-[360px]:text-xs cursor-pointer">
								<Plus className="h-4 w-4 text-teal-50 shrink-0" />
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
					<div className="flex flex-wrap gap-2.5 justify-center">
						<Link href="/advisors/new-sub">
							<Button size="sm" variant="outline" className="h-9.5 px-4 bg-white hover:bg-zinc-50 border-zinc-200/80 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 active:scale-95 rounded-xl font-bold shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer">
								<UserPlus className="h-4 w-4 text-zinc-500 hover:text-zinc-800" />
								New Sub-advisor
							</Button>
						</Link>
						<Link href="/advisors/new">
							<Button size="sm" className="h-9.5 px-4 bg-teal-600 hover:bg-teal-700 text-white active:scale-95 border-none rounded-xl font-bold shadow-md shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer">
								<Plus className="h-4 w-4 text-teal-50" />
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
