"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Calculator, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
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
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { createSale } from "@/app/actions/sales";
import { listSubAdvisors } from "@/app/actions/advisors";
import { ShareReceiptModal } from "./share-receipt-modal";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/formatters";
import { calculateFinance } from "@/lib/utils/finance";
import { isDev } from "@/lib/is-dev";

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
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [shareModal, setShareModal] = useState<{ saleId: string; customerPhone?: string | null; customerName?: string | null } | null>(null);
  const [subAdvisorIds, setSubAdvisorIds] = useState<string[]>([]);
  const [subOptions, setSubOptions] = useState<{ id: string; name: string; code: string; phone: string }[]>([]);
  const [splitByAdvisor, setSplitByAdvisor] = useState<Record<string, string>>({});
  const [subComboKey, setSubComboKey] = useState(0);
  const [preferredCustomerSubAdvisorId, setPreferredCustomerSubAdvisorId] = useState<string | null>(null);
  const showFillMock = false;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      plot_id: initialPlotId || "",
      customer_id: "",
      sold_by_admin: false,
      advisor_id: "" as string | null,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      agreement_date: "",
      total_sale_amount: 0,
      down_payment: 0,
      emi_months: 0,
      monthly_emi: 0,
      emi_day: 5,
      followup_date: "",
      notes: "",
      advisor_selling_price_per_sqft: undefined as number | undefined,
    },
  });

  const selectedPlotId = form.watch("plot_id");
  const selectedCustomerId = form.watch("customer_id");
  const soldByAdmin = form.watch("sold_by_admin");
  const selectedAdvisorId = form.watch("advisor_id");
  const advisorSellingOverride = form.watch("advisor_selling_price_per_sqft");
  const selectedPhase = form.watch("sale_phase");
  const totalSaleAmount = form.watch("total_sale_amount") ?? 0;
  const downPayment = form.watch("down_payment") ?? 0;
  const isDownPaymentFull =
    Number(totalSaleAmount) > 0 && Number(downPayment) >= Number(totalSaleAmount);
  const emiMonths = form.watch("emi_months") || 0;
  const remaining = totalSaleAmount > 0 ? totalSaleAmount - downPayment : 0;
  const phaseDateFieldName = selectedPhase === "token" ? "token_date" : "agreement_date";
  const phaseDateLabel =
    selectedPhase === "token" ? "Token Date" : "Full Payment Date";

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
    // Empty set = advisor has no rows in loaded assignments; do not treat as a real
    // filter (otherwise every plot is excluded and plot_id is cleared — breaks Sell dialog).
    return set.size > 0 ? set : null;
  }, [advisorAssignments, selectedAdvisorId]);

  const allowedAdvisorIdsForProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const set = new Set<string>();
    (advisorAssignments ?? []).forEach((a) => {
      if (a.project_id === selectedProjectId) set.add(a.advisor_id);
    });
    return set.size > 0 ? set : null;
  }, [advisorAssignments, selectedProjectId]);

  const filteredPlots = useMemo(() => {
    if (soldByAdmin) return plots;
    if (!allowedProjectIdsForAdvisor) return plots;
    return plots.filter((p) => {
      const pid = p.project_id ?? p.projects?.id;
      return pid ? allowedProjectIdsForAdvisor.has(pid) : false;
    });
  }, [allowedProjectIdsForAdvisor, plots, soldByAdmin]);

  const filteredAdvisors = useMemo(() => {
    if (!allowedAdvisorIdsForProject) {
      return advisors;
    }
    return (advisors as any[]).filter((a) => allowedAdvisorIdsForProject.has(a.id));
  }, [advisors, allowedAdvisorIdsForProject]);

  useEffect(() => {
    console.log("[SaleForm] Raw advisors from props:", advisors);
  }, [advisors]);

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

  useEffect(() => {
    if (soldByAdmin) {
      form.setValue("advisor_id", null);
      form.setValue("advisor_selling_price_per_sqft", undefined);
    }
  }, [soldByAdmin, form]);

  // Autofill advisor from selected customer.
  // If customer is tagged to a sub-advisor, auto-pick parent as main and preselect the sub.
  useEffect(() => {
    if (soldByAdmin || !selectedCustomerId) {
      setPreferredCustomerSubAdvisorId(null);
      return;
    }
    const customer = (customers as any[]).find((c) => c.id === selectedCustomerId);
    const customerAdvisorId = String(customer?.advisor_id ?? "").trim();
    if (!customerAdvisorId) {
      setPreferredCustomerSubAdvisorId(null);
      return;
    }
    const linked = (advisors as any[]).find((a) => a.id === customerAdvisorId);
    if (!linked?.id) return;
    // Always select the customer's linked advisor directly, regardless of whether they have a parent advisor
    form.setValue("advisor_id", linked.id);
    setPreferredCustomerSubAdvisorId(null);
  }, [advisors, customers, form, selectedCustomerId, soldByAdmin]);

  useEffect(() => {
    if (!selectedAdvisorId || soldByAdmin) {
      setSubOptions([]);
      setSubAdvisorIds([]);
      setSplitByAdvisor({});
      return;
    }
    let cancelled = false;
    listSubAdvisors(selectedAdvisorId)
      .then((rows) => {
        if (!cancelled) setSubOptions(rows as any[]);
      })
      .catch(() => {
        if (!cancelled) setSubOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAdvisorId, soldByAdmin]);

  useEffect(() => {
    if (!selectedAdvisorId || soldByAdmin) return;
    setSubAdvisorIds((prev) => prev.filter((id) => subOptions.some((s) => s.id === id)));
  }, [selectedAdvisorId, soldByAdmin, subOptions]);

  useEffect(() => {
    if (!preferredCustomerSubAdvisorId || soldByAdmin) return;
    if (!subOptions.some((s) => s.id === preferredCustomerSubAdvisorId)) return;
    setSubAdvisorIds((prev) =>
      prev.includes(preferredCustomerSubAdvisorId) ? prev : [...prev, preferredCustomerSubAdvisorId]
    );
    setPreferredCustomerSubAdvisorId(null);
  }, [preferredCustomerSubAdvisorId, soldByAdmin, subOptions]);

  // Keep one visible date in sync when switching phase (token ↔ other phases use different form keys).
  useEffect(() => {
    const token = form.getValues("token_date");
    const agr = form.getValues("agreement_date");
    if (selectedPhase === "token") {
      if (!token && agr) form.setValue("token_date", agr);
    } else {
      if (!agr && token) form.setValue("agreement_date", token);
    }
  }, [selectedPhase, form]);

  // Auto-compute monthly_emi from emi_months when remaining > 0
  useEffect(() => {
    if (selectedPhase === "full_payment") {
      form.setValue("emi_months", null);
      form.setValue("monthly_emi", null);
      form.setValue("emi_day", null);
      return;
    }
    const months = Number(emiMonths);
    if (months >= 1 && remaining > 0) {
      const computed = Math.ceil(remaining / months);
      form.setValue("monthly_emi", computed);
    }
  }, [emiMonths, remaining, form, selectedPhase]);

  // Full payment phase = collect everything now, hide EMI fields.
  useEffect(() => {
    if (selectedPhase !== "full_payment") return;
    const total = Number(form.getValues("total_sale_amount") ?? 0);
    if (total > 0) {
      form.setValue("down_payment", total);
    }
    form.setValue("emi_months", null);
    form.setValue("monthly_emi", null);
    form.setValue("emi_day", null);
    form.setValue("followup_date", "");
  }, [selectedPhase, form, totalSaleAmount]);

  const plotSize = Number(selectedPlot?.size_sqft ?? 0);
  const plotBaseRatePerSqft = Number(selectedPlot?.rate_per_sqft ?? 0);

  const advisorAssignment = useMemo(() => {
    if (!selectedAdvisorId || !selectedProjectId) return null;
    return (
      (advisorAssignments ?? []).find(
        (a) => a.advisor_id === selectedAdvisorId && a.project_id === selectedProjectId
      ) ?? null
    );
  }, [advisorAssignments, selectedAdvisorId, selectedProjectId]);

  const assignmentDefaultRate = Number((advisorAssignment as any)?.commission_rate ?? 0);

  useEffect(() => {
    if (soldByAdmin) return;
    if (!selectedAdvisorId || !selectedProjectId) {
      form.setValue("advisor_selling_price_per_sqft", undefined);
      return;
    }
    if (assignmentDefaultRate > 0) {
      form.setValue("advisor_selling_price_per_sqft", assignmentDefaultRate);
    }
  }, [soldByAdmin, selectedAdvisorId, selectedProjectId, assignmentDefaultRate, form]);

  const assignedFaceRatePerSqft = (() => {
    if (soldByAdmin && selectedPlot) return plotBaseRatePerSqft;
    const override = Number(advisorSellingOverride);
    if (
      !soldByAdmin &&
      selectedAdvisorId &&
      Number.isFinite(override) &&
      override > 0
    ) {
      return override;
    }
    if (!advisorAssignment) return 0;
    return Number((advisorAssignment as any).commission_rate ?? 0);
  })();

  const advisorRateInvalid =
    !soldByAdmin &&
    !!selectedPlot &&
    assignedFaceRatePerSqft > 0 &&
    plotBaseRatePerSqft > 0 &&
    assignedFaceRatePerSqft < plotBaseRatePerSqft;

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
    if (plotBaseRatePerSqft <= 0) return safeZero;
    const rate = soldByAdmin ? plotBaseRatePerSqft : assignedFaceRatePerSqft;
    if (rate <= 0) return safeZero;
    if (!soldByAdmin && rate < plotBaseRatePerSqft) return safeZero;
    if (receivedNow < 0) return safeZero;

    try {
      return calculateFinance({
        plotSizeSqft: plotSize,
        baseRatePerSqft: plotBaseRatePerSqft,
        advisorRatePerSqft: rate,
        downPayment: receivedNow,
        otherPayments: 0,
      });
    } catch {
      return safeZero;
    }
  }, [assignedFaceRatePerSqft, plotSize, plotBaseRatePerSqft, receivedNow, soldByAdmin]);

  const calculatedSplits = useMemo(() => {
    if (soldByAdmin || !selectedAdvisorId || !totalSaleAmount) return [];

    const splits = [];
    let currentId = selectedAdvisorId;
    let level = 0;
    
    const advisor = (advisors as any[]).find((a) => a.id === selectedAdvisorId);
    if (!advisor) return [];

    // Project rate override
    const assignment = (advisorAssignments ?? []).find(
      (a) => a.advisor_id === selectedAdvisorId && a.project_id === selectedProjectId
    );
    let baseRate = 0;
    if (assignment) {
      baseRate = Number((assignment as any).commission_rate ?? (assignment as any).commission_token ?? 0);
    }
    if (!baseRate) {
      baseRate = Number(selectedPhase === "token" ? advisor.commission_token : advisor.commission_full_payment);
    }
    if (!baseRate) {
      baseRate = 5; // default 5%
    }

    const baseCommissionAmount = (baseRate / 100) * totalSaleAmount;
    const levelMultipliers = [1.0, 0.20, 0.10, 0.05];

    while (currentId && level < 4) {
      const adv = (advisors as any[]).find((a) => a.id === currentId);
      if (!adv) break;

      const multiplier = levelMultipliers[level] ?? 0.05;
      const commPct = baseRate * multiplier;
      const amount = baseCommissionAmount * multiplier;

      splits.push({
        advisor_id: adv.id,
        name: adv.name,
        code: adv.code,
        commission_percentage: commPct,
        amount: Math.round(amount * 100) / 100,
        level
      });

      currentId = adv.parent_advisor_id;
      level++;
    }

    return splits;
  }, [selectedAdvisorId, totalSaleAmount, selectedPhase, advisors, advisorAssignments, selectedProjectId, soldByAdmin]);

  const commissionSplitOverflow = false;
  const commissionSplitTotal = calculatedSplits.reduce((sum, r) => sum + r.amount, 0);

  useEffect(() => {
    if (!selectedPlotId || plotSize <= 0 || plotBaseRatePerSqft <= 0) {
      form.setValue("total_sale_amount", 0);
      return;
    }
    const rate = soldByAdmin ? plotBaseRatePerSqft : assignedFaceRatePerSqft;
    if (rate <= 0 || (!soldByAdmin && !selectedAdvisorId) || (!soldByAdmin && rate < plotBaseRatePerSqft)) {
      form.setValue("total_sale_amount", 0);
      return;
    }
    let selling = 0;
    try {
      selling = calculateFinance({
        plotSizeSqft: plotSize,
        baseRatePerSqft: plotBaseRatePerSqft,
        advisorRatePerSqft: rate,
        downPayment: 0,
        otherPayments: 0,
      }).sellingPrice;
    } catch {
      selling = 0;
    }
    form.setValue("total_sale_amount", selling > 0 ? selling : 0);
  }, [
    assignedFaceRatePerSqft,
    form,
    plotSize,
    plotBaseRatePerSqft,
    selectedAdvisorId,
    selectedPlotId,
    soldByAdmin,
    advisorSellingOverride,
  ]);

  // Clear numeric fields if plot is unselected
  useEffect(() => {
    if (!selectedPlotId) {
      form.setValue("total_sale_amount", 0);
      form.setValue("down_payment", 0);
    }
  }, [selectedPlotId, form]);

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
    const plotBaseForMock = Number(randomPlot.rate_per_sqft ?? 0);
    const plotSizeForMock = Number(randomPlot.size_sqft ?? 0);
    let randomAdvisorRate = Number((randomAssignment as any)?.commission_rate ?? 0);
    if (plotBaseForMock > 0) {
      randomAdvisorRate = Math.max(randomAdvisorRate, plotBaseForMock);
    }
    let selling = 0;
    try {
      if (plotBaseForMock > 0 && plotSizeForMock > 0) {
        selling = calculateFinance({
          plotSizeSqft: plotSizeForMock,
          baseRatePerSqft: plotBaseForMock,
          advisorRatePerSqft: randomAdvisorRate,
          downPayment: 0,
          otherPayments: 0,
        }).sellingPrice;
      }
    } catch {
      selling = 0;
    }

    form.reset({
      plot_id: randomPlot.id,
      customer_id: randomCustomer.id,
      sold_by_admin: false,
      advisor_id: randomAdvisor.id,
      sale_phase: "token",
      token_date: new Date().toISOString().split('T')[0],
      total_sale_amount: selling || undefined,
      down_payment: selling ? Math.floor(selling * 0.1) : undefined,
      emi_months: 12,
      monthly_emi: selling ? Math.floor((selling * 0.9) / 12) : undefined,
      emi_day: 5,
      followup_date: "",
      notes: "Mock sale generated for testing Nagpur project.",
      advisor_selling_price_per_sqft:
        randomAdvisorRate > 0 ? randomAdvisorRate : undefined,
    });
    setTouched({});
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
      osc.frequency.value = kind === "success" ? 760 : 220;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + (kind === "success" ? 0.22 : 0.16)
      );
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.24 : 0.18));
      setTimeout(() => void ctx.close(), 320);
    } catch {
      // ignore
    }
  };

  async function onSubmit(values: SaleFormValues) {
    setTouched({ plot_id: true, customer_id: true, advisor_id: true, sale_phase: true });
    if (commissionSplitOverflow) {
      toast.error("Commission split too high", {
        description: `Entered amounts cannot exceed total profit (${formatCurrency(finance.profit)}).`,
      });
      return;
    }
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const pid = selectedAdvisorId && !values.sold_by_admin
        ? [selectedAdvisorId, ...subAdvisorIds]
        : [];
      let commission_splits: SaleFormValues["commission_splits"] = undefined;
      if (pid.length > 1 && finance.profit > 0.001) {
        const sumMid = pid.slice(0, -1).reduce(
          (s, id) => s + (Number.isFinite(Number(splitByAdvisor[id])) ? Number(splitByAdvisor[id]) : 0),
          0,
        );
        const lastAmt = Math.max(0, finance.profit - sumMid);
        commission_splits = pid.map((id, i) => ({
          advisor_id: id,
          amount: i === pid.length - 1 ? lastAmt : Number(splitByAdvisor[id] || 0),
        }));
      }

      const result = await createSale({
        ...values,
        commission_splits,
      });
      if (!result.success) {
        toast.error("Error", { description: result.error });
        setSubmitStatus("error");
        setStatusText(result.error ?? "Failed to record sale");
        playSubmitTone("error");
        return;
      }

      toast.success("Sale recorded successfully");
      setSubmitStatus("success");
      setStatusText("Sale submitted successfully. Opening receipt sharing...");
      playSubmitTone("success");
      const customer = customers.find((c) => c.id === values.customer_id);
      if (result.saleId) {
        setShareModal({
          saleId: result.saleId,
          customerPhone: customer?.phone ?? null,
          customerName: customer?.name ?? null,
        });
      } else {
        setShareModal(null);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error("Error", { description: msg });
      setSubmitStatus("error");
      setStatusText(msg);
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = useMemo(() => {
    if (!selectedCustomerId) return 1;
    if (!soldByAdmin && !selectedAdvisorId) return 2;
    if (!selectedPlotId || totalSaleAmount <= 0) return 3;
    return 4;
  }, [selectedCustomerId, soldByAdmin, selectedAdvisorId, selectedPlotId, totalSaleAmount]);

  const stepper = useMemo(() => {
    const steps = [
      { num: 1, label: "Select Customer" },
      { num: 2, label: "Assign Advisor" },
      { num: 3, label: "Financials" },
      { num: 4, label: "Confirm Sale" },
    ];
    
    return (
      <div className="flex items-center justify-between w-full gap-2 border-b border-zinc-150 pb-3 mb-4 overflow-x-auto dark:border-zinc-800 shrink-0">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          return (
            <div key={step.num} className="flex items-center gap-1.5 shrink-0">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${
                isCompleted 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                  : isActive 
                  ? "bg-indigo-650 bg-indigo-600 text-white shadow-sm" 
                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}>
                {isCompleted ? "✓" : step.num}
              </div>
              <span className={`text-[10px] font-bold tracking-wide whitespace-nowrap transition-all duration-200 ${
                isActive 
                  ? "text-zinc-800 dark:text-zinc-100" 
                  : "text-zinc-400"
              }`}>
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <span className="text-zinc-200 dark:text-zinc-800 ml-1 text-[10px]">➔</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [currentStep]);

  const analyticsBadges = useMemo(() => {
    if (!selectedPlot || totalSaleAmount <= 0) return null;
    const badges = [];
    
    if (finance.profit > 0) {
      badges.push({
        label: "PROFITABLE",
        bg: "bg-emerald-50 text-emerald-750 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
        icon: "🟢"
      });
    }
    
    const profitMargin = finance.sellingPrice > 0 ? (finance.profit / finance.sellingPrice) * 100 : 0;
    if (profitMargin >= 20) {
      badges.push({
        label: "HIGH MARGIN",
        bg: "bg-indigo-50 text-indigo-700 border-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
        icon: "📈"
      });
    }
    
    if (!soldByAdmin) {
      const pctOfSelling = finance.sellingPrice > 0 ? (finance.profit / finance.sellingPrice) * 100 : 0;
      if (pctOfSelling >= 10) {
        badges.push({
          label: "GOOD MARGIN",
          bg: "bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
          icon: "💰"
        });
      }
    }
    
    return badges;
  }, [finance.profit, finance.sellingPrice, soldByAdmin, selectedPlot, totalSaleAmount]);

  return (
    <>
    <Card className="w-full border-0 bg-transparent shadow-none max-w-4xl">
      <CardHeader className="flex flex-row justify-between items-center p-0 pb-3 space-y-0">
        <div>
          <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">New Sale / Booking</CardTitle>
          <CardDescription className="text-[11px] text-zinc-500">Record a new plot transaction</CardDescription>
        </div>
        {showFillMock ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={fillMockData}>
            Fill Mock Data
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {stepper}

        {/* Selected Plot Summary Strip */}
        {selectedPlot && (
          <div className="flex flex-wrap items-center gap-3 md:gap-4 rounded-xl border border-zinc-200/50 bg-zinc-50/60 p-2.5 mb-4 text-[11px] font-medium dark:border-zinc-800 dark:bg-zinc-900/30 shadow-inner">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-zinc-150 text-zinc-700 dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-300 shadow-sm font-semibold">
              <span>🏠</span>
              <span>Plot #{selectedPlot.plot_number}</span>
            </div>
            
            <div className="inline-flex items-center gap-1 text-zinc-500">
              <span>📐</span>
              <span>Size: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{selectedPlot.size_sqft.toLocaleString("en-IN")} sqft</strong></span>
            </div>
            
            <div className="inline-flex items-center gap-1 text-zinc-500">
              <span>📍</span>
              <span>Project: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{selectedPlot.projects?.name || "Nagpur Project"}</strong></span>
            </div>
            
            <div className="inline-flex items-center gap-1 text-zinc-500">
              <span>💰</span>
              <span>Base Rate: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{formatCurrencyShort(selectedPlot.rate_per_sqft)}/sqft</strong></span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* LEFT SIDE: Entities & Sale Details */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* 1. ENTITIES CARD */}
                <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/10">
                  <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2 dark:border-zinc-800">
                    <span className="text-sm">👤</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-350">
                      Entities
                    </h3>
                  </div>
                  <FormField
                    control={form.control}
                    name="plot_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Select Plot *</FormLabel>
                        <Select 
                          onValueChange={(v) => {
                            field.onChange(v);
                            markTouched("plot_id");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger onBlur={() => markTouched("plot_id")} className="h-9 focus:ring-1 focus:ring-indigo-500/20">
                              <SelectValue placeholder="Choose an available plot" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredPlots.map((plot) => (
                              <SelectItem key={plot.id} value={plot.id}>
                                {plot.projects?.name || plot.projects?.id} - {plot.plot_number} ({plot.size_sqft} sqft)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {touched.plot_id && <FormMessage />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Select Customer *</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={customers.map((c) => ({
                              value: c.id,
                              label: String(c.name ?? ""),
                              subtitle: String(c.phone ?? ""),
                            }))}
                            value={field.value}
                            onChange={(v) => {
                              field.onChange(v);
                              markTouched("customer_id");
                            }}
                            onBlur={() => markTouched("customer_id")}
                            placeholder="Search customer by name or phone…"
                            emptyMessage="No customer matches."
                          />
                        </FormControl>
                        {touched.customer_id && <FormMessage />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sold_by_admin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Sold By</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "admin")}
                          value={field.value ? "admin" : "advisor"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="advisor">Advisor</SelectItem>
                            <SelectItem value="admin">Admin (Direct)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                {!soldByAdmin && (
                  <FormField
                    control={form.control}
                    name="advisor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Select Advisor *</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={filteredAdvisors.map((a) => ({
                              value: a.id,
                              label: String(a.name ?? ""),
                              subtitle: String(a.code ?? ""),
                              keywords: String(a.phone ?? ""),
                            }))}
                            value={field.value ?? ""}
                            onChange={(id) => {
                              field.onChange(id || null);
                              markTouched("advisor_id");
                            }}
                            onBlur={() => markTouched("advisor_id")}
                            placeholder="Search advisor by name, code, or phone…"
                            emptyMessage="No advisor matches."
                          />
                        </FormControl>
                        {touched.advisor_id && <FormMessage />}
                      </FormItem>
                    )}
                  />
                )}

                {!soldByAdmin && selectedAdvisorId && calculatedSplits.length > 0 ? (
                  <div className="p-3.5 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10 shadow-sm">
                    <div className="text-xs font-black text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                      Automatic Hierarchical Commission Splits
                    </div>
                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                      Commission is split up the advisor parent chain. Rates are determined by advisor profile and project commission rates.
                    </p>
                    <div className="space-y-2 pt-1 border-t border-amber-200/40">
                      {calculatedSplits.map((row) => (
                        <div key={row.advisor_id} className="flex justify-between items-center text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              {row.name} {row.level === 0 ? "(Seller)" : `(L${row.level} Parent)`}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              Code: {row.code} &middot; {row.commission_percentage.toFixed(2)}% rate
                            </span>
                          </div>
                          <span className="font-mono font-bold text-zinc-850 dark:text-zinc-150 bg-amber-100/40 dark:bg-amber-950/20 px-2 py-1 rounded shadow-3xs">
                            {formatCurrency(row.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-amber-800 dark:text-amber-500 border-t border-amber-200/40 pt-2 leading-none">
                      <span>Total Payout:</span>
                      <span className="font-mono font-black">
                        {formatCurrency(commissionSplitTotal)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {!soldByAdmin && selectedAdvisorId ? (
                  <FormField
                    control={form.control}
                    name="advisor_selling_price_per_sqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Advisor selling price (₹/sqft)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-9"
                            placeholder="From project assignment"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const sanitized = raw.replace(/^0+(?=\d)/, "");
                              if (sanitized === "") {
                                field.onChange(undefined);
                                return;
                              }
                              const n = Number(sanitized);
                              field.onChange(Number.isFinite(n) ? n : undefined);
                            }}
                          />
                        </FormControl>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Prefills from Manage on this project; edit for this plot only if needed.
                        </p>
                        {advisorRateInvalid ? (
                          <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
                            ⚠️ Price is less than plot admin rate ({formatCurrencyShort(plotBaseRatePerSqft)}/sqft).
                          </p>
                        ) : null}
                        {plotBaseRatePerSqft > 0 &&
                        Number(field.value ?? 0) > 0 &&
                        !advisorRateInvalid ? (
                          <p className="text-[10px] text-zinc-655 mt-1 bg-zinc-100/60 dark:bg-zinc-800/40 rounded px-2 py-1 flex flex-wrap justify-between font-medium">
                            <span>Share: {formatCurrencyShort(Number(field.value ?? 0) - plotBaseRatePerSqft)}/sqft</span>
                            <span>Commission: {((Math.max(0, Number(field.value ?? 0) - plotBaseRatePerSqft) / Number(field.value ?? 1)) * 100).toFixed(1)}%</span>
                          </p>
                        ) : null}
                        {touched.advisor_id && <FormMessage />}
                      </FormItem>
                    )}
                  />
                ) : null}
                </div>

                {/* 2. SALE DETAILS CARD */}
                <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/10">
                  <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2 dark:border-zinc-800">
                    <span className="text-sm">📄</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-350">
                      Sale Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="sale_phase"
                      render={({ field }) => (
                        <FormItem className="min-w-0 sm:col-span-1">
                          <FormLabel className="text-xs font-semibold text-zinc-500">Sale Phase *</FormLabel>
                          <Select 
                            onValueChange={(v) => {
                              field.onChange(v);
                              markTouched("sale_phase");
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger onBlur={() => markTouched("sale_phase")} className="h-9 focus:ring-1 focus:ring-indigo-500/20">
                                <SelectValue placeholder="Select phase" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="token">Token / Booking</SelectItem>
                              <SelectItem value="full_payment">Payment completed / Sold</SelectItem>
                            </SelectContent>
                          </Select>
                          {touched.sale_phase && <FormMessage />}
                        </FormItem>
                      )}
                    />
                    <FormField
                      key={phaseDateFieldName}
                      control={form.control}
                      name={phaseDateFieldName as "token_date" | "agreement_date"}
                      render={({ field }) => (
                        <FormItem className="min-w-0 sm:col-span-1">
                          <FormLabel className="text-xs font-semibold text-zinc-500">{phaseDateLabel}</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              onBlur={() => markTouched("sale_phase")}
                              className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                            />
                          </FormControl>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            Stored as {selectedPhase === "token" ? "token date" : "full payment date"}.
                          </p>
                          {touched.sale_phase && <FormMessage />}
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-zinc-500">Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Payment schedule, special requests, etc."
                            {...field}
                            className="focus:ring-1 focus:ring-indigo-500/20"
                          />
                        </FormControl>
                        {touched.notes && <FormMessage />}
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* RIGHT SIDE: Financials & Profit / Earnings */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 3. FINANCIALS CARD */}
                <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/10">
                  <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2 dark:border-zinc-800">
                    <span className="text-sm">💰</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-350">
                      Financials
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="total_sale_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-zinc-500">Selling Price (Auto)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-9 font-mono text-zinc-600 bg-zinc-100/50 dark:text-zinc-400 dark:bg-zinc-800/30"
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
                          {touched.plot_id && <FormMessage />}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="down_payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-zinc-500">
                            {selectedPhase === "full_payment" || isDownPaymentFull
                              ? "Full Payment"
                              : "Down Payment"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                              {...field}
                              value={field.value ?? ""}
                              disabled={selectedPhase === "full_payment"}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const sanitized = raw.replace(/^0+(?=\d)/, "");
                                field.onChange(sanitized === "" ? undefined : Number(sanitized));
                                markTouched("down_payment");
                              }}
                              onBlur={() => markTouched("down_payment")}
                            />
                          </FormControl>
                          {selectedPhase === "full_payment" ? (
                            <p className="text-[10px] text-zinc-400 mt-1">
                              Matches selling price — no EMI for full payment.
                            </p>
                          ) : null}
                          {touched.down_payment && <FormMessage />}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3.5 space-y-1 rounded-xl border border-indigo-100 bg-indigo-50/20 dark:border-indigo-950/20 dark:bg-indigo-950/10 shadow-sm flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Remaining Balance:</span>
                    <span className="font-bold text-sm text-indigo-650 dark:text-indigo-400 tabular-nums">{formatCurrency(remaining)}</span>
                  </div>

                  {remaining > 0 && selectedPhase !== "full_payment" && (
                    <FormField
                      control={form.control}
                      name="followup_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-zinc-500">Follow-up Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-9 focus:ring-1 focus:ring-indigo-500/20" {...field} value={field.value ?? ""} placeholder="Next payment follow-up" />
                          </FormControl>
                          <p className="text-[10px] text-zinc-455 mt-1">Reminder will be created for this date</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* 4. PROFIT & ADVISOR EARNINGS CARD */}
                {selectedPlot ? (
                  <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/10">
                    <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2 dark:border-zinc-800">
                      <span className="text-sm">📈</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-350">
                        {soldByAdmin ? "Pricing (Admin Direct)" : "Profit & Advisor Earnings"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Plot base rate / sqft
                        </div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatCurrencyShort(plotBaseRatePerSqft)}/sqft
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                          Plot Size
                        </div>
                        <div className="font-bold text-right text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {plotSize.toLocaleString("en-IN")} sqft
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Base Price (Total)
                        </div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatCurrency(finance.baseTotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                          {soldByAdmin ? "Admin (plot base) / sqft" : "Advisor selling price / sqft"}
                        </div>
                        <div className="font-bold text-right text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatCurrencyShort(assignedFaceRatePerSqft)}/sqft
                        </div>
                        {advisorRateInvalid ? (
                          <div className="text-[10px] font-bold text-red-550 text-right mt-0.5">
                            Below plot admin rate
                          </div>
                        ) : null}
                      </div>

                      <div className="col-span-2 border-t border-zinc-250/20 pt-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Selling Price (Total)
                        </div>
                        <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5 font-mono">
                          {formatCurrency(finance.sellingPrice)}
                        </div>
                      </div>

                      {!soldByAdmin && (
                        <>
                          <div className="col-span-2 grid grid-cols-2 gap-3.5 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 rounded-xl p-3 mt-1 shadow-inner">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                Total Profit
                              </div>
                              <div className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                                {formatCurrency(finance.profit)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                Advisor Earned (Received)
                              </div>
                              <div className="text-sm font-black text-emerald-750 dark:text-emerald-300 font-mono mt-0.5">
                                {formatCurrency(finance.advisorEarned)}
                              </div>
                              <div className="text-[9px] text-emerald-600 dark:text-emerald-500 font-semibold mt-0.5">
                                Remaining: {formatCurrency(finance.remainingPotential)}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800 mt-2">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-550 mb-1.5">
                        <span>
                          Received: ₹{receivedNow.toLocaleString("en-IN")}
                        </span>
                        <span className="font-mono">{Math.round(finance.ratio * 100)}%</span>
                      </div>
                      <div className="overflow-hidden h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(finance.ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 5. EMI PARAMETERS CARD (IF APPLICABLE) */}
                {selectedPhase !== "full_payment" ? (
                  <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-4 sm:p-5 space-y-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/10">
                    <div className="flex items-center gap-2 border-b border-zinc-200/50 pb-2 dark:border-zinc-800">
                      <span className="text-sm">🗓️</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-350">
                        EMI Parameters
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {remaining > 0 && (
                        <FormField
                          control={form.control}
                          name="emi_months"
                          render={({ field }) => (
                            <FormItem className="min-w-0">
                              <FormLabel className="text-xs font-semibold text-zinc-500">EMI Months</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="e.g. 12"
                                  min={1}
                                  max={120}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    field.onChange(v === "" ? undefined : Number(v));
                                  }}
                                />
                              </FormControl>
                              <p className="text-[9px] text-zinc-400 mt-1">Auto EMI</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="monthly_emi"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-xs font-semibold text-zinc-500">Monthly EMI</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="h-9 focus:ring-1 focus:ring-indigo-500/20"
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
                          <FormItem className="min-w-0">
                            <FormLabel className="text-xs font-semibold text-zinc-500">EMI Day (1-31)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const sanitized = raw.replace(/^0+(?=\d)/, "");
                                  field.onChange(
                                    sanitized === "" ? undefined : Number(sanitized)
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
                ) : (
                  <div className="rounded-xl border border-zinc-200/50 bg-zinc-50/20 p-4 text-[10px] font-semibold text-zinc-400 flex items-center gap-2 dark:border-zinc-800 dark:bg-zinc-900/10 shadow-inner">
                    💡 EMI fields are hidden when the sale is recorded as full payment.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
              <Button
                type="submit"
                disabled={loading || advisorRateInvalid || commissionSplitOverflow}
                className={`min-w-[130px] transition-all duration-300 ${
                  loading
                    ? "scale-[1.02] shadow-md"
                    : submitStatus === "success"
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }`}
              >
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {loading ? "Submitting..." : submitStatus === "success" ? "Submitted" : "Confirm Sale"}
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
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{statusText}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>

    {shareModal && (
      <ShareReceiptModal
        open={!!shareModal}
        onOpenChange={(o) => !o && setShareModal(null)}
        saleId={shareModal.saleId}
        customerPhone={shareModal.customerPhone}
        customerName={shareModal.customerName}
      />
    )}
    </>
  );
}