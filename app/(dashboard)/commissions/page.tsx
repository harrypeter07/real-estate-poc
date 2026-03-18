import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getCommissions } from "@/app/actions/commissions";
import { formatCurrency } from "@/lib/utils/formatters";
import { CommissionsTable } from "@/components/commissions/commissions-table";

export default async function CommissionsPage() {
  const commissions = await getCommissions();

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.total_commission_amount), 0);
  const totalPaid = commissions.reduce((sum, c) => sum + Number(c.amount_paid), 0);
  const totalPending = totalCommissions - totalPaid;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors Commissions"
        subtitle={`Tracking ${commissions.length} commission payouts`}
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

      {commissions.length === 0 ? (
        <CommissionsTable commissions={commissions as any[]} />
      ) : (
        <CommissionsTable commissions={commissions as any[]} />
      )}
    </div>
  );
}
