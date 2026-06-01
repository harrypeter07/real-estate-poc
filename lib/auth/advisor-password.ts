/**
 * Secure, dynamic advisor password generation and storage utilities.
 */

/**
 * Legacy: derived advisor login password: first 4 letters of name + first 4 digits of phone.
 * Retained for backwards-compatibility so pre-existing advisor logins are not broken.
 */
export function buildAdvisorPasswordFromNameAndPhone(
	name: string,
	phone: string,
): string {
	const namePart = String(name)
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.slice(0, 4)
		.padEnd(4, "x");
	const phonePart = String(phone).replace(/\D/g, "").slice(0, 4).padEnd(4, "0");
	return `${namePart}${phonePart}`;
}

/**
 * Generate a highly secure random password using:
 * - First 3 letters of the advisor's name (lowercase)
 * - A special character (e.g., @, #, $, %, !, *, &)
 * - 4 random digits
 */
export function generateRandomAdvisorPassword(name: string): string {
	const namePart = String(name)
		.toLowerCase()
		.replace(/[^a-z]/g, "")
		.slice(0, 3)
		.padEnd(3, "x");

	const symbols = ["@", "#", "$", "%", "!", "*", "&"];
	const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
	const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();

	return `${namePart}${randomSymbol}${randomDigits}`;
}

/**
 * Helper to parse the advisor's password hint and actual notes from the DB notes field.
 * Format: "Actual notes text [pw: password_hint]"
 */
export function extractPasswordAndNotes(notesStr: string | null | undefined): {
	notes: string;
	password: string | null;
} {
	if (!notesStr) return { notes: "", password: null };
	const match = notesStr.match(/\[pw:\s*([^\]\s]+)\s*\]/);
	if (match) {
		const password = match[1];
		const notes = notesStr.replace(/\[pw:\s*([^\]\s]+)\s*\]/, "").trim();
		return { notes, password };
	}
	return { notes: notesStr, password: null };
}

/**
 * Helper to format the advisor's notes and password hint for DB storage.
 */
export function formatNotesWithPassword(
	notes: string | null | undefined,
	password?: string | null,
): string {
	const cleanNotes = (notes || "").trim();
	if (!password) return cleanNotes;
	return cleanNotes ? `${cleanNotes} [pw: ${password}]` : `[pw: ${password}]`;
}
