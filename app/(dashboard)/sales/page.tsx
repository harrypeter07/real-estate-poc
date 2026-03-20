import Link from "next/link";
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
  }>;
}) {
  const params = await searchParams;
  const sales = await getSales();

  // Extract filter parameters
  const from = params.from ?? "";
  const to = params.to ?? "";
  const phase =
    typeof params.phase === "string" && params.phase !== "all" ? params.phase : "";

  // Filter sales based on criteria
  const filteredSales = sales.filter((sale) => {
    // Date range filter
		const saleDateStr = String(sale.created_at ?? "").slice(0, 10); // YYYY-MM-DD
    if (from) {
			if (!saleDateStr || saleDateStr < from) return false;
    }
    if (to) {
			if (!saleDateStr || saleDateStr > to) return false;
    }

    // Phase filter (case-insensitive)
    if (phase) {
      const salePhase = String(sale.sale_phase ?? "").toLowerCase().trim();
      const filterPhase = phase.toLowerCase().trim();
      if (salePhase !== filterPhase) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Bookings"
        subtitle={`${filteredSales.length} transactions recorded`}
        action={
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </Link>
        }
      />

      <SalesFilters />

      {filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <ShoppingCart className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">{sales.length === 0 ? "No sales recorded" : "No sales match these filters"}</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            {sales.length === 0 ? "Record your first plot booking or sale" : "Try adjusting your filter criteria"}
          </p>
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      ) : (
        <SalesList sales={filteredSales} />
      )}
    </div>
  );
}
