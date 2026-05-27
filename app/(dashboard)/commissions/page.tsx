import { Card, CardContent } from "@/components/ui";
import { Suspense } from "react";
import { IndianRupee, TrendingUp, Clock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { getCommissions } from "@/app/actions/commissions";
import { formatCurrency } from "@/lib/utils/formatters";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { CommissionsFilters } from "@/components/commissions/commissions-filters";
import { CommissionsTabs } from "@/components/commissions/commissions-tabs";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const commissions = await getCommissions();

  // Extract filter parameters
  const from = params.from ?? "";
  const to = params.to ?? "";
  const status =
    typeof params.status === "string" && params.status !== "all"
      ? params.status
      : "";

  // Filter commissions based on criteria
  const filteredCommissions = commissions.filter((commission) => {
    // Date range filter (timezone-safe)
    const createdDateStr = String(commission.created_at ?? "").slice(0, 10);
    if (from && (!createdDateStr || createdDateStr < from)) return false;
    if (to && (!createdDateStr || createdDateStr > to)) return false;

    // Status filter
    if (status) {
      const total = Number(commission.total_commission_amount ?? 0);
      const paid = Number(commission.amount_paid ?? 0);
      if (status === "pending" && paid > 0) return false;
      if (status === "partial" && (paid === 0 || paid === total)) return false;
      if (status === "paid" && paid === 0) return false;
      if (status === "paid" && paid < total) return false;
    }

    return true;
  });

  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + Number(c.total_commission_amount), 0);
  const totalPaid = filteredCommissions.reduce((sum, c) => sum + Number(c.amount_paid), 0);
  const totalPending = Math.max(0, totalCommissions - totalPaid);
  const totalExtraPaid = filteredCommissions.reduce((sum, c: any) => {
    const list = Array.isArray(c.advisor_commission_payments)
      ? c.advisor_commission_payments
      : [];
    return (
      sum +
      list.reduce((s: number, p: any) => s + Number(p.extra_paid_amount ?? 0), 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors Commissions"
        subtitle={`Tracking ${filteredCommissions.length} commission payouts`}
      />

      <CommissionsTabs>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="group bg-gradient-to-br from-white to-zinc-50/40 dark:from-zinc-950 dark:to-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.05)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500/10 to-slate-500/5 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Total Commission
                  </p>
                </div>
                <div className="mt-4 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate font-mono">
                    {formatCurrency(totalCommissions)}
                  </p>
                </div>
              </CardContent>
            </Card>
     
            <Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Total Paid
                  </p>
                </div>
                <div className="mt-4 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-green-700 dark:text-emerald-400 leading-tight truncate font-mono">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-white to-rose-50/[0.12] dark:from-zinc-950 dark:to-rose-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-rose-200 dark:hover:border-rose-900/30 hover:shadow-[0_12px_32px_-4px_rgba(244,63,94,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/5 text-rose-650 dark:text-rose-400 border border-rose-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <Clock className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Total Pending
                  </p>
                </div>
                <div className="mt-4 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 leading-tight truncate font-mono">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-white to-amber-50/[0.12] dark:from-zinc-950 dark:to-amber-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-200 dark:hover:border-amber-900/30 hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Extra Paid
                  </p>
                </div>
                <div className="mt-4 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-700 dark:text-amber-500 leading-tight truncate font-mono">
                    {formatCurrency(totalExtraPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Suspense fallback={<div className="h-12 w-full bg-zinc-100 rounded animate-pulse" />}>
            <CommissionsFilters />
          </Suspense>

          <CommissionsTable commissions={filteredCommissions as any[]} />
        </div>
      </CommissionsTabs>
    </div>
  );
}
