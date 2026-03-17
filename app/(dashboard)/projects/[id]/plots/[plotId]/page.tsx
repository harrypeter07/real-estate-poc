import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectById } from "@/app/actions/project-actions";
import { getPlotsByProject } from "@/app/actions/plots";
import { PlotLayoutGrid } from "@/components/projects/plot-layout-grid";

interface Props {
	params: Promise<{ id: string; plotId: string }>;
}

export default async function PlotDetailPage({ params }: Props) {
	const { id, plotId } = await params;

	const project = await getProjectById(id);
	if (!project) notFound();

	const plots = await getPlotsByProject(id);
	const plotExists = plots.some((p) => p.id === plotId);
	if (!plotExists) notFound();

	return (
		<div className="space-y-6">
			<PageHeader
				title={project.name}
				subtitle={`Plot management • Select a plot to view, edit, or sell`}
				showBackButton
				action={
					<Link href={`/projects/${id}/plots/new`}>
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Add Plot
						</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-zinc-500">
						Interactive Plot Layout
					</CardTitle>
				</CardHeader>
				<CardContent>
					<PlotLayoutGrid
						plots={plots}
						projectName={project.name}
						projectId={id}
						initialPlotId={plotId}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
