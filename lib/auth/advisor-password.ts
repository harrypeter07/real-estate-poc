/**
 * Default advisor login password: normalized name + last 10 phone digits.
 * - Name: lowercase letters and digits only (strip spaces/punctuation).
 * - Phone: last 10 numeric digits (or pad).
 * - Minimum length 6 for Supabase Auth (pad with trailing "0" if needed).
 * Changing name/phone in DB does not auto-update Auth; use reset or sync script.
 */
export function buildAdvisorPasswordFromNameAndPhone(
	name: string,
	phone: string,
): string {
	const digits = (phone || "").replace(/\D/g, "");
	const last10 = digits.length >= 10 ? digits.slice(-10) : digits.padStart(10, "0");
	const slug = (name || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 32);
	const base = `${slug || "adv"}${last10}`;
	if (base.length >= 6) return base;
	return (base + "0000000000").slice(0, 6);
}
