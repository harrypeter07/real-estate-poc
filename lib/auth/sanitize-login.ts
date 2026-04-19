/**
 * Normalize login identifiers: length cap, strip control characters.
 * Supabase uses parameterized APIs; this limits abuse surface.
 */
const MAX_LEN = 254;

export function sanitizeLoginIdentifier(raw: unknown): string {
	if (typeof raw !== "string") return "";
	const s = raw.normalize("NFKC").trim().slice(0, MAX_LEN);
	if (!s) return "";
	if (/[\u0000-\u001f\u007f]/.test(s)) return "";
	return s;
}
