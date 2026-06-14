"use client";

import { useEffect, useMemo, useState } from "react";
import {
	saGetBusinessModules,
	saGetUserModules,
	saListBusinesses,
	saListTenantAdmins,
	saSetBusinessModulesBulk,
	saSetUserModulesBulk,
} from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function SuperAdminModulesPage() {
	const [admins, setAdmins] = useState<Array<{ id: string; business_id: string; auth_user_id: string; email: string | null; name: string | null; is_active: boolean }>>([]);
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
	const [selectedUserId, setSelectedUserId] = useState<string>("all");
	const [rows, setRows] = useState<Array<{
		module_key: string;
		name: string;
		enabled: boolean;
		business_enabled: boolean;
		user_enabled: boolean | null;
	}>>([]);
	const [initialRows, setInitialRows] = useState<Array<{
		module_key: string;
		name: string;
		enabled: boolean;
		business_enabled: boolean;
		user_enabled: boolean | null;
	}>>([]);
	const [err, setErr] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [isLoadingModules, setIsLoadingModules] = useState(false);

	const selectedBusinessName = useMemo(() => biz.find((b) => b.id === selectedBusinessId)?.name ?? "—", [biz, selectedBusinessId]);
	const selectedBusinessAdmins = useMemo(() => {
		return admins.filter((a) => a.business_id === selectedBusinessId);
	}, [admins, selectedBusinessId]);

	async function load() {
		setErr(null);
		setIsPending(true);
		try {
			const [bRes, aRes] = await Promise.all([saListBusinesses(), saListTenantAdmins({})]);
			if (!bRes.ok) setErr(bRes.error);
			if (!aRes.ok) setErr(aRes.error);
			const bizData = bRes.ok ? bRes.data : [];
			const adminsData = aRes.ok ? aRes.data : [];
			setBiz(bizData);
			setAdmins(adminsData);
			if (!selectedBusinessId && bizData.length) setSelectedBusinessId(bizData[0].id);
		} catch (e: any) {
			setErr(e?.message ?? "Failed to initialize list");
		} finally {
			setIsPending(false);
		}
	}

	async function loadModules(businessId: string, userId: string) {
		setErr(null);
		setIsLoadingModules(true);
		try {
			if (userId === "all") {
				const res = await saGetBusinessModules({ business_id: businessId });
				if (!res.ok) {
					setErr(res.error);
					setRows([]);
					setInitialRows([]);
					return;
				}
				const items = res.data.map((r) => ({
					module_key: r.module_key,
					name: r.name,
					enabled: r.enabled,
					business_enabled: r.enabled,
					user_enabled: null,
				}));
				setRows(items);
				setInitialRows(items);
			} else {
				const res = await saGetUserModules({ business_id: businessId, auth_user_id: userId });
				if (!res.ok) {
					setErr(res.error);
					setRows([]);
					setInitialRows([]);
					return;
				}
				setRows(res.data);
				setInitialRows(res.data);
			}
		} catch (e: any) {
			setErr(e?.message ?? "Failed to fetch configurations");
		} finally {
			setIsLoadingModules(false);
		}
	}

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setSelectedUserId("all");
	}, [selectedBusinessId]);

	useEffect(() => {
		setRows([]); // Clear rows immediately to prevent showing previous business/user data
		setInitialRows([]);
		if (!selectedBusinessId) return;
		void loadModules(selectedBusinessId, selectedUserId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBusinessId, selectedUserId]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => r.name.toLowerCase().includes(q) || r.module_key.toLowerCase().includes(q));
	}, [rows, search]);

	function handleReset() {
		setRows(JSON.parse(JSON.stringify(initialRows)));
	}

	async function handleRefresh() {
		if (isPending || !selectedBusinessId) return;
		setIsPending(true);
		try {
			await loadModules(selectedBusinessId, selectedUserId);
		} finally {
			setIsPending(false);
		}
	}

	async function handleSave() {
		if (isPending || !selectedBusinessId) return;
		setIsPending(true);
		setErr(null);
		try {
			if (selectedUserId === "all") {
				const enabledModuleKeys = rows.filter((m) => m.enabled).map((m) => m.module_key);
				const res = await saSetBusinessModulesBulk({
					business_id: selectedBusinessId,
					enabledModuleKeys,
				});
				if (!res.ok) {
					setErr(res.error);
					return;
				}
			} else {
				const res = await saSetUserModulesBulk({
					business_id: selectedBusinessId,
					auth_user_id: selectedUserId,
					modules: rows.map((r) => ({
						module_key: r.module_key,
						business_enabled: r.business_enabled,
						user_enabled: r.user_enabled,
					})),
				});
				if (!res.ok) {
					setErr(res.error);
					return;
				}
			}
			await loadModules(selectedBusinessId, selectedUserId);
		} catch (e: any) {
			setErr(e?.message ?? "Failed to save configuration");
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-300">
			<div>
				<h1 className="text-2xl font-black text-zinc-800 tracking-tight">Modules Configuration</h1>
				<p className="text-sm text-zinc-500 mt-1">
					Enable or disable active CRM modules dynamically per business tenant or for specific user scopes.
				</p>
			</div>

			{err ? (
				<div className="rounded-2xl border border-red-100 bg-red-50/60 backdrop-blur-md text-red-700 p-4 text-sm font-semibold shadow-2xs">
					{err}
				</div>
			) : null}

			<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden">
				<CardHeader className="pb-4 pt-6 px-6 border-b border-zinc-100 bg-zinc-50/50">
					<CardTitle className="text-base font-black text-teal-700 font-sans truncate">
						{selectedBusinessName}
					</CardTitle>
					<div className="text-xs text-zinc-500 mt-1 font-medium">
						Business Admins:{" "}
						<span className="font-bold text-zinc-750">
							{selectedBusinessAdmins.length > 0
								? selectedBusinessAdmins.map((a) => `${a.name ?? "—"} (${a.email ?? "—"})`).join(", ")
								: "No admins registered"}
						</span>
					</div>
				</CardHeader>
				<CardContent className="p-6 space-y-6">
					{/* Selector Bar */}
					<div className="flex flex-wrap items-center gap-4 border-b border-zinc-100 pb-5">
						{/* Business Select */}
						<div className="space-y-1 w-full sm:w-72">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Business (Tenant)</span>
							<Select value={selectedBusinessId} onValueChange={setSelectedBusinessId} disabled={isPending}>
								<SelectTrigger className="rounded-xl border-zinc-200 h-10 bg-white w-full">
									<SelectValue placeholder="Select business" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{biz.map((b) => (
										<SelectItem key={b.id} value={b.id} className="rounded-lg">
											{b.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* User Select (Specific User or All) */}
						<div className="space-y-1 w-full sm:w-72">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">User Override Scope</span>
							<Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isPending || !selectedBusinessId}>
								<SelectTrigger className="rounded-xl border-zinc-200 h-10 bg-white w-full">
									<SelectValue placeholder="Select user scope" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									<SelectItem value="all" className="rounded-lg font-bold">
										All Users / Everyone
									</SelectItem>
									{selectedBusinessAdmins.map((a) => (
										<SelectItem key={a.auth_user_id} value={a.auth_user_id} className="rounded-lg">
											{a.name ?? "—"} ({a.email ?? "—"})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="self-end pt-1">
							<Button
								variant="outline"
								size="sm"
								disabled={isPending || !selectedBusinessId}
								onClick={handleRefresh}
								className="rounded-xl h-10 px-4 font-bold border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
							>
								Refresh List
							</Button>
						</div>
					</div>

					{/* Search & Stats */}
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-1 w-full sm:w-80">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Search Module List</span>
							<Input 
								value={search} 
								onChange={(e) => setSearch(e.target.value)} 
								placeholder="e.g. sales, reports, backup..." 
								className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600 bg-white" 
							/>
						</div>
						<div className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 shrink-0">
							{isLoadingModules ? "Loading..." : `${filteredRows.filter((r) => r.enabled).length} of ${filteredRows.length} modules enabled`}
						</div>
					</div>

					{/* Modules List Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{isLoadingModules ? (
							<div className="col-span-full py-12 text-center text-xs text-zinc-400 italic">
								Fetching business configuration modules...
							</div>
						) : (
							<>
								{filteredRows.map((r) => (
									<div 
										key={r.module_key} 
										className={cn(
											"rounded-xl border p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-all duration-200",
											r.enabled 
												? "bg-teal-50/20 border-teal-200/60 shadow-2xs" 
												: "bg-white border-zinc-200/80 hover:border-zinc-300"
										)}
									>
										<div className="min-w-0 space-y-1 flex-1">
											<div className="font-bold text-zinc-800 text-sm truncate">{r.name}</div>
											<div className="text-[10px] text-zinc-400 font-mono tracking-tight bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-150 inline-block truncate max-w-full">
												{r.module_key}
											</div>
										</div>

										<div className="flex items-center gap-3 shrink-0">
											{selectedUserId === "all" ? (
												/* Business Level Toggle */
												<Button
													type="button"
													disabled={isPending || !selectedBusinessId}
													onClick={() => {
														setRows((prev) =>
															prev.map((x) =>
																x.module_key === r.module_key
																	? { ...x, enabled: !x.enabled, business_enabled: !x.business_enabled }
																	: x
															)
														);
													}}
													className={cn(
														"rounded-xl h-9 px-4 font-bold text-xs shadow-3xs transition-all duration-200",
														r.enabled
															? "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/10"
															: "bg-zinc-100 text-zinc-750 hover:bg-zinc-200"
													)}
												>
													{r.enabled ? "Active" : "Disabled"}
												</Button>
											) : (
												/* User Override Control + Business-wide Disable Checkbox */
												<>
													{/* User Specific Override Status Button */}
													<div className="flex flex-col gap-0.5">
														<span className="text-[8px] uppercase font-black text-zinc-400 tracking-wider">User Access</span>
														<Button
															type="button"
															disabled={isPending || !selectedBusinessId}
															onClick={() => {
																setRows((prev) =>
																	prev.map((x) => {
																		if (x.module_key !== r.module_key) return x;
																		const nextEnabled = !x.enabled;
																		return {
																			...x,
																			enabled: nextEnabled,
																			user_enabled: nextEnabled,
																		};
																	})
																);
															}}
															className={cn(
																"rounded-xl h-8 px-4 font-bold text-xs shadow-3xs transition-all duration-200",
																r.enabled
																	? "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/10"
																	: "bg-zinc-100 text-zinc-750 hover:bg-zinc-200"
															)}
														>
															{r.enabled ? "Active" : "Disabled"}
														</Button>
													</div>

													{/* Disable for Everyone Switch Option */}
													<div className="flex flex-col gap-0.5">
														<span className="text-[8px] uppercase font-black text-zinc-400 tracking-wider">Business Wide</span>
														<label className="flex items-center gap-1.5 text-xs font-bold text-zinc-650 cursor-pointer select-none border border-zinc-200/80 rounded-lg px-2.5 h-8 bg-zinc-50/50 hover:bg-zinc-100 transition-colors">
															<input
																type="checkbox"
																checked={!r.business_enabled}
																onChange={(e) => {
																	const nextBizEnabled = !e.target.checked;
																	setRows((prev) =>
																		prev.map((x) => {
																			if (x.module_key !== r.module_key) return x;
																			const nextEnabled = x.user_enabled !== null ? x.user_enabled : nextBizEnabled;
																			return {
																				...x,
																				business_enabled: nextBizEnabled,
																				enabled: nextEnabled,
																			};
																		})
																	);
																}}
																className="h-3.5 w-3.5 accent-teal-600 rounded cursor-pointer"
															/>
															<span>Disable all</span>
														</label>
													</div>
												</>
											)}
										</div>
									</div>
								))}
								{filteredRows.length === 0 ? (
									<div className="col-span-full py-12 text-center text-xs text-zinc-400 italic bg-zinc-50/10 rounded-xl border border-dashed border-zinc-200">
										No system modules found matching your query filter.
									</div>
								) : null}
							</>
						)}
					</div>

					{/* Actions Button Bar */}
					<div className="flex flex-wrap gap-2.5 pt-3 border-t border-zinc-100">
						<Button
							disabled={isPending || !selectedBusinessId}
							onClick={handleSave}
							className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-5 transition-all shadow-sm"
						>
							Save configuration
						</Button>
						<Button
							variant="outline"
							disabled={isPending || !selectedBusinessId}
							onClick={handleReset}
							className="rounded-xl h-10 px-5 border-zinc-200 text-zinc-700 font-bold"
						>
							Reset
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

