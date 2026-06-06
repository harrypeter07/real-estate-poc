import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

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

		const { notes, next_reminder_date, assigned_to, sale_id, customer_id } = body;
		const fs = require("fs");
		const path = require("path");
		const logFile = path.join(process.cwd(), "debug_dues.log");
		fs.appendFileSync(logFile, `[${new Date().toISOString()}] Follow-up POST request body: id=${id}, sale_id=${sale_id}, customer_id=${customer_id}, notes=${notes}\n`);

		let targetId = id;
		let currentReminderCount = 0;

		if (id === "resolve") {
			if (!sale_id || !customer_id) {
				return NextResponse.json({ error: "sale_id and customer_id are required when creating a reminder" }, { status: 400 });
			}

			// Check if unresolved reminder already exists for this sale
			const { data: existing } = await supabase
				.from("due_payment_reminders")
				.select("id, reminder_count")
				.eq("sale_id", sale_id)
				.eq("is_resolved", false)
				.maybeSingle();

			if (existing) {
				targetId = existing.id;
				currentReminderCount = existing.reminder_count || 0;
			} else {
				const businessId = await getCurrentBusinessId();
				if (!businessId) {
					return NextResponse.json({ error: "Business ID not found" }, { status: 400 });
				}

				// Find oldest pending/partial/overdue EMI
				const { data: oldestEmi } = await supabase
					.from("emi_schedule")
					.select("id")
					.eq("sale_id", sale_id)
					.in("status", ["pending", "partial", "overdue"])
					.order("due_date", { ascending: true })
					.limit(1)
					.maybeSingle();

				const { data: newReminder, error: insertErr } = await supabase
					.from("due_payment_reminders")
					.insert({
						sale_id,
						customer_id,
						business_id,
						emi_id: oldestEmi?.id || null,
						risk_level: "upcoming",
						reminder_count: 0,
					})
					.select("id, reminder_count")
					.single();

				if (insertErr || !newReminder) {
					fs.appendFileSync(logFile, `[${new Date().toISOString()}] Insert reminder error: ${insertErr?.message || "no newReminder returned"}\n`);
					return NextResponse.json({ error: insertErr?.message || "Failed to create reminder record" }, { status: 400 });
				}

				targetId = newReminder.id;
				currentReminderCount = newReminder.reminder_count || 0;
			}
		} else {
			// Fetch current reminder count
			const { data: reminder, error: fetchErr } = await supabase
				.from("due_payment_reminders")
				.select("reminder_count")
				.eq("id", id)
				.single();

			if (fetchErr || !reminder) {
				fs.appendFileSync(logFile, `[${new Date().toISOString()}] Fetch reminder error: ${fetchErr?.message || "no reminder found"}\n`);
				return NextResponse.json({ error: "Reminder record not found" }, { status: 404 });
			}

			currentReminderCount = reminder.reminder_count || 0;
		}

		const newCount = currentReminderCount + 1;

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
			.eq("id", targetId)
			.select("*")
			.single();

		if (updateErr) {
			fs.appendFileSync(logFile, `[${new Date().toISOString()}] Update reminder error: ${updateErr.message}\n`);
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		fs.appendFileSync(logFile, `[${new Date().toISOString()}] Follow-up successfully logged. targetId=${targetId}\n`);
		return NextResponse.json(updated);
	} catch (err: any) {
		const fs = require("fs");
		const path = require("path");
		const logFile = path.join(process.cwd(), "debug_dues.log");
		fs.appendFileSync(logFile, `[${new Date().toISOString()}] Follow-up exception: ${err.message}\n`);
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

