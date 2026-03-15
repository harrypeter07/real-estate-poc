import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PlotForm } from "@/components/projects/plot-form";
import { getPlotWithPayments } from "@/app/actions/plots";

interface Props {
  params: { id: string; plotId: string };
}

export default async function EditPlotPage({ params }: Props) {
  const { id: projectId, plotId } = await params;
  const plot = await getPlotWithPayments(plotId);

  if (!plot) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Edit Plot" 
        subtitle={`Editing Plot: ${plot.plot_number}`}
        showBackButton
      />
      <div className="flex justify-center">
        <PlotForm 
          mode="edit" 
          projectId={projectId} 
          initialData={{
            id: plot.id,
            plot_number: plot.plot_number,
            size_sqft: plot.size_sqft,
            rate_per_sqft: plot.rate_per_sqft,
            facing: plot.facing,
            notes: plot.notes,
          }}
        />
      </div>
    </div>
  );
}
