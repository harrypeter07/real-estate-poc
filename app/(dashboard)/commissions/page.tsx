import Link from "next/link";
import { BadgePercent, User, Home, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { Button, Card, CardContent, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getCommissions } from "@/app/actions/commissions";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <BadgePercent className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">No commissions yet</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Commissions will appear here automatically when plot sales are recorded.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Advisor</TableHead>
                  <TableHead>Plot / Project</TableHead>
                  <TableHead>Total Commission</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((comm) => {
                  const remaining = comm.total_commission_amount - comm.amount_paid;
                  const isPaid = remaining <= 0;
                  return (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm flex items-center gap-1">
                            <User className="h-3 w-3 text-zinc-400" /> {comm.advisors.name}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">CODE: {comm.advisors.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-zinc-700 flex items-center gap-1">
                            <Home className="h-3 w-3 text-zinc-400" /> {comm.plot_sales.plots.plot_number}
                          </span>
                          <span className="text-zinc-500 truncate">{comm.plot_sales.plots.projects.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-zinc-900">
                        {formatCurrency(comm.total_commission_amount)}
                        <span className="ml-1.5 text-[10px] text-zinc-400 font-normal">
                          (₹ {Number(comm.commission_percentage ?? 0).toLocaleString("en-IN")}/sqft)
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(comm.amount_paid)}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
