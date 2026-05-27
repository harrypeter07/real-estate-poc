import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; docId: string }> }
) {
	try {
		const { advisorId, docId } = await params;
		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 1. Get document details first
		const { data: document, error: fetchErr } = await supabase
			.from("advisor_kyc_documents")
			.select("file_path")
			.eq("id", docId)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (fetchErr || !document) {
			return NextResponse.json({ error: "Document not found" }, { status: 404 });
		}

		// 2. Delete file from disk
		if (document.file_path) {
			const absolutePath = path.join(process.cwd(), document.file_path);
			await fs.unlink(absolutePath).catch((err) => {
				console.warn(`File could not be deleted from disk: ${absolutePath}. Error: ${err.message}`);
			});
		}

		// 3. Delete database record
		const { error: deleteErr } = await supabase
			.from("advisor_kyc_documents")
			.delete()
			.eq("id", docId)
			.eq("advisor_id", advisorId);

		if (deleteErr) {
			return NextResponse.json({ error: deleteErr.message }, { status: 400 });
		}

		return NextResponse.json({ success: true, message: "Document deleted successfully" });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
