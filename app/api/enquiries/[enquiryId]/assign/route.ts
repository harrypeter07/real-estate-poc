import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
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
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { advisor_id } = body;

		const { data: updatedLead, error: updateErr } = await supabase
			.from("enquiry_customers")
			.update({
				assigned_advisor_id: advisor_id || null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", enquiryId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		// Sync with linked temp customer if exists
		await supabase
			.from("customers")
			.update({
				advisor_id: advisor_id || null,
			})
			.eq("enquiry_temp_id", enquiryId)
			.eq("is_active", false);

		return NextResponse.json(updatedLead);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
