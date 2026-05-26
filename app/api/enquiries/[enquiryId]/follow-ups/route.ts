import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

// GET /api/enquiries/:enquiryId/follow-ups - List follow-up logs
export async function GET(req: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { enquiryId } = await params;

		const { data: followUps, error } = await supabase
			.from("enquiry_follow_ups")
			.select(`
				*,
				business_admins(id, name)
			`)
			.eq("enquiry_id", enquiryId)
			.order("follow_up_date", { ascending: false })
			.order("created_at", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const mapped = (followUps || []).map((fu: any) => ({
			...fu,
			followed_by_name: fu.business_admins?.name || "System",
		}));

		return NextResponse.json(mapped);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// POST /api/enquiries/:enquiryId/follow-ups - Log a follow-up action
export async function POST(req: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
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

		const { enquiryId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { follow_up_date, follow_up_time, follow_up_type, outcome, notes, next_follow_up_date } = body;

		if (!follow_up_date || !follow_up_type) {
			return NextResponse.json({ error: "follow_up_date and follow_up_type are required" }, { status: 400 });
		}

		// Resolve admin ID who performed the action
		const { data: adminInfo } = await supabase
			.from("business_admins")
			.select("id")
			.eq("auth_user_id", user.id)
			.eq("business_id", businessId)
			.maybeSingle();

		// Fetch current lead details
		const { data: lead } = await supabase
			.from("enquiry_customers")
			.select("pipeline_stage")
			.eq("id", enquiryId)
			.single();

		const pipelineStage = lead?.pipeline_stage || "new";

		const { data: followUp, error: insertErr } = await supabase
			.from("enquiry_follow_ups")
			.insert({
				enquiry_id: enquiryId,
				business_id: businessId,
				followed_by: adminInfo?.id || null,
				follow_up_date,
				follow_up_time: follow_up_time || null,
				follow_up_type,
				outcome: outcome || null,
				notes: notes || null,
				next_follow_up_date: next_follow_up_date || null,
				pipeline_stage_at_time: pipelineStage,
			})
			.select("*")
			.single();

		if (insertErr) {
			return NextResponse.json({ error: insertErr.message }, { status: 400 });
		}

		// Update lead follow_up_date
		await supabase
			.from("enquiry_customers")
			.update({
				follow_up_date: next_follow_up_date || null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", enquiryId);

		return NextResponse.json(followUp, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
