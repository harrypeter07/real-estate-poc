/**
 * Block-based attendance: dates as COLUMNS, metrics as ROWS (In Time, Out Time, Duration, OT).
 * Each block starts with a row containing "Employee Code:" (and optionally "Employee Name:").
 */

import type { ParsedAttendanceRow, HrAttendanceType } from "./types";

function norm(s: unknown): string {
	return String(s ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

const MONTHS: Record<string, number> = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	may: 4,
	jun: 5,
	jul: 6,
	aug: 7,
	sep: 8,
	sept: 8,
	oct: 9,
	nov: 10,
	dec: 11,
};

/** Parse DD-MMM, DD-MMM-YYYY, Excel serial date, JS Date */
export function parseDateCell(cell: unknown, defaultYear: number): string | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
		return cell.toISOString().slice(0, 10);
	}
	if (typeof cell === "number") {
		// Excel serial date (days since 1899-12-30)
		if (cell > 20000 && cell < 60000) {
			const epoch = Date.UTC(1899, 11, 30);
			const d = new Date(epoch + cell * 86400000);
			return d.toISOString().slice(0, 10);
		}
	}
	const s = String(cell).trim();
	if (!s) return null;
	// YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

	const m = /^(\d{1,2})[-/]([A-Za-z]{3})[-/]((?:\d{2})|(?:\d{4}))?$/.exec(s);
	if (m) {
		const day = parseInt(m[1], 10);
		const mon = MONTHS[m[2].toLowerCase()];
		if (mon === undefined) return null;
		let year = defaultYear;
		if (m[3]) {
			const y = parseInt(m[3], 10);
			year = m[3].length === 2 ? 2000 + y : y;
		}
		const d = new Date(Date.UTC(year, mon, day));
		return d.toISOString().slice(0, 10);
	}
	const d2 = new Date(s);
	if (!Number.isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
	return null;
}

/** Excel time as fraction of day, or HH:MM string */
export function parseTimeCell(cell: unknown): string | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (typeof cell === "number") {
		if (cell >= 0 && cell < 1) {
			const total = Math.round(cell * 24 * 60);
			const h = Math.floor(total / 60) % 24;
			const m = total % 60;
			return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		}
		return null;
	}
	const s = String(cell).trim();
	if (!s) return null;
	if (/^0+:0{0,2}$/i.test(s) || s === "0" || s === "00:00") return "00:00";
	const mm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
	if (mm) {
		const h = Math.min(23, parseInt(mm[1], 10));
		const m = Math.min(59, parseInt(mm[2], 10));
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	}
	return null;
}

/** Duration: minutes integer, or "H:MM", or decimal hours */
export function parseDurationToMinutes(cell: unknown): number | null {
	if (cell === "" || cell === null || cell === undefined) return null;
	if (typeof cell === "number") {
		if (cell >= 0 && cell < 1) {
			return Math.round(cell * 24 * 60);
		}
		if (Number.isFinite(cell)) return Math.round(cell);
		return null;
	}
	const s = String(cell).trim();
	if (!s) return null;
	const hm = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (hm) {
		return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
	}
	const n = Number(s.replace(/[^0-9.-]/g, ""));
	return Number.isFinite(n) ? Math.round(n) : null;
}

function parseOvertimeMinutes(cell: unknown): number {
	const v = parseDurationToMinutes(cell);
	return v != null ? Math.max(0, v) : 0;
}

