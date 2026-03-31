"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saListAuditLogs, saListBusinesses } from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SuperAdminAuditLogsPage() {
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [selectedBiz, setSelectedBiz] = useState<string>("all");
	const [rows, setRows] = useState<any[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const bizName = useMemo(() => {
		if (selectedBiz === "all") return "All businesses";
		return biz.find((b) => b.id === selectedBiz)?.name ?? "Business";
	}, [biz, selectedBiz]);

	async function load() {
		setErr(null);
		const b = await saListBusinesses();
		if (b.ok) setBiz(b.data);
		else setErr(b.error);

		const logs = await saListAuditLogs({
			business_id: selectedBiz === "all" ? undefined : selectedBiz,
			limit: 200,
		});
		if (!logs.ok) setErr((prev) => prev ?? logs.error);
		setRows(logs.ok ? logs.data : []);
	}

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		startTransition(load);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBiz]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Audit logs</h1>
				<p className="text-sm text-zinc-600">Every super admin change is recorded here.</p>
			</div>

			{err ? (
				<div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-bold">{bizName}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="text-xs font-semibold text-zinc-600">Business</div>
						<Select value={selectedBiz} onValueChange={setSelectedBiz} disabled={isPending}>
							<SelectTrigger className="w-72">
								<SelectValue placeholder="Select business" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								{biz.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(load)}>
							Refresh
						</Button>
					</div>

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
									<TableCell className="text-xs text-zinc-600 font-mono">{String(r.created_at ?? "").replace("T", " ").slice(0, 19)}</TableCell>
									<TableCell className="text-sm font-semibold">{r.action}</TableCell>
									<TableCell className="text-xs font-mono text-zinc-600">{r.actor_auth_user_id}</TableCell>
									<TableCell className="text-xs font-mono text-zinc-600">{r.target_admin_auth_user_id ?? "—"}</TableCell>
									<TableCell className="text-xs font-mono text-zinc-600">{r.target_business_id ?? "—"}</TableCell>
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

