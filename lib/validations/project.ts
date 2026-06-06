import { z } from "zod";

export const projectSchema = z.object({
	project_name: z.string().min(2, "Project name must be at least 2 characters"),
	project_code: z
		.string()
		.regex(/^[a-zA-Z0-9-]*$/, "Code must contain only letters, numbers, and hyphens")
		.optional()
		.or(z.literal("")),
	location: z.string().min(1, "Location is required"),
	google_maps_link: z
		.string()
		.url("Must be a valid URL")
		.or(z.literal(""))
		.optional()
		.default(""),
	project_type: z.enum(["Plot", "Flat", "Row House", "Farm House", "Commercial"], {
		message: "Please select a project type",
	}),
	// Retained for plot auto-generation compatibility
	total_plots_count: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().int("Must be a whole number").nonnegative("Must be 0 or greater").default(0)
	),
	starting_plot_number: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 1 : Number(val)),
		z.number().int().min(1, "Must be at least 1").default(1)
	),
	
	// Pricing
	starting_price: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().nonnegative("Price must be 0 or greater").default(0)
	),
	rate_per_sqft: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().nonnegative("Rate must be 0 or greater").default(0)
	),
	plc_charges: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().nonnegative("PLC charges must be 0 or greater").default(0)
	),
	registration_charges: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().nonnegative("Registration charges must be 0 or greater").default(0)
	),

	// Scheme
	down_payment_amount: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().nonnegative("Down payment must be 0 or greater").default(0)
	),
	emi_months: z.preprocess(
		(val) => (val === "" || val === undefined || val === null ? 0 : Number(val)),
		z.number().int().nonnegative("EMI months must be 0 or greater").default(0)
	),
	emi_type: z.enum(["Fixed", "Flexible", "Step-up", "Balloon"]).default("Fixed"),
	offer_details: z.string().default(""),

	// Status
	status: z.enum(["Upcoming", "Active", "Hold", "Completed", "Sold Out"]).default("Active"),

	// Notes
	description: z.string().default(""),
	amenities: z.string().default(""),
	nearby_locations: z.string().default(""),
	internal_notes: z.string().default(""),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
