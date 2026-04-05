import { z } from "zod";
import { isValid, parseISO } from "date-fns";

const advisorDistributionEntry = z.object({
  advisor_id: z.string().uuid(),
  amount: z.coerce.number().nonnegative(),
});

export const paymentSchema = z.object({
  sale_id: z.string().uuid("Invalid sale selected"),
  customer_id: z.string().uuid("Invalid customer selected"),
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_date: z
    .string()
    .min(1, "Payment date is required")
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date")
    .refine((v) => {
      const d = parseISO(v);
      return isValid(d);
    }, "Invalid date"),
  payment_mode: z.enum(["cash", "cheque", "online", "other"]),
  slip_number: z.string().optional().default(""),
  receipt_path: z.string().optional().default(""),
  is_confirmed: z.boolean().default(false),
  notes: z.string().optional().default(""),
  advisor_distribution: z.array(advisorDistributionEntry).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
