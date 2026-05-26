import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const { searchParams } = new URL(req.url);

		const status = searchParams.get("status");
		const dateFrom = searchParams.get("date_from");
		const dateTo = searchParams.get("date_to");
		const businessId = searchParams.get("business_id");

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		let query = supabase
			.from("advisor_recovery_tracking")
			.select("*, customers(name, phone)")
			.eq("advisor_id", advisorId)
			.eq("business_id", businessId);

		if (status) {
			query = query.eq("recovery_status", status);
		}
		if (dateFrom) {
			query = query.gte("due_date", dateFrom);
		}
		if (dateTo) {
			query = query.lte("due_date", dateTo);
		}

		query = query.order("due_date", { ascending: true, nullsFirst: false });

		const { data, error } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const formatted = (data || []).map((item: any) => ({
			...item,
			customer_name: item.customers?.name || "—",
			customer_phone: item.customers?.phone || "—",
		}));

		return NextResponse.json(formatted);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(
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
			customer_id,
			sale_id,
			total_due_amount,
			due_date,
			next_follow_up_date,
			recovery_notes,
			business_id,
		} = body;

		if (!total_due_amount || !business_id) {
			return NextResponse.json(
				{ error: "total_due_amount and business_id are required" },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Insert recovery record
		const { data, error } = await supabase
			.from("advisor_recovery_tracking")
			.insert({
				advisor_id: advisorId,
				business_id,
				customer_id: customer_id || null,
				sale_id: sale_id || null,
				total_due_amount: Number(total_due_amount),
				recovered_amount: 0,
				recovery_status: "pending",
				due_date: due_date || null,
				next_follow_up_date: next_follow_up_date || null,
				recovery_notes: recovery_notes || null,
				follow_up_count: 0,
			})
			.select("*, customers(name, phone)")
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const formatted = {
			...data,
			customer_name: data.customers?.name || "—",
			customer_phone: data.customers?.phone || "—",
		};

		return NextResponse.json(formatted, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
