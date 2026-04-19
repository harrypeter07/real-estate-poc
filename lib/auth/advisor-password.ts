/**
 * Default advisor login password: first 4 letters of name + first 4 digits of phone.
 * Not stored in DB; used for display hints and initial Auth signup. Sync Auth separately.
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
