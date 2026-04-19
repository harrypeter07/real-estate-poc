import { z } from "zod";

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
	// City / Location input (stored in `enquiry_customers.address`)
	address: z.string().optional().default(""),
	email_id: z.string().email("Invalid email").optional().nullable(),
	birth_date: z.string().optional().nullable(),
	project_id: z.string().uuid("Invalid project").optional().nullable(),
	category: z.string().min(2, "Category is required"),
	property_type: z.string().optional().nullable(),
	segment: z.string().optional().nullable(),
	budget_min: z.coerce.number().optional().nullable(),
	budget_max: z.coerce.number().optional().nullable(),
	preferred_location: z.string().optional().nullable(),
	bhk_size_requirement: z.string().optional().nullable(),
	assigned_advisor_id: z.string().uuid("Invalid advisor").optional().nullable(),
	details: z.string().optional().default(""),
	is_active: z.boolean().optional().default(true),
	follow_up_date: z.string().optional().nullable(),
	enquiry_status: enquiryStatusSchema.optional().default("new"),
}).superRefine((val, ctx) => {
	const min = val.budget_min;
	const max = val.budget_max;
	if (min != null && max != null && Number(max) < Number(min)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["budget_max"],
			message: "Budget max cannot be less than budget min",
		});
	}
});

export type EnquiryCustomerFormValues = z.infer<typeof enquiryCustomerSchema>;

