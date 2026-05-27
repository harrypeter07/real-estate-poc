import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

		// 1. Fetch customer details
		const { data: customer, error: custErr } = await supabase
			.from("customers")
			.select("*, advisors(name)")
			.eq("id", id)
			.single();

		if (custErr || !customer) {
			return NextResponse.json({ error: "Customer not found" }, { status: 404 });
		}

		// 2. Fetch sales
		const { data: sales } = await supabase
			.from("plot_sales")
			.select(`
				*,
				plots(plot_number, projects(name))
			`)
			.eq("customer_id", id)
			.eq("is_cancelled", false);

		const saleIds = (sales || []).map((s) => s.id);

		let emiSchedule: any[] = [];
		let penalties: any[] = [];
		let reminders: any[] = [];

		if (saleIds.length > 0) {
			const [emisRes, penaltiesRes, remindersRes] = await Promise.all([
				supabase
					.from("emi_schedule")
					.select(`
						*,
						payments(slip_number, payment_date, payment_mode)
					`)
					.in("sale_id", saleIds)
					.order("emi_number", { ascending: true }),
				supabase
					.from("payment_penalties")
					.select(`
						*,
						emi_schedule(emi_number)
					`)
					.in("sale_id", saleIds)
					.eq("is_paid", false)
					.eq("is_waived", false)
					.order("created_at", { ascending: false }),
				supabase
					.from("due_payment_reminders")
					.select(`
						*,
						business_admins(name)
					`)
					.in("sale_id", saleIds)
					.order("created_at", { ascending: false }),
			]);

			emiSchedule = emisRes.data || [];
			penalties = penaltiesRes.data || [];
			reminders = remindersRes.data || [];
		}

		// Map reminders to include admin names
		const mappedReminders = reminders.map((r: any) => ({
			...r,
			assigned_to_name: r.business_admins?.name || "System",
		}));

		return NextResponse.json({
			customer,
			sales: (sales || []).map((s: any) => ({
				...s,
				plot_number: s.plots?.plot_number || "—",
				project_name: s.plots?.projects?.name || "—",
			})),
			emi_schedule: emiSchedule,
			penalties: penalties.map((p: any) => ({
				...p,
				emi_number: p.emi_schedule?.emi_number || null,
			})),
			reminders: mappedReminders,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
