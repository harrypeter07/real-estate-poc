import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

		const { notes, next_reminder_date, assigned_to } = body;

		// Fetch current reminder count
		const { data: reminder, error: fetchErr } = await supabase
			.from("due_payment_reminders")
			.select("reminder_count")
			.eq("id", id)
			.single();

		if (fetchErr || !reminder) {
			return NextResponse.json({ error: "Reminder record not found" }, { status: 404 });
		}

		const newCount = (reminder.reminder_count || 0) + 1;

		const { data: updated, error: updateErr } = await supabase
			.from("due_payment_reminders")
			.update({
				reminder_count: newCount,
				last_reminder_sent: new Date().toISOString(),
				next_reminder_date: next_reminder_date || null,
				assigned_to: assigned_to || null,
				resolution_notes: notes || null,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json(updated);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
