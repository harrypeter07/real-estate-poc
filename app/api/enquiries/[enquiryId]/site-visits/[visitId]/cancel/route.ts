import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ enquiryId: string; visitId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { visitId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { notes, status } = body; // status: 'cancelled' or 'no_show'

		const finalStatus = status === "no_show" ? "no_show" : "cancelled";

		const { data: visit, error } = await supabase
			.from("enquiry_site_visits")
			.update({
				status: finalStatus,
				notes: notes || null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", visitId)
			.select("*")
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(visit);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
