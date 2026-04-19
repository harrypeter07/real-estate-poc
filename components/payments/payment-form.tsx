"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchableCombobox,
} from "@/components/ui";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { createPayment } from "@/app/actions/payments";
import {
  getSaleCommissionParticipants,
  type SaleCommissionParticipant,
} from "@/app/actions/sales";
import { formatCurrency } from "@/lib/utils/formatters";
import { isDev } from "@/lib/is-dev";
import { ReceiptUpload } from "@/components/shared/receipt-upload";
import { ShareReceiptModal } from "@/components/sales/share-receipt-modal";

interface PaymentFormProps {
  sales: any[];
  initialSaleId?: string;
}

export function PaymentForm({ sales, initialSaleId }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSaleId, setShareSaleId] = useState<string | null>(null);
  const [shareCustomerPhone, setShareCustomerPhone] = useState<string | null>(null);
  const [shareCustomerName, setShareCustomerName] = useState<string | null>(null);
  const [draftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  );

  const [teamParticipants, setTeamParticipants] = useState<SaleCommissionParticipant[]>([]);
  const [splitByAdvisor, setSplitByAdvisor] = useState<Record<string, string>>({});

  const selectedSale = sales.find(s => s.id === initialSaleId);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      sale_id: initialSaleId ?? "",
      customer_id: selectedSale?.customer_id ?? "",
      amount: undefined as any,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: "",
      receipt_path: "",
      // Payments recorded through this form are always treated as confirmed
      is_confirmed: true,
      notes: "",
      advisor_distribution: undefined,
    },
  });

  const currentSaleId = form.watch("sale_id");
  const amountValue = Number(form.watch("amount") || 0);
  const activeSale = useMemo(
    () => sales.find((s) => s.id === currentSaleId),
    [sales, currentSaleId]
  );
  const saleTotal = Number(activeSale?.total_sale_amount ?? 0);
  const salePaid = Number(activeSale?.amount_paid ?? 0);
  const saleRemaining = Math.max(0, saleTotal - salePaid);

  const PAYMENT_SPLIT_EPS = 0.02;

  useEffect(() => {
    if (!currentSaleId) {
      setTeamParticipants([]);
      setSplitByAdvisor({});
      return;
    }
    const sale = sales.find((s) => s.id === currentSaleId);
    if (sale?.sold_by_admin) {
      setTeamParticipants([]);
      setSplitByAdvisor({});
      return;
    }
    const embedded = sale?.commission_participants;
    if (Array.isArray(embedded) && embedded.length > 0) {
      setTeamParticipants(embedded as SaleCommissionParticipant[]);
      return;
    }
    let cancelled = false;
    void getSaleCommissionParticipants(currentSaleId).then((rows) => {
      if (!cancelled) setTeamParticipants(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSaleId, sales]);

  const teamAdvisorKey = useMemo(
    () => teamParticipants.map((p) => p.advisor_id).join(","),
    [teamParticipants],
  );

  useEffect(() => {
    setSplitByAdvisor({});
  }, [currentSaleId, teamAdvisorKey]);

  const commissionParticipantIds = teamParticipants.map((p) => p.advisor_id);
  const splitSumManual =
    commissionParticipantIds.length > 1
      ? commissionParticipantIds.slice(0, -1).reduce(
          (s, id) =>
            s + (Number.isFinite(Number(splitByAdvisor[id])) ? Number(splitByAdvisor[id]) : 0),
          0,
        )
      : 0;
  const splitLastAuto =
    commissionParticipantIds.length > 1
      ? Math.max(0, amountValue - splitSumManual)
      : commissionParticipantIds.length === 1
        ? amountValue
        : 0;
  const paymentSplitOverflow =
    commissionParticipantIds.length > 1 &&
    amountValue > PAYMENT_SPLIT_EPS &&
    splitSumManual > amountValue + PAYMENT_SPLIT_EPS;

  function applyProportionalPaymentSplit() {
    if (teamParticipants.length <= 1 || amountValue <= 0) return;
    const pool = teamParticipants.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (pool <= 0) return;
    const mids = teamParticipants.slice(0, -1);
    const next: Record<string, string> = {};
    for (const p of mids) {
      next[p.advisor_id] = ((amountValue * (Number(p.amount) || 0)) / pool).toFixed(2);
    }
    setSplitByAdvisor(next);
  }

  // Payment phase selector (UI-only). DB triggers keep plot status/sale_phase consistent
  // based on remaining_amount, but this helps the operator choose "sold/full payment".
  const [targetPhase, setTargetPhase] = useState<"token" | "full_payment">("token");

  // Update customer_id when sale_id changes
  useEffect(() => {
    const sale = sales.find(s => s.id === currentSaleId);
    if (sale) {
      form.setValue("customer_id", sale.customer_id);
    }
  }, [currentSaleId, sales, form]);

  useEffect(() => {
    // If sale already fully paid, default to full_payment. Otherwise default to token.
    if (saleRemaining <= 0) {
      setTargetPhase("full_payment");
      return;
    }
    const current = (activeSale?.sale_phase as string | undefined) ?? "token";
    setTargetPhase(current === "full_payment" ? "full_payment" : "token");
  }, [activeSale?.sale_phase, saleRemaining]);

  useEffect(() => {
    // Auto-switch phase when the user enters the exact remaining amount.
    if (saleRemaining > 0 && amountValue > 0 && amountValue === saleRemaining) {
      setTargetPhase("full_payment");
    }
    if (saleRemaining > 0 && amountValue > 0 && amountValue < saleRemaining) {
      setTargetPhase("token");
    }
  }, [amountValue, saleRemaining]);

  const fillMockData = () => {
    if (sales.length === 0) {
      toast.error("Need at least one sale to record a payment");
      return;
    }

    const sale = initialSaleId ? selectedSale : sales[Math.floor(Math.random() * sales.length)];
    if (!sale) return;

    const remaining = Math.max(
      0,
      Number(sale.total_sale_amount ?? 0) - Number(sale.amount_paid ?? 0)
    );
    form.reset({
      sale_id: sale.id,
      customer_id: sale.customer_id,
      amount:
        remaining > 0
          ? Math.max(1, Math.min(remaining, Math.floor(Math.random() * 50000) + 5000))
          : 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: `SLIP-${Math.floor(Math.random() * 10000)}`,
      receipt_path: "",
      is_confirmed: true,
      notes: "Mock payment for testing Nagpur project installment.",
      advisor_distribution: undefined,
    });
  };

  const playSubmitTone = (kind: "success" | "error") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 740 : 210;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.14));
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.22 : 0.16));
      setTimeout(() => void ctx.close(), 300);
    } catch {
      // Ignore audio errors (browser policy/device issues)
    }
  };

  async function onSubmit(values: PaymentFormValues) {
    if (saleRemaining <= 0) {
      toast.error("This sale is already fully paid");
      return;
    }
    if (Number(values.amount ?? 0) > saleRemaining) {
      toast.error("Payment exceeds remaining sale amount");
      return;
    }
    const amt = Number(values.amount ?? 0);
    if (paymentSplitOverflow) {
      toast.error("Payment split too high", {
        description: `Allocated amounts cannot exceed this receipt (${formatCurrency(amt)}).`,
      });
      return;
    }

    let advisor_distribution: PaymentFormValues["advisor_distribution"] = undefined;
    if (!activeSale?.sold_by_admin && teamParticipants.length === 1 && amt > 0) {
      advisor_distribution = [
        { advisor_id: teamParticipants[0].advisor_id, amount: amt },
      ];
    } else if (!activeSale?.sold_by_admin && teamParticipants.length > 1 && amt > 0) {
      const pid = commissionParticipantIds;
      const sumMid = pid.slice(0, -1).reduce(
        (s, id) => s + (Number.isFinite(Number(splitByAdvisor[id])) ? Number(splitByAdvisor[id]) : 0),
        0,
      );
      const lastAmt = Math.max(0, amt - sumMid);
      advisor_distribution = pid.map((id, i) => ({
        advisor_id: id,
        amount: i === pid.length - 1 ? lastAmt : Number(splitByAdvisor[id] || 0),
      }));
    }

    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const result = await createPayment(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to record payment");
        playSubmitTone("error");
        return;
      }

      toast.success("Payment recorded successfully");
      setSubmitStatus("success");
      setStatusText("Payment submitted successfully. Opening receipt sharing...");
      playSubmitTone("success");
      setShareSaleId(values.sale_id);
      setShareCustomerPhone(activeSale?.customers?.phone ?? null);
      setShareCustomerName(activeSale?.customers?.name ?? null);
      setShareModalOpen(true);
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while submitting payment.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="max-w-2xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div>
          <CardTitle className="text-lg">Record Payment</CardTitle>
          <CardDescription className="text-xs">
            Add a new payment installment against a sale
          </CardDescription>
        </div>
        {isDev ? (
          <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
            Fill Mock Data
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sale_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Sale / Plot *</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      options={sales.map((sale) => ({
                        value: sale.id,
                        label: `${sale.plots?.projects?.name ?? "—"} — Plot ${sale.plots?.plot_number ?? "—"}`,
                        subtitle: String(sale.customers?.name ?? "—"),
                        keywords: String(sale.customers?.phone ?? ""),
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!!initialSaleId}
                      placeholder="Search by project, plot, customer, phone…"
                      emptyMessage="No sale matches."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 25000"
                        {...field}
                        max={saleRemaining > 0 ? saleRemaining : undefined}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const sanitized = raw.replace(/^0+(?=\d)/, "");
                          const next = sanitized === "" ? undefined : Number(sanitized);
                          if (next === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (saleRemaining > 0 && next > saleRemaining) {
                            field.onChange(saleRemaining);
                            return;
                          }
                          field.onChange(next);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-zinc-900">
                  Payment Phase
                </p>
                <Select
                  value={targetPhase}
                  onValueChange={(v) => {
                    if (v !== "token" && v !== "full_payment") return;
                    setTargetPhase(v);
                    if (v === "full_payment") {
                      form.setValue("amount", saleRemaining > 0 ? saleRemaining : 0);
                    }
                  }}
                  disabled={saleRemaining <= 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="token">Token / Booking</SelectItem>
                    <SelectItem value="full_payment">Payment completed (Sold)</SelectItem>
                  </SelectContent>
                </Select>
                {targetPhase === "full_payment" ? (
                  <p className="text-[11px] text-zinc-500">
                    When full payment is selected, remaining amount will be filled.
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Partial payment keeps the sale in token phase.
                  </p>
                )}
              </div>
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {currentSaleId && (
              <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Sale Total:</span>
                  <span className="font-medium">{formatCurrency(saleTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Already Paid:</span>
                  <span className="font-medium">{formatCurrency(salePaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Remaining:</span>
                  <span className="font-bold">{formatCurrency(saleRemaining)}</span>
                </div>
                {amountValue > saleRemaining && saleRemaining > 0 && (
                  <div className="text-xs text-red-600 font-medium">
                    Entered amount is above remaining balance.
                  </div>
                )}
              </div>
            )}

            {currentSaleId &&
            !activeSale?.sold_by_admin &&
            teamParticipants.length > 0 &&
            amountValue > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-amber-900">
                    Receipt split by advisor (reference)
                  </div>
                  {teamParticipants.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={applyProportionalPaymentSplit}
                    >
                      Match commission shares
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-amber-900/90">
                  Allocate this receipt across the same advisors as on the sale. Amounts must total{" "}
                  <span className="font-mono font-semibold">{formatCurrency(amountValue)}</span>.
                </p>
                {teamParticipants.length === 1 ? (
                  <p className="text-sm font-mono font-semibold text-zinc-900">
                    {teamParticipants[0].name}: {formatCurrency(amountValue)}
                  </p>
                ) : (
                  <>
                    {teamParticipants.map((p, idx) => {
                      const isLast = idx === teamParticipants.length - 1;
                      return (
                        <div key={p.advisor_id} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-zinc-700">
                            {p.name}
                            {p.is_main ? (
                              <span className="text-zinc-400 text-xs"> (main)</span>
                            ) : (
                              <span className="text-amber-800 text-xs"> (sub)</span>
                            )}
                          </span>
                          {isLast ? (
                            <span className="font-mono tabular-nums font-semibold text-zinc-900 w-28 text-right">
                              {formatCurrency(splitLastAuto)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 w-28 text-right font-mono text-xs"
                              value={splitByAdvisor[p.advisor_id] ?? ""}
                              onChange={(e) =>
                                setSplitByAdvisor((prev) => ({
                                  ...prev,
                                  [p.advisor_id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                            />
                          )}
                        </div>
                      );
                    })}
                    <div className="text-[11px] text-amber-800 space-y-1">
                      <p>
                        Total allocated:{" "}
                        <strong className="tabular-nums">
                          {formatCurrency(splitSumManual + (paymentSplitOverflow ? 0 : splitLastAuto))}
                        </strong>{" "}
                        / {formatCurrency(amountValue)}
                      </p>
                      <p>
                        Remainder → last advisor:{" "}
                        <strong className="tabular-nums">{formatCurrency(splitLastAuto)}</strong>
                      </p>
                    </div>
                    {paymentSplitOverflow ? (
                      <p className="text-[11px] font-medium text-red-700">
                        Entered rows exceed this receipt. Lower earlier amounts.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="payment_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online / UPI</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slip_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slip / Reference Number</FormLabel>
                    <FormControl><Input placeholder="e.g. UPI Ref or Receipt #" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="receipt_path"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ReceiptUpload
                      folder="payments"
                      recordId={draftId}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Any specific details about this payment" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading || paymentSplitOverflow}
                className={`min-w-[140px] transition-all duration-300 ${
                  loading
                    ? "scale-[1.02] shadow-md"
                    : submitStatus === "success"
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }`}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? "Submitting..."
                  : submitStatus === "success"
                  ? "Submitted"
                  : "Record Payment"}
              </Button>
            </div>
            {submitStatus !== "idle" && (
              <div
                className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
                  submitStatus === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {submitStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{statusText}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      </Card>

      {shareSaleId && (
        <ShareReceiptModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) {
              router.push("/payments");
              router.refresh();
            }
          }}
          saleId={shareSaleId}
          customerPhone={shareCustomerPhone}
          customerName={shareCustomerName}
          donePath="/payments"
        />
      )}
    </>
  );
}
