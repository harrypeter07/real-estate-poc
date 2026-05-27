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
		const days = parseInt(url.searchParams.get("days") || "7");

		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);
		const tomorrowStr = tomorrow.toISOString().split("T")[0];

		const futureLimit = new Date(today);
		futureLimit.setDate(today.getDate() + days);
		const futureLimitStr = futureLimit.toISOString().split("T")[0];

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
			.gte("follow_up_date", tomorrowStr)
			.lte("follow_up_date", futureLimitStr)
			.not("pipeline_stage", "in", '("converted","lost")')
			.eq("is_active", true)
			.order("follow_up_date", { ascending: true });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = (enquiries || []).map((enq: any) => ({
			id: enq.id,
			name: enq.name,
			phone: enq.phone,
			pipeline_stage: enq.pipeline_stage,
			follow_up_date: enq.follow_up_date,
			advisor_name: enq.advisors?.name || null,
		}));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
