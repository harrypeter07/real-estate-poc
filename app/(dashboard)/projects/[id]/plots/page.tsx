import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { getPlotsByProject } from "@/app/actions/plots";
import { PlotCard } from "@/components/projects/plot-card";
import { PlotLayoutGrid } from "@/components/projects/plot-layout-grid";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plotId?: string }>;
}

export default async function PlotsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { plotId } = await searchParams;
  const plots = await getPlotsByProject(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Plots"
        subtitle={`Viewing all ${plots.length} plots for this project`}
        showBackButton
        action={
          <Link href={`/projects/${id}/plots/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Single Plot
            </Button>
          </Link>
        }
      />

      {plots.length > 0 && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">
              Interactive Layout View
            </h2>
            <p className="text-xs text-zinc-500">
              Similar to a movie seat screen – tap a plot to view details.
            </p>
          </div>
          <PlotLayoutGrid plots={plots} projectId={id} initialPlotId={plotId} />
        </div>
      )}

      {plots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <LayoutGrid className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">No plots added yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-6">
            Get started by adding your first plot or using the bulk import.
          </p>
          <div className="flex gap-3">
            <Link href={`/projects/${id}/plots/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Single Plot
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plots.map((plot) => (
            <PlotCard key={plot.id} plot={plot} projectId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
