import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

// GET /api/enquiries/:enquiryId/site-visits - List visits for a lead
export async function GET(req: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { enquiryId } = await params;

		const { data: visits, error } = await supabase
			.from("enquiry_site_visits")
			.select(`
				*,
				projects(id, name),
				business_admins(id, name)
			`)
			.eq("enquiry_id", enquiryId)
			.order("scheduled_date", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = (visits || []).map((v: any) => ({
			...v,
			project_name: v.projects?.name || null,
			conducted_by_name: v.business_admins?.name || "System",
		}));

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// POST /api/enquiries/:enquiryId/site-visits - Schedule a site visit
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

		const { project_id, scheduled_date, scheduled_time, conducted_by, accompanied_by, notes } = body;

		if (!scheduled_date) {
			return NextResponse.json({ error: "scheduled_date is required" }, { status: 400 });
		}

		// Insert site visit record
		const { data: visit, error: insertErr } = await supabase
			.from("enquiry_site_visits")
			.insert({
				enquiry_id: enquiryId,
				business_id: businessId,
				project_id: project_id || null,
				scheduled_date,
				scheduled_time: scheduled_time || null,
				status: "scheduled",
				conducted_by: conducted_by || null,
				accompanied_by: accompanied_by || null,
				notes: notes || null,
			})
			.select("*")
			.single();

		if (insertErr) {
			return NextResponse.json({ error: insertErr.message }, { status: 400 });
		}

		// Fetch current site_visit_count
		const { data: lead } = await supabase
			.from("enquiry_customers")
			.select("site_visit_count")
			.eq("id", enquiryId)
			.single();

		const currentCount = lead?.site_visit_count || 0;

		// Update lead stage to 'site_visit' and increment visit count
		await supabase
			.from("enquiry_customers")
			.update({
				pipeline_stage: "site_visit",
				site_visit_count: currentCount + 1,
				updated_at: new Date().toISOString(),
			})
			.eq("id", enquiryId);

		return NextResponse.json(visit, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
