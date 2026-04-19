/**
 * Last 10 digits of the phone (matches DB `public.app_phone_key` and advisor email trigger).
 */
export function normalizePhoneKey(input: string | null | undefined): string | null {
	const raw = String(input ?? "").trim();
	if (!raw) return null;
	const digits = raw.replace(/\D/g, "");
	if (!digits) return null;
	const ten = digits.length > 10 ? digits.slice(-10) : digits;
	return ten.length === 10 ? ten : null;
}

/** For search: digits-only query to compare against stored phones. */
export function digitsOnly(input: string): string {
	return String(input ?? "").replace(/\D/g, "");
}
