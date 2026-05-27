import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ saleId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { saleId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { emi_id, new_due_date, new_emi_amount, reason } = body;

		if (!emi_id) {
			return NextResponse.json({ error: "emi_id is required" }, { status: 400 });
		}

		const updatePayload: any = {
			notes: reason ? `Adjusted: ${reason}` : "Adjusted",
			updated_at: new Date().toISOString(),
		};

		if (new_due_date) {
			updatePayload.due_date = new_due_date;
		}

		if (new_emi_amount != null) {
			updatePayload.emi_amount = Number(new_emi_amount);
		}

		const { data: updatedEmi, error: updateErr } = await supabase
			.from("emi_schedule")
			.update(updatePayload)
			.eq("id", emi_id)
			.eq("sale_id", saleId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json(updatedEmi);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
