"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saGetBusinessModules, saListBusinesses, saToggleBusinessModule } from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function SuperAdminModulesPage() {
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [selectedBiz, setSelectedBiz] = useState<string>("");
	const [rows, setRows] = useState<Array<{ module_key: string; enabled: boolean; name: string }>>([]);
	const [err, setErr] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const title = useMemo(() => {
		const b = biz.find((x) => x.id === selectedBiz);
		return b?.name ?? "Modules";
	}, [biz, selectedBiz]);

	async function loadBusinesses() {
		const b = await saListBusinesses();
		if (!b.ok) {
			setErr(b.error);
			setBiz([]);
			return;
		}
		setBiz(b.data);
		setSelectedBiz((prev) => prev || b.data[0]?.id || "");
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
		void loadBusinesses();
	}, []);

	useEffect(() => {
		if (!selectedBiz) return;
		void loadModules(selectedBiz);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBiz]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Modules</h1>
				<p className="text-sm text-zinc-600">Enable/disable modules per business (real time).</p>
			</div>

			{err ? (
				<div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-bold">{title}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-3">
						<div className="text-xs font-semibold text-zinc-600">Business</div>
						<Select value={selectedBiz} onValueChange={setSelectedBiz} disabled={isPending}>
							<SelectTrigger className="w-72">
								<SelectValue placeholder="Select business" />
							</SelectTrigger>
							<SelectContent>
								{biz.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							disabled={isPending || !selectedBiz}
							onClick={() => startTransition(() => loadModules(selectedBiz))}
						>
							Refresh
						</Button>
					</div>

					<div className="divide-y rounded-md border bg-white">
						{rows.map((r) => (
							<div key={r.module_key} className="flex items-center justify-between p-4">
								<div>
									<div className="font-semibold text-sm">{r.name}</div>
									<div className="text-xs text-zinc-500 font-mono">{r.module_key}</div>
								</div>
								<Switch
									checked={r.enabled}
									disabled={isPending || !selectedBiz}
									onCheckedChange={(checked) => {
										startTransition(async () => {
											setErr(null);
											const res = await saToggleBusinessModule({
												business_id: selectedBiz,
												module_key: r.module_key,
												enabled: checked,
											});
											if (!res.ok) setErr(res.error);
											await loadModules(selectedBiz);
										});
									}}
								/>
							</div>
						))}
						{rows.length === 0 ? (
							<div className="p-6 text-sm text-zinc-500 text-center">No modules found.</div>
						) : null}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

