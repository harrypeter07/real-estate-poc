"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  User,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ReceiptViewer } from "@/components/shared/receipt-viewer";

export function PaymentsTable({ payments }: { payments: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  const hasRows = payments.length > 0;

  const subtitle = useMemo(() => {
    if (!selected) return "";
    const project = selected.plot_sales?.plots?.projects?.name ?? "—";
    const plot = selected.plot_sales?.plots?.plot_number ?? "—";
    return `${project} • ${plot}`;
  }, [selected]);

  if (!hasRows) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
          <CreditCard className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold">No payments yet</h3>
        <p className="text-sm text-zinc-500 mt-1 mb-4">
          Record your first payment installment
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
                <TableHead>Date</TableHead>
                <TableHead>Customer / Plot</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => {
                    setSelected(payment);
                    setOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm flex items-center gap-1">
                        <User className="h-3 w-3 text-zinc-400" />{" "}
                        {payment.customers?.name ?? "—"}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Home className="h-3 w-3 text-zinc-400" />
                        {payment.plot_sales?.plots?.projects?.name ?? "—"} -{" "}
                        {payment.plot_sales?.plots?.plot_number ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-zinc-900">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="capitalize text-[10px] font-bold"
                    >
                      {payment.payment_mode}
                    </Badge>
                    {payment.slip_number && (
                      <p className="text-[10px] text-zinc-400 mt-0.5 uppercase">
                        #{payment.slip_number}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.is_confirmed ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1 border-yellow-200">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? null : close())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate">Payment</div>
                <div className="text-xs text-zinc-500 font-normal truncate">
                  {subtitle}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <DetailRow label="Date" value={formatDate(selected.payment_date)} />
                <DetailRow
                  label="Customer"
                  value={selected.customers?.name ?? "—"}
                />
                <DetailRow
                  label="Amount"
                  value={formatCurrency(selected.amount)}
                  strong
                />
                <DetailRow
                  label="Mode"
                  value={String(selected.payment_mode ?? "—")}
                />
                {selected.slip_number && (
                  <DetailRow label="Slip / Ref #" value={selected.slip_number} mono />
                )}
                {selected.notes && (
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                    {selected.notes}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <ReceiptViewer
                  receiptPath={selected.receipt_path}
                  title="Receipt image"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
      <span className="text-zinc-500">{label}</span>
      <span
        className={[
          strong ? "font-bold" : "font-medium",
          mono ? "font-mono text-xs" : "",
          "text-zinc-900",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

