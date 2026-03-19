"use client";

import { useMemo, useState, useEffect } from "react";
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
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/formatters";
import { calculateFinance } from "@/lib/utils/finance";

interface SaleFormProps {
  plots: any[];
  customers: any[];
  advisors: any[];
  initialPlotId?: string;
  advisorAssignments?: Array<{
    project_id: string;
    advisor_id: string;
    commission_rate: number;
  }>;
}

export function SaleForm({
  plots,
  customers,
  advisors,
  initialPlotId,
  advisorAssignments,
}: SaleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      plot_id: initialPlotId || "",
      customer_id: "",
      advisor_id: "",
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      agreement_date: "",
      // Keep amount fields visually blank until user/plot sets them.
      total_sale_amount: undefined as any,
      down_payment: undefined as any,
      monthly_emi: undefined as any,
      emi_day: 5,
      notes: "",
    },
  });

  const selectedPlotId = form.watch("plot_id");
  const selectedAdvisorId = form.watch("advisor_id");
  const totalSaleAmount = form.watch("total_sale_amount") ?? 0;
  const downPayment = form.watch("down_payment") ?? 0;
  const remaining = totalSaleAmount - downPayment;

  const selectedPlot = useMemo(
    () => plots.find((p) => p.id === selectedPlotId) ?? null,
    [plots, selectedPlotId]
  );

  const selectedProjectId =
    selectedPlot?.project_id ?? selectedPlot?.projects?.id ?? null;

  const allowedProjectIdsForAdvisor = useMemo(() => {
    if (!selectedAdvisorId) return null;
    const set = new Set<string>();
    (advisorAssignments ?? []).forEach((a) => {
      if (a.advisor_id === selectedAdvisorId) set.add(a.project_id);
    });
    return set;
  }, [advisorAssignments, selectedAdvisorId]);

  const allowedAdvisorIdsForProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const set = new Set<string>();
    (advisorAssignments ?? []).forEach((a) => {
      if (a.project_id === selectedProjectId) set.add(a.advisor_id);
    });
    return set;
  }, [advisorAssignments, selectedProjectId]);

  const filteredPlots = useMemo(() => {
    if (!allowedProjectIdsForAdvisor) return plots;
    return plots.filter((p) => {
      const pid = p.project_id ?? p.projects?.id;
      return pid ? allowedProjectIdsForAdvisor.has(pid) : false;
    });
  }, [allowedProjectIdsForAdvisor, plots]);

  const filteredAdvisors = useMemo(() => {
    if (!allowedAdvisorIdsForProject) return advisors;
    return advisors.filter((a) => allowedAdvisorIdsForProject.has(a.id));
  }, [advisors, allowedAdvisorIdsForProject]);

  // keep selections consistent when filters change
  useEffect(() => {
    if (
      selectedPlotId &&
      allowedProjectIdsForAdvisor &&
      selectedProjectId &&
      !allowedProjectIdsForAdvisor.has(selectedProjectId)
    ) {
      form.setValue("plot_id", "");
    }
  }, [allowedProjectIdsForAdvisor, form, selectedPlotId, selectedProjectId]);

  useEffect(() => {
    if (
      selectedAdvisorId &&
      allowedAdvisorIdsForProject &&
      !allowedAdvisorIdsForProject.has(selectedAdvisorId)
    ) {
      form.setValue("advisor_id", "");
    }
  }, [allowedAdvisorIdsForProject, form, selectedAdvisorId]);

  const plotSize = Number(selectedPlot?.size_sqft ?? 0);
  const projectMinRatePerSqft = Number(
    selectedPlot?.projects?.min_plot_rate ?? 0
  );

  const advisorAssignment = useMemo(() => {
    if (!selectedAdvisorId || !selectedProjectId) return null;
    return (
      (advisorAssignments ?? []).find(
        (a) => a.advisor_id === selectedAdvisorId && a.project_id === selectedProjectId
      ) ?? null
    );
  }, [advisorAssignments, selectedAdvisorId, selectedProjectId]);

  const assignedFaceRatePerSqft = (() => {
    if (!advisorAssignment) return 0;
    return Number((advisorAssignment as any).commission_rate ?? 0);
  })();

  const advisorRateInvalid =
    !!selectedPlot &&
    assignedFaceRatePerSqft > 0 &&
    projectMinRatePerSqft > 0 &&
    assignedFaceRatePerSqft < projectMinRatePerSqft;

  const receivedNow = Number(downPayment ?? 0);
  const finance = useMemo(() => {
    const safeZero = {
      baseTotal: 0,
      sellingPrice: 0,
      profit: 0,
      received: 0,
      ratio: 0,
      advisorEarned: 0,
      remaining: 0,
      remainingPotential: 0,
      downPaymentPaymentRecord: null,
    } as const;

    if (plotSize <= 0) return safeZero;
    if (projectMinRatePerSqft <= 0) return safeZero;
    if (assignedFaceRatePerSqft <= 0) return safeZero;
    if (assignedFaceRatePerSqft < projectMinRatePerSqft) return safeZero;
    if (receivedNow < 0) return safeZero;

    try {
      return calculateFinance({
        plotSizeSqft: plotSize,
        baseRatePerSqft: projectMinRatePerSqft,
        advisorRatePerSqft: assignedFaceRatePerSqft,
        downPayment: receivedNow,
        otherPayments: 0,
      });
    } catch {
      return safeZero;
    }
  }, [assignedFaceRatePerSqft, plotSize, projectMinRatePerSqft, receivedNow]);

  // Auto-fill selling price when plot/advisor/phase changes (selling_price = advisor_rate * size)
  useEffect(() => {
    if (!selectedPlotId) return;
    if (!selectedAdvisorId) return;
    if (plotSize <= 0) return;
    if (assignedFaceRatePerSqft <= 0) return;
    const selling = calculateFinance({
      plotSizeSqft: plotSize,
      baseRatePerSqft: projectMinRatePerSqft,
      advisorRatePerSqft: assignedFaceRatePerSqft,
      downPayment: 0,
      otherPayments: 0,
    }).sellingPrice;
    if (selling > 0) form.setValue("total_sale_amount", selling);
  }, [
    assignedFaceRatePerSqft,
    form,
    plotSize,
    projectMinRatePerSqft,
    selectedAdvisorId,
    selectedPlotId,
  ]);

  const fillMockData = () => {
    if (plots.length === 0 || customers.length === 0 || advisors.length === 0) {
      toast.error("Need at least one plot, customer, and advisor to fill mock data");
      return;
    }

    const randomPlot = plots[Math.floor(Math.random() * plots.length)];
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomAdvisor = advisors[Math.floor(Math.random() * advisors.length)];

    const randomAssignment =
      (advisorAssignments ?? []).find(
        (a) => a.advisor_id === randomAdvisor.id && a.project_id === (randomPlot.project_id ?? randomPlot.projects?.id)
      ) ?? null;
    const randomAdvisorRate = Number((randomAssignment as any)?.commission_rate ?? 0);
    const selling = calculateFinance({
      plotSizeSqft: Number(randomPlot.size_sqft ?? 0),
      baseRatePerSqft: Number(randomPlot.projects?.min_plot_rate ?? 0),
      advisorRatePerSqft: randomAdvisorRate,
      downPayment: 0,
      otherPayments: 0,
    }).sellingPrice;

    form.reset({
      plot_id: randomPlot.id,
      customer_id: randomCustomer.id,
      advisor_id: randomAdvisor.id,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      total_sale_amount: selling || undefined,
      down_payment: selling ? Math.floor(selling * 0.1) : undefined,
      monthly_emi: selling ? Math.floor(selling * 0.02) : undefined,
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <div>
          <CardTitle className="text-lg">New Sale / Booking</CardTitle>
          <CardDescription className="text-xs">Record a new plot transaction</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillMockData}>
          Fill Mock Data
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Selections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold border-b pb-1.5 uppercase tracking-wider text-zinc-500">
                  Entities
                </h3>
                
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
                          {filteredPlots.map((plot) => (
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
                          {filteredAdvisors.map((advisor) => (
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

                <h3 className="text-xs font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">
                  Sale Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="sale_phase"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1 min-w-0">
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
                      <FormItem className="sm:col-span-1 min-w-0">
                        <FormLabel>Token Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agreement_date"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-1 min-w-0">
                        <FormLabel>Agreement Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
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
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Payment schedule, special requests, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Financials */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold border-b pb-2 uppercase tracking-wider text-zinc-500">
                  Financials
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="total_sale_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price (Auto)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            disabled
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(sanitized === "" ? undefined : Number(sanitized));
                            }}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(sanitized === "" ? undefined : Number(sanitized));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Remaining Balance:</span>
                    <span className="font-bold">{formatCurrency(remaining)}</span>
                  </div>
                </div>

                {selectedPlot ? (
                  <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                      Pricing, Profit & Advisor Earnings
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Base Rate / sqft
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {formatCurrencyShort(projectMinRatePerSqft)}/sqft
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                          Plot Size
                        </div>
                        <div className="font-semibold text-zinc-900 text-right">
                          {plotSize.toLocaleString("en-IN")} sqft
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Base Price (Total)
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {formatCurrency(finance.baseTotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                          Advisor Rate / sqft
                        </div>
                        <div className="font-semibold text-zinc-900 text-right">
                          {formatCurrencyShort(assignedFaceRatePerSqft)}/sqft
                        </div>
                        {advisorRateInvalid ? (
                          <div className="text-[11px] text-red-600 text-right">
                            Must be ≥ base rate
                          </div>
                        ) : null}
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Selling Price (Total)
                        </div>
                        <div className="font-bold text-zinc-900">
                          {formatCurrency(finance.sellingPrice)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Total Profit
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {formatCurrency(finance.profit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right">
                          Advisor Earned (Based on Received)
                        </div>
                        <div className="font-semibold text-zinc-900 text-right">
                          {formatCurrency(finance.advisorEarned)}
                        </div>
                        <div className="text-[11px] text-zinc-500 text-right">
                          Remaining potential: {formatCurrency(finance.remainingPotential)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                        <span>
                          Received: ₹{receivedNow.toLocaleString("en-IN")}
                        </span>
                        <span>{Math.round(finance.ratio * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                        <div
                          className="h-full bg-zinc-900"
                          style={{ width: `${Math.round(finance.ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="monthly_emi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly EMI</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(sanitized === "" ? undefined : Number(sanitized));
                            }}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              field.onChange(
                                sanitized === "" ? 0 : Number(sanitized)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading || advisorRateInvalid} className="min-w-[120px]">
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
