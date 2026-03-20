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
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const sales = await getSales();

  // Extract filter parameters
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";
  const phase = typeof searchParams.phase === "string" && searchParams.phase !== "all" ? searchParams.phase : "";

  // Filter sales based on criteria
  const filteredSales = sales.filter((sale) => {
    // Date range filter
    if (from) {
      const saleDate = new Date(sale.sale_date);
      const fromDate = new Date(from);
      if (saleDate < fromDate) return false;
    }
    if (to) {
      const saleDate = new Date(sale.sale_date);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (saleDate > toDate) return false;
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
