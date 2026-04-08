import { z } from "zod";

export const plotSchema = z.object({
  plot_number: z.string().min(1, "Plot number is required"),
  size_sqft: z
    .number()
    .positive("Size must be greater than 0"),
  rate_per_sqft: z
    .number()
    .positive("Rate must be greater than 0"),
  facing: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type PlotFormValues = z.infer<typeof plotSchema>;

/** For edit flows: allow changing only one field (e.g. only size or only rate). */
export const plotUpdateSchema = z.object({
  plot_number: z.string().min(1, "Plot number is required"),
  size_sqft: z.number().positive("Size must be greater than 0").optional(),
  rate_per_sqft: z.number().positive("Rate must be greater than 0").optional(),
  facing: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type PlotUpdateFormValues = z.infer<typeof plotUpdateSchema>;

export const plotBulkUpdateSchema = z.object({
  size_sqft: z.number().positive("Size must be greater than 0").optional(),
  rate_per_sqft: z.number().positive("Rate must be greater than 0").optional(),
  facing: z.string().optional(),
  notes: z.string().optional(),
});

export type PlotBulkUpdateValues = z.infer<typeof plotBulkUpdateSchema>;

export const bulkPlotSchema = z.object({
  from_number: z.number().int().positive("Must be greater than 0"),
  to_number: z.number().int().positive("Must be greater than 0"),
  prefix: z.string().optional().default("LT NO-"),
  size_sqft: z.number().positive("Size must be greater than 0"),
  rate_per_sqft: z.number().positive("Rate must be greater than 0"),
  facing: z.string().optional().default(""),
}).refine((data) => data.to_number >= data.from_number, {
  message: "To number must be >= From number",
  path: ["to_number"],
});

export type BulkPlotFormValues = z.infer<typeof bulkPlotSchema>;
