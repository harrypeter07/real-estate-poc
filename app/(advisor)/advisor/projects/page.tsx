import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorAssignedProjects } from "@/app/actions/advisor-projects";
import { Card, CardContent, Button } from "@/components/ui";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { formatCurrencyShort } from "@/lib/utils/formatters";

export default async function AdvisorProjectsPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const rows = await getAdvisorAssignedProjects(advisorId);

	return (
		<div className="space-y-6">
			<PageHeader
				title="My Projects"
				subtitle={
					rows.length === 0
						? "You are not assigned to any project yet"
						: `${rows.length} assigned project${rows.length === 1 ? "" : "s"} — view layout and sales (read-only)`
				}
			/>

			{rows.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-14 text-center text-sm text-zinc-500">
						When your administrator assigns you to a project, it will appear here.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{rows.map((r) => (
						<Card key={r.project_id} className="border-zinc-200 shadow-sm">
							<CardContent className="p-4 space-y-3">
								<div className="flex items-start gap-2">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
										<Building2 className="h-4 w-4 text-zinc-600" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="font-semibold text-zinc-900 truncate">{r.project.name}</p>
										{r.project.location ? (
											<p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
												<MapPin className="h-3 w-3 shrink-0" />
												<span className="truncate">{r.project.location}</span>
											</p>
										) : null}
									</div>
								</div>
								<div className="text-[11px] text-zinc-500">
									Your default selling rate:{" "}
									<span className="font-medium text-zinc-800">
										{formatCurrencyShort(r.commission_rate)}/sqft
									</span>
									{r.project.total_plots_count != null ? (
										<>
											{" "}
											· {r.project.total_plots_count} plots planned
										</>
									) : null}
								</div>
								<Link href={`/advisor/projects/${r.project.id}`}>
									<Button size="sm" variant="outline" className="w-full">
										View project
										<ArrowRight className="h-3.5 w-3.5 ml-2" />
									</Button>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
