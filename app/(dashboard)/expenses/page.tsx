import Link from "next/link";
import { Plus, Receipt, IndianRupee, TrendingUp, Clock, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getExpenses } from "@/app/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ReceiptViewButton } from "@/components/shared/receipt-view-button";
import { ExpenseRowActions } from "@/components/expenses/expense-row-actions";
import { ExpensesTabs } from "@/components/expenses/expenses-tabs";
import { ResponsiveSelectFilter } from "@/components/expenses/responsive-select-filter";

const CATEGORY_LIST = [
  "all",
  "office",
  "marketing",
  "travel",
  "layout_dev",
  "legal",
  "salary",
  "utilities",
  "maintenance",
  "misc",
] as const;

const paymentTypeLabels: Record<string, string> = {
  cash: "💵 Cash",
  online: "🌐 Online",
  upi: "📱 UPI",
  bank_transfer: "🏦 Bank Transfer",
  cheque: "✍️ Cheque",
  other: "💳 Other",
};

const categoryEmojis: Record<string, string> = {
  office: "🏢",
  marketing: "📢",
  travel: "🚗",
  layout_dev: "🏗️",
  legal: "⚖️",
  salary: "💼",
  utilities: "⚡",
  maintenance: "🧹",
  misc: "📦",
};

export default async function ExpensesPage({
  searchParams,
}: {
	searchParams: Promise<{
		category?: string;
		project?: string;
		group?: string;
		payment_status?: string;
		payment_type?: string;
	}>;
}) {
  const params = await searchParams;
  const expenses = await getExpenses();
  const selectedCategory = params.category ?? "all";
  const selectedProject = params.project ?? "all";
  const groupByProject = params.group === "project";
  const paymentStatus = params.payment_status ?? "all";
  const paymentType = params.payment_type ?? "all";

  const categoryConfig = {
    office: { 
      label: "Office", 
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20",
      dotClass: "bg-blue-500"
    },
    marketing: { 
      label: "Marketing", 
      className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20",
      dotClass: "bg-purple-500"
    },
    travel: { 
      label: "Travel", 
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 hover:bg-orange-500/20",
      dotClass: "bg-orange-500"
    },
    layout_dev: { 
      label: "Development", 
      className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 hover:bg-teal-500/20",
      dotClass: "bg-teal-500"
    },
    legal: { 
      label: "Legal", 
      className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 hover:bg-red-500/20",
      dotClass: "bg-red-500"
    },
    salary: { 
      label: "Salary", 
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
      dotClass: "bg-emerald-500"
    },
    utilities: { 
      label: "Utilities", 
      className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20",
      dotClass: "bg-cyan-500"
    },
    maintenance: { 
      label: "Maintenance", 
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20",
      dotClass: "bg-amber-500"
    },
    misc: { 
      label: "Misc", 
      className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20 hover:bg-zinc-500/20",
      dotClass: "bg-zinc-500"
    },
  };

  const filteredExpenses = expenses.filter((exp: any) => {
    if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
    if (selectedProject !== "all" && exp.project_id !== selectedProject) return false;
    const total = Number(exp.amount ?? 0);
    const paid = Number(exp.paid_amount ?? exp.amount ?? 0);
    const isPartial = paid < total;
    if (paymentStatus === "partial" && !isPartial) return false;
    if (paymentStatus === "full" && isPartial) return false;
    if (paymentType !== "all" && String(exp.payment_type ?? "cash") !== paymentType) return false;
    return true;
  });

  const groupedRows = filteredExpenses.reduce((acc: Record<string, any[]>, row: any) => {
    const key = row.projects?.name ?? "No Project";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const projectOptions = Array.from(
    new Map(
      expenses
        .filter((e: any) => e.projects?.id)
        .map((e: any) => [e.projects.id, { id: e.projects.id, name: e.projects.name }])
    ).values()
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const totalPaid = filteredExpenses.reduce(
    (sum, exp: any) => sum + Number(exp.paid_amount ?? exp.amount ?? 0),
    0
  );
  const totalPending = Math.max(0, totalExpenses - totalPaid);
  const partialCount = filteredExpenses.filter(
    (exp: any) => Number(exp.paid_amount ?? exp.amount ?? 0) < Number(exp.amount ?? 0)
  ).length;

  const phaseBuckets = filteredExpenses.reduce(
    (acc: Record<string, number>, exp: any) => {
      const cat = String(exp.category ?? "misc");
      const phase =
        cat === "layout_dev" || cat === "legal"
          ? "Development Phase"
          : cat === "marketing" || cat === "travel"
          ? "Sales Phase"
          : "Operations Phase";
      acc[phase] = (acc[phase] ?? 0) + Number(exp.amount ?? 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const categoryOptions = CATEGORY_LIST.map((c) => {
    if (c === "all") return { value: "all", label: "📁 All Categories" };
    const config = categoryConfig[c as keyof typeof categoryConfig];
    const emoji = categoryEmojis[c] || "📦";
    return {
      value: c,
      label: `${emoji} ${config?.label || c.replace("_", " ")}`,
    };
  });

  const projectSelectOptions = [
    { value: "all", label: "All Projects" },
    ...projectOptions.map((p: any) => ({
      value: p.id,
      label: `🏢 ${p.name}`,
    })),
  ];

  const paymentStatusOptions = [
    { value: "all", label: "All Payment Statuses" },
    { value: "full", label: "✓ Full" },
    { value: "partial", label: "⌛ Partial" },
  ];

  const paymentTypeOptions = [
    { value: "all", label: "All Payment Types" },
    ...["cash", "online", "upi", "bank_transfer", "cheque", "other"].map((t) => ({
      value: t,
      label: paymentTypeLabels[t] || t.replace("_", " "),
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl">💳</span>
            <span className="font-black tracking-tight text-zinc-800">Expenses & Outflows</span>
          </div>
        }
        subtitle={
          <span className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400 font-medium">Track office, site development, marketing, and salary operations.</span>
            <span className="h-4 w-px bg-zinc-200" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-150">
              {filteredExpenses.length} Records
            </span>
          </span>
        }
        action={
          <Link href="/expenses/new">
            <Button size="sm" className="h-10 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs px-5 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)] active:scale-[0.98] flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        }
      />

      <ExpensesTabs>
        <div className="space-y-6">
          {/* Premium Filter Bar */}
          <Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🔍</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Filter & Analytics Toolbar
                  </h3>
                </div>
                <Link
                  href={`/expenses?category=${selectedCategory}&project=${selectedProject}&group=${groupByProject ? "none" : "project"}&payment_status=${paymentStatus}&payment_type=${paymentType}`}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-300 hover:scale-102 ${
                    groupByProject
                      ? "bg-teal-600 text-white border-teal-600 shadow-[0_3px_12px_rgba(13,148,136,0.3)]"
                      : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-805 dark:text-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  📊 {groupByProject ? "Grouped by Project" : "Group by Project"}
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Category Filter */}
                <div className="flex flex-col gap-1.5">
                  <div className="block md:hidden">
                    <ResponsiveSelectFilter
                      label="Category"
                      emoji="📁"
                      currentValue={selectedCategory}
                      options={categoryOptions}
                      baseUrl="/expenses"
                      paramName="category"
                      otherParams={{
                        project: selectedProject,
                        group: groupByProject ? "project" : "none",
                        payment_status: paymentStatus,
                        payment_type: paymentType,
                      }}
                    />
                  </div>
                  <div className="hidden md:flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-505 flex items-center gap-1">
                      📁 Category
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_LIST.map((c) => {
                        const isActive = selectedCategory === c;
                        return (
                          <Link
                            key={c}
                            href={`/expenses?category=${c}&project=${selectedProject}&group=${groupByProject ? "project" : "none"}&payment_status=${paymentStatus}&payment_type=${paymentType}`}
                            className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 hover:-translate-y-0.5 ${
                              isActive
                                ? "bg-teal-600 text-white border-teal-600 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-semibold"
                                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800/80"
                            }`}
                          >
                            {c === "all" ? "All" : c.replace("_", " ")}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                  {/* Project Filter */}
                  <div className="flex flex-col gap-1.5">
                    <div className="block md:hidden">
                      <ResponsiveSelectFilter
                        label="Project"
                        emoji="🏗️"
                        currentValue={selectedProject}
                        options={projectSelectOptions}
                        baseUrl="/expenses"
                        paramName="project"
                        otherParams={{
                          category: selectedCategory,
                          group: groupByProject ? "project" : "none",
                          payment_status: paymentStatus,
                          payment_type: paymentType,
                        }}
                      />
                    </div>
                    <div className="hidden md:flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        🏗️ Project
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/expenses?category=${selectedCategory}&project=all&group=${groupByProject ? "project" : "none"}&payment_status=${paymentStatus}&payment_type=${paymentType}`}
                          className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                            selectedProject === "all"
                              ? "bg-teal-600 text-white border-teal-600 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-semibold"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800/80"
                          }`}
                        >
                          All
                        </Link>
                        {projectOptions.map((p: any) => {
                          const isActive = selectedProject === p.id;
                          return (
                            <Link
                              key={p.id}
                              href={`/expenses?category=${selectedCategory}&project=${p.id}&group=${groupByProject ? "project" : "none"}&payment_status=${paymentStatus}&payment_type=${paymentType}`}
                              className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                                isActive
                                  ? "bg-teal-600 text-white border-teal-600 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-semibold"
                                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800/80"
                              }`}
                            >
                              {p.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Payment Status Filter */}
                  <div className="flex flex-col gap-1.5">
                    <div className="block md:hidden">
                      <ResponsiveSelectFilter
                        label="Payment Status"
                        emoji="⏳"
                        currentValue={paymentStatus}
                        options={paymentStatusOptions}
                        baseUrl="/expenses"
                        paramName="payment_status"
                        otherParams={{
                          category: selectedCategory,
                          project: selectedProject,
                          group: groupByProject ? "project" : "none",
                          payment_type: paymentType,
                        }}
                      />
                    </div>
                    <div className="hidden md:flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        ⏳ Payment Status
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "All", value: "all" },
                          { label: "Full", value: "full" },
                          { label: "Partial", value: "partial" },
                        ].map((f) => {
                          const isActive = paymentStatus === f.value;
                          return (
                            <Link
                              key={f.value}
                              href={`/expenses?category=${selectedCategory}&project=${selectedProject}&group=${groupByProject ? "project" : "none"}&payment_status=${f.value}&payment_type=${paymentType}`}
                              className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                                isActive
                                  ? "bg-teal-600 text-white border-teal-600 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-semibold"
                                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800/80"
                              }`}
                            >
                              {f.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Payment Type Filter */}
                  <div className="flex flex-col gap-1.5">
                    <div className="block md:hidden">
                      <ResponsiveSelectFilter
                        label="Payment Type"
                        emoji="💳"
                        currentValue={paymentType}
                        options={paymentTypeOptions}
                        baseUrl="/expenses"
                        paramName="payment_type"
                        otherParams={{
                          category: selectedCategory,
                          project: selectedProject,
                          group: groupByProject ? "project" : "none",
                          payment_status: paymentStatus,
                        }}
                      />
                    </div>
                    <div className="hidden md:flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        💳 Payment Type
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["all", "cash", "online", "upi", "bank_transfer", "cheque", "other"].map((t) => {
                          const isActive = paymentType === t;
                          return (
                            <Link
                              key={t}
                              href={`/expenses?category=${selectedCategory}&project=${selectedProject}&group=${groupByProject ? "project" : "none"}&payment_status=${paymentStatus}&payment_type=${t}`}
                              className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                                isActive
                                  ? "bg-teal-600 text-white border-teal-600 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-semibold"
                                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800/80"
                              }`}
                            >
                              {t === "all" ? "All" : t.replace("_", " ")}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <Card className="group bg-gradient-to-br from-zinc-950 to-zinc-900 text-white border-zinc-850 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none overflow-hidden flex flex-col justify-between h-full rounded-2xl relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
              <CardContent className="p-5 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-850 text-zinc-300 border border-zinc-800 shadow-inner transition-transform duration-300 group-hover:scale-105">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate flex-1">
                    Total Outflow
                  </p>
                </div>
                <div className="mt-6 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight leading-tight truncate font-mono">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-white to-emerald-50/[0.08] dark:from-zinc-950 dark:to-emerald-950/[0.03] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full rounded-2xl">
              <CardContent className="p-5 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Total Paid
                  </p>
                </div>
                <div className="mt-6 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 leading-tight truncate font-mono">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-white to-amber-50/[0.08] dark:from-zinc-950 dark:to-amber-950/[0.03] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-200 dark:hover:border-amber-900/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full rounded-2xl">
              <CardContent className="p-5 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <Clock className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Pending
                  </p>
                </div>
                <div className="mt-6 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-amber-700 dark:text-amber-505 leading-tight truncate font-mono">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-white to-blue-50/[0.08] dark:from-zinc-950 dark:to-blue-950/[0.03] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full rounded-2xl">
              <CardContent className="p-5 flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-3.5 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
                    Partial Payments
                  </p>
                </div>
                <div className="mt-6 flex flex-col justify-end">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400 leading-tight truncate font-mono">
                    {partialCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upgraded Insights Card */}
          <Card className="border border-zinc-200/60 dark:border-zinc-800/80 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base leading-none">📊</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Overall Insights (Expenses by Project Phase)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { phase: "Development Phase", emoji: "🏗️", gradient: "from-teal-500/5 to-emerald-500/5 border-teal-500/10 hover:border-teal-500/30" },
                  { phase: "Sales Phase", emoji: "💼", gradient: "from-indigo-500/5 to-purple-500/5 border-indigo-500/10 hover:border-indigo-500/30" },
                  { phase: "Operations Phase", emoji: "⚙️", gradient: "from-amber-500/5 to-orange-500/5 border-amber-500/10 hover:border-amber-500/30" },
                ].map(({ phase, emoji, gradient }) => (
                  <div 
                    key={phase} 
                    className={`rounded-2xl border p-4 bg-gradient-to-br ${gradient} hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-out`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{emoji}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {phase}
                      </span>
                    </div>
                    <div className="text-xl font-black tracking-tight mt-2 text-zinc-900 dark:text-zinc-150 font-mono">
                      {formatCurrency(phaseBuckets[phase] ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Expenses List Layout */}
          {filteredExpenses.length === 0 ? (
            /* Empty State with Centered Receipt Icon & Helper CTAs */
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 sm:p-20 text-center bg-zinc-50/20 dark:bg-zinc-950/10 backdrop-blur-sm transition-all duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/5 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-md mb-6 animate-pulse">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {expenses.length === 0 ? "💳 No expenses recorded yet" : "🔍 No expenses match filter"}
              </h3>
              <p className="text-sm text-zinc-550 dark:text-zinc-400 max-w-sm mt-2 mb-6 leading-relaxed">
                {expenses.length === 0
                  ? "Operational and project expenses will appear here."
                  : "Try widening your category/project filters or clearing search criteria to see details."}
              </p>
              <Link href="/expenses/new">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-[0_4px_12px_rgba(13,148,136,0.2)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.3)] transition-all duration-300 hover:-translate-y-0.5 font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-20 border-b border-zinc-200/60 dark:border-zinc-800/80">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap pl-4 py-3">
                        📅 Date
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap py-3">
                        📝 Description
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap py-3">
                        🏷️ Category
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right py-3">
                        💰 Amount
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right py-3">
                        🧾 Receipt
                      </TableHead>
                      <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-right pr-4 py-3">
                        ⚙️ Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupByProject
                      ? Object.entries(groupedRows).flatMap(([projectName, rows]) => [
                          { __group: true, projectName, total: (rows as any[]).reduce((s, r) => s + Number(r.amount), 0) },
                          ...(rows as any[]),
                        ])
                      : filteredExpenses
                    ).map((expense: any, idx: number) => {
                      if (expense.__group) {
                        return (
                          <TableRow key={`group-${expense.projectName}-${idx}`} className="bg-zinc-50/60 dark:bg-zinc-900/60 border-y border-zinc-200/40 dark:border-zinc-800/40 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                            <TableCell colSpan={6} className="font-extrabold text-zinc-850 dark:text-zinc-200 text-xs py-3 px-4">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span className="text-base">🏗️</span>
                                  <span>Project: {expense.projectName}</span>
                                </span>
                                <span className="font-mono bg-zinc-200/60 dark:bg-zinc-850 px-2 py-0.5 rounded text-[10px] text-zinc-650 dark:text-zinc-300">
                                  Total Group Expense: {formatCurrency(expense.total)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      const cat =
                        categoryConfig[expense.category as keyof typeof categoryConfig] || categoryConfig.misc;
                      return (
                        <TableRow 
                          key={expense.id} 
                          className="group transition-all duration-300 hover:bg-teal-50/30 dark:hover:bg-teal-950/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:-translate-y-[0.5px] border-b border-zinc-200/60 dark:border-zinc-800/80 relative"
                        >
                          <TableCell className="relative pl-4 font-medium whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300 transition-all duration-300 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-teal-500 before:rounded-r before:scale-y-0 group-hover:before:scale-y-100 before:transition-all before:duration-300">
                            {formatDate(expense.expense_date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base leading-none">
                                  {categoryEmojis[expense.category] ?? "📦"}
                                </span>
                                <span className="font-semibold text-zinc-905 dark:text-zinc-100 text-sm tracking-tight hover:text-teal-650 transition-colors">
                                  {expense.description}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/40">
                                  🏢 {expense.projects?.name ?? "No Project"}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/40">
                                  {paymentTypeLabels[expense.payment_type] ?? `💳 ${String(expense.payment_type).replace("_", " ")}`}
                                </span>
                                {expense.receipt_note && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/40 text-zinc-450 dark:text-zinc-500 border border-zinc-200/30 dark:border-zinc-800/30">
                                    Ref: {expense.receipt_note}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider transition-all duration-300 border shadow-sm ${cat.className}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${cat.dotClass}`} />
                              {cat.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end py-1 font-mono">
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 transition-all duration-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:drop-shadow-[0_0_8px_rgba(20,184,166,0.15)]">
                                {formatCurrency(expense.amount)}
                              </span>
                              <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                Number(expense.paid_amount ?? expense.amount ?? 0) >= Number(expense.amount)
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              }`}>
                                {Number(expense.paid_amount ?? expense.amount ?? 0) >= Number(expense.amount) ? (
                                  <>✓ Paid</>
                                ) : (
                                  <>⌛ Paid: {formatCurrency(Number(expense.paid_amount ?? expense.amount ?? 0))}</>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end pr-1">
                              <ReceiptViewButton
                                receiptPath={(expense as any).receipt_path}
                                title="Expense Receipt"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="lg:opacity-40 lg:group-hover:opacity-100 transition-opacity duration-300">
                              <ExpenseRowActions expenseId={expense.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {(groupByProject
                  ? Object.entries(groupedRows).flatMap(([projectName, rows]) => [
                      { __group: true, projectName, total: (rows as any[]).reduce((s, r) => s + Number(r.amount), 0) },
                      ...(rows as any[]),
                    ])
                  : filteredExpenses
                ).map((expense: any, idx: number) => {
                  if (expense.__group) {
                    return (
                      <div key={`mobile-group-${expense.projectName}-${idx}`} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/50 rounded-xl px-4 py-2.5 font-bold text-[11px] text-zinc-700 dark:text-zinc-300 flex justify-between items-center shadow-sm">
                        <span>🏗️ {expense.projectName}</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-150">{formatCurrency(expense.total)}</span>
                      </div>
                    );
                  }
                  const cat =
                    categoryConfig[expense.category as keyof typeof categoryConfig] || categoryConfig.misc;
                  return (
                    <div 
                      key={`mobile-${expense.id}`} 
                      className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3 relative overflow-hidden group"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-teal-500" />
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold text-zinc-405 dark:text-zinc-500">
                            📅 {formatDate(expense.expense_date)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{categoryEmojis[expense.category] ?? "📦"}</span>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
                              {expense.description}
                            </h4>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border shadow-sm ${cat.className}`}
                        >
                          <span className={`h-1 w-1 rounded-full ${cat.dotClass}`} />
                          {cat.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[9px] font-bold border-t border-zinc-100 dark:border-zinc-900/60 pt-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/50">
                          🏢 {expense.projects?.name ?? "No Project"}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/50">
                          {paymentTypeLabels[expense.payment_type] ?? `💳 ${String(expense.payment_type).replace("_", " ")}`}
                        </span>
                        {expense.receipt_note && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900/40 text-zinc-450 dark:text-zinc-500 border border-zinc-200/30 dark:border-zinc-800/30">
                            Ref: {expense.receipt_note}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-100/60 dark:border-zinc-900 mt-1">
                        <div className="flex flex-col font-mono">
                          <span className="font-black text-sm text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(expense.amount)}
                          </span>
                          <span className={`text-[9px] font-bold mt-0.5 ${
                            Number(expense.paid_amount ?? expense.amount ?? 0) >= Number(expense.amount)
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {Number(expense.paid_amount ?? expense.amount ?? 0) >= Number(expense.amount)
                              ? "✓ Paid"
                              : `⌛ Paid: ${formatCurrency(Number(expense.paid_amount ?? expense.amount ?? 0))}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <ReceiptViewButton
                            receiptPath={(expense as any).receipt_path}
                            title="Expense Receipt"
                          />
                          <ExpenseRowActions expenseId={expense.id} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ExpensesTabs>
    </div>
  );
}
