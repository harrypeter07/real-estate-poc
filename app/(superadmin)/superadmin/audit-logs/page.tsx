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
		<div className="space-y-8 animate-in fade-in duration-300">
			<div>
				<h1 className="text-2xl font-black text-zinc-800 tracking-tight">Audit Logs</h1>
				<p className="text-sm text-zinc-500 mt-1">
					Review detailed recordings of all tenant administration modifications, actions, and credentials operations.
				</p>
			</div>

			{err ? (
				<div className="rounded-2xl border border-red-100 bg-red-50/60 backdrop-blur-md text-red-700 p-4 text-sm font-semibold shadow-2xs">
					{err}
				</div>
			) : null}

			<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden">
				<CardHeader className="pb-3 pt-6 px-6 border-b border-zinc-100 bg-zinc-50/50">
					<CardTitle className="text-sm font-black text-zinc-800 uppercase tracking-wider">
						Global Audit Stream
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 space-y-6">
					<Suspense fallback={<div className="text-xs text-zinc-400 font-bold">Loading filters…</div>}>
						<AuditLogsToolbar businesses={businesses} />
					</Suspense>

					<div className="rounded-xl border border-zinc-200/80 overflow-hidden shadow-2xs">
						<div className="overflow-x-auto w-full">
							<Table>
								<TableHeader className="bg-zinc-50/70">
									<TableRow>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4">Date & Time</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4">Operation</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4">Actor</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4">Target Admin</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4">Business Tenant</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((r) => (
										<TableRow key={r.id} className="hover:bg-zinc-50/40 transition-colors">
											<TableCell className="text-xs text-zinc-500 font-mono whitespace-nowrap px-4 py-3.5">
												{r.created_at_label}
											</TableCell>
											<TableCell className="px-4 py-3.5" title={`Technical ID: ${r.action}`}>
												<span className="text-xs font-bold text-zinc-800">{r.action_label}</span>
											</TableCell>
											<TableCell className="text-xs font-semibold text-zinc-650 px-4 py-3.5 max-w-[200px] truncate">
												{r.actor_label}
											</TableCell>
											<TableCell className="text-xs text-zinc-500 px-4 py-3.5 max-w-[200px] truncate">
												{r.target_admin_label ?? "—"}
											</TableCell>
											<TableCell className="px-4 py-3.5 max-w-[180px] truncate">
												<span className="text-xs font-bold text-teal-650">{r.business_name ?? "—"}</span>
											</TableCell>
										</TableRow>
									))}
									{rows.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="text-xs text-zinc-400 text-center py-12 italic bg-zinc-50/10">
												No audit log transactions recorded yet.
											</TableCell>
										</TableRow>
									) : null}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
