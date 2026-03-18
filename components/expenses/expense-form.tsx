"use client";

import { useState } from "react";
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
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { createExpense } from "@/app/actions/expenses";

export function ExpenseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      category: "misc",
      receipt_note: "",
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
    const categories: any[] = ["office", "marketing", "travel", "office", "marketing", "salary"];
    const randomIndex = Math.floor(Math.random() * descriptions.length);

    form.reset({
      description: descriptions[randomIndex],
      amount: Math.floor(Math.random() * 5000) + 200,
      expense_date: new Date().toISOString().split('T')[0],
      category: categories[randomIndex],
      receipt_note: `Receipt #${Math.floor(Math.random() * 10000)}`,
    });
  };

  async function onSubmit(values: ExpenseFormValues) {
    setLoading(true);
    try {
      const result = await createExpense(values);
      if (!result.success) {
        toast.error("Error", { description: result.error });
        return;
      }

      toast.success("Expense recorded successfully");
      router.push("/expenses");
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
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record office or site related expenses</CardDescription>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Input placeholder="What was this expense for?" {...field} /></FormControl>
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
                      {...field}
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
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="office">Office / Maintenance</SelectItem>
                      <SelectItem value="marketing">Marketing / Ads</SelectItem>
                      <SelectItem value="travel">Travel / Site Visits</SelectItem>
                      <SelectItem value="layout_dev">Layout Development</SelectItem>
                      <SelectItem value="legal">Legal / Registry</SelectItem>
                      <SelectItem value="salary">Staff Salary</SelectItem>
                      <SelectItem value="misc">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receipt_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Note</FormLabel>
                  <FormControl><Input placeholder="Bill number or reference" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Expense
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
