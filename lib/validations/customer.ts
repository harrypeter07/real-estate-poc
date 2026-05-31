import { z } from "zod";
import { sanitizePhoneNumber } from "@/lib/utils/phone";

export const customerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.preprocess(
    (v) => sanitizePhoneNumber(v as string),
    z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
  ),
  alternate_phone: z.preprocess(
    (v) => (v ? sanitizePhoneNumber(v as string) : ""),
    z
      .string()
      .optional()
      .default("")
      .refine((v) => v === "" || /^\d{10}$/.test(v), {
        message: "Alternate phone must be exactly 10 digits",
      })
  ),
  address: z.string().optional().default(""),
  birth_date: z.string().optional().nullable(),
  advisor_id: z.preprocess(
    (v) => (v === "none" || v === "" ? null : v),
    z.string().uuid("Invalid advisor selected").optional().nullable()
  ),
  route: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  is_active: z.boolean().default(true),
  aadhaar_url: z.string().optional().nullable(),
  pan_url: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  aadhaar_number: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable(),
  kyc_status: z.string().optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
