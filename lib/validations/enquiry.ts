import { z } from "zod";

export const ENQUIRY_PLAN_OPTIONS = [
	"Monthly",
	"Quarterly",
	"Half-Yearly",
	"Yearly",
	"PT",
	"Other",
] as const;

export const enquiryStatusSchema = z.enum([
	"new",
	"contacted",
	"follow_up",
	"joined",
	"not_interested",
]);

export const enquiryCustomerSchema = z.object({
	name: z.string().min(2, "Name is required"),
	phone: z
		.string()
		.regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
	alternate_phone: z
		.string()
		.optional()
		.default("")
		.refine((v) => v === "" || /^\d{10}$/.test(v), {
			message: "Alternate phone must be exactly 10 digits",
		}),
	address: z.string().optional().default(""),
	birth_date: z.string().optional().nullable(),
	project_id: z.string().uuid("Invalid project").optional().nullable(),
	category: z.string().min(2, "Category is required"),
	details: z.string().optional().default(""),
	is_active: z.boolean().optional().default(true),
	follow_up_date: z.string().optional().nullable(),
	interested_plan: z.string().optional().nullable(),
	enquiry_status: enquiryStatusSchema.optional().default("new"),
});

export type EnquiryCustomerFormValues = z.infer<typeof enquiryCustomerSchema>;

