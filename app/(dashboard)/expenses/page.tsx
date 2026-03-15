import Link from "next/link";
import { Plus, Receipt, IndianRupee, Tag, Calendar } from "lucide-react";
import { Button, Card, CardContent, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getExpenses } from "@/app/actions/expenses";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  const categoryConfig = {
    office: { label: "Office", className: "bg-zinc-100 text-zinc-800" },
    marketing: { label: "Marketing", className: "bg-blue-100 text-blue-800" },
    travel: { label: "Travel", className: "bg-orange-100 text-orange-800" },
    layout_dev: { label: "Development", className: "bg-purple-100 text-purple-800" },
    legal: { label: "Legal", className: "bg-red-100 text-red-800" },
    salary: { label: "Salary", className: "bg-green-100 text-green-800" },
    misc: { label: "Misc", className: "bg-slate-100 text-zinc-800" },
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} records found`}
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

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <Receipt className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold">No expenses recorded</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            Start tracking your office and site expenses
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const cat = categoryConfig[expense.category as keyof typeof categoryConfig] || categoryConfig.misc;
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{expense.description}</span>
                          {expense.receipt_note && (
                            <span className="text-[10px] text-zinc-400 uppercase">Ref: {expense.receipt_note}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${cat.className} text-[10px] uppercase font-bold`}>
                          {cat.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(expense.amount)}
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
