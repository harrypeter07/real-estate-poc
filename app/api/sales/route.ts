import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export async function GET(req: Request) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const businessId = await getCurrentBusinessId();
		if (!businessId) {
			return NextResponse.json({ error: "Business ID not found" }, { status: 400 });
		}

		const url = new URL(req.url);
		const projectId = url.searchParams.get("project_id");
		const advisorId = url.searchParams.get("advisor_id");
		const salePhase = url.searchParams.get("sale_phase");
		const isCancelled = url.searchParams.get("is_cancelled");
		const dateFrom = url.searchParams.get("date_from");
		const dateTo = url.searchParams.get("date_to");
		const page = parseInt(url.searchParams.get("page") || "1");
		const limit = parseInt(url.searchParams.get("limit") || "10");

		const offset = (page - 1) * limit;

		let query = supabase
			.from("plot_sales")
			.select(`
				*,
				customers(id, name, phone, email, address),
				advisors(id, name),
				plots(id, plot_number, facing, size_sqft, rate_per_sqft, projects(id, name, location))
			`, { count: "exact" })
			.eq("business_id", businessId);

		if (projectId && projectId !== "all") {
			// filter by project_id inside plots relation
			// Since Supabase does not do automatic relational filtering unless using inner join, we filter manually or using inner join plots!inner(...)
			query = supabase
				.from("plot_sales")
				.select(`
					*,
					customers(id, name, phone, email, address),
					advisors(id, name),
					plots!inner(id, plot_number, facing, size_sqft, rate_per_sqft, project_id, projects(id, name, location))
				`, { count: "exact" })
				.eq("business_id", businessId)
				.eq("plots.project_id", projectId);
		}

		if (advisorId && advisorId !== "all") {
			query = query.eq("advisor_id", advisorId);
		}
		if (salePhase && salePhase !== "all") {
			query = query.eq("sale_phase", salePhase);
		}
		if (isCancelled !== null && isCancelled !== undefined && isCancelled !== "all") {
			query = query.eq("is_cancelled", isCancelled === "true");
		}
		if (dateFrom) {
			query = query.gte("token_date", dateFrom);
		}
		if (dateTo) {
			query = query.lte("token_date", dateTo);
		}

		const { data: sales, count, error } = await query
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const saleIds = (sales || []).map((s) => s.id);
		const emiSummaries: Record<string, { total: number; paid: number; overdue: number }> = {};

		if (saleIds.length > 0) {
			const { data: emis } = await supabase
				.from("emi_schedule")
				.select("sale_id, status, due_date")
				.in("sale_id", saleIds);

			const today = new Date();

			if (emis) {
				for (const emi of emis) {
					if (!emiSummaries[emi.sale_id]) {
						emiSummaries[emi.sale_id] = { total: 0, paid: 0, overdue: 0 };
					}
					emiSummaries[emi.sale_id].total++;
					if (emi.status === "paid") {
						emiSummaries[emi.sale_id].paid++;
					} else if (emi.status === "pending" || emi.status === "overdue") {
						if (new Date(emi.due_date) < today) {
							emiSummaries[emi.sale_id].overdue++;
						}
					}
				}
			}
		}

		const result = (sales || []).map((sale: any) => ({
			...sale,
			customer_name: sale.customers?.name || "—",
			customer_phone: sale.customers?.phone || "—",
			advisor_name: sale.advisors?.name || "—",
			plot_number: sale.plots?.plot_number || "—",
			project_name: sale.plots?.projects?.name || "—",
			emi_summary: emiSummaries[sale.id] || { total: 0, paid: 0, overdue: 0 },
		}));

		return NextResponse.json({
			data: result,
			total: count || 0,
			page,
			limit,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
