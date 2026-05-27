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

		// Query 9k
		const { data: payments, error } = await supabase
			.from("payments")
			.select(`
				id,
				amount,
				payment_date,
				payment_mode,
				slip_number,
				receipt_path,
				is_confirmed,
				notes,
				created_at,
				plot_sales!inner(
					id,
					plots!inner(
						id,
						plot_number,
						projects!inner(id, name)
					)
				)
			`)
			.eq("customer_id", id)
			.order("payment_date", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		// Get linked emi_number and penalties for these payments
		const payIds = (payments || []).map((p) => p.id);
		const emiLinks: Record<string, { emi_number: number; due_date: string }> = {};
		const penaltyLinks: Record<string, { penalty_amount: number; penalty_type: string }> = {};

		if (payIds.length > 0) {
			const [emisRes, penaltiesRes] = await Promise.all([
				supabase.from("emi_schedule").select("payment_id, emi_number, due_date").in("payment_id", payIds),
				supabase.from("payment_penalties").select("payment_id, penalty_amount, penalty_type").in("payment_id", payIds),
			]);

			if (emisRes.data) {
				for (const emi of emisRes.data) {
					if (emi.payment_id) {
						emiLinks[emi.payment_id] = { emi_number: emi.emi_number, due_date: emi.due_date };
					}
				}
			}

			if (penaltiesRes.data) {
				for (const pen of penaltiesRes.data) {
					if (pen.payment_id) {
						penaltyLinks[pen.payment_id] = { penalty_amount: Number(pen.penalty_amount), penalty_type: pen.penalty_type };
					}
				}
			}
		}

		const result = (payments || []).map((p: any) => {
			const plot = p.plot_sales?.plots;
			const project = plot?.projects;
			const emi = emiLinks[p.id];
			const pen = penaltyLinks[p.id];

			return {
				id: p.id,
				amount: p.amount,
				payment_date: p.payment_date,
				payment_mode: p.payment_mode,
				slip_number: p.slip_number,
				receipt_path: p.receipt_path,
				is_confirmed: p.is_confirmed,
				notes: p.notes,
				created_at: p.created_at,
				emi_number: emi?.emi_number || null,
				emi_due_date: emi?.due_date || null,
				plot_number: plot?.plot_number || "—",
				project_name: project?.name || "—",
				penalty_amount: pen?.penalty_amount || null,
				penalty_type: pen?.penalty_type || null,
			};
		});

		return NextResponse.json(result);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
