import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; projectId: string }> }
) {
	try {
		const { advisorId, projectId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			commission_token,
			commission_agreement,
			commission_registry,
			commission_full_payment,
		} = body;

		// Validation: 0 <= value <= 100
		const rates = {
			commission_token,
			commission_agreement,
			commission_registry,
			commission_full_payment,
		};

		for (const [key, value] of Object.entries(rates)) {
			if (value !== undefined && value !== null) {
				const num = Number(value);
				if (Number.isNaN(num) || num < 0 || num > 100) {
					return NextResponse.json(
						{ error: `${key} must be a number between 0 and 100` },
						{ status: 400 }
					);
				}
			}
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Resolve business_id from advisor to ensure correct data integrity
		const { data: advisor, error: advErr } = await supabase
			.from("advisors")
			.select("business_id")
			.eq("id", advisorId)
			.maybeSingle();

		if (advErr || !advisor) {
			return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
		}

		const businessId = advisor.business_id;

		// 2. Fetch existing override to construct payload or upsert directly
		const { data: existing, error: fetchErr } = await supabase
			.from("advisor_project_commissions")
			.select("*")
			.eq("advisor_id", advisorId)
			.eq("project_id", projectId)
			.maybeSingle();

		const payload: any = {
			advisor_id: advisorId,
			project_id: projectId,
			business_id: businessId,
			commission_token: commission_token !== undefined ? Number(commission_token) : (existing?.commission_token || 0),
			commission_agreement: commission_agreement !== undefined ? Number(commission_agreement) : (existing?.commission_agreement || 0),
			commission_registry: commission_registry !== undefined ? Number(commission_registry) : (existing?.commission_registry || 0),
			commission_full_payment: commission_full_payment !== undefined ? Number(commission_full_payment) : (existing?.commission_full_payment || 0),
			updated_at: new Date().toISOString(),
		};

		const { data: updatedOverride, error: upsertErr } = await supabase
			.from("advisor_project_commissions")
			.upsert(payload, {
				onConflict: "project_id,advisor_id"
			})
			.select("*")
			.single();

		if (upsertErr) {
			return NextResponse.json({ error: upsertErr.message }, { status: 400 });
		}

		return NextResponse.json(updatedOverride);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
