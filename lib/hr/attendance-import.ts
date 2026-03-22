import type { ParsedAttendanceRow } from "./types";

export type AttendancePreviewRow = {
	employee_code: string;
	employee_name?: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: string;
	is_valid: boolean;
	error?: string;
};

function buildPreviewRows(rows: ParsedAttendanceRow[], cap = 500): AttendancePreviewRow[] {
	return rows.slice(0, cap).map((r) => ({
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
}

/** Upsert parsed attendance for known employee codes. */
export async function upsertParsedAttendanceRows(
	supabase: { from: (t: string) => any },
	rows: ParsedAttendanceRow[]
): Promise<{
	inserted: number;
	errors: string[];
	previewRows: AttendancePreviewRow[];
}> {
	const { data: emps, error: e2 } = await supabase.from("hr_employees").select("id, employee_code");
	if (e2) {
		return {
			inserted: 0,
			errors: [e2.message],
			previewRows: buildPreviewRows(rows),
		};
	}
	const codeToId = new Map((emps ?? []).map((e: { employee_code: string; id: string }) => [String(e.employee_code).trim(), e.id]));

	const insertErrors: string[] = [];
	let inserted = 0;

	for (const r of rows) {
		const eid = codeToId.get(r.employee_code);
		if (!eid) {
			insertErrors.push(`Unknown employee code: ${r.employee_code}`);
			continue;
		}
		const { error } = await supabase.from("hr_attendance").upsert(
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

	return {
		inserted,
		errors: insertErrors,
		previewRows: buildPreviewRows(rows),
	};
}
