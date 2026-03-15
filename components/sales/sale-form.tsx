"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Calculator } from "lucide-react";
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
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { createSale } from "@/app/actions/sales";
import { formatCurrency } from "@/lib/utils/formatters";

interface SaleFormProps {
  plots: any[];
  customers: any[];
  advisors: any[];
}

export function SaleForm({ plots, customers, advisors }: SaleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      plot_id: "",
      customer_id: "",
      advisor_id: "",
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      agreement_date: "",
      total_sale_amount: 0,
      down_payment: 0,
      monthly_emi: 0,
      emi_day: 5,
      notes: "",
    },
  });

  const selectedPlotId = form.watch("plot_id");
  const totalSaleAmount = form.watch("total_sale_amount");
  const downPayment = form.watch("down_payment");
  const remaining = totalSaleAmount - downPayment;

  // Auto-fill total amount when plot is selected
  useEffect(() => {
    if (selectedPlotId) {
      const plot = plots.find(p => p.id === selectedPlotId);
      if (plot) {
        form.setValue("total_sale_amount", plot.total_amount);
      }
    }
  }, [selectedPlotId, plots, form]);

  const fillMockData = () => {
    if (plots.length === 0 || customers.length === 0 || advisors.length === 0) {
      toast.error("Need at least one plot, customer, and advisor to fill mock data");
      return;
    }

    const randomPlot = plots[Math.floor(Math.random() * plots.length)];
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];

    form.reset({
      plot_id: randomPlot.id,
      customer_id: randomCustomer.id,
      advisor_id: randomAdvisor.id,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      total_sale_amount: randomPlot.total_amount,
      down_payment: Math.floor(randomPlot.total_amount * 0.1),
      monthly_emi: Math.floor(randomPlot.total_amount * 0.02),
      emi_day: 5,
      notes: "Mock sale generated for testing Nagpur project.",
    });
  };

  async function onSubmit(values: SaleFormValues) {
    setLoading(true);
    try {
      const result = await createSale(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        return;
      }

      toast.success("Sale recorded successfully");
      router.push("/sales");
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>New Sale / Booking</CardTitle>
          <CardDescription>Record a new plot transaction</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selections */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">Entities</h3>
                
                <FormField
                  control={form.control}
                  name="plot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Plot *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an available plot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plots.map((plot) => (
                            <SelectItem key={plot.id} value={plot.id}>
                              {plot.projects.name} - {plot.plot_number} ({plot.size_sqft} sqft)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a buyer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} ({customer.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advisor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Advisor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose channel partner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {advisors.map((advisor) => (
                            <SelectItem key={advisor.id} value={advisor.id}>
                              {advisor.name} ({advisor.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Financials */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">Financials</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_sale_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Sale Amount *</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="down_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Down Payment</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Remaining Balance:</span>
                    <span className="font-bold">{formatCurrency(remaining)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthly_emi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly EMI</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emi_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EMI Day (1-31)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sale_phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Phase *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="token">Token / Booking</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="registry">Registry</SelectItem>
                        <SelectItem value="full_payment">Full Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="token_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agreement_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agreement Date</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Payment schedule, special requests, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Sale
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
