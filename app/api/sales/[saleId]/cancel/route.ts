import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

export async function POST(req: Request, { params }: { params: Promise<{ saleId: string }> }) {
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

		const { saleId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { cancellation_reason, refund_amount = 0, refund_date, cancelled_by } = body;

		if (!cancellation_reason) {
			return NextResponse.json({ error: "cancellation_reason is required" }, { status: 400 });
		}

		// Get booking details
		const { data: sale, error: fetchErr } = await supabase
			.from("plot_sales")
			.select("plot_id, customer_id, total_sale_amount, amount_paid")
			.eq("id", saleId)
			.single();

		if (fetchErr || !sale) {
			return NextResponse.json({ error: "Sale booking not found" }, { status: 404 });
		}

		const resolverName = cancelled_by || user.email || "Admin";

		// 1. Cancel plot sale
		const { data: updatedSale, error: cancelErr } = await supabase
			.from("plot_sales")
			.update({
				is_cancelled: true,
				revoked_at: new Date().toISOString(),
				revoked_by: resolverName,
				cancellation_reason,
				updated_at: new Date().toISOString(),
			})
			.eq("id", saleId)
			.select("*")
			.single();

		if (cancelErr) {
			return NextResponse.json({ error: cancelErr.message }, { status: 400 });
		}

		// 2. Mark plot back to 'available'
		await supabase
			.from("plots")
			.update({ status: "available" })
			.eq("id", sale.plot_id);

		// 3. Delete existing payments for this sale
		await supabase
			.from("payments")
			.delete()
			.eq("sale_id", saleId);

		// 4. Create refund record (negative payment)
		let refundPayment = null;
		if (Number(refund_amount) > 0) {
			const { data: payRow } = await supabase
				.from("payments")
				.insert({
					business_id: businessId,
					sale_id: saleId,
					customer_id: sale.customer_id,
					amount: -Math.abs(Number(refund_amount)),
					payment_date: refund_date || new Date().toISOString().split("T")[0],
					payment_mode: "cash",
					is_confirmed: true,
					slip_number: `REF-${new Date().toISOString().replace(/\D/g, "").slice(0, 8)}-RFND`,
					notes: `Refund for booking cancellation. Reason: ${cancellation_reason}`,
				})
				.select("*")
				.single();
			refundPayment = payRow;
		}

		// 5. Delete all EMI / due payment entries
		await supabase.from("due_payment_reminders").delete().eq("sale_id", saleId);
		await supabase.from("payment_penalties").delete().eq("sale_id", saleId);
		await supabase.from("emi_schedule").delete().eq("sale_id", saleId);

		// 6. Delete recovery records
		await supabase.from("recovery_notes").delete().eq("sale_id", saleId);
		await supabase.from("promise_to_pay").delete().eq("sale_id", saleId);
		await supabase.from("legal_escalations").delete().eq("sale_id", saleId);
		await supabase.from("advisor_recovery_tracking").delete().eq("sale_id", saleId);

		// 7. Delete Commissions
		const { data: commRows } = await supabase
			.from("advisor_commissions")
			.select("id")
			.eq("sale_id", saleId);
		const commIds = commRows?.map((r) => r.id) || [];
		if (commIds.length > 0) {
			await supabase.from("commission_ledger").delete().in("commission_id", commIds);
			await supabase.from("commission_holds").delete().in("commission_id", commIds);
			await supabase.from("advisor_commission_payments").delete().in("commission_id", commIds);
		}
		await supabase.from("advisor_commissions").delete().eq("sale_id", saleId);

		// 8. Recalculate balances (should show only refund payment or 0)
		const amountPaid = Number(refundPayment ? refundPayment.amount : 0);
		const remainingAmount = Number(sale.total_sale_amount) - amountPaid;

		await supabase
			.from("plot_sales")
			.update({
				amount_paid: amountPaid,
				remaining_amount: remainingAmount,
			})
			.eq("id", saleId);

		return NextResponse.json({
			success: true,
			sale: updatedSale,
			refund_payment: refundPayment,
			amount_paid: amountPaid,
			remaining_amount: remainingAmount,
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
