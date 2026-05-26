import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const { searchParams } = new URL(req.url);
		const businessId = searchParams.get("business_id");

		if (!businessId) {
			return NextResponse.json({ error: "business_id is required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const { data, error } = await supabase
			.from("advisor_kyc_documents")
			.select("*, business_admins(name)")
			.eq("advisor_id", advisorId)
			.eq("business_id", businessId)
			.order("created_at", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const formatted = (data || []).map((item: any) => ({
			...item,
			verified_by_name: item.business_admins?.name || null,
		}));

		return NextResponse.json(formatted);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ advisorId: string }> }
) {
	try {
		const { advisorId } = await params;
		const formData = await req.formData().catch(() => null);
		if (!formData) {
			return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
		}

		const file = formData.get("file") as File | null;
		const documentType = formData.get("document_type") as string | null;
		const documentNumber = formData.get("document_number") as string | null;
		const expiryDate = formData.get("expiry_date") as string | null;
		const notes = formData.get("notes") as string | null;
		const businessId = formData.get("business_id") as string | null;

		// Validation
		if (!file || !documentType || !businessId) {
			return NextResponse.json(
				{ error: "file, document_type, and business_id are required" },
				{ status: 400 }
			);
		}

		const validTypes = [
			"aadhaar",
			"pan",
			"passport",
			"voter_id",
			"driving_license",
			"bank_passbook",
			"photo",
			"agreement",
			"other",
		];
		if (!validTypes.includes(documentType)) {
			return NextResponse.json(
				{ error: `Invalid document_type. Must be one of: ${validTypes.join(", ")}` },
				{ status: 400 }
			);
		}

		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return NextResponse.json(
				{ error: "Invalid file type. Only JPG, PNG, and PDF are allowed." },
				{ status: 400 }
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File size exceeds the 5MB limit." },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		if (!supabase) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Save file to filesystem: /uploads/kyc/:businessId/:advisorId/
		const uploadsDir = path.join(process.cwd(), "uploads", "kyc", businessId, advisorId);
		await fs.mkdir(uploadsDir, { recursive: true });

		const sanitizedFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
		const targetFilePath = path.join(uploadsDir, sanitizedFileName);

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await fs.writeFile(targetFilePath, buffer);

		// Insert DB record
		const relativePath = path.join("uploads", "kyc", businessId, advisorId, sanitizedFileName).replace(/\\/g, "/");

		const { data: document, error: dbError } = await supabase
			.from("advisor_kyc_documents")
			.insert({
				advisor_id: advisorId,
				business_id: businessId,
				document_type: documentType,
				document_number: documentNumber || null,
				file_path: relativePath,
				file_name: file.name,
				file_size: file.size,
				mime_type: file.type,
				status: "pending",
				expiry_date: expiryDate ? (expiryDate === "" ? null : expiryDate) : null,
				notes: notes || null,
			})
			.select("*")
			.single();

		if (dbError) {
			// Cleanup written file
			await fs.unlink(targetFilePath).catch(() => null);
			return NextResponse.json({ error: dbError.message }, { status: 400 });
		}

		return NextResponse.json(document, { status: 201 });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
