import { requireSuperAdmin } from "@/lib/auth/superadmin";

export default async function SuperAdminRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Ensure only superadmins can render this route group.
	await requireSuperAdmin();
	return <>{children}</>;
}

