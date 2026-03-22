import * as XLSX from "xlsx";

/** Read first sheet as 2D array (dates as Date where possible). */
export function readSheetMatrixFromBuffer(buffer: ArrayBuffer): unknown[][] {
	const wb = XLSX.read(buffer, { type: "array", cellDates: true, cellNF: false });
	const sheet = wb.Sheets[wb.SheetNames[0]];
	return XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: "",
		raw: true,
	}) as unknown[][];
}
