"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
	projectSchema,
	type ProjectFormValues,
} from "@/lib/validations/project";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export type ActionResponse = {
	success: boolean;
	error?: string;
};

async function recalcLayoutExpenseForProject(supabase: any, projectId: string) {
	const { data: plots } = await supabase
		.from("plots")
		.select("size_sqft, rate_per_sqft")
		.eq("project_id", projectId);
	const total = (plots ?? []).reduce((sum: number, p: any) => {
		const size = Number(p.size_sqft ?? 0);
		const rate = Number(p.rate_per_sqft ?? 0);
		if (size <= 0 || rate <= 0) return sum;
		return sum + size * rate;
	}, 0);

	await supabase
		.from("projects")
		.update({ layout_expense: total, updated_at: new Date().toISOString() })
		.eq("id", projectId);
}

const generateProjectCode = (name: string) => {
	const words = name.trim().toUpperCase().split(" ");
	const initials = words.map((w) => w[0] || "").join("").slice(0, 3);
	const random = Math.floor(1000 + Math.random() * 9000);
	return `${initials}-${random}`;
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createProject(
	values: ProjectFormValues
): Promise<ActionResponse> {
	const parsed = projectSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const businessId = await getCurrentBusinessId();
	if (!businessId) {
		return {
			success: false,
			error: "Business context is missing. Sign out and sign in again.",
		};
	}

	const code =
		parsed.data.project_code ||
		generateProjectCode(parsed.data.project_name);

	const projectData = {
		business_id: businessId,
		project_name: parsed.data.project_name,
		project_code: code,
		location: parsed.data.location ?? "",
		google_maps_link: parsed.data.google_maps_link ?? "",
		project_type: parsed.data.project_type ?? "Plot",
		total_plots_count: parsed.data.total_plots_count ?? 0,
		layout_expense: 0,
		starting_plot_number: parsed.data.starting_plot_number ?? 1,
		starting_price: parsed.data.starting_price ?? 0,
		rate_per_sqft: parsed.data.rate_per_sqft ?? 0,
		plc_charges: parsed.data.plc_charges ?? 0,
		registration_charges: parsed.data.registration_charges ?? 0,
		down_payment_percent: parsed.data.down_payment_percent ?? 0,
		emi_months: parsed.data.emi_months ?? 0,
		emi_type: parsed.data.emi_type ?? "Fixed",
		offer_details: parsed.data.offer_details ?? "",
		status: parsed.data.status ?? "Active",
		description: parsed.data.description ?? "",
		amenities: parsed.data.amenities ?? "",
		nearby_locations: parsed.data.nearby_locations ?? "",
		internal_notes: parsed.data.internal_notes ?? "",
	};

	const { data, error } = await supabase
		.from("projects")
		.insert([projectData])
		.select();

	// ✅ FIX: return error cleanly instead of throwing raw object
	if (error) {
		console.error("createProject error:", error);
		return {
			success: false,
			error: error.message ?? "Failed to create project",
		};
	}

	const projectRow = data?.[0] ?? null;

	// Auto-create basic plot records
	const count = parsed.data.total_plots_count ?? 0;
	const start = parsed.data.starting_plot_number ?? 1;
	if (projectRow && count > 0) {
		const plotsToInsert = Array.from({ length: count }, (_, idx) => ({
			business_id: businessId,
			project_id: projectRow.id,
			plot_number: String(start + idx),
			size_sqft: 0,
			rate_per_sqft: 0,
			facing: null,
		}));

		const { error: plotError } = await supabase
			.from("plots")
			.insert(plotsToInsert);

		if (plotError) {
			return {
				success: false,
				error: `Project created but failed to create plots: ${plotError.message}`,
			};
		}
	}

	if (projectRow?.id) {
		await recalcLayoutExpenseForProject(supabase, projectRow.id);
	}

	revalidatePath("/projects");
	return { success: true };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateProject(
	id: string,
	values: ProjectFormValues
): Promise<ActionResponse> {
	const parsed = projectSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const code =
		parsed.data.project_code ||
		generateProjectCode(parsed.data.project_name);

	const projectData = {
		project_name: parsed.data.project_name,
		project_code: code,
		location: parsed.data.location ?? "",
		google_maps_link: parsed.data.google_maps_link ?? "",
		project_type: parsed.data.project_type ?? "Plot",
		total_plots_count: parsed.data.total_plots_count ?? 0,
		starting_plot_number: parsed.data.starting_plot_number ?? 1,
		starting_price: parsed.data.starting_price ?? 0,
		rate_per_sqft: parsed.data.rate_per_sqft ?? 0,
		plc_charges: parsed.data.plc_charges ?? 0,
		registration_charges: parsed.data.registration_charges ?? 0,
		down_payment_percent: parsed.data.down_payment_percent ?? 0,
		emi_months: parsed.data.emi_months ?? 0,
		emi_type: parsed.data.emi_type ?? "Fixed",
		offer_details: parsed.data.offer_details ?? "",
		status: parsed.data.status ?? "Active",
		description: parsed.data.description ?? "",
		amenities: parsed.data.amenities ?? "",
		nearby_locations: parsed.data.nearby_locations ?? "",
		internal_notes: parsed.data.internal_notes ?? "",
		updated_at: new Date().toISOString(),
	};

	const { error } = await supabase
		.from("projects")
		.update(projectData)
		.eq("id", id);

	// ✅ FIX: return error cleanly instead of throwing raw object
	if (error) {
		console.error("updateProject error:", error);
		return {
			success: false,
			error: error.message ?? "Failed to update project",
		};
	}

	await recalcLayoutExpenseForProject(supabase, id);
	revalidatePath("/projects");
	revalidatePath(`/projects/${id}`);
	return { success: true };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteProject(id: string): Promise<ActionResponse> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { error } = await supabase.from("projects").delete().eq("id", id);

	if (error) {
		return { success: false, error: error.message };
	}

	revalidatePath("/projects");
	return { success: true };
}

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export async function getProjects() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: projects, error } = await supabase
		.from("projects")
		.select("*")
		// ✅ FIX: removed .eq("is_active", true) — column doesn't exist
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return (projects ?? []).map((p) => ({
		...p,
		name: p.project_name ?? p.name ?? "",
		code: p.project_code ?? p.code ?? "",
		down_payment_percentage:
			p.down_payment_percent ?? p.down_payment_percentage ?? 0,
	}));
}

