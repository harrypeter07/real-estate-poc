import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ enquiryId: string }> }) {
	try {
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { enquiryId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { pipeline_stage, lost_reason } = body;

		if (!pipeline_stage) {
			return NextResponse.json({ error: "pipeline_stage is required" }, { status: 400 });
		}

		if (pipeline_stage === "lost" && !lost_reason) {
			return NextResponse.json({ error: "lost_reason is required when stage is lost" }, { status: 400 });
		}

		// Fetch existing lead to check details
		const { data: existingLead, error: fetchErr } = await supabase
			.from("enquiry_customers")
			.select("*")
			.eq("id", enquiryId)
			.single();

		if (fetchErr || !existingLead) {
			return NextResponse.json({ error: "Enquiry lead not found" }, { status: 404 });
		}

		const updatePayload: any = {
			pipeline_stage,
			updated_at: new Date().toISOString(),
		};

		if (pipeline_stage === "lost") {
			updatePayload.lost_reason = lost_reason;
			updatePayload.is_active = false;
		}

		if (pipeline_stage === "converted") {
			updatePayload.is_active = false;
			updatePayload.upgraded_at = new Date().toISOString();
		}

		// Update lead
		const { data: updatedLead, error: updateErr } = await supabase
			.from("enquiry_customers")
			.update(updatePayload)
			.eq("id", enquiryId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		// If converting to converted, ensure customer is active
		if (pipeline_stage === "converted") {
			const { data: customer } = await supabase
				.from("customers")
				.select("id")
				.eq("enquiry_temp_id", enquiryId)
				.maybeSingle();

			if (customer) {
				await supabase
					.from("customers")
					.update({
						is_active: true,
						upgraded_from_enquiry_id: enquiryId,
						upgraded_from_enquiry_at: new Date().toISOString(),
						upgraded_from_enquiry_category: existingLead.category,
						upgraded_from_enquiry_details: existingLead.details,
					})
					.eq("id", customer.id);

				await supabase
					.from("enquiry_customers")
					.update({ upgraded_customer_id: customer.id })
					.eq("id", enquiryId);
			}
		}

		return NextResponse.json(updatedLead);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
