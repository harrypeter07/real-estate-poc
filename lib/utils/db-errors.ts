/**
 * Maps Postgres unique violations (23505) to user-facing messages for phone constraints.
 */
export function mapUniquePhoneViolation(
	error: { code?: string; message?: string; details?: string },
	entity: "advisor" | "customer" | "employee"
): string | null {
	if (error.code !== "23505") return null;
	const blob = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
	const phoneHint =
		blob.includes("phone") ||
		blob.includes("app_phone_key") ||
		blob.includes("_phone_");
	if (!phoneHint) return null;
	switch (entity) {
		case "advisor":
			return "An advisor with this phone number already exists for your business.";
		case "customer":
			return "A customer with this phone number already exists for your business.";
		case "employee":
			return "An employee with this phone number already exists for your business.";
		default:
			return "This phone number is already in use.";
	}
}
