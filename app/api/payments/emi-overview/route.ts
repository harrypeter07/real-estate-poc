import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

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

		// 1. Fetch active sales with customer and plot details
		const { data: sales, error: salesErr } = await supabase
			.from("plot_sales")
			.select(`
				id,
				remaining_amount,
				monthly_emi,
				emi_day,
				token_date,
				customers(id, name, phone),
				plots(plot_number, projects(name)),
				payments(payment_date)
			`)
			.eq("business_id", businessId)
			.eq("is_cancelled", false);

		if (salesErr) {
			return NextResponse.json({ error: salesErr.message }, { status: 400 });
		}

		if (!sales || sales.length === 0) {
			return NextResponse.json({ upcoming: [], overdue: [], recent: [] });
		}

		const saleLastPaymentDateMap = new Map();
		const saleMap = new Map();
		const saleIds: string[] = [];

		for (const sale of sales) {
			saleMap.set(sale.id, sale);
			saleIds.push(sale.id);
			const paymentDates = (sale.payments || [])
				.map((p: any) => p.payment_date)
				.filter(Boolean)
				.sort((a: string, b: string) => b.localeCompare(a));
			saleLastPaymentDateMap.set(sale.id, paymentDates[0] || null);
		}

		// 2. Fetch all EMIs for these sales
		const { data: emis, error: emiErr } = await supabase
			.from("emi_schedule")
			.select(`
				*,
				payments(id, amount, payment_date, payment_mode)
			`)
			.in("sale_id", saleIds);

		if (emiErr) {
			return NextResponse.json({ error: emiErr.message }, { status: 400 });
		}

		// 3. Fetch recent payments from payments table
		const { data: recentPayments, error: recentErr } = await supabase
			.from("payments")
			.select(`
				id,
				amount,
				payment_date,
				payment_mode,
				slip_number,
				customers(id, name, phone),
				plot_sales(id, remaining_amount, plots(plot_number, projects(name)))
			`)
			.eq("business_id", businessId)
			.order("payment_date", { ascending: false })
			.limit(5);

		const today = new Date();
		const todayStr = today.toISOString().split("T")[0];

		// Calculate virtual due dates for fallback
		const lastMonth = new Date(today);
		lastMonth.setMonth(today.getMonth() - 1);
		const lastMonth5th = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-05`;

		const nextMonth = new Date(today);
		nextMonth.setMonth(today.getMonth() + 1);
		const nextMonth5th = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-05`;

		const mappedEmis: any[] = [];

		if (emis && emis.length > 0) {
			// Use actual EMI schedule rows
			for (const emi of emis) {
				const sale = saleMap.get(emi.sale_id) as any;
				let displayStatus = emi.status;
				if ((emi.status === "pending" || emi.status === "overdue" || emi.status === "partial") && emi.due_date < todayStr) {
					displayStatus = "overdue";
				} else if (emi.status === "pending" && emi.due_date >= todayStr) {
					displayStatus = "upcoming";
				}

				mappedEmis.push({
					id: emi.id,
					emi_number: emi.emi_number,
					emi_amount: emi.emi_amount,
					paid_amount: emi.paid_amount || 0,
					remaining_amount: emi.remaining_amount || 0,
					due_date: emi.due_date,
					status: displayStatus,
					paid_date: emi.paid_date || emi.payments?.payment_date || null,
					payment_mode: emi.payments?.payment_mode || "—",
					customer_name: sale?.customers?.name || "—",
					customer_phone: sale?.customers?.phone || "—",
					plot_number: sale?.plots?.plot_number || "—",
					project_name: sale?.plots?.projects?.name || "—",
					total_remaining_balance: sale?.remaining_amount || 0,
					payment_id: emi.payment_id || null,
					last_payment_date: saleLastPaymentDateMap.get(emi.sale_id) || null,
				});
			}
		} else {
			// Fallback: Generate dynamic virtual EMIs from active outstanding bookings
			for (const sale of sales as any[]) {
				if (sale.remaining_amount <= 0) continue;

				const emiAmt = sale.monthly_emi > 0 ? sale.monthly_emi : Math.min(15000, Number((sale.remaining_amount * 0.05).toFixed(0)));
				
				// Virtual Overdue
				mappedEmis.push({
					id: `virtual-overdue-${sale.id}`,
					emi_number: 1,
					emi_amount: emiAmt,
					paid_amount: 0,
					remaining_amount: emiAmt,
					due_date: lastMonth5th,
					status: "overdue",
					paid_date: null,
					payment_mode: "—",
					customer_name: sale.customers?.name || "—",
					customer_phone: sale.customers?.phone || "—",
					plot_number: sale.plots?.plot_number || "—",
					project_name: sale.plots?.projects?.name || "—",
					total_remaining_balance: sale.remaining_amount,
					payment_id: null,
					last_payment_date: saleLastPaymentDateMap.get(sale.id) || null,
				});

				// Virtual Upcoming
				mappedEmis.push({
					id: `virtual-upcoming-${sale.id}`,
					emi_number: 2,
					emi_amount: emiAmt,
					paid_amount: 0,
					remaining_amount: emiAmt,
					due_date: nextMonth5th,
					status: "upcoming",
					paid_date: null,
					payment_mode: "—",
					customer_name: sale.customers?.name || "—",
					customer_phone: sale.customers?.phone || "—",
					plot_number: sale.plots?.plot_number || "—",
					project_name: sale.plots?.projects?.name || "—",
					total_remaining_balance: sale.remaining_amount,
					payment_id: null,
					last_payment_date: saleLastPaymentDateMap.get(sale.id) || null,
				});
			}
		}

		// Categorize Overdue and Upcoming
		const overdue = mappedEmis
			.filter((emi) => emi.status === "overdue" && emi.remaining_amount > 0)
			.sort((a, b) => a.due_date.localeCompare(b.due_date))
			.slice(0, 5);

		const upcoming = mappedEmis
			.filter((emi) => (emi.status === "upcoming" || emi.status === "pending" || emi.status === "partial") && emi.due_date >= todayStr && emi.remaining_amount > 0)
			.sort((a, b) => a.due_date.localeCompare(b.due_date))
			.slice(0, 5);

		// Map recent payments from payments table
		const recent = (recentPayments || []).map((p: any) => ({
			id: p.id,
			emi_number: p.slip_number || "—",
			emi_amount: p.amount,
			paid_amount: p.amount,
			remaining_amount: 0,
			due_date: p.payment_date,
			status: "paid",
			paid_date: p.payment_date,
			payment_mode: p.payment_mode || "—",
			customer_name: p.customers?.name || "—",
			customer_phone: p.customers?.phone || "—",
			plot_number: p.plot_sales?.plots?.plot_number || "—",
			project_name: p.plot_sales?.plots?.projects?.name || "—",
			total_remaining_balance: p.plot_sales?.remaining_amount || 0,
			payment_id: p.id,
		}));

		return NextResponse.json({
			upcoming,
			overdue,
			recent,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
