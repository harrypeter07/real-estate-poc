/**
 * Match a free-text query against multiple fields (names, codes, phones, etc.).
 * Supports case-insensitive substring match and digit-only phone-style matching.
 */
export function matchesTextSearch(
	queryRaw: string,
	...parts: (string | number | undefined | null)[]
): boolean {
	const q = String(queryRaw ?? "").trim().toLowerCase();
	if (!q) return true;
	const blob = parts
		.filter((p) => p !== undefined && p !== null && String(p).length > 0)
		.map((p) => String(p))
		.join(" ")
		.toLowerCase();
	if (blob.includes(q)) return true;
	const qDigits = q.replace(/\D/g, "");
	if (qDigits.length > 0) {
		const blobDigits = blob.replace(/\D/g, "");
		if (blobDigits.includes(qDigits)) return true;
	}
	return false;
}
