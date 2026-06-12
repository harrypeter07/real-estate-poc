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
		const pipelineStage = url.searchParams.get("pipeline_stage");
		const projectId = url.searchParams.get("project_id");
		const search = url.searchParams.get("search");

		let query = supabase
			.from("enquiry_customers")
			.select(`
				*,
				projects(id, name),
				advisors(id, name)
			`)
			.eq("business_id", businessId);

		if (pipelineStage && pipelineStage !== "all") {
			query = query.eq("pipeline_stage", pipelineStage);
		}
		if (projectId && projectId !== "all") {
			query = query.eq("project_id", projectId);
		}
		if (search) {
			query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
		}

		const { data: enquiries, error } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const stages = ["new", "contacted", "follow_up", "site_visit", "negotiation", "converted", "lost"];
		const board: Record<string, { count: number; totalBudget: number; leads: any[] }> = {};

		for (const st of stages) {
			board[st] = { count: 0, totalBudget: 0, leads: [] };
		}

		for (const enq of enquiries || []) {
			const st = enq.pipeline_stage || "new";
			if (!board[st]) {
				board[st] = { count: 0, totalBudget: 0, leads: [] };
			}
			board[st].count++;
			board[st].totalBudget += Number(enq.budget_max || 0);
			board[st].leads.push({
				...enq,
				project_name: enq.projects?.name || null,
				advisor_name: enq.advisors?.name || null,
			});
		}

		return NextResponse.json(board);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
