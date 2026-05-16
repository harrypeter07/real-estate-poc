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

	const partsClean = parts.map((p) => String(p ?? "").trim().toLowerCase());
	const blob = partsClean.join(" ");

	// 1. Basic substring match (case-insensitive, handled by blob construction)
	if (blob.includes(q)) return true;

	// 2. Phone number normalization & comparison
	const normalizePhone = (val: string) => val.replace(/\D/g, "").slice(-10);
	const qNorm = normalizePhone(q);

	if (qNorm.length >= 10) {
		for (const p of partsClean) {
			const pNorm = normalizePhone(p);
			if (pNorm.length >= 10 && pNorm === qNorm) return true;
		}
	}

	// 3. Fallback: Digit-only partial match for shorter queries
	const qDigits = q.replace(/\D/g, "");
	if (qDigits.length > 0) {
		const blobDigits = blob.replace(/\D/g, "");
		if (blobDigits.includes(qDigits)) return true;
	}

	return false;
}
