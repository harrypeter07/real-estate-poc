import type { ParsedAttendanceRow } from "./types";
import type { HrAttendanceType } from "./types";

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

function normalizeAttendanceType(t: string | undefined): HrAttendanceType {
	if (t === "leave" || t === "holiday") return t;
	return "present";
}

/** Map many possible Excel code strings to employee UUID (e.g. "1", "01", "001"). */
function buildEmployeeCodeLookup(
	emps: Array<{ id: string; employee_code: string }>
): Map<string, string> {
	const m = new Map<string, string>();
	for (const e of emps) {
		const raw = String(e.employee_code ?? "").trim();
		if (!raw) continue;
		m.set(raw, e.id);
		const digits = raw.replace(/\D/g, "");
		if (digits) {
			m.set(digits, e.id);
			const n = parseInt(digits, 10);
			if (!Number.isNaN(n)) {
				m.set(String(n), e.id);
				for (const w of [2, 3, 4]) {
					m.set(String(n).padStart(w, "0"), e.id);
				}
			}
		}
	}
	return m;
}

function resolveEmployeeId(lookup: Map<string, string>, code: string): string | undefined {
	const raw = String(code ?? "").trim();
	if (!raw) return undefined;
	if (lookup.has(raw)) return lookup.get(raw);
	const digits = raw.replace(/\D/g, "");
	if (digits && lookup.has(digits)) return lookup.get(digits);
	const n = parseInt(digits, 10);
	if (!Number.isNaN(n) && lookup.has(String(n))) return lookup.get(String(n));
	return undefined;
}

type UpsertRow = {
	employee_id: string;
	work_date: string;
	in_time: string | null;
	out_time: string | null;
	duration_minutes: number | null;
	overtime_minutes: number;
	attendance_type: HrAttendanceType;
	is_valid: boolean;
};

function toUpsertRow(r: ParsedAttendanceRow, employeeId: string): UpsertRow {
	return {
		employee_id: employeeId,
		work_date: r.work_date,
		in_time: r.in_time && r.in_time !== "00:00" ? r.in_time : null,
		out_time: r.out_time && r.out_time !== "00:00" ? r.out_time : null,
		duration_minutes: r.duration_minutes,
		overtime_minutes: Math.max(0, r.overtime_minutes ?? 0),
		attendance_type: normalizeAttendanceType(r.attendance_type),
		is_valid: Boolean(r.is_valid),
	};
}

const BATCH = 150;

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
	const lookup = buildEmployeeCodeLookup((emps ?? []) as Array<{ id: string; employee_code: string }>);

	const insertErrors: string[] = [];
	let inserted = 0;

	const prepared: UpsertRow[] = [];
	const skipped: string[] = [];

	for (const r of rows) {
		const eid = resolveEmployeeId(lookup, r.employee_code);
		if (!eid) {
			skipped.push(`Unknown employee code: ${r.employee_code}`);
			continue;
		}
		prepared.push(toUpsertRow(r, eid));
	}

	insertErrors.push(...skipped);

	for (let i = 0; i < prepared.length; i += BATCH) {
		const chunk = prepared.slice(i, i + BATCH);
		const { error } = await supabase.from("hr_attendance").upsert(chunk, {
			onConflict: "employee_id,work_date",
		});
		if (!error) {
			inserted += chunk.length;
			continue;
		}
		// Fallback: row-by-row for this chunk (clearer errors, tolerates odd rows)
		for (const row of chunk) {
			const { error: rowErr } = await supabase.from("hr_attendance").upsert(row, {
				onConflict: "employee_id,work_date",
			});
			if (rowErr) {
				insertErrors.push(`${row.work_date} (${row.employee_id.slice(0, 8)}…): ${rowErr.message}`);
			} else {
				inserted++;
			}
		}
	}

	return {
		inserted,
		errors: insertErrors,
		previewRows: buildPreviewRows(rows),
	};
}
