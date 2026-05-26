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

		// 1. Get global commission settings from advisor record
		const { data: advisor, error: advErr } = await supabase
			.from("advisors")
			.select("commission_token, commission_agreement, commission_registry, commission_full_payment")
			.eq("id", advisorId)
			.single();

		if (advErr || !advisor) {
			return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
		}

		// 2. Get per-project overrides
		const { data: overrides, error: ovrErr } = await supabase
			.from("advisor_project_commissions")
			.select("*, projects(name)")
			.eq("advisor_id", advisorId);

		if (ovrErr) {
			return NextResponse.json({ error: ovrErr.message }, { status: 400 });
		}

		const formattedOverrides = (overrides || []).map((item: any) => ({
			id: item.id,
			project_id: item.project_id,
			project_name: item.projects?.name || "Unknown Project",
			commission_token: item.commission_token,
			commission_agreement: item.commission_agreement,
			commission_registry: item.commission_registry,
			commission_full_payment: item.commission_full_payment,
			commission_rate: item.commission_rate,
		}));

		return NextResponse.json({
			global: {
				commission_token: advisor.commission_token || 0,
				commission_agreement: advisor.commission_agreement || 0,
				commission_registry: advisor.commission_registry || 0,
				commission_full_payment: advisor.commission_full_payment || 0,
			},
			project_overrides: formattedOverrides,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

export async function PATCH(
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

		// Build update payload dynamically
		const payload: any = {
			updated_at: new Date().toISOString(),
		};
		if (commission_token !== undefined) payload.commission_token = Number(commission_token);
		if (commission_agreement !== undefined) payload.commission_agreement = Number(commission_agreement);
		if (commission_registry !== undefined) payload.commission_registry = Number(commission_registry);
		if (commission_full_payment !== undefined) payload.commission_full_payment = Number(commission_full_payment);

		const { data: updatedAdvisor, error: updateErr } = await supabase
			.from("advisors")
			.update(payload)
			.eq("id", advisorId)
			.select("commission_token, commission_agreement, commission_registry, commission_full_payment")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json(updatedAdvisor);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
