import Link from "next/link";
import { Plus, Receipt, IndianRupee } from "lucide-react";
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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; project?: string; group?: string }>;
}) {
  const params = await searchParams;
  const expenses = await getExpenses();
  const selectedCategory = params.category ?? "all";
  const selectedProject = params.project ?? "all";
  const groupByProject = params.group === "project";

  const categoryConfig = {
    office: { label: "Office", className: "bg-zinc-100 text-zinc-800" },
    marketing: { label: "Marketing", className: "bg-blue-100 text-blue-800" },
    travel: { label: "Travel", className: "bg-orange-100 text-orange-800" },
    layout_dev: { label: "Development", className: "bg-purple-100 text-purple-800" },
    legal: { label: "Legal", className: "bg-red-100 text-red-800" },
    salary: { label: "Salary", className: "bg-green-100 text-green-800" },
    utilities: { label: "Utilities", className: "bg-cyan-100 text-cyan-800" },
    maintenance: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800" },
    misc: { label: "Misc", className: "bg-slate-100 text-zinc-800" },
  };

  const filteredExpenses = expenses.filter((exp: any) => {
    if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
    if (selectedProject !== "all" && exp.project_id !== selectedProject) return false;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${filteredExpenses.length} records found`}
        action={
          <Link href="/expenses/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Outflow</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold uppercase text-zinc-500 mr-1">Category:</span>
          {CATEGORY_LIST.map((c) => (
            <Link
              key={c}
              href={`/expenses?category=${c}&project=${selectedProject}&group=${groupByProject ? "project" : "none"}`}
              className={`text-xs px-2.5 py-1 rounded border ${
                selectedCategory === c
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200"
              }`}
            >
              {c === "all" ? "All" : c.replace("_", " ")}
            </Link>
          ))}

          <span className="text-xs font-semibold uppercase text-zinc-500 ml-2">Project:</span>
          <Link
            href={`/expenses?category=${selectedCategory}&project=all&group=${groupByProject ? "project" : "none"}`}
            className={`text-xs px-2.5 py-1 rounded border ${
              selectedProject === "all"
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200"
            }`}
          >
            All
          </Link>
          {projectOptions.map((p: any) => (
            <Link
              key={p.id}
              href={`/expenses?category=${selectedCategory}&project=${p.id}&group=${groupByProject ? "project" : "none"}`}
              className={`text-xs px-2.5 py-1 rounded border ${
                selectedProject === p.id
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200"
              }`}
            >
              {p.name}
            </Link>
          ))}
          <Link
            href={`/expenses?category=${selectedCategory}&project=${selectedProject}&group=${groupByProject ? "none" : "project"}`}
            className={`ml-auto text-xs px-2.5 py-1 rounded border ${
              groupByProject
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200"
            }`}
          >
            {groupByProject ? "Grouped by Project" : "Group by Project"}
          </Link>
        </CardContent>
      </Card>

      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <Receipt className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">
            {expenses.length === 0 ? "No expenses recorded" : "No expenses match filter"}
          </h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            {expenses.length === 0
              ? "Start tracking your office and site expenses"
              : "Try changing category/project filters"}
          </p>
          <Link href="/expenses/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </Link>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
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
                      <TableRow key={`group-${expense.projectName}-${idx}`} className="bg-zinc-50">
                        <TableCell colSpan={5} className="font-semibold text-zinc-700">
                          {expense.projectName} — {formatCurrency(expense.total)}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const cat =
                    categoryConfig[expense.category as keyof typeof categoryConfig] || categoryConfig.misc;
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{expense.description}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">
                            {expense.projects?.name ? `Project: ${expense.projects.name}` : "Project: None"}
                          </span>
                          {expense.receipt_note && (
                            <span className="text-[10px] text-zinc-400 uppercase">
                              Ref: {expense.receipt_note}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${cat.className} text-[10px] uppercase font-bold`}
                        >
                          {cat.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ReceiptViewButton
                            receiptPath={(expense as any).receipt_path}
                            title="Expense Receipt"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
