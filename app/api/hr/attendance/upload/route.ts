import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";
import { matrixFromAttendanceUpload } from "@/lib/hr/attendance-upload-matrix";
import { parseWorkDurationCsvMatrix } from "@/lib/hr/csv-work-duration-parser";
import { upsertParsedAttendanceRows } from "@/lib/hr/attendance-import";

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const form = await req.formData();
	const file = form.get("file");
	if (!(file instanceof Blob)) {
		return NextResponse.json({ error: "Missing file" }, { status: 400 });
	}

	const name = file instanceof File ? file.name.toLowerCase() : "";

	const yearRaw = form.get("defaultYear");
	const defaultYear =
		typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw.trim())
			? parseInt(yearRaw.trim(), 10)
			: new Date().getFullYear();

	const dryRun =
		form.get("dryRun") === "true" ||
		form.get("dryRun") === "1" ||
		form.get("dryRun") === "yes";

	const buf = await file.arrayBuffer();

	let matrix: unknown[][];
	let fileKind: "excel" | "csv";
	try {
		const out = matrixFromAttendanceUpload(buf, name);
		matrix = out.matrix;
		fileKind = out.kind;
	} catch (e) {
		if (e instanceof Error && e.message === "UNSUPPORTED_TYPE") {
			return NextResponse.json(
				{
					error:
						"Unsupported file type. Use .xlsx / .xls (Excel) or .csv (UTF-8) for the Work Duration report.",
				},
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{
				error:
					"Could not read this file. Re-save the Excel workbook, or export as CSV (UTF-8) and try again.",
			},
			{ status: 400 }
		);
	}

	const { rows, errors: parseErrors } = parseWorkDurationCsvMatrix(matrix, { defaultYear });
	const formatLabel = fileKind === "excel" ? "excel-work-duration" : "csv-work-duration";

	if (dryRun) {
		const previewRows = rows.slice(0, 500).map((r) => ({
			employee_code: r.employee_code,
			employee_name: r.employee_name,
			work_date: r.work_date,
			in_time: r.in_time,
			out_time: r.out_time,
			duration_minutes: r.duration_minutes,
			overtime_minutes: r.overtime_minutes,
			attendance_type: r.attendance_type,
			is_valid: r.is_valid,
			error: r.error,
		}));
		return NextResponse.json({
			inserted: 0,
			errors: parseErrors,
			parsed: rows.length,
			format: formatLabel,
			fileKind,
			defaultYear,
			previewRows,
			dryRun: true,
		});
	}

	const { inserted, errors: upsertErrors, previewRows } = await upsertParsedAttendanceRows(
		auth.supabase,
		rows
	);

	return NextResponse.json({
		inserted,
		errors: [...parseErrors, ...upsertErrors],
		parsed: rows.length,
		format: formatLabel,
		fileKind,
		defaultYear,
		previewRows,
		dryRun: false,
	});
}
