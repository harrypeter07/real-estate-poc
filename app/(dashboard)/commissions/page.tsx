import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getCommissions } from "@/app/actions/commissions";
import { formatCurrency } from "@/lib/utils/formatters";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { CommissionsFilters } from "@/components/commissions/commissions-filters";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const commissions = await getCommissions();

  // Extract filter parameters
  const from = typeof searchParams.from === "string" ? searchParams.from : "";
  const to = typeof searchParams.to === "string" ? searchParams.to : "";
  const status = typeof searchParams.status === "string" && searchParams.status !== "all" ? searchParams.status : "";

  // Filter commissions based on criteria
  const filteredCommissions = commissions.filter((commission) => {
    // Date range filter
    if (from) {
      const createdDate = new Date(commission.created_at);
      const fromDate = new Date(from);
      if (createdDate < fromDate) return false;
    }
    if (to) {
      const createdDate = new Date(commission.created_at);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (createdDate > toDate) return false;
    }

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
  const totalPending = totalCommissions - totalPaid;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors Commissions"
        subtitle={`Tracking ${filteredCommissions.length} commission payouts`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Commission
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-green-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Paid
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-500 mb-2 text-xs font-bold uppercase tracking-wider">
              Total Pending
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <CommissionsFilters />

      {filteredCommissions.length === 0 ? (
        <CommissionsTable commissions={filteredCommissions as any[]} />
      ) : (
        <CommissionsTable commissions={filteredCommissions as any[]} />
      )}
    </div>
  );
}
