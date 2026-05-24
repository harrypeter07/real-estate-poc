"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export type SearchResultItem = {
	id: string;
	type: "project" | "plot" | "advisor" | "customer" | "enquiry" | "sale";
	title: string;
	subtitle: string;
	href: string;
	badge?: string;
};

export type SearchResults = {
	projects: SearchResultItem[];
	plots: SearchResultItem[];
	advisors: SearchResultItem[];
	customers: SearchResultItem[];
	enquiries: SearchResultItem[];
	sales: SearchResultItem[];
	total: number;
};

export async function searchGlobal(query: string): Promise<SearchResults> {
	const empty: SearchResults = {
		projects: [],
		plots: [],
		advisors: [],
		customers: [],
		enquiries: [],
		sales: [],
		total: 0,
	};

	const q = query.trim();
	if (!q || q.length < 2) return empty;

	const supabase = await createClient();
	if (!supabase) return empty;

	const businessId = await getCurrentBusinessId();
	const search = `%${q}%`;

	const [
		{ data: projects },
		{ data: plots },
		{ data: advisors },
		{ data: customers },
		{ data: enquiries },
		{ data: sales },
	] = await Promise.all([
		// Projects — match name or location
		supabase
			.from("projects")
			.select("id, name, location")
			.or(`name.ilike.${search},location.ilike.${search}`)
			.eq("is_active", true)
			.limit(6),

		// Plots — match plot number, join to project name
		supabase
			.from("plots")
			.select("id, plot_number, status, project_id, projects(name)")
			.ilike("plot_number", search)
			.limit(8),

		// Advisors — match name or phone
		supabase
			.from("advisors")
			.select("id, name, phone, code")
			.or(`name.ilike.${search},phone.ilike.${search}`)
			.limit(6),

		// Customers — match name or phone
		supabase
			.from("customers")
			.select("id, name, phone, is_active")
			.or(`name.ilike.${search},phone.ilike.${search}`)
			.eq("is_active", true)
			.limit(8),

		// Enquiries — match name or phone
		supabase
			.from("enquiry_customers")
			.select("id, name, phone, category, enquiry_status")
			.or(`name.ilike.${search},phone.ilike.${search}`)
			.eq("is_active", true)
			.limit(6),

		// Sales — match by customer name, plot number, or slip number
		supabase
			.from("plot_sales")
			.select(
				"id, total_sale_amount, sale_phase, token_date, customers(name, phone), plots(plot_number, projects(name))"
			)
			.or(
				`customers.name.ilike.${search},customers.phone.ilike.${search},plots.plot_number.ilike.${search}`
			)
			.eq("is_cancelled", false)
			.limit(6),
	]);

	const projectResults: SearchResultItem[] = (projects ?? []).map((p: any) => ({
		id: p.id,
		type: "project",
		title: p.name,
		subtitle: p.location ?? "No location",
		href: `/projects/${p.id}`,
		badge: "Project",
	}));

	const plotResults: SearchResultItem[] = (plots ?? []).map((p: any) => ({
		id: p.id,
		type: "plot",
		title: `Plot ${p.plot_number}`,
		subtitle: p.projects?.name ?? "Unknown project",
		href: `/projects/${p.project_id}?plotId=${p.id}`,
		badge: String(p.status ?? "").replace(/_/g, " "),
	}));

	const advisorResults: SearchResultItem[] = (advisors ?? []).map((a: any) => ({
		id: a.id,
		type: "advisor",
		title: a.name,
		subtitle: `${a.phone ?? "—"}${a.code ? ` · ${a.code}` : ""}`,
		href: `/advisors/${a.id}`,
		badge: "Advisor",
	}));

	const customerResults: SearchResultItem[] = (customers ?? []).map((c: any) => ({
		id: c.id,
		type: "customer",
		title: c.name,
		subtitle: c.phone ?? "—",
		href: `/customers/${c.id}`,
		badge: "Customer",
	}));

	const enquiryResults: SearchResultItem[] = (enquiries ?? []).map((e: any) => ({
		id: e.id,
		type: "enquiry",
		title: e.name,
		subtitle: `${e.phone ?? "—"} · ${e.category ?? "enquiry"}`,
		href: `/enquiries?search=${encodeURIComponent(e.phone ?? e.name)}`,
		badge: e.enquiry_status ?? "new",
	}));

	const saleResults: SearchResultItem[] = (sales ?? []).map((s: any) => ({
		id: s.id,
		type: "sale",
		title: `${s.customers?.name ?? "—"} — Plot ${s.plots?.plot_number ?? "—"}`,
		subtitle: `${s.plots?.projects?.name ?? "—"} · ₹${Number(s.total_sale_amount ?? 0).toLocaleString("en-IN")}`,
		href: `/sales?id=${s.id}`,
		badge: s.sale_phase ?? "sale",
	}));

	const total =
		projectResults.length +
		plotResults.length +
		advisorResults.length +
		customerResults.length +
		enquiryResults.length +
		saleResults.length;

	return {
		projects: projectResults,
		plots: plotResults,
		advisors: advisorResults,
		customers: customerResults,
		enquiries: enquiryResults,
		sales: saleResults,
		total,
	};
}
