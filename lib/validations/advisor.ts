import { z } from "zod";

export const advisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().optional().default(""),
  birth_date: z.string().optional().nullable(),
  commission_face1: z.coerce.number().min(0).max(100).default(0),
  commission_face2: z.coerce.number().min(0).max(100).default(0),
  commission_face3: z.coerce.number().min(0).max(100).default(0),
  commission_face4: z.coerce.number().min(0).max(100).default(0),
  commission_face5: z.coerce.number().min(0).max(100).default(0),
  commission_face6: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional().default(""),
  is_active: z.boolean().default(true),
});

export type AdvisorFormValues = z.infer<typeof advisorSchema>;
