"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, CheckCircle2, Clock, Home, User } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { recordCommissionPayment } from "@/app/actions/commissions";

export function CommissionsTable({ commissions }: { commissions: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paidDate, setPaidDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");

  const remaining = useMemo(() => {
    if (!selected) return 0;
    return Number(selected.total_commission_amount ?? 0) - Number(selected.amount_paid ?? 0);
  }, [selected]);

  const canPay = !!selected && remaining > 0;

  function openRow(comm: any) {
    setSelected(comm);
    setPayAmount("");
    setPaidDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setOpen(true);
  }

  async function submitPay() {
    if (!selected) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > remaining) {
      toast.error("Amount exceeds remaining");
      return;
    }
    setSaving(true);
    try {
      const res = await recordCommissionPayment(selected.id, amt, {
        paid_date: paidDate,
        note,
      });
      if (!res.success) {
        toast.error("Payment failed", { description: res.error });
        return;
      }
      toast.success("Commission payment recorded");
      setOpen(false);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
          <BadgePercent className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">No commissions yet</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Commissions will appear here automatically when plot sales are recorded.
        </p>
      </div>
    );
  }

  return (
    <>
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
                const rem = Number(comm.total_commission_amount ?? 0) - Number(comm.amount_paid ?? 0);
                const isPaid = rem <= 0;
                return (
                  <TableRow
                    key={comm.id}
                    className="cursor-pointer hover:bg-zinc-50"
                    onClick={() => openRow(comm)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm flex items-center gap-1">
                          <User className="h-3 w-3 text-zinc-400" /> {comm.advisors?.name ?? "—"}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          CODE: {comm.advisors?.code ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1">
                          <Home className="h-3 w-3 text-zinc-400" /> {comm.plot_sales?.plots?.plot_number ?? "—"}
                        </span>
                        <span className="text-zinc-500 truncate">
                          {comm.plot_sales?.plots?.projects?.name ?? "—"}
                        </span>
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
                      {formatCurrency(rem)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Commission</span>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <InfoRow label="Advisor" value={selected.advisors?.name ?? "—"} />
                <InfoRow
                  label="Plot"
                  value={`${selected.plot_sales?.plots?.projects?.name ?? "—"} • ${
                    selected.plot_sales?.plots?.plot_number ?? "—"
                  }`}
                />
                <InfoRow label="Total" value={formatCurrency(selected.total_commission_amount)} strong />
                <InfoRow label="Paid" value={formatCurrency(selected.amount_paid)} />
                <InfoRow label="Remaining" value={formatCurrency(remaining)} strong />
                {selected.notes && (
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                    {selected.notes}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-md border border-zinc-200 p-3 space-y-2">
                  <div className="text-sm font-semibold text-zinc-900">Pay advisor</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Amount</div>
                      <Input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        disabled={!canPay || saving}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Date</div>
                      <Input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        disabled={!canPay || saving}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Note (optional)</div>
                    <Textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="UPI/Bank ref, etc."
                      disabled={!canPay || saving}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPayAmount(String(Math.max(0, remaining)))}
                      disabled={!canPay || saving}
                    >
                      Pay full
                    </Button>
                    <Button
                      type="button"
                      onClick={submitPay}
                      disabled={!canPay || saving}
                    >
                      {saving ? "Saving…" : "Record payment"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
      <span className="text-zinc-500">{label}</span>
      <span className={[strong ? "font-bold" : "font-medium", "text-zinc-900"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

