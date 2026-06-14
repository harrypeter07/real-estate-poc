import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saListBusinesses, saListTenantAdmins } from "@/app/actions/superadmin";
import { Building2, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function SuperAdminOverviewPage() {
	const [biz, admins] = await Promise.all([saListBusinesses(), saListTenantAdmins({})]);

	const bizCount = biz.ok ? biz.data.length : 0;
	const adminCount = admins.ok ? admins.data.length : 0;
	const activeAdmins = admins.ok ? admins.data.filter((a) => a.is_active).length : 0;
	const allOk = biz.ok && admins.ok;

	return (
		<div className="space-y-8 animate-in fade-in duration-300">
			<div>
				<h1 className="text-2xl font-black text-zinc-800 tracking-tight">System Overview</h1>
				<p className="text-sm text-zinc-500 mt-1">
					Monitor global system tenants, administration accounts, active modules, and audit log pipelines.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Businesses Card */}
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600" />
					<CardContent className="p-6 pl-7 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Total Businesses</p>
							<p className="text-3xl font-black text-zinc-800 font-mono">{bizCount}</p>
							<p className="text-xs text-zinc-500">Registered SaaS tenants</p>
						</div>
						<div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100/50 group-hover:scale-110 transition-transform duration-300">
							<Building2 className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>

				{/* Tenant Admins Card */}
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
					<CardContent className="p-6 pl-7 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Tenant Admins</p>
							<p className="text-3xl font-black text-zinc-800 font-mono">{adminCount}</p>
							<div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold mt-1">
								<span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
								<span>{activeAdmins} active accounts</span>
							</div>
						</div>
						<div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 group-hover:scale-110 transition-transform duration-300">
							<ShieldAlert className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>

				{/* Status Card */}
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
					<div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
					<CardContent className="p-6 pl-7 flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">System Status</p>
							<p className={cn("text-lg font-black mt-2.5", allOk ? "text-emerald-600" : "text-amber-600")}>
								{allOk ? "Operational" : "Degraded"}
							</p>
							<p className="text-xs text-zinc-500">
								{allOk ? "All database pipelines OK" : "Failed to load complete dataset"}
							</p>
						</div>
						<div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-300", 
							allOk ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-amber-50 text-amber-600 border-amber-100/50"
						)}>
							{allOk ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

