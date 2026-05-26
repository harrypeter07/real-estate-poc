import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

		const { saleId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { discount_amount, discount_reason, approved_by } = body;

		if (discount_amount == null || !approved_by) {
			return NextResponse.json({ error: "discount_amount and approved_by are required" }, { status: 400 });
		}

		const { data: updatedSale, error: updateErr } = await supabase
			.from("plot_sales")
			.update({
				discount_amount: Number(discount_amount),
				discount_reason: discount_reason || null,
				discount_approved_by: approved_by,
				updated_at: new Date().toISOString(),
			})
			.eq("id", saleId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json(updatedSale);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
