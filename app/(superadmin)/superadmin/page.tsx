import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saListBusinesses, saListTenantAdmins } from "@/app/actions/superadmin";

export default async function SuperAdminOverviewPage() {
	const [biz, admins] = await Promise.all([saListBusinesses(), saListTenantAdmins({})]);

	const bizCount = biz.ok ? biz.data.length : 0;
	const adminCount = admins.ok ? admins.data.length : 0;
	const activeAdmins = admins.ok ? admins.data.filter((a) => a.is_active).length : 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Overview</h1>
				<p className="text-sm text-zinc-600">Tenants, admins, modules and audit activity.</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
							Businesses
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{bizCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
							Tenant admins
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{adminCount}</div>
						<div className="text-xs text-zinc-500 mt-1">{activeAdmins} active</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
							Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-zinc-700">
							{biz.ok && admins.ok ? "OK" : "Some data failed to load"}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

