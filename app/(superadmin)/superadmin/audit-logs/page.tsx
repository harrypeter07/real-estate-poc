import { Suspense } from "react";
import { saListAuditLogs, saListBusinesses, type AuditLogRow } from "@/app/actions/superadmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditLogsToolbar } from "./audit-logs-toolbar";

export default async function SuperAdminAuditLogsPage({
	searchParams,
}: {
	searchParams: Promise<{ business?: string }>;
}) {
	const sp = await searchParams;
	const rawBiz = typeof sp.business === "string" ? sp.business.trim() : "";
	const businessId =
		rawBiz && rawBiz !== "all" && /^[0-9a-f-]{36}$/i.test(rawBiz) ? rawBiz : undefined;

	const [bizRes, logsRes] = await Promise.all([
		saListBusinesses(),
		saListAuditLogs({ business_id: businessId, limit: 200 }),
	]);

	const businesses = bizRes.ok ? bizRes.data : [];
	const rows: AuditLogRow[] = logsRes.ok ? logsRes.data : [];
	const err = !bizRes.ok ? bizRes.error : !logsRes.ok ? logsRes.error : null;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Audit logs</h1>
				<p className="text-sm text-zinc-600">
					Every super admin change is recorded with readable names and actions.
				</p>
			</div>

			{err ? (
				<div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-bold">Filters</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Suspense fallback={<div className="text-sm text-zinc-500">Loading filters…</div>}>
						<AuditLogsToolbar businesses={businesses} />
					</Suspense>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Action</TableHead>
								<TableHead>Actor</TableHead>
								<TableHead>Target admin</TableHead>
								<TableHead>Business</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.id}>
									<TableCell className="text-sm text-zinc-700 whitespace-nowrap">
										{r.created_at_label}
									</TableCell>
									<TableCell className="text-sm" title={`Technical id: ${r.action}`}>
										<span className="font-medium text-zinc-900">{r.action_label}</span>
									</TableCell>
									<TableCell className="text-sm text-zinc-800 max-w-[240px]">
										{r.actor_label}
									</TableCell>
									<TableCell className="text-sm text-zinc-800 max-w-[240px]">
										{r.target_admin_label ?? "—"}
									</TableCell>
									<TableCell className="text-sm text-zinc-800 max-w-[220px]">
										{r.business_name ?? "—"}
									</TableCell>
								</TableRow>
							))}
							{rows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="text-sm text-zinc-500 text-center py-8">
										No logs yet.
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
