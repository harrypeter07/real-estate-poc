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

/** Case-insensitive, collapse spaces — for matching file name vs HR name */
export function normalizePersonName(s: string | null | undefined): string {
	return String(s ?? "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

export type HrEmployeeRef = { id: string; employee_code: string; name: string };

/** Map many possible Excel code strings to employee UUID (e.g. "1", "01", "001"). */
export function buildEmployeeCodeLookup(emps: Array<{ id: string; employee_code: string }>): Map<string, string> {
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

export function resolveEmployeeId(lookup: Map<string, string>, code: string): string | undefined {
	const raw = String(code ?? "").trim();
	if (!raw) return undefined;
	if (lookup.has(raw)) return lookup.get(raw);
	const digits = raw.replace(/\D/g, "");
	if (digits && lookup.has(digits)) return lookup.get(digits);
	const n = parseInt(digits, 10);
	if (!Number.isNaN(n) && lookup.has(String(n))) return lookup.get(String(n));
	return undefined;
}

/**
 * Every employee code in the file must exist in HR, and the file name must match HR name (case-insensitive).
 * Returns blocking errors — save must not proceed if ok is false.
 */
export function validateHrEmployeesForAttendance(
	emps: HrEmployeeRef[],
	rows: ParsedAttendanceRow[]
): { ok: boolean; errors: string[] } {
	const errors: string[] = [];
	const lookup = buildEmployeeCodeLookup(emps);
	const byId = new Map(emps.map((e) => [e.id, e]));

	const codesInFile = [...new Set(rows.map((r) => String(r.employee_code ?? "").trim()).filter(Boolean))];

	for (const code of codesInFile) {
		const eid = resolveEmployeeId(lookup, code);
		if (!eid) {
			errors.push(`Unknown employee code (not in HR): ${code}`);
			continue;
		}
		const emp = byId.get(eid);
		if (!emp) {
			errors.push(`Unknown employee code: ${code}`);
			continue;
		}

		const rowsForCode = rows.filter((r) => String(r.employee_code ?? "").trim() === code);
		const namesInFile = new Set(rowsForCode.map((r) => normalizePersonName(r.employee_name)).filter(Boolean));
		if (namesInFile.size > 1) {
			errors.push(
				`Employee ${code}: inconsistent names in file (${[...namesInFile].join(" vs ")})`
			);
		}

		const fileNameNorm = normalizePersonName(rowsForCode[0]?.employee_name);
		const hrNameNorm = normalizePersonName(emp.name);

		if (!fileNameNorm) {
			errors.push(`Employee ${code}: missing name in file (HR has "${emp.name}")`);
			continue;
		}
		if (fileNameNorm !== hrNameNorm) {
			errors.push(
				`Employee ${code}: name mismatch — file "${rowsForCode[0]?.employee_name ?? ""}" ≠ HR "${emp.name}" (case-insensitive)`
			);
		}
	}

	return { ok: errors.length === 0, errors };
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

/** Upsert parsed attendance — call only after validateHrEmployeesForAttendance passes. */
export async function upsertParsedAttendanceRows(
	supabase: { from: (t: string) => any },
	rows: ParsedAttendanceRow[]
): Promise<{
	inserted: number;
	errors: string[];
	previewRows: AttendancePreviewRow[];
}> {
	const { data: emps, error: e2 } = await supabase.from("hr_employees").select("id, employee_code, name");
	if (e2) {
		return {
			inserted: 0,
			errors: [e2.message],
			previewRows: buildPreviewRows(rows),
		};
	}
	const list = (emps ?? []) as HrEmployeeRef[];
	const lookup = buildEmployeeCodeLookup(list);

	const insertErrors: string[] = [];
	let inserted = 0;

	const prepared: UpsertRow[] = [];

	for (const r of rows) {
		const eid = resolveEmployeeId(lookup, r.employee_code);
		if (!eid) {
			insertErrors.push(`Unknown employee code: ${r.employee_code}`);
			continue;
		}
		prepared.push(toUpsertRow(r, eid));
	}

	for (let i = 0; i < prepared.length; i += BATCH) {
		const chunk = prepared.slice(i, i + BATCH);
		const { error } = await supabase.from("hr_attendance").upsert(chunk, {
			onConflict: "employee_id,work_date",
		});
		if (!error) {
			inserted += chunk.length;
			continue;
		}
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
