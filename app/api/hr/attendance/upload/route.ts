import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/hr/auth-route";
import { parseAttendanceExcelAuto } from "@/lib/hr/excel-parser";

export async function POST(req: Request) {
	const auth = await requireAdmin();
	if ("error" in auth) return auth.error;

	const form = await req.formData();
	const file = form.get("file");
	if (!(file instanceof Blob)) {
		return NextResponse.json({ error: "Missing file" }, { status: 400 });
	}

	const yearRaw = form.get("defaultYear");
	const defaultYear =
		typeof yearRaw === "string" && /^\d{4}$/.test(yearRaw.trim())
			? parseInt(yearRaw.trim(), 10)
			: new Date().getFullYear();

	const buf = await file.arrayBuffer();
	const { rows, errors: parseErrors, format } = parseAttendanceExcelAuto(buf, {
		defaultYear,
	});

	const { data: emps, error: e2 } = await auth.supabase.from("hr_employees").select("id, employee_code");
	if (e2) {
		return NextResponse.json({ error: e2.message }, { status: 500 });
	}
	const codeToId = new Map((emps ?? []).map((e: any) => [String(e.employee_code).trim(), e.id]));

	const insertErrors: string[] = [...parseErrors];
	let inserted = 0;

	for (const r of rows) {
		const eid = codeToId.get(r.employee_code);
		if (!eid) {
			insertErrors.push(`Unknown employee code: ${r.employee_code}`);
			continue;
		}
		const { error } = await auth.supabase.from("hr_attendance").upsert(
			{
				employee_id: eid,
				work_date: r.work_date,
				in_time: r.in_time,
				out_time: r.out_time,
				duration_minutes: r.duration_minutes,
				overtime_minutes: r.overtime_minutes,
				attendance_type: r.attendance_type,
				is_valid: r.is_valid,
			},
			{ onConflict: "employee_id,work_date" }
		);
		if (error) insertErrors.push(`${r.employee_code} ${r.work_date}: ${error.message}`);
		else inserted++;
	}

	const previewRows = rows.slice(0, 100).map((r) => ({
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
		inserted,
		errors: insertErrors,
		parsed: rows.length,
		format,
		defaultYear,
		previewRows,
	});
}
