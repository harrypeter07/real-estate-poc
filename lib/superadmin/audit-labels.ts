/** Maps internal audit action keys to short, human-readable labels. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
	"business.create": "Created business",
	"business_with_owner.create": "Created business with owner",
	"admin.create": "Created tenant admin",
	"admin.set_active": "Changed tenant admin active status",
	"admin.update": "Updated tenant admin profile",
	"admin.delete": "Removed tenant admin",
	"admin.password.change": "Changed tenant admin password",
	"module.toggle": "Toggled module for tenant",
	"module.set_bulk": "Updated multiple modules (bulk)",
};

export function formatAuditActionLabel(action: string): string {
	const key = String(action ?? "").trim();
	if (AUDIT_ACTION_LABELS[key]) return AUDIT_ACTION_LABELS[key];
	return key
		.replace(/\./g, " → ")
		.replace(/_/g, " ");
}

export function formatAuditTimestamp(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return String(iso);
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}
