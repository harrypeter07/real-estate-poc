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

		let query = supabase
			.from("plots")
			.select(`
				*,
				projects(id, name, emi_months)
			`)
			.eq("status", "available");

		if (projectId && projectId !== "all") {
			query = query.eq("project_id", projectId);
		}

		const { data: plots, error } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const filtered = (plots || []).filter((p: any) => p.projects && p.projects.id);

		const result = filtered.map((p: any) => ({
			id: p.id,
			project_id: p.project_id,
			project_name: p.projects?.name || "—",
			project_emi_months: p.projects?.emi_months || 0,
			plot_number: p.plot_number,
			size_sqft: p.size_sqft,
			rate_per_sqft: p.rate_per_sqft,
			total_amount: p.total_amount || (p.size_sqft * p.rate_per_sqft),
			facing: p.facing || "—",
			notes: p.notes || "",
		}));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
