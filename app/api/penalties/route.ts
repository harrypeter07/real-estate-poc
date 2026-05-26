import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

// GET /api/penalties - List penalties with filters
export async function GET(req: Request) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const businessId = await getCurrentBusinessId();
		if (!businessId) {
			return NextResponse.json({ error: "Business ID not found" }, { status: 400 });
		}

		const url = new URL(req.url);
		const customerId = url.searchParams.get("customer_id");
		const isPaid = url.searchParams.get("is_paid");
		const isWaived = url.searchParams.get("is_waived");
		const page = parseInt(url.searchParams.get("page") || "1");
		const limit = parseInt(url.searchParams.get("limit") || "10");

		const offset = (page - 1) * limit;

		let query = supabase
			.from("payment_penalties")
			.select(`
				*,
				customers(id, name, phone),
				plot_sales(id, plots(plot_number)),
				emi_schedule(id, emi_number)
			`, { count: "exact" })
			.eq("business_id", businessId);

		if (customerId && customerId !== "all") {
			query = query.eq("customer_id", customerId);
		}
		if (isPaid !== null && isPaid !== undefined && isPaid !== "all") {
			query = query.eq("is_paid", isPaid === "true");
		}
		if (isWaived !== null && isWaived !== undefined && isWaived !== "all") {
			query = query.eq("is_waived", isWaived === "true");
		}

		const { data: penalties, count, error } = await query
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = (penalties || []).map((p: any) => ({
			...p,
			customer_name: p.customers?.name || "—",
			customer_phone: p.customers?.phone || "—",
			plot_number: p.plot_sales?.plots?.plot_number || "—",
			emi_number: p.emi_schedule?.emi_number || null,
		}));

		return NextResponse.json({
			data: result,
			total: count || 0,
			page,
			limit,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// POST /api/penalties - Raise a penalty
export async function POST(req: Request) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const businessId = await getCurrentBusinessId();
		if (!businessId) {
			return NextResponse.json({ error: "Business ID not found" }, { status: 400 });
		}

		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { sale_id, customer_id, emi_id, penalty_type, penalty_amount, reason } = body;

		if (!sale_id || !customer_id || !penalty_amount || !penalty_type) {
			return NextResponse.json(
				{ error: "sale_id, customer_id, penalty_amount, and penalty_type are required" },
				{ status: 400 }
			);
		}

		const { data: penalty, error: insertErr } = await supabase
			.from("payment_penalties")
			.insert({
				business_id: businessId,
				sale_id,
				customer_id,
				emi_id: emi_id || null,
				penalty_type,
				penalty_amount: Number(penalty_amount),
				reason: reason || null,
				is_paid: false,
				is_waived: false,
			})
			.select("*")
			.single();

		if (insertErr || !penalty) {
			return NextResponse.json({ error: insertErr?.message || "Failed to raise penalty" }, { status: 400 });
		}

		// Also update emi_schedule.penalty_amount for linked EMI
		if (emi_id) {
			const { data: emi } = await supabase
				.from("emi_schedule")
				.select("penalty_amount")
				.eq("id", emi_id)
				.single();

			if (emi) {
				const newPenaltyAmount = Number(emi.penalty_amount || 0) + Number(penalty_amount);
				await supabase
					.from("emi_schedule")
					.update({
						penalty_amount: newPenaltyAmount,
						updated_at: new Date().toISOString(),
					})
					.eq("id", emi_id);
			}
		}

		return NextResponse.json(penalty, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
