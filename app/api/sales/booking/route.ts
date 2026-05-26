import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";

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
			plot_id,
			customer_id,
			advisor_id,
			sale_phase,
			token_date,
			total_sale_amount,
			discount_amount = 0,
			discount_reason = "",
			discount_approved_by = null,
			down_payment = 0,
			monthly_emi = 0,
			emi_day = 5,
			lead_source = "other",
			notes = "",
			generate_emi = true,
			emi_start_date,
			emi_months,
		} = body;

		if (!plot_id || !customer_id || !advisor_id || !total_sale_amount || !sale_phase) {
			return NextResponse.json(
				{ error: "plot_id, customer_id, advisor_id, total_sale_amount, and sale_phase are required" },
				{ status: 400 }
			);
		}

		// 1. Validate plot is available
		const { data: plot, error: plotErr } = await supabase
			.from("plots")
			.select("status")
			.eq("id", plot_id)
			.single();

		if (plotErr || !plot) {
			return NextResponse.json({ error: "Plot not found" }, { status: 404 });
		}

		if (plot.status === "sold" || plot.status === "sold_without_data") {
			return NextResponse.json({ error: "Plot is already sold." }, { status: 409 });
		}

		// 2. Calculate net amount
		const netAmount = Number(total_sale_amount) - Number(discount_amount) - Number(down_payment);

		// 3. Insert into plot_sales
		const { data: sale, error: saleErr } = await supabase
			.from("plot_sales")
			.insert({
				business_id: businessId,
				plot_id,
				customer_id,
				advisor_id,
				sale_phase,
				token_date: token_date || new Date().toISOString().split("T")[0],
				total_sale_amount: Number(total_sale_amount),
				discount_amount: Number(discount_amount),
				discount_reason: discount_reason || null,
				discount_approved_by: discount_approved_by || null,
				down_payment: Number(down_payment),
				monthly_emi: Number(monthly_emi),
				emi_day: Number(emi_day),
				amount_paid: Number(down_payment), // initialize down_payment as paid amount
				remaining_amount: netAmount,
				lead_source,
				notes: notes || null,
				is_cancelled: false,
			})
			.select("*")
			.single();

		if (saleErr || !sale) {
			return NextResponse.json({ error: saleErr?.message || "Failed to create booking" }, { status: 400 });
		}

		// 4. Update plots.status = 'sold'
		await supabase
			.from("plots")
			.update({ status: "sold" })
			.eq("id", plot_id);

		// 5. If generate_emi = true
		let emis: any[] = [];
		if (generate_emi && netAmount > 0 && monthly_emi > 0) {
			const count = emi_months ? Number(emi_months) : Math.ceil(netAmount / monthly_emi);
			const baseStartDate = emi_start_date ? new Date(emi_start_date) : new Date();

			for (let i = 1; i <= count; i++) {
				const dueDate = new Date(baseStartDate);
				dueDate.setMonth(dueDate.getMonth() + (i - 1));
				if (emi_day) {
					dueDate.setDate(Math.min(Number(emi_day), new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()));
				}

				let amount = Number(monthly_emi);
				if (emi_months) {
					amount = Number((netAmount / count).toFixed(2));
				} else if (i === count) {
					amount = Number((netAmount - (monthly_emi * (count - 1))).toFixed(2));
				}

				const { data: emiRow } = await supabase
					.from("emi_schedule")
					.insert({
						sale_id: sale.id,
						customer_id,
						business_id: businessId,
						emi_number: i,
						due_date: dueDate.toISOString().split("T")[0],
						emi_amount: amount,
						paid_amount: 0,
						status: "pending",
					})
					.select("*")
					.single();

				if (emiRow) {
					emis.push(emiRow);
				}
			}
		}

		// 6. Record the down payment in payments table if down_payment > 0
		if (Number(down_payment) > 0) {
			await supabase
				.from("payments")
				.insert({
					business_id: businessId,
					sale_id: sale.id,
					customer_id,
					amount: Number(down_payment),
					payment_date: token_date || new Date().toISOString().split("T")[0],
					payment_mode: "cash",
					is_confirmed: true,
					slip_number: `REC-${new Date().toISOString().replace(/\D/g, "").slice(0, 8)}-DOWN`,
					notes: "Down payment recorded at booking",
				});
		}

		// 7. Auto-convert enquiry lead to 'converted'
		const { data: cust } = await supabase
			.from("customers")
			.select("enquiry_temp_id")
			.eq("id", customer_id)
			.single();

		if (cust?.enquiry_temp_id) {
			const enquiryId = cust.enquiry_temp_id;
			await supabase
				.from("enquiry_customers")
				.update({
					pipeline_stage: "converted",
					is_active: false,
					upgraded_customer_id: customer_id,
					upgraded_at: new Date().toISOString(),
				})
				.eq("id", enquiryId);

			await supabase
				.from("customers")
				.update({
					is_active: true,
				})
				.eq("id", customer_id);
		}

		return NextResponse.json({
			sale,
			emi_schedule: emis,
		}, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
