import Link from "next/link";
import { Suspense } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { SalesList } from "@/components/sales/sales-list";
import { SalesFilters } from "@/components/sales/sales-filters";
import { getSales } from "@/app/actions/sales";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    phase?: string;
    advisor?: string;
    project?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const sales = await getSales();

  // Extract filter parameters
  const from = params.from ?? "";
  const to = params.to ?? "";
  const phase =
    typeof params.phase === "string" && params.phase !== "all"
      ? params.phase
      : "";
  const advisor =
    typeof params.advisor === "string" && params.advisor !== "all"
      ? params.advisor
      : "";
  const project =
    typeof params.project === "string" && params.project !== "all"
      ? params.project
      : "";
  const sort = typeof params.sort === "string" ? params.sort : "newest";

  // Filter sales based on criteria
  const filteredSales = sales.filter((sale) => {
    // Date range filter (timezone-safe)
    const saleDateStr = String(sale.created_at ?? "").slice(0, 10); // YYYY-MM-DD
    if (from && (!saleDateStr || saleDateStr < from)) return false;
    if (to && (!saleDateStr || saleDateStr > to)) return false;

    // Phase filter (case-insensitive)
    if (phase) {
      const salePhase = String(sale.sale_phase ?? "").toLowerCase().trim();
      const filterPhase = phase.toLowerCase().trim();
      if (filterPhase === "revoked") {
        if (!sale.is_cancelled) return false;
      } else {
        // For token / sold views, exclude revoked sales.
        if (sale.is_cancelled) return false;
        if (salePhase !== filterPhase) return false;
      }
    }

    // Advisor filter
    if (advisor) {
      if (String(sale.advisor_id ?? "") !== advisor) return false;
    }
    // Project filter
    if (project) {
      const projectId = String((sale as any).plots?.projects?.id ?? "");
      if (projectId !== project) return false;
    }

    return true;
  });

  const sortedSales = [...filteredSales].sort((a: any, b: any) => {
    if (sort === "oldest") {
      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    }
    if (sort === "project") {
      return String(a.plots?.projects?.name ?? "").localeCompare(
        String(b.plots?.projects?.name ?? "")
      );
    }
    if (sort === "layout") {
      return String(a.sale_phase ?? "").localeCompare(String(b.sale_phase ?? ""));
    }
    // newest default
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });

  const projectOptions = Array.from(
    new Map(
      sales
          .filter((s: any) => s?.plots?.projects?.id)
          .map((s: any) => [s.plots.projects.id, { id: s.plots.projects.id, name: s.plots.projects.name }])
    ).values()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl">💰</span>
            <span className="font-black tracking-tight text-zinc-800">Sales & Bookings</span>
          </div>
        }
        subtitle={
          <span className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400 font-medium">Track transactions, collections, and payment progress.</span>
            <span className="h-4 w-px bg-zinc-200" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-150">
              {filteredSales.length} Transactions
            </span>
          </span>
        }
        action={
          <Link href="/sales/new">
            <Button size="sm" className="h-10 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs px-5 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] active:scale-[0.98] flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<div className="h-12 w-full bg-zinc-100 rounded-2xl animate-pulse" />}>
        <SalesFilters projects={projectOptions as any[]} />
      </Suspense>

      {filteredSales.length === 0 ? (
        <div className="border border-dashed border-zinc-200/80 rounded-2xl p-16 text-center bg-white flex flex-col items-center justify-center transition-all duration-300 shadow-xs max-w-xl mx-auto my-8">
          <div className="h-14 w-14 rounded-2xl bg-zinc-50 border border-zinc-150/60 flex items-center justify-center mb-4 text-zinc-400 shadow-2xs">
            <ShoppingCart className="h-6 w-6 text-zinc-450 animate-pulse" />
          </div>
          <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wide">
            {sales.length === 0 ? "📭 No sales recorded yet" : "🔍 No sales match filters"}
          </h3>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-2 mb-6 max-w-sm mx-auto">
            {sales.length === 0 
              ? "Sales transactions and bookings will appear here once new bookings are completed." 
              : "We couldn't find any sales matching your select filters. Try clearing or expanding your date range parameters."}
          </p>
          <Link href="/sales/new">
            <Button size="sm" className="h-9.5 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs px-5 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] active:scale-[0.98] flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Record Sale
            </Button>
          </Link>
        </div>
      ) : (
        <Suspense fallback={<div className="h-48 w-full bg-zinc-100 rounded-2xl animate-pulse" />}>
          <SalesList sales={sortedSales} />
        </Suspense>
      )}
    </div>
  );
}