/** Infer year from report title lines like "01-Mar-2026 To 21-Mar-2026". */
export function inferDefaultYearFromMatrix(matrix: unknown[][], fallback: number): number {
	const sample = matrix
		.slice(0, 45)
		.map((r) => (r ?? []).map((c) => String(c ?? "")).join(" "))
		.join("\n");
	const m =
		/\b(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\s+To\b/i.exec(sample) ??
		/\bTo\s+(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{4})\b/i.exec(sample);
	if (m) {
		const y = parseInt(m[3], 10);
		if (y >= 1990 && y <= 2100) return y;
	}
	return fallback;
}

function parseDaysHeaderRow(
	row: unknown[] | undefined,
	defaultYear: number
): { ok: boolean; datesByCol: (string | null)[] } {
	if (!row?.length) return { ok: false, datesByCol: [] };
	const firstRaw = String(row[0] ?? "").trim();
	const firstNorm = norm(firstRaw);
	const looksLikeDaysLabel =
		firstNorm === "days" ||
		firstNorm === "day" ||
		/^days$/i.test(firstRaw) ||
		(firstNorm.includes("days") && !firstNorm.includes("duration"));

	const datesByCol: (string | null)[] = [];
	let parsed = 0;
	for (let c = 0; c < row.length; c++) {
		const ds = parseDateCell(row[c], defaultYear);
		datesByCol[c] = ds;
		if (ds) parsed++;
	}
	if (parsed < 2) return { ok: false, datesByCol: [] };
	if (looksLikeDaysLabel) return { ok: true, datesByCol };
	// Some exports leave col A empty but put "Days" in B — still allow if enough dates
	if (!firstNorm && parsed >= 3) return { ok: true, datesByCol };
	return { ok: false, datesByCol: [] };
}

function findAllDaysHeaderRowIndices(matrix: unknown[][], defaultYear: number): number[] {
	const idx: number[] = [];
	for (let r = 0; r < matrix.length; r++) {
		if (parseDaysHeaderRow(matrix[r], defaultYear).ok) idx.push(r);
	}
	return idx;
}

export function detectHorizontalAttendanceFormat(matrix: unknown[][]): boolean {
	const limit = Math.min(matrix.length, 150);
	const y = new Date().getFullYear();
	for (let r = 0; r < limit; r++) {
		const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
		if (/employee\s*code\s*[:-]/i.test(line)) return true;
	}
	for (let r = 0; r < limit; r++) {
		if (parseDaysHeaderRow(matrix[r], y).ok) return true;
	}
	return false;
}

function parseEmployeeHeaderRow(row: unknown[]): { code: string; name: string } {
	let code = "";
	let name = "";
	for (let i = 0; i < row.length; i++) {
		const s = String(row[i] ?? "").trim();
		const mc = /^employee\s*code\s*[:-]+\s*(.+)$/i.exec(s);
		if (mc) code = mc[1].trim().split(/\s+/)[0] ?? "";
		const mn = /^employee\s*name\s*[:-]+\s*(.+)$/i.exec(s);
		if (mn) name = mn[1].trim();
	}
	if (!code || !name) {
		const joined = row.map((c) => String(c ?? "")).join(" ").replace(/\s+/g, " ");
		const m = /employee\s*code\s*[:-]+\s*(\S+)/i.exec(joined);
		if (m) code = m[1].trim();
		const m2 = /employee\s*name\s*[:-]+\s*(.+?)(?=\s*$|employee\s*code)/i.exec(joined);
		if (m2) name = m2[1].trim();
	}
	return { code, name };
}

function findEmployeeBlockStartRows(matrix: unknown[][]): number[] {
	const starts: number[] = [];
	for (let r = 0; r < matrix.length; r++) {
		const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
		if (/employee\s*code\s*[:-]/i.test(line)) starts.push(r);
	}
	return starts;
}

function findDateHeaderInBlock(
	block: unknown[][],
	defaultYear: number
): {
	dateRow: number;
	datesByCol: (string | null)[];
} {
	for (let r = 0; r < Math.min(block.length, 25); r++) {
		const row = block[r] ?? [];
		const datesByCol: (string | null)[] = [];
		let parsed = 0;
		for (let c = 0; c < row.length; c++) {
			const ds = parseDateCell(row[c], defaultYear);
			datesByCol[c] = ds;
			if (ds) parsed++;
		}
		if (parsed >= 2) {
			return { dateRow: r, datesByCol };
		}
	}
	return { dateRow: -1, datesByCol: [] };
}

function matchMetricRow(label: string): "in" | "out" | "duration" | "ot" | "ignore" | null {
	const l = norm(label);
	if (!l) return null;
	if (l.includes("t duration") || l === "t duration") return "ignore";
	if (l === "in time" || (l.startsWith("in") && l.includes("time") && !l.includes("out")))
		return "in";
	if (l === "out time" || (l.includes("out") && l.includes("time"))) return "out";
	if (l === "duration" || (l.includes("duration") && !l.includes("t duration"))) return "duration";
	if (l === "ot" || l.includes("overtime") || l === "o t") return "ot";
	return null;
}

function getRowLabel(block: unknown[][], r: number): string {
	const row = block[r] ?? [];
	return String(row[0] ?? row[1] ?? "").trim();
}

function emitColumnsForEmployee(
	code: string,
	_name: string | undefined,
	datesByCol: (string | null)[],
	block: unknown[][],
	inRow: number,
	outRow: number,
	durRow: number,
	otRow: number
): ParsedAttendanceRow[] {
	const out: ParsedAttendanceRow[] = [];
	const maxCol = Math.max(
		datesByCol.length,
		inRow >= 0 ? (block[inRow]?.length ?? 0) : 0,
		outRow >= 0 ? (block[outRow]?.length ?? 0) : 0,
		durRow >= 0 ? (block[durRow]?.length ?? 0) : 0,
		otRow >= 0 ? (block[otRow]?.length ?? 0) : 0
	);

	for (let c = 0; c < maxCol; c++) {
		const work_date = datesByCol[c];
		if (!work_date) continue;

		const inRaw = inRow >= 0 ? block[inRow]?.[c] : "";
		const outRaw = outRow >= 0 ? block[outRow]?.[c] : "";
		const durRaw = durRow >= 0 ? block[durRow]?.[c] : "";
		const otRaw = otRow >= 0 ? block[otRow]?.[c] : "";

		let in_time = parseTimeCell(inRaw);
		let out_time = parseTimeCell(outRaw);
		let duration_minutes = parseDurationToMinutes(durRaw);
		let overtime_minutes = parseOvertimeMinutes(otRaw);

		if (in_time === "00:00" && (!out_time || out_time === "00:00")) {
			in_time = null;
			out_time = null;
		} else if (in_time === "00:00") {
			in_time = null;
		} else if (out_time === "00:00") {
			out_time = null;
		}

		const hasWork =
			(in_time && in_time !== "00:00") ||
			(out_time && out_time !== "00:00") ||
			(duration_minutes != null && duration_minutes > 0) ||
			overtime_minutes > 0;

		if (!hasWork) continue;

		let attendance_type: HrAttendanceType = "present";
		const is_valid: boolean =
			(duration_minutes != null && duration_minutes > 0) ||
			Boolean(in_time && out_time && in_time !== "00:00" && out_time !== "00:00");

		const row: ParsedAttendanceRow = {
			employee_code: code,
			work_date,
			in_time,
			out_time,
			duration_minutes,
			overtime_minutes,
			attendance_type,
			is_valid,
			...(_name ? { employee_name: _name } : {}),
		};
		if (!is_valid) row.error = "Check in/out or duration";
		out.push(row);
	}
	return out;
}

/**
 * Work Duration Report style: "Days" row with DD-MMM columns first, then weekday row,
 * then "Employee Code:- …", then In/Out/Duration/OT rows.
 */
function parseDaysFirstHorizontal(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const errors: string[] = [];
	const out: ParsedAttendanceRow[] = [];
	const daysRows = findAllDaysHeaderRowIndices(matrix, defaultYear);

	if (daysRows.length === 0) {
		return { rows: [], errors: [] };
	}

	for (let i = 0; i < daysRows.length; i++) {
		const start = daysRows[i];
		const end = i + 1 < daysRows.length ? daysRows[i + 1] : matrix.length;
		const { datesByCol } = parseDaysHeaderRow(matrix[start], defaultYear);
		if (!datesByCol.length) continue;

		let empRow = -1;
		for (let r = start + 1; r < end; r++) {
			const line = (matrix[r] ?? []).map((c) => String(c ?? "")).join(" ");
			if (/employee\s*code/i.test(line)) {
				empRow = r;
				break;
			}
		}
		if (empRow < 0) {
			errors.push(`Block at sheet row ${start + 1}: no Employee Code row below "Days" header`);
			continue;
		}

		const { code, name: _name } = parseEmployeeHeaderRow(matrix[empRow] ?? []);
		if (!code) {
			errors.push(`Row ${empRow + 1}: could not parse employee code (expected Employee Code:- or Code:)`);
			continue;
		}

		const block = matrix.slice(start, end);
		const relEmp = empRow - start;

		let inRow = -1;
		let outRow = -1;
		let durRow = -1;
		let otRow = -1;

		for (let r = relEmp + 1; r < block.length; r++) {
			const absR = start + r;
			if (absR >= end) break;
			const rowArr = block[r] ?? [];
			if (parseDaysHeaderRow(rowArr, defaultYear).ok) break;
			const line = rowArr.map((c) => String(c ?? "")).join(" ");
			if (r > relEmp + 1 && /employee\s*code/i.test(line)) break;

			const label = getRowLabel(block, r);
			const kind = matchMetricRow(label);
			if (kind === null || kind === "ignore") continue;
			if (kind === "in") inRow = r;
			else if (kind === "out") outRow = r;
			else if (kind === "duration") durRow = r;
			else if (kind === "ot") otRow = r;
		}

		if (inRow < 0 && outRow < 0 && durRow < 0) {
			errors.push(
				`Employee ${code}: no In/Out/Duration rows found below employee row (sheet row ${empRow + 1})`
			);
			continue;
		}

		out.push(
			...emitColumnsForEmployee(code, _name, datesByCol, block, inRow, outRow, durRow, otRow)
		);
	}

	return { rows: out, errors };
}

/** Legacy: employee header row first, then date row + metrics below it. */
function parseEmployeeFirstHorizontal(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const errors: string[] = [];
	const out: ParsedAttendanceRow[] = [];
	const starts = findEmployeeBlockStartRows(matrix);

	if (starts.length === 0) {
		return { rows: [], errors: ['No blocks found. Expected a row containing "Employee Code:"'] };
	}

	for (let bi = 0; bi < starts.length; bi++) {
		const start = starts[bi];
		const end = bi + 1 < starts.length ? starts[bi + 1] : matrix.length;
		const { code, name: _name } = parseEmployeeHeaderRow(matrix[start] ?? []);
		if (!code) {
			errors.push(`Row ${start + 1}: could not parse employee code`);
			continue;
		}

		const block = matrix.slice(start + 1, end);
		const { dateRow, datesByCol } = findDateHeaderInBlock(block, defaultYear);
		if (dateRow < 0) {
			errors.push(`Employee ${code}: could not find a date header row (need ≥2 date columns)`);
			continue;
		}

		let inRow = -1;
		let outRow = -1;
		let durRow = -1;
		let otRow = -1;

		for (let r = dateRow + 1; r < block.length; r++) {
			const label = getRowLabel(block, r);
			const kind = matchMetricRow(label);
			if (kind === null || kind === "ignore") continue;
			if (kind === "in") inRow = r;
			else if (kind === "out") outRow = r;
			else if (kind === "duration") durRow = r;
			else if (kind === "ot") otRow = r;
		}

		if (inRow < 0 && outRow < 0 && durRow < 0) {
			errors.push(`Employee ${code}: no In/Out/Duration rows found below date row`);
			continue;
		}

		out.push(
			...emitColumnsForEmployee(code, _name, datesByCol, block, inRow, outRow, durRow, otRow)
		);
	}

	return { rows: out, errors };
}

export function parseHorizontalBlockAttendance(
	matrix: unknown[][],
	defaultYear: number
): { rows: ParsedAttendanceRow[]; errors: string[] } {
	const year = inferDefaultYearFromMatrix(matrix, defaultYear);
	const daysRows = findAllDaysHeaderRowIndices(matrix, year);
	const empStarts = findEmployeeBlockStartRows(matrix);
	const firstEmp = empStarts.length ? empStarts[0] : Number.POSITIVE_INFINITY;
	const firstDay = daysRows.length ? daysRows[0] : Number.POSITIVE_INFINITY;
	/** Work Duration Report has calendar ("Days" + dates) above the employee row. */
	const useDaysFirst =
		daysRows.length > 0 && (firstEmp === Number.POSITIVE_INFINITY || firstDay < firstEmp);

	if (useDaysFirst) {
		const { rows, errors } = parseDaysFirstHorizontal(matrix, year);
		if (rows.length > 0 || errors.length > 0) {
			return { rows, errors };
		}
	}

	return parseEmployeeFirstHorizontal(matrix, year);
}
