import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const { searchParams } = new URL(req.url);

		const dateFrom = searchParams.get("date_from");
		const dateTo = searchParams.get("date_to");
		const status = searchParams.get("status"); // paid, pending, partial
		const page = Number(searchParams.get("page") || 1);
		const limit = Number(searchParams.get("limit") || 10);

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Base query
		let query = supabase
			.from("advisor_commissions")
			.select(
				`
				*,
				plot_sales!inner(
					id,
					sale_phase,
					token_date,
					plots(
						id,
						plot_number,
						projects(id, name)
					),
					customers(id, name)
				)
				`,
				{ count: "exact" }
			)
			.eq("advisor_id", advisorId);

		// Apply date filters
		if (dateFrom) {
			query = query.gte("created_at", dateFrom);
		}
		if (dateTo) {
			query = query.lte("created_at", dateTo);
		}

		// Apply status filters
		if (status === "paid") {
			query = query.lte("remaining_commission", 0);
		} else if (status === "pending") {
			// remaining_commission equals total_commission_amount, or amount_paid is 0
			query = query.eq("amount_paid", 0);
		} else if (status === "partial") {
			query = query.gt("amount_paid", 0).gt("remaining_commission", 0);
		}

		// Ordering
		query = query.order("created_at", { ascending: false });

		// Pagination
		const offset = (page - 1) * limit;
		query = query.range(offset, offset + limit - 1);

		const { data, count, error } = await query;

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Format final response items
		const formatted = (data || []).map((item: any) => {
			const sale = item.plot_sales;
			const plot = sale?.plots;
			const project = plot?.projects;
			const customer = sale?.customers;

			// Determine status label
			let currentStatus = "pending";
			if (item.remaining_commission <= 0) {
				currentStatus = "paid";
			} else if (item.amount_paid > 0) {
				currentStatus = "partial";
			}

			return {
				id: item.id,
				sale_id: item.sale_id,
				commission_percentage: item.commission_percentage,
				total_commission_amount: item.total_commission_amount,
				amount_paid: item.amount_paid,
				remaining_commission: item.remaining_commission,
				paid_date: item.paid_date,
				created_at: item.created_at,
				notes: item.notes,
				status: currentStatus,
				// Joined properties
				plot_number: plot?.plot_number || "—",
				project_name: project?.name || "—",
				customer_name: customer?.name || "—",
				sale_phase: sale?.sale_phase || "—",
				token_date: sale?.token_date || null,
			};
		});

		return NextResponse.json({
			data: formatted,
			pagination: {
				total: count || 0,
				page,
				limit,
				pages: Math.ceil((count || 0) / limit),
			},
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
