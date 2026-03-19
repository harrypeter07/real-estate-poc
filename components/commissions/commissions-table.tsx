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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils/formatters";
import { recordCommissionPayment } from "@/app/actions/commissions";
import { ReceiptUpload } from "@/components/shared/receipt-upload";
import { ReceiptViewButton } from "@/components/shared/receipt-view-button";
import { useRouter } from "next/navigation";

export function CommissionsTable({ commissions }: { commissions: any[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"manage" | "history">("manage");
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paidDate, setPaidDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMode, setPaymentMode] = useState<"cash" | "online" | "cheque">(
    "cash"
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptPath, setReceiptPath] = useState("");
  const [note, setNote] = useState("");

  const remaining = useMemo(() => {
    if (!selected) return 0;
    return Number(selected.total_commission_amount ?? 0) - Number(selected.amount_paid ?? 0);
  }, [selected]);

  const eligibleNow = useMemo(() => {
    if (!selected) return 0;
    const saleTotal = Number(selected.plot_sales?.total_sale_amount ?? 0);
    const saleReceived = Number(selected.plot_sales?.amount_paid ?? 0);
    const profitTotal = Number(selected.total_commission_amount ?? 0);
    if (saleTotal <= 0 || profitTotal <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, saleReceived / saleTotal));
    return profitTotal * ratio;
  }, [selected]);

  const availableNow = useMemo(() => {
    if (!selected) return 0;
    const paidToAdvisor = Number(selected.amount_paid ?? 0);
    return Math.max(0, eligibleNow - paidToAdvisor);
  }, [eligibleNow, selected]);

  const canPay = !!selected && remaining > 0;

  function openRow(comm: any, mode: "manage" | "history") {
    setSelected(comm);
    setPayAmount("");
    setPaidDate(new Date().toISOString().slice(0, 10));
    setPaymentMode("cash");
    setReferenceNumber("");
    setReceiptPath("");
    setNote("");
    setDialogMode(mode);
    setOpen(true);
  }

  async function submitPay() {
    if (!selected) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > availableNow) {
      toast.error("Amount exceeds eligible commission");
      return;
    }
    setSaving(true);
    try {
      const res = await recordCommissionPayment(selected.id, amt, {
        paid_date: paidDate,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        receipt_path: receiptPath,
        note,
      });
      if (!res.success) {
        toast.error("Payment failed", { description: res.error });
        return;
      }
      toast.success("Commission payment recorded");
      setOpen(false);
      setSelected(null);
      router.refresh();
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
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Advisor</TableHead>
                <TableHead>Plot / Project</TableHead>
                <TableHead>Total Commission</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((comm) => {
                const rem = Number(comm.total_commission_amount ?? 0) - Number(comm.amount_paid ?? 0);
                const isPaid = rem <= 0;
                return (
                  <TableRow
                    key={comm.id}
                    className="hover:bg-zinc-50"
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRow(comm, "manage");
                          }}
                        >
                          Manage
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRow(comm, "history");
                          }}
                        >
                          See history
                        </Button>
                      </div>
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
              <span>
                {dialogMode === "manage" ? "Manage Commission Payment" : "Commission Payout History"}
              </span>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div
              className={
                dialogMode === "history"
                  ? "grid grid-cols-1 gap-4"
                  : "grid grid-cols-1 lg:grid-cols-2 gap-4"
              }
            >
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 mb-3">
                  <span><strong>Advisor:</strong> {selected.advisors?.name ?? "—"}</span>
                  <span><strong>Plot:</strong> {selected.plot_sales?.plots?.projects?.name ?? "—"} • {selected.plot_sales?.plots?.plot_number ?? "—"}</span>
                  <span><strong>Total:</strong> {formatCurrency(selected.total_commission_amount)}</span>
                  <span><strong>Paid:</strong> {formatCurrency(selected.amount_paid)}</span>
                  <span><strong>Available:</strong> {formatCurrency(availableNow)}</span>
                </div>
                {dialogMode === "manage" && (
                  <>
                    <InfoRow label="Total Profit" value={formatCurrency(selected.total_commission_amount)} strong />
                    <InfoRow label="Paid" value={formatCurrency(selected.amount_paid)} />
                    <InfoRow label="Advisor earned so far" value={formatCurrency(eligibleNow)} strong />
                    <InfoRow label="Available to pay" value={formatCurrency(availableNow)} strong />
                    <InfoRow label="Remaining (overall)" value={formatCurrency(remaining)} />
                    {selected.notes && (
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 whitespace-pre-wrap">
                        {selected.notes}
                      </div>
                    )}
                  </>
                )}

                {dialogMode === "history" &&
                  Array.isArray(selected.advisor_commission_payments) &&
                  selected.advisor_commission_payments.length > 0 && (
                    <div className="rounded-md border border-zinc-200 p-3">
                      <div className="text-sm font-semibold text-zinc-900 mb-2">
                        Payout history
                      </div>
                      <div className="space-y-2">
                        {selected.advisor_commission_payments
                          .slice()
                          .sort(
                            (a: any, b: any) =>
                              String(b.paid_date).localeCompare(String(a.paid_date)) ||
                              String(b.created_at).localeCompare(String(a.created_at))
                          )
                          .map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-zinc-500">
                                  {p.paid_date} •{" "}
                                  {String(p.payment_mode ?? "cash").toUpperCase()}
                                  {p.reference_number
                                    ? ` • ${p.reference_number}`
                                    : ""}
                                </div>
                                {p.note ? (
                                  <div className="text-xs text-zinc-700 truncate">
                                    {p.note}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <ReceiptViewButton
                                  receiptPath={p.receipt_path}
                                  title="Commission receipt"
                                />
                                <div className="font-semibold text-zinc-900 text-sm whitespace-nowrap">
                                  {formatCurrency(p.amount)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              {dialogMode === "manage" ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-zinc-200 p-3 space-y-2">
                    <div className="text-sm font-semibold text-zinc-900">
                      Pay advisor
                    </div>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Mode</div>
                        <Select
                          value={paymentMode}
                          onValueChange={(v) =>
                            setPaymentMode(v as "cash" | "online" | "cheque")
                          }
                          disabled={!canPay || saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online / UPI</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">
                          Reference # (optional)
                        </div>
                        <Input
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="UTR / cheque / ref"
                          disabled={!canPay || saving}
                        />
                      </div>
                    </div>

                    <ReceiptUpload
                      folder="commissions"
                      recordId={selected.id}
                      value={receiptPath}
                      onChange={setReceiptPath}
                    />

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
                        onClick={() =>
                          setPayAmount(String(Math.max(0, availableNow)))
                        }
                        disabled={!canPay || saving}
                      >
                        Pay max
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
              ) : null}
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

