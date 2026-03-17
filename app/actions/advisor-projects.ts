"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

export type AdvisorProjectAssignment = {
	id: string;
	project_id: string;
	advisor_id: string;
	commission_token: number;
	commission_agreement: number;
	commission_registry: number;
	commission_full_payment: number;
	created_at: string;
	updated_at: string;
	advisor?: {
		id: string;
		name: string;
		code: string;
		phone: string;
	} | null;
};

export async function getAdvisorAssignmentsByProject(
	projectId: string,
): Promise<AdvisorProjectAssignment[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("advisor_project_commissions")
		.select(
			`
      *,
      advisors(id, name, code, phone)
    `,
		)
		.eq("project_id", projectId)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);

	return (
		data?.map((row: any) => ({
			id: row.id,
			project_id: row.project_id,
			advisor_id: row.advisor_id,
			commission_token: Number(row.commission_token ?? 0),
			commission_agreement: Number(row.commission_agreement ?? 0),
			commission_registry: Number(row.commission_registry ?? 0),
			commission_full_payment: Number(row.commission_full_payment ?? 0),
			created_at: row.created_at,
			updated_at: row.updated_at,
			advisor: row.advisors
				? {
						id: row.advisors.id,
						name: row.advisors.name,
						code: row.advisors.code,
						phone: row.advisors.phone,
					}
				: null,
		})) ?? []
	);
}

export async function upsertAdvisorAssignment(
	projectId: string,
	input: {
		advisor_id: string;
		commission_token: number;
		commission_agreement: number;
		commission_registry: number;
		commission_full_payment: number;
	},
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase.from("advisor_project_commissions").upsert(
		{
			project_id: projectId,
			advisor_id: input.advisor_id,
			commission_token: input.commission_token,
			commission_agreement: input.commission_agreement,
			commission_registry: input.commission_registry,
			commission_full_payment: input.commission_full_payment,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "project_id,advisor_id" },
	);

	if (error) return { success: false, error: error.message };

	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

export async function removeAdvisorAssignment(
	projectId: string,
	advisorId: string,
): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase
		.from("advisor_project_commissions")
		.delete()
		.eq("project_id", projectId)
		.eq("advisor_id", advisorId);

	if (error) return { success: false, error: error.message };

	revalidatePath(`/projects/${projectId}`);
	return { success: true };
}

