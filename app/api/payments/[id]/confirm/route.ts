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

		// 1. Fetch payment to know the sale_id
		const { data: payment, error: fetchErr } = await supabase
			.from("payments")
			.select("sale_id, amount")
			.eq("id", id)
			.single();

		if (fetchErr || !payment) {
			return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
		}

		// 2. Mark payment confirmed
		const { data: confirmed, error: confirmErr } = await supabase
			.from("payments")
			.update({
				is_confirmed: true,
				updated_at: new Date().toISOString(),
			})
			.eq("id", id)
			.select("*")
			.single();

		if (confirmErr) {
			return NextResponse.json({ error: confirmErr.message }, { status: 400 });
		}

		// 3. Recalculate plot_sales.amount_paid and remaining_amount
		const { data: sale } = await supabase
			.from("plot_sales")
			.select("total_sale_amount, discount_amount")
			.eq("id", payment.sale_id)
			.single();

		if (sale) {
			const { data: allPays } = await supabase
				.from("payments")
				.select("amount")
				.eq("sale_id", payment.sale_id)
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
				.eq("id", payment.sale_id);
		}

		return NextResponse.json(confirmed);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
