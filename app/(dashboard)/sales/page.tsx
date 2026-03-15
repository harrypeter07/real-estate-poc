import Link from "next/link";
import { Plus, ShoppingCart, Calendar, User, MapPin, IndianRupee } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getSales } from "@/app/actions/sales";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default async function SalesPage() {
  const sales = await getSales();

  const phaseConfig = {
    token: { label: "Token", className: "bg-yellow-100 text-yellow-800" },
    agreement: { label: "Agreement", className: "bg-blue-100 text-blue-800" },
    registry: { label: "Registry", className: "bg-green-100 text-green-800" },
    full_payment: { label: "Full Payment", className: "bg-purple-100 text-purple-800" },
  };

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
        <div className="grid grid-cols-1 gap-4">
          {sales.map((sale) => {
            const phase = phaseConfig[sale.sale_phase as keyof typeof phaseConfig];
            return (
              <Card key={sale.id} className="overflow-hidden hover:border-zinc-400 transition-colors">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left side - Plot Info */}
                    <div className="p-4 md:w-1/4 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={phase.className}>{phase.label}</Badge>
                        <span className="font-bold text-lg">{sale.plots.plot_number}</span>
                      </div>
                      <p className="text-sm text-zinc-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {sale.plots.projects.name}
                      </p>
                      <div className="mt-4 space-y-1">
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Amount</p>
                        <p className="text-lg font-bold text-zinc-900">{formatCurrency(sale.total_sale_amount)}</p>
                      </div>
                    </div>

                    {/* Middle - Customer & Advisor */}
                    <div className="p-4 md:w-2/4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Customer</p>
                            <p className="text-sm font-semibold">{sale.customers.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Advisor</p>
                            <p className="text-sm font-semibold">{sale.advisors.name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Date</p>
                            <p>{sale.token_date ? formatDate(sale.token_date) : formatDate(sale.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <IndianRupee className="h-4 w-4 text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Paid / Remaining</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(sale.amount_paid)} / 
                              <span className="text-red-600 ml-1">{formatCurrency(sale.remaining_amount)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="p-4 md:w-1/4 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-zinc-200">
                      <Link href={`/sales/${sale.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full">View Details</Button>
                      </Link>
                      <Link href={`/payments/new?saleId=${sale.id}`} className="w-full">
                        <Button size="sm" className="w-full">Collect Payment</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
