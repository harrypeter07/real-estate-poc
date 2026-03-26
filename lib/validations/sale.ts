import { z } from "zod";

export const saleSchema = z
  .object({
    plot_id: z.string().uuid("Invalid plot selected"),
    customer_id: z.string().uuid("Invalid customer selected"),
    sold_by_admin: z.boolean().default(false),
    advisor_id: z.string().uuid("Invalid advisor selected").optional().nullable(),
    // Project workflow is simplified to only two phases:
    // - token (booking in progress)
    // - full_payment (payment completed / sold)
    sale_phase: z.enum(["token", "full_payment"]),
    token_date: z.string().optional().nullable(),
    agreement_date: z.string().optional().nullable(),
    total_sale_amount: z.coerce.number().positive("Total sale amount must be positive"),
    down_payment: z.coerce.number().min(0).default(0),
    emi_months: z.coerce.number().min(1).max(120).optional().nullable(),
    monthly_emi: z.coerce.number().min(0).optional().nullable(),
    emi_day: z.coerce.number().min(1).max(31).optional().nullable(),
    followup_date: z.string().optional().nullable(),
    notes: z.string().optional().default(""),
  })
  .refine((data) => !data.sold_by_admin || data.advisor_id == null, {
    message: "Admin sale must not have advisor",
    path: ["advisor_id"],
  })
  .refine((data) => data.sold_by_admin || (data.advisor_id && data.advisor_id.length > 0), {
    message: "Advisor is required when not sold by admin",
    path: ["advisor_id"],
  })
  .refine(
    (data) =>
      data.sale_phase === "full_payment" ||
      Number(data.down_payment ?? 0) <= Number(data.total_sale_amount ?? 0),
    {
      message: "Amount cannot be greater than payment amount",
      path: ["down_payment"],
    },
  );

export type SaleFormValues = z.infer<typeof saleSchema>;
