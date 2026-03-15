import { z } from "zod";

export const saleSchema = z.object({
  plot_id: z.string().uuid("Invalid plot selected"),
  customer_id: z.string().uuid("Invalid customer selected"),
  advisor_id: z.string().uuid("Invalid advisor selected"),
  sale_phase: z.enum(["token", "agreement", "registry", "full_payment"]),
  token_date: z.string().optional().nullable(),
  agreement_date: z.string().optional().nullable(),
  total_sale_amount: z.coerce.number().positive("Total sale amount must be positive"),
  down_payment: z.coerce.number().min(0).default(0),
  monthly_emi: z.coerce.number().min(0).optional().nullable(),
  emi_day: z.coerce.number().min(1).max(31).optional().nullable(),
  notes: z.string().optional().default(""),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
