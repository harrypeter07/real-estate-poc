import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number is required"),
  alternate_phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  birth_date: z.string().optional().nullable(),
  advisor_id: z.string().uuid("Invalid advisor selected").optional().nullable(),
  route: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  is_active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
