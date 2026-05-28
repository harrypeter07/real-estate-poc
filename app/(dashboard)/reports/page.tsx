import { Suspense } from "react";
import {
	Building2,
	Users,
	Handshake,
	CreditCard,
	Clock,
	ArrowRight,
	BarChart3,
	UserCheck,
	Home,
	Coins,
	UserPlus,
	Receipt,
	PlusCircle,
	Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { getReportStats } from "@/app/actions/reports";
import Link from "next/link";
import ProjectAnalyticsSection from "./project-analytics-section";
import { ReportsFilters } from "@/components/reports/reports-filters";
import ProjectTrendsSection from "./project-trends-section";
import ProjectSelectorContainer from "./project-selector-container";
import { requireEntitlement } from "@/lib/auth/require-entitlement";
import { ReportsTabs } from "@/components/reports/reports-tabs";

export default async function ReportsPage({
	searchParams,
}: {
	searchParams: Promise<{ from?: string; to?: string; project?: string }>;
}) {
	const params = await searchParams;
	const projectId = params.project ?? "";

	// Module gating (real-time, tenant-scoped)
	await requireEntitlement("reports");

	const supabase = await createClient();
	if (!supabase) {
		return (
			<div className="p-8 text-center">
				<p className="text-red-500 font-semibold">Database connection failed</p>
			</div>
		);
	}

	let reportStats: Awaited<ReturnType<typeof getReportStats>> | null = null;
	let projectsCount: number | null = null;
	let customersCount: number | null = null;
	let recentReminders: any[] | null = null;

	// Only load overview-heavy stats when no project is selected
	if (!projectId) {
		const [rs, projectsCountRes, customersCountRes, remindersRes] = await Promise.all([
			getReportStats({
				startDate: params.from ?? undefined,
				endDate: params.to ?? undefined,
			}),
			supabase.from("projects").select("*", { count: "exact", head: true }).then((r) => r.count ?? 0),
			supabase.from("customers").select("*", { count: "exact", head: true }).then((r) => r.count ?? 0),
			supabase
				.from("reminders")
				.select("*, customers(name)")
				.eq("is_completed", false)
				.order("reminder_date", { ascending: true })
				.limit(5)
				.then((r) => r.data ?? []),
		]);

		reportStats = rs;
		projectsCount = projectsCountRes;
		customersCount = customersCountRes;
		recentReminders = remindersRes;
	}

	const totalSalesValue = reportStats?.summary.totalSalesValue ?? 0;
	const totalCollected = reportStats?.summary.totalRevenueCollected ?? 0;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Reports"
				subtitle={
					projectId ? "Analytics for Selected project" : "Project-specific analytics & overview"
				}
			/>

      <ReportsTabs>
        <div className="space-y-6">
          <Suspense fallback={<div className="h-9 w-32 bg-zinc-100 rounded animate-pulse" />}>
            <ProjectSelectorContainer />
          </Suspense>

          <Suspense fallback={<div className="h-9 w-64 bg-zinc-100 rounded animate-pulse" />}>
            <ReportsFilters basePath="/reports" />
          </Suspense>

          {projectId ? (
            <>
              <Suspense fallback={<div className="h-32 bg-zinc-100 rounded animate-pulse" />}>
                <ProjectAnalyticsSection projectId={projectId} />
              </Suspense>
              <Suspense fallback={<div className="h-96 bg-zinc-100 rounded animate-pulse" />}>
                <ProjectTrendsSection
                  projectId={projectId}
                  from={params.from}
                  to={params.to}
                />
              </Suspense>
            </>
          ) : (
            <>
              {/* Overview when no project selected */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 w-full">
                <StatCard
                  title="Total Projects"
                  value={projectsCount?.toString() || "0"}
                  icon={Building2}
                  color="blue"
                />
                <StatCard
                  title="Active Customers"
                  value={customersCount?.toString() || "0"}
                  icon={Users}
                  color="green"
                />
                <StatCard
                  title="Total Sales"
                  value={formatCurrency(totalSalesValue)}
                  icon={Handshake}
                  color="orange"
                />
                <StatCard
                  title="Revenue Collected"
                  value={formatCurrency(totalCollected)}
                  icon={CreditCard}
                  color="zinc"
                />
                <StatCard
                  title="Extra Commission Paid"
                  value={formatCurrency(
                    (reportStats?.summary as any)?.totalExtraCommissionPaid ?? 0
                  )}
                  icon={CreditCard}
                  color="orange"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Reminders Card */}
                <Card className="bg-white dark:bg-zinc-955/20 border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100/50 dark:border-zinc-900/60 pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                          <Bell className="h-3.5 w-3.5" />
                        </span>
                        Upcoming Reminders
                      </CardTitle>
                      <Link href="/messaging">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 px-2.5 h-8 rounded-lg text-indigo-600 dark:text-indigo-400">
                          View All <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                      <div className="space-y-3">
                        {recentReminders?.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-center justify-between border-b border-zinc-100/60 dark:border-zinc-900/40 pb-3 last:border-0 last:pb-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 -mx-2 px-2 rounded-lg transition-colors duration-200"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {reminder.title}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-505 font-medium">
                                {reminder.customers?.name || "General"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {reminder.reminder_date}
                              </p>
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider mt-0.5">
                                {reminder.reminder_time || "All Day"}
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!recentReminders || recentReminders.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Clock className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                              No pending reminders
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>

                {/* Enhanced Quick Actions Card */}
                <Card className="bg-white dark:bg-zinc-950/20 border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-zinc-100/50 dark:border-zinc-900/60 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <PlusCircle className="h-3.5 w-3.5" />
                      </span>
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5">
                    <Link href="/sales/new" className="group">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/50 hover:bg-emerald-50/[0.08] hover:border-emerald-200/60 dark:hover:border-emerald-900/30 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                          <Coins className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            New Sale
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate leading-normal mt-0.5">
                            Record booking
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/payments/new" className="group">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/50 hover:bg-blue-50/[0.08] hover:border-blue-200/60 dark:hover:border-blue-900/30 hover:shadow-[0_8px_20px_-6px_rgba(59,130,246,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                          <CreditCard className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-zinc-955 dark:text-zinc-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Collect Payment
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate leading-normal mt-0.5">
                            Record installment
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/customers/new" className="group">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/50 hover:bg-violet-50/[0.08] hover:border-violet-200/60 dark:hover:border-violet-900/30 hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/20 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                          <UserPlus className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-100 leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            Add Customer
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-505 font-semibold truncate leading-normal mt-0.5">
                            New lead/buyer
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Link href="/expenses/new" className="group">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/50 hover:bg-rose-50/[0.08] hover:border-rose-200/60 dark:hover:border-rose-900/30 hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                          <Receipt className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-100 leading-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            Add Expense
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate leading-normal mt-0.5">
                            Office outflow
                          </p>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </ReportsTabs>
    </div>
  );
}
