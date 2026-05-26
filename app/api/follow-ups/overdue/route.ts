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

		const todayStr = new Date().toISOString().split("T")[0];

		const { data: enquiries, error } = await supabase
			.from("enquiry_customers")
			.select(`
				id,
				name,
				phone,
				pipeline_stage,
				follow_up_date,
				assigned_advisor_id,
				advisors(name)
			`)
			.eq("business_id", businessId)
			.lt("follow_up_date", todayStr)
			.not("pipeline_stage", "in", '("converted","lost")')
			.eq("is_active", true)
			.order("follow_up_date", { ascending: true }); // oldest first

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const leadIds = (enquiries || []).map((e) => e.id);
		const lastOutcomes: Record<string, string> = {};

		if (leadIds.length > 0) {
			const { data: followUps } = await supabase
				.from("enquiry_follow_ups")
				.select("enquiry_id, outcome, created_at")
				.in("enquiry_id", leadIds)
				.order("created_at", { ascending: false });

			if (followUps) {
				const processed = new Set<string>();
				for (const fu of followUps) {
					if (!processed.has(fu.enquiry_id)) {
						lastOutcomes[fu.enquiry_id] = fu.outcome || "";
						processed.add(fu.enquiry_id);
					}
				}
			}
		}

		const result = (enquiries || []).map((enq: any) => ({
			id: enq.id,
			name: enq.name,
			phone: enq.phone,
			pipeline_stage: enq.pipeline_stage,
			follow_up_date: enq.follow_up_date,
			advisor_name: enq.advisors?.name || null,
			last_follow_up_outcome: lastOutcomes[enq.id] || null,
		}));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
