import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
	try {
		const admin = createAdminClient();
		if (!admin) {
			return NextResponse.json({ error: "Admin database connection failed" }, { status: 500 });
		}

		const todayStr = new Date().toISOString().split("T")[0];

		// Update all pending/partial EMIs whose due_date has passed to 'overdue'
		const { data, error } = await admin
			.from("emi_schedule")
			.update({
				status: "overdue",
				updated_at: new Date().toISOString(),
			})
			.in("status", ["pending", "partial"])
			.lt("due_date", todayStr)
			.select("id");

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({
			success: true,
			updated_count: data?.length || 0,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// Support POST as well
export async function POST() {
	return GET();
}
