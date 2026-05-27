import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { payment_id } = body;

		if (!payment_id) {
			return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
		}

		const { data: updated, error } = await supabase
			.from("payment_penalties")
			.update({
				is_paid: true,
				payment_id,
				paid_date: new Date().toISOString().split("T")[0],
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select("*")
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(updated);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
