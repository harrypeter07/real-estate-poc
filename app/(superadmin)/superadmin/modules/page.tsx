"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
	saGetBusinessModules,
	saListBusinesses,
	saListTenantAdmins,
	saSetBusinessModulesBulk,
} from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SuperAdminModulesPage() {
	const [admins, setAdmins] = useState<Array<{ id: string; business_id: string; email: string | null; name: string | null; is_active: boolean }>>([]);
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [selectedAdminId, setSelectedAdminId] = useState<string>("");
	const [rows, setRows] = useState<Array<{ module_key: string; enabled: boolean; name: string }>>([]);
	const [err, setErr] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [isPending, startTransition] = useTransition();

	const selectedAdmin = useMemo(() => admins.find((a) => a.id === selectedAdminId) ?? null, [admins, selectedAdminId]);
	const selectedBusinessId = selectedAdmin?.business_id ?? "";
	const selectedBusinessName = useMemo(() => biz.find((b) => b.id === selectedBusinessId)?.name ?? "—", [biz, selectedBusinessId]);

	async function load() {
		setErr(null);
		const [bRes, aRes] = await Promise.all([saListBusinesses(), saListTenantAdmins({})]);
		if (!bRes.ok) setErr(bRes.error);
		if (!aRes.ok) setErr(aRes.error);
		const bizData = bRes.ok ? bRes.data : [];
		const adminsData = aRes.ok ? aRes.data : [];
		setBiz(bizData);
		setAdmins(adminsData);
		if (!selectedAdminId && adminsData.length) setSelectedAdminId(adminsData[0].id);
	}

	async function loadModules(businessId: string) {
		setErr(null);
		const res = await saGetBusinessModules({ business_id: businessId });
		if (!res.ok) {
			setErr(res.error);
			setRows([]);
			return;
		}
		setRows(res.data);
	}

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!selectedBusinessId) return;
		void loadModules(selectedBusinessId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBusinessId]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => r.name.toLowerCase().includes(q) || r.module_key.toLowerCase().includes(q));
	}, [rows, search]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Modules</h1>
				<p className="text-sm text-zinc-600">
					Enable/disable modules for a tenant by selecting one tenant admin. (Modules are tenant/business-scoped.)
				</p>
			</div>

			{err ? (
				<div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-bold">
						{selectedBusinessName}
					</CardTitle>
					<div className="text-xs text-zinc-500 mt-1">
						Selected admin:{" "}
						{selectedAdmin
							? `${selectedAdmin.name ?? "—"} (${selectedAdmin.email ?? "—"})`
							: "—"}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="text-xs font-semibold text-zinc-600">Tenant admin</div>
						<Select value={selectedAdminId} onValueChange={setSelectedAdminId} disabled={isPending}>
							<SelectTrigger className="w-72">
								<SelectValue placeholder="Select admin" />
							</SelectTrigger>
							<SelectContent>
								{admins.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.name ?? "—"} - {a.email ?? "—"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							disabled={isPending || !selectedBusinessId}
							onClick={() => startTransition(() => loadModules(selectedBusinessId))}
						>
							Refresh
						</Button>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<div className="text-xs font-semibold text-zinc-600">Search module</div>
						<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type: reports, sales, hr..." className="w-80" />
						<div className="text-xs text-zinc-500">
							{filteredRows.filter((r) => r.enabled).length} enabled in this view
						</div>
					</div>

					<div className="divide-y rounded-md border bg-white">
						{filteredRows.map((r) => (
							<div key={r.module_key} className="flex items-center justify-between p-4 gap-3">
								<div className="min-w-0">
									<div className="font-semibold text-sm truncate">{r.name}</div>
									<div className="text-xs text-zinc-500 font-mono truncate">{r.module_key}</div>
								</div>
								<Button
									type="button"
									disabled={isPending || !selectedBusinessId}
									onClick={() => {
										setRows((prev) =>
											prev.map((x) =>
												x.module_key === r.module_key ? { ...x, enabled: !x.enabled } : x
											)
										);
									}}
									className={
										r.enabled
											? "bg-green-600 text-white hover:bg-green-700"
											: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
									}
								>
									{r.enabled ? "Enabled" : "Disabled"}
								</Button>
							</div>
						))}
						{filteredRows.length === 0 ? (
							<div className="p-6 text-sm text-zinc-500 text-center">No modules found.</div>
						) : null}
					</div>

					<div className="flex flex-wrap gap-2 pt-1">
						<Button
							disabled={isPending || !selectedBusinessId}
							onClick={() => {
								startTransition(async () => {
									setErr(null);
									const enabledModuleKeys = rows.filter((m) => m.enabled).map((m) => m.module_key);
									const res = await saSetBusinessModulesBulk({
										business_id: selectedBusinessId,
										enabledModuleKeys,
									});
									if (!res.ok) {
										setErr(res.error);
										return;
									}
									await loadModules(selectedBusinessId);
								});
							}}
						>
							Save modules
						</Button>
						<Button
							variant="outline"
							disabled={isPending || !selectedBusinessId}
							onClick={() => startTransition(() => loadModules(selectedBusinessId))}
						>
							Reset
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

