import Link from "next/link";
import { Plus, Building2, LayoutGrid, BadgeCheck, IndianRupee, FolderOpen } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectsListClient } from "@/components/projects/projects-list-client";
import { getProjectsWithPlotCounts, getProjectsSummaryStats } from "@/app/actions/project-actions";
import { formatCurrency } from "@/lib/utils/formatters";

export default async function ProjectsPage() {
  const [projects, stats] = await Promise.all([
    getProjectsWithPlotCounts(),
    getProjectsSummaryStats(),
  ]);

  const totalProjects = projects.length;
  let totalAvailablePlots = 0;
  let totalBookedPlots = 0;

  projects.forEach((p) => {
    totalAvailablePlots += p.plotCounts.available;
    totalBookedPlots += p.plotCounts.token + p.plotCounts.agreement + p.plotCounts.sold;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} land project${
          projects.length !== 1 ? "s" : ""
        }`}
        action={
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        }
      />

      {projects.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="group bg-gradient-to-br from-white to-zinc-50/40 dark:from-zinc-950 dark:to-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.05)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-3.5 w-full">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500/10 to-slate-500/5 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">Total Projects</p>
              </div>
              <div className="mt-4 flex flex-col justify-end">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">{totalProjects}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-3.5 w-full">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">Available Plots</p>
              </div>
              <div className="mt-4 flex flex-col justify-end">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 leading-tight truncate">{totalAvailablePlots}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-white to-rose-50/[0.12] dark:from-zinc-950 dark:to-rose-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-rose-200 dark:hover:border-rose-900/30 hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-3.5 w-full">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 text-rose-600 dark:text-rose-400 border border-rose-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">Booked Plots</p>
              </div>
              <div className="mt-4 flex flex-col justify-end">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 leading-tight truncate">{totalBookedPlots}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-3.5 w-full">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">Revenue</p>
              </div>
              <div className="mt-4 flex flex-col justify-end">
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 leading-tight truncate">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/20 p-10 sm:p-20 text-center shadow-sm max-w-2xl mx-auto my-8 transition-all duration-300 hover:shadow-md">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/20 dark:to-emerald-950/10 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 shadow-inner mb-6 relative group">
            <div className="absolute inset-0 bg-teal-400/10 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-50" />
            <FolderOpen className="h-10 w-10 relative z-10 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            📁 No projects found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-8 max-w-sm">
            Create your first project to start managing plots.
          </p>
          <Link href="/projects/new">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-md shadow-teal-500/10 hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-200 px-6 py-5 rounded-xl flex items-center gap-2 hover:-translate-y-0.5">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        </div>
      ) : (
        <ProjectsListClient projects={projects} />
      )}
    </div>
  );
}
