import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, User, Phone, MapPin, ShieldCheck, FileText, ArrowLeft, Landmark, FileQuestion } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CustomerDocuments } from "@/components/customers/customer-documents";
import { getCustomerById } from "@/app/actions/customers";
import { getCustomerDocuments } from "@/app/actions/customer-documents";
import { getCustomerPlotSales } from "@/app/actions/sales";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

export default async function AdvisorCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ensure advisor is logged in (and route is not accessible anonymously).
  const supabase = await createClient();
  if (!supabase) notFound();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const docs = await getCustomerDocuments(id);
  const plotSales = await getCustomerPlotSales(id);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (parts[0]?.[0] || "").toUpperCase();
  };

  const initials = getInitials(customer.name);
  const kycStatus = customer.kyc_status || "pending";

  return (
    <div className="space-y-6">
      {/* Premium Profile Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200/80 bg-white shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
        <div className="flex items-center gap-4">
          <Link href="/advisor/customers" className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors shadow-sm active:scale-95">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-600 to-emerald-500 text-white flex items-center justify-center text-lg font-black shadow-[0_4px_20px_rgba(13,148,136,0.2)] border border-teal-400/20 shrink-0">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-zinc-800 tracking-tight">{customer.name}</h1>
                {kycStatus === "verified" ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Verified Customer
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-650 border border-zinc-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                    <span className="h-1 w-1 rounded-full bg-zinc-400" />
                    🟠 KYC {kycStatus}
                  </Badge>
                )}
                {customer.is_active === false && (
                  <Badge variant="destructive" className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">Advisor Workspace Details</p>
            </div>
          </div>
        </div>

        <Link href={`/advisor/customers/${id}/edit`}>
          <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-bold gap-1.5 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 shadow-sm transition-all duration-200 cursor-pointer active:scale-98">
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card + Transactions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Profile Details Card */}
          <Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white transition-all duration-300">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-black border-b border-zinc-100 pb-3.5 uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-zinc-400" />
                Contact Information
              </h3>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-xs text-zinc-700 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-200/40">
                  <Phone className="h-4 w-4 text-teal-650 shrink-0" />
                  <span className="font-mono font-bold text-zinc-800">{customer.phone}</span>
                </div>

                {customer.address && (
                  <div className="flex items-start gap-3 text-xs text-zinc-700 bg-zinc-50/50 p-2.5 rounded-xl border border-zinc-200/40">
                    <MapPin className="h-4 w-4 text-teal-650 shrink-0 mt-0.5" />
                    <span className="font-bold text-zinc-800 whitespace-pre-wrap leading-relaxed">{customer.address}</span>
                  </div>
                )}

                {customer.notes && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">Internal Account Notes</span>
                    <div className="rounded-xl border border-zinc-150 bg-zinc-50/30 p-3 text-[11px] font-semibold text-zinc-600 whitespace-pre-wrap leading-relaxed">
                      {customer.notes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transactions Card */}
          <Card className="border border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] rounded-2xl bg-white transition-all duration-300">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xs font-black border-b border-zinc-100 pb-3.5 uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Landmark className="h-4.5 w-4.5 text-zinc-400" />
                Transactions (Plots Bought)
              </h3>

              {plotSales.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/30">
                  <FileQuestion className="h-6 w-6 text-zinc-450" />
                  No sales recorded for this customer.
                </div>
              ) : (
                <div className="space-y-3">
                  {plotSales.map((sale: any) => {
                    const isFullyPaid = sale.amount_paid >= (sale.total_sale_amount ?? 0);

                    return (
                      <div
                        key={sale.id}
                        className={cn(
                          "rounded-2xl border border-zinc-200/80 bg-white p-4 space-y-3 hover:shadow-md transition-all duration-300 border-l-4",
                          isFullyPaid 
                            ? "border-l-emerald-500" 
                            : "border-l-teal-500"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-zinc-800 truncate">
                              📍 {sale.plots?.plot_number ?? "—"} • {sale.plots?.projects?.name ?? "—"}
                            </div>
                            <div className="text-[9px] text-zinc-450 uppercase font-mono font-bold mt-0.5">
                              Phase: {sale.sale_phase ?? "—"}
                            </div>
                          </div>
                          {isFullyPaid ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-[0_2px_8px_rgba(16,185,129,0.06)]">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                              PAID
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200/50 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                              DUE
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-zinc-500 font-semibold">Total Cost</span>
                            <span className="font-extrabold text-zinc-800">{formatCurrency(sale.total_sale_amount ?? 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-zinc-500 font-semibold">Paid Amount</span>
                            <span className="font-extrabold text-emerald-650 bg-emerald-50/50 px-2 py-0.5 rounded-lg border border-emerald-100/50">{formatCurrency(sale.amount_paid ?? 0)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-zinc-500 font-semibold">Remaining Dues</span>
                            <span className={cn("font-black", isFullyPaid ? "text-zinc-450" : "text-red-650 bg-red-50/50 px-2 py-0.5 rounded-lg border border-red-100/50 shadow-inner")}>
                              {formatCurrency(sale.remaining_amount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Documents & KYC uploads */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerDocuments
            customerId={id}
            customerName={customer.name}
            initialDocs={docs as any[]}
            customer={customer}
          />
        </div>
      </div>
    </div>
  );
}
