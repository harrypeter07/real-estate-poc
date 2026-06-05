import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

// GET /api/payments - List payments with filters
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
		const saleId = url.searchParams.get("sale_id");
		const customerId = url.searchParams.get("customer_id");
		const paymentMode = url.searchParams.get("payment_mode");
		const isConfirmed = url.searchParams.get("is_confirmed");
		const dateFrom = url.searchParams.get("date_from");
		const dateTo = url.searchParams.get("date_to");
		const page = parseInt(url.searchParams.get("page") || "1");
		const limit = parseInt(url.searchParams.get("limit") || "10");

		const offset = (page - 1) * limit;

		let query = supabase
			.from("payments")
			.select(`
				*,
				customers(id, name, phone),
				plot_sales!inner(id, is_cancelled, sale_phase, plots(plot_number, projects(name)))
			`, { count: "exact" })
			.eq("business_id", businessId)
			.eq("plot_sales.is_cancelled", false);

		if (saleId && saleId !== "all") {
			query = query.eq("sale_id", saleId);
		}
		if (customerId && customerId !== "all") {
			query = query.eq("customer_id", customerId);
		}
		if (paymentMode && paymentMode !== "all") {
			query = query.eq("payment_mode", paymentMode);
		}
		if (isConfirmed !== null && isConfirmed !== undefined && isConfirmed !== "all") {
			query = query.eq("is_confirmed", isConfirmed === "true");
		}
		if (dateFrom) {
			query = query.gte("payment_date", dateFrom);
		}
		if (dateTo) {
			query = query.lte("payment_date", dateTo);
		}

		const { data: payments, count, error } = await query
			.order("payment_date", { ascending: false })
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Also fetch linked EMI numbers
		const payIds = (payments || []).map((p) => p.id);
		const emiLinks: Record<string, number> = {};

		if (payIds.length > 0) {
			const { data: emis } = await supabase
				.from("emi_schedule")
				.select("payment_id, emi_number")
				.in("payment_id", payIds);

			if (emis) {
				for (const emi of emis) {
					if (emi.payment_id) {
						emiLinks[emi.payment_id] = emi.emi_number;
					}
				}
			}
		}

		const result = (payments || []).map((pay: any) => ({
			...pay,
			customer_name: pay.customers?.name || "—",
			customer_phone: pay.customers?.phone || "—",
			plot_number: pay.plot_sales?.plots?.plot_number || "—",
			project_name: pay.plot_sales?.plots?.projects?.name || "—",
			emi_number: emiLinks[pay.id] || null,
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

// POST /api/payments - Add a new payment transaction
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

		const {
			sale_id,
			customer_id,
			amount,
			payment_date,
			payment_mode,
			slip_number,
			notes = "",
			emi_id,
			penalty_id,
		} = body;

		if (!sale_id || !customer_id || !amount || !payment_mode) {
			return NextResponse.json(
				{ error: "sale_id, customer_id, amount, and payment_mode are required" },
				{ status: 400 }
			);
		}

		// Generate receipt number REC-YYYYMMDD-XXXX
		const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
		const randomSuffix = Math.floor(1000 + Math.random() * 9000);
		const generatedSlipNo = slip_number || `REC-${todayStr}-${randomSuffix}`;

		// Insert payment record
		const { data: payment, error: payErr } = await supabase
			.from("payments")
			.insert({
				business_id: businessId,
				sale_id,
				customer_id,
				amount: Number(amount),
				payment_date: payment_date || new Date().toISOString().split("T")[0],
				payment_mode,
				slip_number: generatedSlipNo,
				is_confirmed: true, // Default to confirmed/pakka for demo simplicity, or false if user wants verification flow
				notes,
			})
			.select("*")
			.single();

		if (payErr || !payment) {
			return NextResponse.json({ error: payErr?.message || "Failed to log payment" }, { status: 400 });
		}

		// 2. If emi_id is provided, update emi_schedule
		if (emi_id) {
			const { data: emi } = await supabase
				.from("emi_schedule")
				.select("emi_amount, paid_amount")
				.eq("id", emi_id)
				.single();

			if (emi) {
				const newPaid = Number(emi.paid_amount || 0) + Number(amount);
				const status = newPaid >= Number(emi.emi_amount) ? "paid" : "partial";
				await supabase
					.from("emi_schedule")
					.update({
						paid_amount: newPaid,
						status,
						payment_id: payment.id,
						paid_date: payment_date || new Date().toISOString().split("T")[0],
						updated_at: new Date().toISOString(),
					})
					.eq("id", emi_id);
			}
		}

		// 3. If penalty_id is provided, mark payment_penalties.is_paid = true
		if (penalty_id) {
			await supabase
				.from("payment_penalties")
				.update({
					is_paid: true,
					payment_id: payment.id,
					paid_date: payment_date || new Date().toISOString().split("T")[0],
					updated_at: new Date().toISOString(),
				})
				.eq("id", penalty_id);
		}

		// 4. Recalculate plot_sales.amount_paid and remaining_amount
		const { data: sale } = await supabase
			.from("plot_sales")
			.select("total_sale_amount, discount_amount")
			.eq("id", sale_id)
			.single();

		if (sale) {
			const { data: allPays } = await supabase
				.from("payments")
				.select("amount")
				.eq("sale_id", sale_id)
				.eq("is_confirmed", true);

			const amountPaid = (allPays || []).reduce((sum, p) => sum + Number(p.amount), 0);
			const remainingAmount = Number(sale.total_sale_amount) - Number(sale.discount_amount || 0) - amountPaid;

			await supabase
				.from("plot_sales")
				.update({
					amount_paid: amountPaid,
					remaining_amount: remainingAmount,
					updated_at: new Date().toISOString(),
				})
				.eq("id", sale_id);
		}

		return NextResponse.json({
			payment,
			msg: "Payment logged successfully",
		}, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
