"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
} from "@/components/ui";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { createPayment } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils/formatters";
import { ReceiptUpload } from "@/components/shared/receipt-upload";

interface PaymentFormProps {
  sales: any[];
  initialSaleId?: string;
}

export function PaymentForm({ sales, initialSaleId }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [draftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  );

  const selectedSale = sales.find(s => s.id === initialSaleId);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      sale_id: initialSaleId ?? "",
      customer_id: selectedSale?.customer_id ?? "",
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: "",
      receipt_path: "",
      // Payments recorded through this form are always treated as confirmed
      is_confirmed: true,
      notes: "",
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

  // Update customer_id when sale_id changes
  useEffect(() => {
    const sale = sales.find(s => s.id === currentSaleId);
    if (sale) {
      form.setValue("customer_id", sale.customer_id);
    }
  }, [currentSaleId, sales, form]);

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
    });
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

    setLoading(true);
    try {
      const result = await createPayment(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        return;
      }

      toast.success("Payment recorded successfully");
      router.push("/payments");
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Record Payment</CardTitle>
          <CardDescription>Add a new payment installment against a sale</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="sale_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Sale / Plot *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!initialSaleId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a sale transaction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sales.map((sale) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.plots.projects.name} - {sale.plots.plot_number} ({sale.customers.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          const next = sanitized === "" ? 0 : Number(sanitized);
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
              <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-200 space-y-1 text-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
