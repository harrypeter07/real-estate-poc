import { z } from "zod";

export const expenseSchema = z.object({
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  expense_date: z.string().min(1, "Date is required"),
  category: z.enum([
    "office",
    "marketing",
    "travel",
    "layout_dev",
    "legal",
    "salary",
    "utilities",
    "maintenance",
    "misc",
  ]),
  project_id: z.string().uuid("Invalid project selected").optional().nullable(),
  receipt_note: z.string().optional().default(""),
  receipt_path: z.string().optional().default(""),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
