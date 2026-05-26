import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data, error } = await supabase
			.from("advisor_project_commissions")
			.select("*, projects(name)")
			.eq("advisor_id", advisorId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Format output to inline project name
		const formatted = (data || []).map((item: any) => ({
			...item,
			project_name: item.projects?.name || "Unknown Project",
		}));

		return NextResponse.json(formatted);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			project_id,
			commission_token,
			commission_agreement,
			commission_registry,
			commission_full_payment,
			business_id,
		} = body;

		if (!project_id || !business_id) {
			return NextResponse.json(
				{ error: "project_id and business_id are required" },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Check advisor exists and belongs to business_id
		const { data: advisor, error: advError } = await supabase
			.from("advisors")
			.select("id, business_id")
			.eq("id", advisorId)
			.eq("business_id", business_id)
			.maybeSingle();

		if (advError || !advisor) {
			return NextResponse.json(
				{ error: "Advisor not found or does not belong to the business" },
				{ status: 404 }
			);
		}

		// 2. Check project exists
		const { data: project, error: projError } = await supabase
			.from("projects")
			.select("id, name")
			.eq("id", project_id)
			.maybeSingle();

		if (projError || !project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		// 3. Upsert commission rates (key constraint is project_id + advisor_id)
		const { data: upsertData, error: upsertError } = await supabase
			.from("advisor_project_commissions")
			.upsert({
				advisor_id: advisorId,
				project_id,
				business_id,
				commission_token: commission_token ? Number(commission_token) : 0,
				commission_agreement: commission_agreement ? Number(commission_agreement) : 0,
				commission_registry: commission_registry ? Number(commission_registry) : 0,
				commission_full_payment: commission_full_payment ? Number(commission_full_payment) : 0,
				updated_at: new Date().toISOString(),
			}, {
				onConflict: "project_id,advisor_id"
			})
			.select("*, projects(name)")
			.single();

		if (upsertError) {
			return NextResponse.json({ error: upsertError.message }, { status: 400 });
		}

		const formatted = {
			...upsertData,
			project_name: upsertData.projects?.name || "Unknown Project",
		};

		return NextResponse.json(formatted);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
