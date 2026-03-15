import { BarChart3, TrendingUp, TrendingDown, PieChart, Users, Building2, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getReportStats } from "@/app/actions/reports";
import { formatCurrency } from "@/lib/utils/formatters";

export default async function ReportsPage() {
  const stats = await getReportStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports"
        subtitle="Overview of sales, revenue, and performance"
      />

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 text-white border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Sales Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.summary.totalSalesValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Revenue Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.summary.totalRevenueCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.summary.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Net Profit (Cash)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.summary.netProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Sales Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Project Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.projectStats.map((project) => {
              const percentage = project.total > 0 ? (project.sold / project.total) * 100 : 0;
              return (
                <div key={project.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{project.name}</span>
                    <span className="text-zinc-500">{project.sold} / {project.total} Plots Sold</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase">
                    <span>{Math.round(percentage)}% Completed</span>
                    <span>{project.available} Available</span>
                  </div>
                </div>
              );
            })}
            {stats.projectStats.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">No projects found</p>}
          </CardContent>
        </Card>

        {/* Advisor Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4" /> Advisor Commission Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.advisorPerformance.map((advisor) => (
                <div key={advisor.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{advisor.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
                      Paid: {formatCurrency(advisor.paidCommission)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">{formatCurrency(advisor.totalCommission)}</p>
                    <p className="text-[10px] text-red-500 font-bold uppercase">
                      Due: {formatCurrency(advisor.totalCommission - advisor.paidCommission)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.advisorPerformance.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">No advisors found</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
