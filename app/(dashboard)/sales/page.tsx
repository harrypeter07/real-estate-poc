import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { SalesList } from "@/components/sales/sales-list";
import { getSales } from "@/app/actions/sales";

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Bookings"
        subtitle={`${sales.length} transactions recorded`}
        action={
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </Link>
        }
      />

      {sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <ShoppingCart className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">No sales recorded</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            Record your first plot booking or sale
          </p>
          <Link href="/sales/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      ) : (
        <SalesList sales={sales} />
      )}
    </div>
  );
}
