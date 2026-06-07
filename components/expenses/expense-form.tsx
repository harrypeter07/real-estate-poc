"use client";

import { useState } from "react";
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
} from "@/components/ui";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { isDev } from "@/lib/is-dev";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import { ReceiptUpload } from "@/components/shared/receipt-upload";

export function ExpenseForm({
  projects = [],
  mode = "create",
  initialData = null,
}: {
  projects?: Array<{ id: string; name: string }>;
  mode?: "create" | "edit";
  initialData?: any | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  const [draftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      description: initialData?.description ?? "",
      amount: initialData?.amount ?? (undefined as any),
      paid_amount: initialData?.paid_amount ?? (undefined as any),
      expense_date: initialData?.expense_date ?? new Date().toISOString().split('T')[0],
      payment_type: initialData?.payment_type ?? "cash",
      category: initialData?.category ?? "misc",
      project_id: initialData?.project_id ?? null,
      receipt_note: initialData?.receipt_note ?? "",
      receipt_path: initialData?.receipt_path ?? "",
    },
  });

  const fillMockData = () => {
    const descriptions = [
      "Office tea and snacks",
      "Nagpur Metro advertising",
      "Wardha Road site visit fuel",
      "Office electricity bill",
      "Printing of project brochures",
      "Cleaning staff salary",
    ];
    const categories: any[] = ["office", "marketing", "travel", "utilities", "maintenance", "salary"];
    const randomProject = projects.length
      ? projects[Math.floor(Math.random() * projects.length)]
      : null;
    const randomIndex = Math.floor(Math.random() * descriptions.length);
    const amount = Math.floor(Math.random() * 5000) + 200;

    form.reset({
      description: descriptions[randomIndex],
      amount,
      paid_amount: amount,
      expense_date: new Date().toISOString().split('T')[0],
      payment_type: "cash",
      category: categories[randomIndex],
      project_id: randomProject?.id ?? null,
      receipt_note: `Receipt #${Math.floor(Math.random() * 10000)}`,
      receipt_path: "",
    });
  };

  const playSubmitTone = (kind: "success" | "error") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 740 : 220;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "success" ? 0.2 : 0.15));
      osc.start(now);
      osc.stop(now + (kind === "success" ? 0.22 : 0.17));
      setTimeout(() => void ctx.close(), 300);
    } catch {}
  };

  async function onSubmit(values: ExpenseFormValues) {
    setLoading(true);
    setSubmitStatus("idle");
    setStatusText("");
    try {
      const result =
        mode === "edit" && initialData?.id
          ? await updateExpense(initialData.id, values)
          : await createExpense(values);
      if (!result.success) {
        let errMsg = result.error ?? "Failed to record expense";
        if (errMsg.toLowerCase().includes("numeric field overflow")) {
          errMsg = "Amount is too large. Please enter a valid amount.";
        }
        toast.error("Error", { description: errMsg });
        setSubmitStatus("error");
        setStatusText(errMsg);
        playSubmitTone("error");
        return;
      }

      toast.success(mode === "edit" ? "Expense updated successfully" : "Expense recorded successfully");
      setSubmitStatus("success");
      setStatusText(mode === "edit" ? "Expense updated successfully." : "Expense recorded successfully.");
      playSubmitTone("success");
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      toast.error("Something went wrong");
      setSubmitStatus("error");
      setStatusText("Something went wrong while saving expense.");
      playSubmitTone("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl w-full border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-md rounded-2xl overflow-hidden transition-all duration-300">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {isDev && (
          <div className="flex justify-end border-b border-zinc-100 dark:border-zinc-800/60 pb-3 mb-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-[10px] font-black rounded-lg border-teal-200/60 hover:bg-teal-50 hover:text-teal-600 dark:border-teal-900/60 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 transition-all duration-300 flex items-center gap-1 shadow-sm active:scale-95"
              onClick={fillMockData}
            >
              🤖 Fill Mock Details
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Description (Full Width) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-450 dark:text-zinc-500 flex items-center gap-1">
                    📝 Description *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What was this expense for?" 
                      className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
                      {...field} 
                      value={field.value ?? ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Paid Amount (2-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      💰 Amount (₹) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-mono font-bold"
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
              <FormField
                control={form.control}
                name="paid_amount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      💳 Paid Amount (₹) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500 font-mono font-bold"
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

            {/* Date and Payment Type (2-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      📅 Date *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
                        {...field} 
                        value={field.value ?? ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      💳 Payment Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus:ring-teal-500/20 focus:border-teal-500">
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg">
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="online">🌐 Online</SelectItem>
                        <SelectItem value="upi">📱 UPI</SelectItem>
                        <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                        <SelectItem value="cheque">✍️ Cheque</SelectItem>
                        <SelectItem value="other">💳 Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category and Project (2-Column Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      🏷️ Category *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus:ring-teal-500/20 focus:border-teal-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg">
                        <SelectItem value="office">🏢 Office / Maintenance</SelectItem>
                        <SelectItem value="marketing">📢 Marketing / Ads</SelectItem>
                        <SelectItem value="travel">🚗 Travel / Site Visits</SelectItem>
                        <SelectItem value="layout_dev">🏗️ Layout Development</SelectItem>
                        <SelectItem value="legal">⚖️ Legal / Registry</SelectItem>
                        <SelectItem value="salary">💼 Staff Salary</SelectItem>
                        <SelectItem value="utilities">⚡ Utilities</SelectItem>
                        <SelectItem value="maintenance">🧹 Maintenance</SelectItem>
                        <SelectItem value="misc">📦 Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-455 dark:text-zinc-500 flex items-center gap-1">
                      🏗️ Linked Project
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-950 border-zinc-200/85 dark:border-zinc-800 transition-all duration-350 focus:ring-teal-500/20 focus:border-teal-500">
                          <SelectValue placeholder="Link to a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg">
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            🏗️ {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt details (Outlined Box) */}
            <div className="bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-905 p-4 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-2">
                <span className="text-sm">🧾</span>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Receipt & Billing details
                </h4>
              </div>

              <FormField
                control={form.control}
                name="receipt_note"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-extrabold tracking-wider uppercase text-zinc-450 dark:text-zinc-500 flex items-center gap-1">
                      Ref Note
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Bill number or reference" 
                        className="h-10 bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 rounded-xl transition-all duration-350 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
                        {...field} 
                        value={field.value ?? ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receipt_path"
                render={({ field }) => (
                  <FormItem className="pt-2">
                    <FormControl>
                      <ReceiptUpload
                        folder="expenses"
                        recordId={draftId}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-zinc-100 dark:border-zinc-850">
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 px-6 rounded-xl text-xs font-bold text-zinc-550 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all duration-300"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="h-11 px-6 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 text-white shadow-[0_4px_12px_rgba(13,148,136,0.2)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] min-w-[145px]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Submitting..." : mode === "edit" ? "Update Expense" : "Record Expense"}
              </Button>
            </div>

            {submitStatus !== "idle" && (
              <div className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs animate-in fade-in zoom-in-95 duration-300 ${
                submitStatus === "success"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
              }`}>
                {submitStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{statusText}</span>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