// ─── GET BY ID ────────────────────────────────────────────────────────────────
export async function getProjectById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: project, error } = await supabase
		.from("projects")
		.select("*")
		.eq("id", id)
		.single();

	if (error || !project) return null;

	return {
		...project,
		name: project.project_name ?? project.name ?? "",
		code: project.project_code ?? project.code ?? "",
		down_payment_percentage:
			project.down_payment_percent ?? project.down_payment_percentage ?? 0,
	};
}

export type PlotStatusCounts = {
	available: number;
	token: number;
	agreement: number;
	sold: number;
	total: number;
};

export type ProjectWithStats = {
	project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>;
	plotCounts: PlotStatusCounts;
	totalRevenue: number;
	recentSales: Array<{
		id: string;
		plot_number: string;
		customer_name: string;
		advisor_name: string;
		total_sale_amount: number;
		token_date: string | null;
		sale_phase: string;
	}>;
};

// ─── GET WITH STATS ───────────────────────────────────────────────────────────
export async function getProjectWithStats(
	id: string,
	options?: { advisorId?: string }
): Promise<ProjectWithStats | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data: project, error: projectError } = await supabase
		.from("projects")
		.select("*")
		.eq("id", id)
		.single();

	if (projectError || !project) return null;

	const mappedProject = {
		...project,
		name: project.project_name ?? project.name ?? "",
		code: project.project_code ?? project.code ?? "",
		down_payment_percentage:
			project.down_payment_percent ?? project.down_payment_percentage ?? 0,
	};

	const { data: plots } = await supabase
		.from("plots")
		.select("id, status")
		.eq("project_id", id);

	const plotCounts: PlotStatusCounts = {
		available: 0,
		token: 0,
		agreement: 0,
		sold: 0,
		total: plots?.length ?? 0,
	};

	plots?.forEach((plot) => {
		const status = String(plot.status ?? "").trim().toLowerCase();
		if (status === "sold_without_data") {
			plotCounts.sold++;
			return;
		}
		if (status && status in plotCounts) {
			plotCounts[status as keyof Omit<PlotStatusCounts, "total">]++;
		}
	});

	const plotIds = plots?.map((p) => p.id) ?? [];

	let totalRevenue = 0;
	let recentSales: ProjectWithStats["recentSales"] = [];

	const { data: payRows } = await supabase
		.from("payments")
		.select(`amount, plot_sales!inner(plots!inner(project_id))`)
		.eq("is_confirmed", true)
		.eq("plot_sales.plots.project_id", id);

	totalRevenue = (payRows ?? []).reduce(
		(sum, p) => sum + Number((p as any).amount ?? 0),
		0
	);

	if (plotIds.length > 0) {
		const { data: salesRaw } = await supabase
			.from("plot_sales")
			.select(
				`id, advisor_id, total_sale_amount, token_date, sale_phase, plot_id,
         plots!inner(plot_number), customers!inner(name), advisors!inner(name)`
			)
			.in("plot_id", plotIds)
			.eq("is_cancelled", false)
			.order("created_at", { ascending: false });

		let sales = salesRaw ?? [];
		if (options?.advisorId && sales.length > 0) {
			const aid = options.advisorId;
			const ids = sales.map((s: { id: string }) => s.id);
			const { data: commLinks } = await supabase
				.from("advisor_commissions")
				.select("sale_id")
				.in("sale_id", ids)
				.eq("advisor_id", aid);
			const hasComm = new Set(
				(commLinks ?? []).map((c: { sale_id: string }) => c.sale_id)
			);
			sales = sales.filter(
				(s: { id: string; advisor_id?: string | null }) =>
					s.advisor_id === aid || hasComm.has(s.id)
			);
			sales = sales.slice(0, 5);
		}

		if (sales.length) {
			recentSales = sales.map((s: any) => ({
				id: s.id,
				plot_number: s.plots?.plot_number ?? "—",
				customer_name: s.customers?.name ?? "—",
				advisor_name: s.advisors?.name ?? "—",
				total_sale_amount: Number(s.total_sale_amount),
				token_date: s.token_date,
				sale_phase: s.sale_phase,
			}));
		}
	}

	return { project: mappedProject, plotCounts, totalRevenue, recentSales };
}

