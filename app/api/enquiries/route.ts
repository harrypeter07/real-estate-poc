import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

// GET /api/enquiries - List enquiries with filters and pagination
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
		const advisorId = url.searchParams.get("advisor_id");
		const leadSource = url.searchParams.get("lead_source");
		const dateFrom = url.searchParams.get("date_from");
		const dateTo = url.searchParams.get("date_to");
		const search = url.searchParams.get("search");
		const page = parseInt(url.searchParams.get("page") || "1");
		const limit = parseInt(url.searchParams.get("limit") || "10");

		const offset = (page - 1) * limit;

		let query = supabase
			.from("enquiry_customers")
			.select(`
				*,
				projects(id, name),
				advisors(id, name)
			`, { count: "exact" })
			.eq("business_id", businessId);

		if (pipelineStage && pipelineStage !== "all") {
			query = query.eq("pipeline_stage", pipelineStage);
		}
		if (projectId && projectId !== "all") {
			query = query.eq("project_id", projectId);
		}
		if (advisorId && advisorId !== "all") {
			query = query.eq("assigned_advisor_id", advisorId);
		}
		if (leadSource && leadSource !== "all") {
			query = query.eq("lead_source", leadSource);
		}
		if (dateFrom) {
			query = query.gte("created_at", dateFrom);
		}
		if (dateTo) {
			query = query.lte("created_at", dateTo);
		}
		if (search) {
			query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
		}

		const { data: enquiries, count, error } = await query
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Count follow_up_history per lead
		const leadIds = (enquiries || []).map((e) => e.id);
		const followUpCounts: Record<string, number> = {};

		if (leadIds.length > 0) {
			const { data: followUps } = await supabase
				.from("enquiry_follow_ups")
				.select("enquiry_id")
				.in("enquiry_id", leadIds);

			if (followUps) {
				for (const fu of followUps) {
					followUpCounts[fu.enquiry_id] = (followUpCounts[fu.enquiry_id] || 0) + 1;
				}
			}
		}

		const result = (enquiries || []).map((enq: any) => ({
			...enq,
			project_name: enq.projects?.name || null,
			advisor_name: enq.advisors?.name || null,
			follow_up_count: followUpCounts[enq.id] || 0,
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

// POST /api/enquiries - Create a new lead/enquiry
export async function POST(req: Request) {
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

		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			name,
			phone,
			alternate_phone,
			email_id,
			address,
			birth_date,
			project_id,
			category,
			details,
			property_type,
			segment,
			budget_min,
			budget_max,
			preferred_location,
			bhk_size_requirement,
			lead_source,
			assigned_advisor_id,
			follow_up_date,
		} = body;

		if (!name || !phone) {
			return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
		}

		// Check duplicate phone per business
		const { data: existingLead } = await supabase
			.from("enquiry_customers")
			.select("id")
			.eq("business_id", businessId)
			.eq("phone", phone)
			.eq("is_active", true)
			.maybeSingle();

		if (existingLead) {
			return NextResponse.json({ error: "An active lead with this phone number already exists." }, { status: 409 });
		}

		const { data: enquiry, error: insertError } = await supabase
			.from("enquiry_customers")
			.insert({
				business_id: businessId,
				name,
				phone,
				alternate_phone: alternate_phone || null,
				email_id: email_id || null,
				address: address || null,
				birth_date: birth_date || null,
				project_id: project_id || null,
				category: category || "other",
				details: details || null,
				property_type: property_type || null,
				segment: segment || null,
				budget_min: budget_min ? Number(budget_min) : null,
				budget_max: budget_max ? Number(budget_max) : null,
				preferred_location: preferred_location || null,
				bhk_size_requirement: bhk_size_requirement || null,
				lead_source: lead_source || "other",
				assigned_advisor_id: assigned_advisor_id || null,
				follow_up_date: follow_up_date || null,
				pipeline_stage: "new",
				is_active: true,
			})
			.select("*")
			.single();

		if (insertError) {
			return NextResponse.json({ error: insertError.message }, { status: 400 });
		}

		// Create temp customer mapping
		await supabase
			.from("customers")
			.insert({
				business_id: businessId,
				name,
				phone,
				alternate_phone: alternate_phone || null,
				address: address || null,
				birth_date: birth_date || null,
				email: email_id || null,
				advisor_id: assigned_advisor_id || null,
				route: preferred_location || address || null,
				notes: details || null,
				is_active: false, // temporary until upgraded
				enquiry_temp_id: enquiry.id,
			});

		return NextResponse.json(enquiry, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
