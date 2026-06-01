import { z } from "zod";

export const saleSchema = z
  .object({
    plot_id: z.string().uuid("Please select a plot from the list"),
    customer_id: z.string().uuid("Invalid customer selected"),
    sold_by_admin: z.boolean().default(false),
    advisor_id: z.string().uuid("Invalid advisor selected").optional().nullable(),
    split_with_parent: z.boolean().optional().default(true),
    // Project workflow is simplified to only two phases:
    // - token (booking in progress)
    // - full_payment (payment completed / sold)
    sale_phase: z.enum(["token", "full_payment"]),
    token_date: z.string().optional().nullable(),
    agreement_date: z.string().optional().nullable(),
    total_sale_amount: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
      z.number().min(1, "Please select a plot to calculate selling price")
    ),
    down_payment: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
      z.number().min(0, "Down payment cannot be negative")
    ),
    emi_months: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
      z.number().min(1).max(120).optional().nullable()
    ),
    monthly_emi: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
      z.number().min(0).optional().nullable()
    ),
    emi_day: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
      z.number().min(1).max(31).optional().nullable()
    ),
    followup_date: z.string().optional().nullable(),
    notes: z.string().optional().default(""),
    /** Per-sqft price the advisor sells at; optional override of project default from Manage. */
    advisor_selling_price_per_sqft: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        const n = Number(val);
        return Number.isFinite(n) ? n : undefined;
      },
      z.number().min(0).optional(),
    ),
    /** Rupee split of total profit commission across main + sub-advisors (optional; server defaults to main only). */
    commission_splits: z
      .array(
        z.object({
          advisor_id: z.string().uuid(),
          commission_percentage: z.preprocess(
            (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
            z.number().min(0)
          ),
          amount: z.preprocess(
            (val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
            z.number().min(0)
          ),
        }),
      )
      .optional(),
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
    (data) => {
      // Only validate down payment against total if total is actually set
      if (!data.total_sale_amount || data.total_sale_amount <= 0) return true;
      if (data.sale_phase === "full_payment") return true;
      return Number(data.down_payment ?? 0) <= Number(data.total_sale_amount);
    },
    {
      message: "Down payment cannot exceed selling price",
      path: ["down_payment"],
    },
  );

export type SaleFormValues = z.infer<typeof saleSchema>;
