"use client";

import { useState, useEffect } from "react";
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
  Switch,
} from "@/components/ui";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { createPayment } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils/formatters";

interface PaymentFormProps {
  sales: any[];
  initialSaleId?: string;
}

export function PaymentForm({ sales, initialSaleId }: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      is_confirmed: false,
      notes: "",
    },
  });

  const currentSaleId = form.watch("sale_id");

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

    form.reset({
      sale_id: sale.id,
      customer_id: sale.customer_id,
      amount: Math.floor(Math.random() * 50000) + 5000,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: "cash",
      slip_number: `SLIP-${Math.floor(Math.random() * 10000)}`,
      is_confirmed: true,
      notes: "Mock payment for testing Nagpur project installment.",
    });
  };

  async function onSubmit(values: PaymentFormValues) {
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
                    <FormControl><Input type="number" placeholder="e.g. 25000" {...field} /></FormControl>
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
              name="is_confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Confirmed Payment</FormLabel>
                    <div className="text-sm text-zinc-500">
                      Mark as 'Pakka' if payment is verified in bank/cashbox
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
