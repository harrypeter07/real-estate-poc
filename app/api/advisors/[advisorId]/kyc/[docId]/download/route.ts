import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string; docId: string }> }
) {
	try {
		const { advisorId, docId } = await params;
		const supabase = await createClient();
		if (!supabase) {
			return new Response("Database connection failed", { status: 500 });
		}

		// Authenticate
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new Response("Unauthorized", { status: 401 });
		}

		// Fetch document path and info
		const { data: document, error } = await supabase
			.from("advisor_kyc_documents")
			.select("file_path, file_name, mime_type")
			.eq("id", docId)
			.eq("advisor_id", advisorId)
			.maybeSingle();

		if (error || !document) {
			return new Response("Document not found", { status: 404 });
		}

		const absolutePath = path.join(process.cwd(), document.file_path);
		const fileBuffer = await fs.readFile(absolutePath);

		return new Response(fileBuffer, {
			headers: {
				"Content-Type": document.mime_type || "application/octet-stream",
				"Content-Disposition": `inline; filename="${encodeURIComponent(document.file_name || "document")}"`,
			},
		});
	} catch (err: any) {
		return new Response(err.message || "Internal Server Error", { status: 500 });
	}
}
