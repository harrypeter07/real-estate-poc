/**
 * Default advisor login password: deterministic 8-digit numeric from name + phone.
 * Not stored in DB; used for display hints and initial Auth signup. Sync Auth separately.
 */
export function buildAdvisorPasswordFromNameAndPhone(
	name: string,
	phone: string,
): string {
	const seed = `${String(name).trim()}|${String(phone).replace(/\D/g, "")}`;
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	const n = (Math.abs(h) % 90000000) + 10000000;
	return String(n);
}
