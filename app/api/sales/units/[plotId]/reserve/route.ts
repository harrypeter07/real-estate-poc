import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ plotId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { plotId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { customer_id, reserved_by, valid_until, notes } = body;

		if (!customer_id || !valid_until) {
			return NextResponse.json({ error: "customer_id and valid_until are required" }, { status: 400 });
		}

		const expiryDate = new Date(valid_until).toLocaleString();
		const reservationNotes = `Reserved for customer ${customer_id} by ${reserved_by || 'admin'} until ${expiryDate}. Notes: ${notes || 'none'}`;

		// Update plot status to 'token' and update notes
		const { data: plot, error: updateErr } = await supabase
			.from("plots")
			.update({
				status: "token",
				notes: reservationNotes,
				updated_at: new Date().toISOString(),
			})
			.eq("id", plotId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json({
			success: true,
			plot,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
