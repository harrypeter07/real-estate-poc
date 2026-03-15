import { z } from "zod";

export const projectSchema = z.object({
	name: z.string().min(2, "Project name must be at least 2 characters"),
	location: z.string().min(1, "Location is required"),
	total_plots_count: z
		.number()
		.int("Must be a whole number")
		.positive("Must be greater than 0"),
	layout_expense: z.number().min(0, "Cannot be negative"),
	description: z.string(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