// ─── GET WITH PLOT COUNTS ─────────────────────────────────────────────────────
export async function getProjectsWithPlotCounts() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: projects, error } = await supabase
		.from("projects")
		.select("*")
		// ✅ FIX: removed .eq("is_active", true) — column doesn't exist
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	if (!projects) return [];

	const projectIds = projects.map((p) => p.id);

	const { data: allPlots } = await supabase
		.from("plots")
		.select("project_id, status, size_sqft")
		.in("project_id", projectIds);

	const plotCountsMap = new Map<string, PlotStatusCounts>();
	const areaMap = new Map<string, { total: number; available: number }>();

	projects.forEach((p) => {
		plotCountsMap.set(p.id, {
			available: 0,
			token: 0,
			agreement: 0,
			sold: 0,
			total: 0,
		});
		areaMap.set(p.id, { total: 0, available: 0 });
	});

	allPlots?.forEach((plot) => {
		const counts = plotCountsMap.get(plot.project_id);
		const area = areaMap.get(plot.project_id);
		const size = Number(plot.size_sqft ?? 0);
		const status = String(plot.status ?? "").trim().toLowerCase();
		if (counts) {
			counts.total++;
			if (status === "sold_without_data") {
				counts.sold++;
			} else if (status && status in counts) {
				counts[status as keyof Omit<PlotStatusCounts, "total">]++;
			}
		}
		if (area) {
			area.total += size;
			if (status === "available") area.available += size;
		}
	});

	return projects.map((project) => {
		const mapped = {
			...project,
			name: project.project_name ?? project.name ?? "",
			code: project.project_code ?? project.code ?? "",
			down_payment_percentage:
				project.down_payment_percent ?? project.down_payment_percentage ?? 0,
		};
		return {
			...mapped,
			plotCounts: plotCountsMap.get(project.id) ?? {
				available: 0,
				token: 0,
				agreement: 0,
				sold: 0,
				total: 0,
			},
			available_area_sqft: areaMap.get(project.id)?.available ?? 0,
			sold_area_sqft:
				(areaMap.get(project.id)?.total ?? 0) -
				(areaMap.get(project.id)?.available ?? 0),
			left_area_sqft: areaMap.get(project.id)?.available ?? 0,
			total_area_sqft: areaMap.get(project.id)?.total ?? 0,
		};
	});
}

// ─── SUMMARY STATS ────────────────────────────────────────────────────────────
export async function getProjectsSummaryStats() {
	const supabase = await createClient();
	if (!supabase) return { totalRevenue: 0 };

	const businessId = await getCurrentBusinessId();
	if (!businessId) return { totalRevenue: 0 };

	const { data: payRows, error } = await supabase
		.from("payments")
		.select("amount")
		.eq("business_id", businessId)
		.eq("is_confirmed", true);

	if (error) {
		console.error("Error fetching summary stats:", error);
		return { totalRevenue: 0 };
	}

	const totalRevenue = (payRows ?? []).reduce(
		(sum, p) => sum + Number(p.amount ?? 0),
		0
	);
	return { totalRevenue };
}
