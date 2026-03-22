import * as XLSX from "xlsx";
import type { ParsedAttendanceRow, HrAttendanceType } from "./types";

function norm(s: unknown): string {
	return String(s ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

function mapType(t: string): HrAttendanceType {
	const x = norm(t);
	if (x === "leave" || x === "l") return "leave";
	if (x === "holiday" || x === "h") return "holiday";
	return "present";
}

/**
 * Normalized sheet: header row then data rows.
 * Expected columns (case-insensitive): Employee Code, Date, In, Out, Duration (min), OT (min), Type
 */
export function parseAttendanceExcelBuffer(buffer: ArrayBuffer): {
	rows: ParsedAttendanceRow[];
	errors: string[];
} {
	const errors: string[] = [];
	const wb = XLSX.read(buffer, { type: "array" });
	const sheet = wb.Sheets[wb.SheetNames[0]];
	const matrix = XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: "",
		raw: false,
	}) as unknown[][];

	if (!matrix.length) {
		return { rows: [], errors: ["Empty sheet"] };
	}

	const headerRow = matrix[0].map((c) => norm(c));
	const colIndex: Record<string, number> = {};
	headerRow.forEach((h, i) => {
		if (h.includes("employee") && h.includes("code")) colIndex.code = i;
		else if (h === "date" || h.includes("work date")) colIndex.date = i;
		else if (h === "in" || h.includes("in time")) colIndex.in = i;
		else if (h === "out" || h.includes("out time")) colIndex.out = i;
		else if (h.includes("duration")) colIndex.duration = i;
		else if (h === "ot" || h.includes("overtime")) colIndex.ot = i;
		else if (h === "type") colIndex.type = i;
	});

	if (colIndex.code === undefined || colIndex.date === undefined) {
		return {
			rows: [],
			errors: [
				"Could not find required columns. Use: Employee Code, Date, and optionally In, Out, Duration (min), OT (min), Type",
			],
		};
	}

	const rows: ParsedAttendanceRow[] = [];
	for (let r = 1; r < matrix.length; r++) {
		const line = matrix[r];
		const code = line[colIndex.code];
		const dateCell = line[colIndex.date];
		if (!code || !dateCell) continue;

		const otRaw = colIndex.ot !== undefined ? line[colIndex.ot] : "";
		const durRaw = colIndex.duration !== undefined ? line[colIndex.duration] : "";

		let duration_minutes: number | null = null;
		if (durRaw !== "" && durRaw !== undefined && durRaw !== null) {
			const n = Number(String(durRaw).replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(n)) duration_minutes = Math.round(n);
		}

		let overtime_minutes = 0;
		if (otRaw !== "" && otRaw !== undefined && otRaw !== null) {
			const n = Number(String(otRaw).replace(/[^0-9.-]/g, ""));
			if (Number.isFinite(n)) overtime_minutes = Math.round(n);
		}

		const inTime =
			colIndex.in !== undefined && line[colIndex.in]
				? String(line[colIndex.in]).trim()
				: null;
		const outTime =
			colIndex.out !== undefined && line[colIndex.out]
				? String(line[colIndex.out]).trim()
				: null;

		const typeStr =
			colIndex.type !== undefined && line[colIndex.type]
				? String(line[colIndex.type])
				: "present";
		const attendance_type = mapType(typeStr);

		let work_date = "";
		if (dateCell instanceof Date) {
			work_date = dateCell.toISOString().slice(0, 10);
		} else {
			const d = new Date(String(dateCell));
			if (!Number.isNaN(d.getTime())) work_date = d.toISOString().slice(0, 10);
			else {
				const s = String(dateCell).trim();
				if (/^\d{4}-\d{2}-\d{2}$/.test(s)) work_date = s;
				else {
					errors.push(`Row ${r + 1}: invalid date ${dateCell}`);
					continue;
				}
			}
		}

		const is_valid =
			attendance_type === "leave" ||
			attendance_type === "holiday" ||
			(inTime && outTime) ||
			(duration_minutes != null && duration_minutes >= 0);

		rows.push({
			employee_code: String(code).trim(),
			work_date,
			in_time: inTime,
			out_time: outTime,
			duration_minutes,
			overtime_minutes,
			attendance_type,
			is_valid,
			...(!is_valid ? { error: "Missing in/out or duration for present row" } : {}),
		});
	}

	return { rows, errors };
}

export function parseAttendanceCsvText(text: string): ReturnType<
	typeof parseAttendanceExcelBuffer
> {
	const wb = XLSX.read(text, { type: "string" });
	const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	return parseAttendanceExcelBuffer(buf.buffer as ArrayBuffer);
}
