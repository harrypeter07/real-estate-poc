import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; commissionId: string }> }
) {
	try {
		const { commissionId } = await params;
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data, error } = await supabase
			.from("advisor_commission_payments")
			.select("*")
			.eq("commission_id", commissionId)
			.order("paid_date", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(data || []);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; commissionId: string }> }
) {
	try {
		const { commissionId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const {
			amount,
			extra_paid_amount,
			payment_mode,
			reference_number,
			receipt_path,
			note,
			paid_date,
		} = body;

		if (amount === undefined || amount === null) {
			return NextResponse.json({ error: "amount is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Resolve business_id from the advisor_commissions record
		const { data: commission, error: commErr } = await supabase
			.from("advisor_commissions")
			.select("business_id")
			.eq("id", commissionId)
			.maybeSingle();

		if (commErr || !commission) {
			return NextResponse.json({ error: "Commission record not found" }, { status: 404 });
		}

		const businessId = commission.business_id;

		// 2. Insert payment installment record
		// Database triggers will automatically recalculate advisor_commissions.amount_paid & remaining_commission
		const { data: newPayment, error: insertErr } = await supabase
			.from("advisor_commission_payments")
			.insert({
				commission_id: commissionId,
				business_id: businessId,
				amount: Number(amount),
				extra_paid_amount: extra_paid_amount ? Number(extra_paid_amount) : 0,
				payment_mode: payment_mode || "cash",
				reference_number: reference_number || null,
				receipt_path: receipt_path || null,
				note: note || null,
				paid_date: paid_date || new Date().toISOString().slice(0, 10),
			})
			.select("*")
			.single();

		if (insertErr) {
			return NextResponse.json({ error: insertErr.message }, { status: 400 });
		}

		return NextResponse.json(newPayment, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
