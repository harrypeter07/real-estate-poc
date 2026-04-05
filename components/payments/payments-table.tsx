"use client";

import { useMemo, useState } from "react";
import { ListSearchBar } from "@/components/shared/list-search-bar";
import { matchesTextSearch } from "@/lib/utils/text-search";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  User,
  Share2,
  FileText,
  MessageCircle,
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
import { generateReceipt, getReceiptUrlByPath } from "@/app/actions/receipts";
import { toast } from "sonner";
import { openWhatsAppPaymentReminder } from "@/lib/payment-whatsapp";

export function PaymentsTable({ payments }: { payments: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [listQuery, setListQuery] = useState("");

  const visiblePayments = useMemo(() => {
    return payments.filter((payment) =>
      matchesTextSearch(
        listQuery,
        payment.customers?.name,
        payment.customers?.phone,
        payment.plot_sales?.plots?.projects?.name,
        payment.plot_sales?.plots?.plot_number,
        payment.slip_number,
        payment.payment_mode,
      ),
    );
  }, [payments, listQuery]);

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
  const generatedPdfPath =
    selected?.plot_sales?.receipt_path &&
    String(selected.plot_sales.receipt_path).toLowerCase().endsWith(".pdf")
      ? selected.plot_sales.receipt_path
      : null;

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
          <div className="p-3 border-b border-zinc-100">
            <ListSearchBar
              value={listQuery}
              onChange={setListQuery}
              placeholder="Search by customer, phone, plot, project, slip…"
              className="max-w-xl"
            />
          </div>
          {visiblePayments.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-600">
              No payments match your search. Clear the box to see all {payments.length}{" "}
              payment{payments.length === 1 ? "" : "s"}.
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer / Plot</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Remind</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePayments.map((payment) => (
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
                      {Array.isArray(payment.sale_commission_team) &&
                      payment.sale_commission_team.length > 1 ? (
                        <span className="text-[10px] text-zinc-400">
                          Commission: {payment.sale_commission_team.length} advisors — open for
                          amounts
                        </span>
                      ) : null}
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
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {payment.payment_due_meta?.is_payment_due ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-700 border-green-200 h-8 px-2"
                        onClick={() =>
                          openWhatsAppPaymentReminder({
                            phone: payment.customers?.phone,
                            customerName: payment.customers?.name ?? "Customer",
                            plot: String(payment.plot_sales?.plots?.plot_number ?? "—"),
                            project: String(
                              payment.plot_sales?.plots?.projects?.name ?? "—"
                            ),
                            remainingAmount: Number(
                              payment.plot_sales?.remaining_amount ?? 0
                            ),
                            monthlyEmi: payment.plot_sales?.monthly_emi,
                            nextDue: payment.payment_due_meta?.next_emi_due,
                          })
                        }
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Remind
                      </Button>
                    ) : (
                      <span className="text-[10px] text-zinc-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
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
              {Array.isArray(selected.sale_commission_team) &&
                selected.sale_commission_team.length > 0 && (
                  <div className="lg:col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Advisor commission (this sale)
                    </p>
                    <ul className="space-y-2 text-xs">
                      {(() => {
                        const team = selected.sale_commission_team as {
                          name: string;
                          phone: string;
                          amount: number;
                          is_main?: boolean;
                        }[];
                        const totalComm = team.reduce(
                          (s, m) => s + Number(m.amount ?? 0),
                          0,
                        );
                        const payAmt = Number(selected.amount ?? 0);
                        return team.map((m, i: number) => {
                          const share =
                            totalComm > 0 && payAmt > 0
                              ? (Number(m.amount ?? 0) / totalComm) * payAmt
                              : 0;
                          return (
                            <li
                              key={i}
                              className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200/80 pb-2 last:border-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 font-medium text-zinc-900">
                                  <span>{m.name}</span>
                                  {m.is_main ? (
                                    <span className="rounded bg-zinc-200 px-1 py-0 text-[9px] font-bold uppercase text-zinc-700">
                                      Main
                                    </span>
                                  ) : m.is_main === false ? (
                                    <span className="rounded bg-amber-100 px-1 py-0 text-[9px] font-bold uppercase text-amber-900">
                                      Sub
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-zinc-500 tabular-nums">{m.phone}</span>
                              </div>
                              <div className="shrink-0 text-right font-mono tabular-nums">
                                <div className="font-semibold text-zinc-900">
                                  {formatCurrency(m.amount)}
                                </div>
                                {totalComm > 0 && payAmt > 0 ? (
                                  <div className="text-[10px] font-normal text-zinc-500">
                                    ~{formatCurrency(share)} of this receipt
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      Totals are each advisor&apos;s commission on the sale. &quot;Of this
                      receipt&quot; splits the payment amount by the same proportions (reference
                      only).
                    </p>
                  </div>
                )}
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
                {selected.payment_due_meta?.is_payment_due && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() =>
                      openWhatsAppPaymentReminder({
                        phone: selected.customers?.phone,
                        customerName: selected.customers?.name ?? "Customer",
                        plot: String(selected.plot_sales?.plots?.plot_number ?? "—"),
                        project: String(
                          selected.plot_sales?.plots?.projects?.name ?? "—"
                        ),
                        remainingAmount: Number(
                          selected.plot_sales?.remaining_amount ?? 0
                        ),
                        monthlyEmi: selected.plot_sales?.monthly_emi,
                        nextDue: selected.payment_due_meta?.next_emi_due,
                      })
                    }
                  >
                    <MessageCircle className="h-4 w-4" />
                    Remind for payment (WhatsApp)
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={generatingReceipt || !selected.sale_id}
                  onClick={async () => {
                    if (!selected?.sale_id) return;
                    setGeneratingReceipt(true);
                    setGenerateProgress(8);
                    const timer = setInterval(() => {
                      setGenerateProgress((p) => (p >= 92 ? 92 : p + 8));
                    }, 180);
                    try {
                      const res = await generateReceipt(selected.sale_id);
                      if (!res.success || !res.path) {
                        toast.error("Failed to generate receipt", {
                          description: res.error ?? "Please try again.",
                        });
                        return;
                      }
                      setGenerateProgress(100);
                      setSelected((prev: any) => ({
                        ...prev,
                        plot_sales: {
                          ...(prev?.plot_sales ?? {}),
                          receipt_path: res.path,
                        },
                      }));
                      toast.success("Receipt generated", {
                        description: res.sizeKb ? `PDF size: ${res.sizeKb} KB` : undefined,
                      });
                    } finally {
                      clearInterval(timer);
                      setGeneratingReceipt(false);
                      setTimeout(() => setGenerateProgress(0), 500);
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {generatingReceipt ? "Generating receipt..." : "Generate Receipt"}
                </Button>
                {generatingReceipt && (
                  <div className="w-full rounded-md border border-zinc-200 bg-zinc-50 p-2">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Preparing and uploading PDF...</span>
                      <span>{Math.min(100, Math.max(0, Math.round(generateProgress)))}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
                      <div
                        className="h-full bg-zinc-900 transition-all duration-200"
                        style={{ width: `${Math.min(100, Math.max(0, generateProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
                {generatedPdfPath && (
                  <ShareReceiptButton
                    receiptPath={generatedPdfPath}
                    customerPhone={selected.customers?.phone}
                  />
                )}
                <ReceiptViewer
                  receiptPath={generatedPdfPath}
                  title="Receipt"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShareReceiptButton({
  receiptPath,
  customerPhone,
}: {
  receiptPath: string | null | undefined;
  customerPhone: string | null | undefined;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full gap-2 text-green-600 border-green-200 hover:bg-green-50"
      disabled={loading || !receiptPath}
      onClick={async () => {
        if (!receiptPath) return;
        setLoading(true);
        try {
          const url = await getReceiptUrlByPath(receiptPath);
          const phone = customerPhone?.replace(/\D/g, "") ?? "";
          const withCode = phone.startsWith("91") ? phone : `91${phone}`;
          const msg = url
            ? `Hi, please find your receipt: ${url}`
            : "Hi, please find your receipt.";
          if (phone) {
            window.open(
              `https://wa.me/${withCode}?text=${encodeURIComponent(msg)}`,
              "_blank"
            );
          } else if (url) {
            await navigator.clipboard.writeText(url);
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      <Share2 className="h-4 w-4" />
      {loading ? "Loading…" : "Share Receipt via WhatsApp"}
    </Button>
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

