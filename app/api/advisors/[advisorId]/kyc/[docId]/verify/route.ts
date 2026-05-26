import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; docId: string }> }
) {
	try {
		const { advisorId, docId } = await params;
		const body = await req.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { status, rejection_reason } = body;

		if (status !== "verified" && status !== "rejected") {
			return NextResponse.json(
				{ error: "status must be either 'verified' or 'rejected'" },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Authenticate and get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Resolve admin_id from business_admins using auth_user_id
		const { data: admin, error: adminErr } = await supabase
			.from("business_admins")
			.select("id")
			.eq("auth_user_id", user.id)
			.maybeSingle();

		if (adminErr || !admin) {
			return NextResponse.json(
				{ error: "Only registered business administrators can verify documents" },
				{ status: 403 }
			);
		}

		const updatePayload: any = {
			status,
			verified_by: admin.id,
			verified_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		if (status === "rejected") {
			updatePayload.rejection_reason = rejection_reason || "Document rejected by administrator";
		} else {
			updatePayload.rejection_reason = null;
		}

		const { data: updatedDoc, error: updateErr } = await supabase
			.from("advisor_kyc_documents")
			.update(updatePayload)
			.eq("id", docId)
			.eq("advisor_id", advisorId)
			.select("*")
			.single();

		if (updateErr) {
			return NextResponse.json({ error: updateErr.message }, { status: 400 });
		}

		return NextResponse.json(updatedDoc);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
