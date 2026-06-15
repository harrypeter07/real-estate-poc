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
    commission_token?: number;
    commission_agreement?: number;
    commission_registry?: number;
    commission_full_payment?: number;
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
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [splitWithChild, setSplitWithChild] = useState(false);
  const [selectedChildAdvisorIds, setSelectedChildAdvisorIds] = useState<string[]>([]);
  const [subComboKey, setSubComboKey] = useState(0);
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
      split_with_parent: true,
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
  const splitWithParent = form.watch("split_with_parent") ?? true;
  const advisorSellingOverride = form.watch("advisor_selling_price_per_sqft");
  const selectedPhase = form.watch("sale_phase");
  const totalSaleAmount = Number(form.watch("total_sale_amount") ?? 0);
  const downPayment = Number(form.watch("down_payment") ?? 0);
  const isDownPaymentFull =
    totalSaleAmount > 0 && downPayment >= totalSaleAmount;
  const emiMonths = Number(form.watch("emi_months") || 0);
  const remaining = totalSaleAmount > 0 ? totalSaleAmount - downPayment : 0;
  const phaseDateFieldName = selectedPhase === "token" ? "token_date" : "agreement_date";
  const phaseDateLabel =
    selectedPhase === "token" ? "Token Date" : "Full Payment Date";

  const selectedAdvisor = useMemo(() => {
    if (!selectedAdvisorId) return null;
    return (advisors as any[]).find((a) => a.id === selectedAdvisorId) ?? null;
  }, [advisors, selectedAdvisorId]);

  const hasParentAdvisor = Boolean(selectedAdvisor?.parent_advisor_id);

  const selectedPlot = useMemo(
    () => plots.find((p) => p.id === selectedPlotId) ?? null,
    [plots, selectedPlotId]
  );

  const plotTypeLabel = useMemo(() => {
    if (!selectedPlot?.type) return "plot";
    const t = String(selectedPlot.type).trim().toLowerCase();
    return t;
  }, [selectedPlot]);

  const plotTypeLabelCap = useMemo(() => {
    if (!selectedPlot?.type) return "Plot";
    const t = String(selectedPlot.type).trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }, [selectedPlot]);

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
    return set;
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
    if (allowedAdvisorIdsForProject === null) {
      return advisors;
    }
    return (advisors as any[]).filter((a) => allowedAdvisorIdsForProject.has(a.id));
  }, [advisors, allowedAdvisorIdsForProject]);

  useEffect(() => {
    console.log("[SaleForm] Raw advisors from props:", advisors);
  }, [advisors]);

  // Pre-populate emi_months from selected plot's project defaults
  useEffect(() => {
    if (selectedPlot) {
      const projEmiMonths = (selectedPlot as any).projects?.emi_months;
      if (projEmiMonths !== undefined && projEmiMonths !== null && projEmiMonths > 0) {
        form.setValue("emi_months", projEmiMonths);
      } else {
        form.setValue("emi_months", null);
      }
    }
  }, [selectedPlot, form]);

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

  useEffect(() => {
    if (!selectedAdvisorId || soldByAdmin) {
      setSubOptions([]);
      setSubAdvisorIds([]);
      setSplitByAdvisor({});
      setSplitWithChild(false);
      setSelectedChildAdvisorIds([]);
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

  // Reset custom amounts when advisor, project, or phase changes
  useEffect(() => {
    setCustomAmounts({});
  }, [selectedAdvisorId, selectedProjectId, selectedPhase]);

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
    } else {
      form.setValue("monthly_emi", 0);
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
    const advisor = (advisors as any[]).find((a) => a.id === selectedAdvisorId);
    let assignment = (advisorAssignments ?? []).find(
      (a) => a.advisor_id === selectedAdvisorId && a.project_id === selectedProjectId
    );
    if (!assignment && advisor?.parent_advisor_id) {
      assignment = (advisorAssignments ?? []).find(
        (a) => a.advisor_id === advisor.parent_advisor_id && a.project_id === selectedProjectId
      );
    }
    return assignment ?? null;
  }, [advisorAssignments, selectedAdvisorId, selectedProjectId, advisors]);

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
    const mainAdvisor = (advisors as any[]).find((a) => a.id === selectedAdvisorId);
    if (!mainAdvisor) return [];

    // Fetch project assignment using the memo (which includes fallback logic)
    const assignment = advisorAssignment;

    // Get main advisor rate from project assignment or fall back to profile default, then to 5%
    let mainRate = 0;
    if (assignment) {
      mainRate = Number(
        selectedPhase === "token"
          ? (assignment as any).commission_token
          : (assignment as any).commission_full_payment
      );
    }
    if (!mainRate) {
      mainRate = Number(selectedPhase === "token" ? mainAdvisor.commission_token : mainAdvisor.commission_full_payment);
    }
    if (!mainRate) {
      const parentAdvisorId = mainAdvisor.parent_advisor_id;
      if (parentAdvisorId) {
        const parentAdvisor = (advisors as any[]).find((a) => a.id === parentAdvisorId);
        if (parentAdvisor) {
          mainRate = Number(selectedPhase === "token" ? parentAdvisor.commission_token : parentAdvisor.commission_full_payment);
        }
      }
    }
    if (!mainRate) {
      mainRate = 5.0; // default 5%
    }

    // Get sub-advisor rate from project assignment or fall back to 1%
    let subRate = assignment ? Number((assignment as any).sub_advisor_commission_rate ?? 0) : 0;
    if (!subRate) {
      subRate = 1.0; // default 1%
    }

    const profit = finance.profit;

    // Check if we are splitting with parent advisor
    if (hasParentAdvisor && splitWithParent) {
      // Selected advisor is the sub-advisor (gets subRate)
      // Parent advisor is the advisor (gets mainRate - subRate)
      const parentAdvisor = (advisors as any[]).find((a) => a.id === mainAdvisor.parent_advisor_id);
      
      const subAmount = (subRate / 100) * profit;
      const mainAmount = (Math.max(0, mainRate - subRate) / 100) * profit;

      const customSub = customAmounts[mainAdvisor.id];
      const subFinalAmount = customSub !== undefined && customSub !== "" ? Number(customSub) : subAmount;

      const customParent = parentAdvisor ? customAmounts[parentAdvisor.id] : undefined;
      const parentFinalAmount = customParent !== undefined && customParent !== "" ? Number(customParent) : mainAmount;

      splits.push({
        advisor_id: mainAdvisor.id,
        name: mainAdvisor.name,
        code: mainAdvisor.code,
        commission_percentage: totalSaleAmount > 0 ? (subFinalAmount / totalSaleAmount) * 100 : 0,
        amount: Math.round(subFinalAmount * 100) / 100,
        level: 0, // sub-advisor
      });

      if (parentAdvisor) {
        splits.push({
          advisor_id: parentAdvisor.id,
          name: parentAdvisor.name,
          code: parentAdvisor.code,
          commission_percentage: totalSaleAmount > 0 ? (parentFinalAmount / totalSaleAmount) * 100 : 0,
          amount: Math.round(parentFinalAmount * 100) / 100,
          level: 1, // parent advisor
        });
      }
    }
    // Check if we are splitting with child advisor
    else if (splitWithChild && selectedChildAdvisorIds.length > 0) {
      // Selected advisor is the advisor (gets mainRate - subRate * count)
      // Selected child advisors are the sub-advisors (each gets subRate)
      const childAdvisors = selectedChildAdvisorIds
        .map((id) => (advisors as any[]).find((a) => a.id === id))
        .filter(Boolean);

      const childCount = childAdvisors.length;
      const mainAmount = (Math.max(0, mainRate - subRate * childCount) / 100) * profit;
      const subAmount = (subRate / 100) * profit;

      const customMain = customAmounts[mainAdvisor.id];
      const mainFinalAmount = customMain !== undefined && customMain !== "" ? Number(customMain) : mainAmount;

      splits.push({
        advisor_id: mainAdvisor.id,
        name: mainAdvisor.name,
        code: mainAdvisor.code,
        commission_percentage: totalSaleAmount > 0 ? (mainFinalAmount / totalSaleAmount) * 100 : 0,
        amount: Math.round(mainFinalAmount * 100) / 100,
        level: 0, // advisor
      });

      childAdvisors.forEach((childAdvisor) => {
        const customChild = customAmounts[childAdvisor.id];
        const childFinalAmount =
          customChild !== undefined && customChild !== "" ? Number(customChild) : subAmount;

        splits.push({
          advisor_id: childAdvisor.id,
          name: childAdvisor.name,
          code: childAdvisor.code,
          commission_percentage: totalSaleAmount > 0 ? (childFinalAmount / totalSaleAmount) * 100 : 0,
          amount: Math.round(childFinalAmount * 100) / 100,
          level: 1, // sub-advisor
        });
      });
    }
    // Standalone
    else {
      const mainAmount = profit;
      const customMain = customAmounts[mainAdvisor.id];
      const mainFinalAmount = customMain !== undefined && customMain !== "" ? Number(customMain) : mainAmount;

      splits.push({
        advisor_id: mainAdvisor.id,
        name: mainAdvisor.name,
        code: mainAdvisor.code,
        commission_percentage: totalSaleAmount > 0 ? (mainFinalAmount / totalSaleAmount) * 100 : 0,
        amount: Math.round(mainFinalAmount * 100) / 100,
        level: 0, // standalone advisor
      });
    }

    return splits;
  }, [
    selectedAdvisorId,
    totalSaleAmount,
    selectedPhase,
    advisors,
    advisorAssignments,
    selectedProjectId,
    soldByAdmin,
    finance.profit,
    splitWithParent,
    splitWithChild,
    selectedChildAdvisorIds,
    customAmounts,
    hasParentAdvisor,
  ]);

  const commissionSplitTotal = calculatedSplits.reduce((sum, r) => sum + r.amount, 0);
  const commissionSplitOverflow = commissionSplitTotal > finance.profit + 0.01;

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
      if (calculatedSplits.length > 0) {
        commission_splits = calculatedSplits.map((row) => ({
          advisor_id: row.advisor_id,
          commission_percentage: row.commission_percentage,
          amount: row.amount,
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
          <CardDescription className="text-[11px] text-zinc-500">Record a new {plotTypeLabel} transaction</CardDescription>
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
              <span>{plotTypeLabelCap} #{selectedPlot.plot_number}</span>
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
                        <FormLabel className="text-xs font-semibold text-zinc-500">Select {plotTypeLabelCap} *</FormLabel>
                        <Select 
                          onValueChange={(v) => {
                            field.onChange(v);
                            markTouched("plot_id");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger onBlur={() => markTouched("plot_id")} className="h-9 focus:ring-1 focus:ring-indigo-500/20">
                              <SelectValue placeholder={`Choose an available ${plotTypeLabel}`} />
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
                  <>
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

                    {selectedAdvisorId && hasParentAdvisor && (
                      <FormField
                        control={form.control}
                        name="split_with_parent"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs transition-all hover:shadow-sm">
                            <div className="space-y-0.5 pr-4">
                              <FormLabel className="text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer select-none">
                                Split commission with parent advisor?
                              </FormLabel>
                              <p className="text-[10px] text-zinc-455 dark:text-zinc-500 font-semibold leading-normal">
                                If enabled, the parent chain gets commission overrides. If disabled, sub-advisor acts as a standalone advisor.
                              </p>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="h-4.5 w-4.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650 shrink-0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedAdvisorId && subOptions.length > 0 && (
                      <div className="space-y-3 p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs transition-all hover:shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 pr-4">
                            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer select-none">
                              Split commission with sub-advisor?
                            </label>
                            <p className="text-[10px] text-zinc-455 dark:text-zinc-500 font-semibold leading-normal">
                              If enabled, select a sub-advisor to share commission.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={splitWithChild}
                            onChange={(e) => {
                              setSplitWithChild(e.target.checked);
                              if (!e.target.checked) setSelectedChildAdvisorIds([]);
                            }}
                            className="h-4.5 w-4.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650 shrink-0"
                          />
                        </div>
                        
                        {splitWithChild && (
                          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-850 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Select Sub-Advisors
                              </label>
                              {subOptions.length > 1 && (
                                <button
                                  type="button"
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                                  onClick={() => {
                                    if (selectedChildAdvisorIds.length === subOptions.length) {
                                      setSelectedChildAdvisorIds([]);
                                    } else {
                                      setSelectedChildAdvisorIds(subOptions.map((s) => s.id));
                                    }
                                  }}
                                >
                                  {selectedChildAdvisorIds.length === subOptions.length
                                    ? "Deselect All"
                                    : "Select All"}
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2 pt-1">
                              {subOptions.map((sub) => {
                                const isChecked = selectedChildAdvisorIds.includes(sub.id);
                                return (
                                  <label
                                    key={sub.id}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-all duration-200 ${
                                      isChecked
                                        ? "border-indigo-200 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10"
                                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-zinc-700 dark:text-zinc-250">
                                        {sub.name}
                                      </span>
                                      <span className="text-[9px] text-zinc-400 font-mono">
                                        Code: {sub.code}
                                      </span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedChildAdvisorIds((prev) => [...prev, sub.id]);
                                        } else {
                                          setSelectedChildAdvisorIds((prev) =>
                                            prev.filter((id) => id !== sub.id)
                                          );
                                        }
                                      }}
                                      className="h-4.5 w-4.5 rounded border-zinc-300 text-indigo-650 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!soldByAdmin && selectedAdvisorId && calculatedSplits.length > 0 ? (
                  <div className="p-3.5 space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10 shadow-sm">
                    <div className="text-xs font-black text-amber-900 dark:text-amber-400 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                        Automatic Hierarchical Commission Splits
                      </div>
                      {Object.keys(customAmounts).length > 0 && (
                        <button
                          type="button"
                          className="text-[9px] font-bold text-amber-700 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300 underline"
                          onClick={() => setCustomAmounts({})}
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                      Commission is split up the advisor parent chain. Rates are determined by advisor profile and project commission rates.
                    </p>
                    <div className="space-y-2 pt-1 border-t border-amber-200/40">
                      {calculatedSplits.map((row) => {
                        const profitPct = finance.profit > 0 ? (row.amount / finance.profit) * 100 : 0;
                        return (
                          <div key={row.advisor_id} className="flex justify-between items-center text-xs gap-4 py-1.5 border-b border-amber-200/20 last:border-0">
                            <div className="flex flex-col flex-1">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                               {row.name} {row.level === 0 ? (splitWithParent && hasParentAdvisor ? "(Sub-advisor)" : "(Advisor)") : (splitWithParent && hasParentAdvisor ? "(Advisor)" : "(Sub-advisor)")}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-mono">
                                Code: {row.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative flex items-center">
                                <span className="absolute left-1.5 text-[10px] text-zinc-450 pointer-events-none">₹</span>
                                <input
                                  type="text"
                                  className="w-24 h-7 text-right pr-2 pl-4 text-xs font-mono rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                                  value={customAmounts[row.advisor_id] !== undefined ? customAmounts[row.advisor_id] : Math.round(row.amount).toString()}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow only digits, single decimal point
                                    if (/^\d*\.?\d*$/.test(val)) {
                                      setCustomAmounts((prev) => ({
                                        ...prev,
                                        [row.advisor_id]: val,
                                      }));
                                    }
                                  }}
                                />
                              </div>
                              <span className="w-24 text-right font-mono font-bold text-zinc-850 dark:text-zinc-150 bg-amber-100/40 dark:bg-amber-950/20 px-2 py-1 rounded shadow-3xs" title={`${Number(row.commission_percentage.toFixed(3))}% of sale`}>
                                {Number(profitPct.toFixed(1))}% of profit
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {commissionSplitOverflow && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/30 text-red-650 dark:text-red-400 text-[10px] font-bold mt-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>Commissions exceed profit ({formatCurrency(finance.profit)})</span>
                      </div>
                    )}
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
                              field.onChange(sanitized === "" ? "" : Number(sanitized));
                            }}
                          />
                        </FormControl>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Prefills from Manage on this project; edit for this {plotTypeLabel} only if needed.
                        </p>
                        {advisorRateInvalid ? (
                          <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
                            ⚠️ Price is less than {plotTypeLabel} admin rate ({formatCurrencyShort(plotBaseRatePerSqft)}/sqft).
                          </p>
                        ) : null}
                        {plotBaseRatePerSqft > 0 &&
                        Number(field.value ?? 0) > 0 &&
                        !advisorRateInvalid ? (
                          <p className="text-[10px] text-zinc-655 mt-1 bg-zinc-100/60 dark:bg-zinc-800/40 rounded px-2 py-1 flex flex-wrap justify-between font-medium">
                            <span>Share: {formatCurrencyShort(Number(field.value ?? 0) - plotBaseRatePerSqft)}/sqft</span>
                            <span>Commission: {Number(((Math.max(0, Number(field.value ?? 0) - plotBaseRatePerSqft) / Number(field.value ?? 1)) * 100).toFixed(3))}%</span>
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
                                field.onChange(sanitized === "" ? "" : Number(sanitized));
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
                                field.onChange(sanitized === "" ? "" : Number(sanitized));
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
                          {plotTypeLabelCap} base rate / sqft
                        </div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatCurrencyShort(plotBaseRatePerSqft)}/sqft
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                          {plotTypeLabelCap} Size
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
                          {soldByAdmin ? `Admin (${plotTypeLabel} base) / sqft` : "Advisor selling price / sqft"}
                        </div>
                        <div className="font-bold text-right text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatCurrencyShort(assignedFaceRatePerSqft)}/sqft
                        </div>
                        {advisorRateInvalid ? (
                          <div className="text-[10px] font-bold text-red-550 text-right mt-0.5">
                            Below {plotTypeLabel} admin rate
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
                          <div className="col-span-2 grid grid-cols-1 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 rounded-xl p-3 mt-1 shadow-inner">
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
                              <FormLabel className="text-xs font-semibold text-zinc-500 whitespace-nowrap">EMI Months</FormLabel>
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
                                    field.onChange(v === "" ? "" : Number(v));
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
                            <FormLabel className="text-xs font-semibold text-zinc-500 whitespace-nowrap">Monthly EMI</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const sanitized = raw.replace(/^0+(?=\d)/, "");
                                  field.onChange(sanitized === "" ? "" : Number(sanitized));
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
                            <FormLabel className="text-xs font-semibold text-zinc-500 whitespace-nowrap">EMI Day (1-31)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="h-9 focus:ring-1 focus:ring-indigo-500/20"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const sanitized = raw.replace(/^0+(?=\d)/, "");
                                  field.onChange(sanitized === "" ? "" : Number(sanitized));
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