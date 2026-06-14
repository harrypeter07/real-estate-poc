"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
	saCreateBusiness,
	saCreateBusinessWithOwner,
	saCreateTenantAdmin,
	saDeleteTenantAdmin,
	saChangeTenantAdminPassword,
	saGetBusinessDeleteSnapshot,
	saGetBusinessPurgeSteps,
	saListBusinesses,
	saListTenantAdmins,
	saPurgeBusinessStep,
	saSetAdminActive,
	saUpdateTenantAdmin,
} from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PurgeStepState = {
	key: string;
	label: string;
	status: "pending" | "running" | "done" | "error" | "stopped";
	matched: number;
	deleted: number;
	deletedAuthUsers: number;
	error?: string;
};

export default function SuperAdminAdminsPage() {
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [admins, setAdmins] = useState<any[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const [newBizName, setNewBizName] = useState("");
	const [newOwnerName, setNewOwnerName] = useState("");
	const [newOwnerEmail, setNewOwnerEmail] = useState("");
	const [newOwnerPassword, setNewOwnerPassword] = useState("");
	const [showNewOwnerPassword, setShowNewOwnerPassword] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<string>("all");
	const [createAdminBizId, setCreateAdminBizId] = useState<string>("");
	const [adminName, setAdminName] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [adminPassword, setAdminPassword] = useState("");
	const [showAdminPassword, setShowAdminPassword] = useState(false);

	const [searchQuery, setSearchQuery] = useState("");
	const [purgeBusinessId, setPurgeBusinessId] = useState("");
	const [purgeConfirmText, setPurgeConfirmText] = useState("");
	const [purgeSteps, setPurgeSteps] = useState<PurgeStepState[]>([]);
	const [purging, setPurging] = useState(false);
	const purgeAbortRef = useRef(false);
	const [purgeAdvisorCount, setPurgeAdvisorCount] = useState(0);
	const [purgeBusinessName, setPurgeBusinessName] = useState("");
	const [purgeAdmins, setPurgeAdmins] = useState<
		Array<{ id: string; name: string | null; email: string | null; is_active: boolean }>
	>([]);
	const [purgeAdminPasswords, setPurgeAdminPasswords] = useState<Record<string, string>>({});
	const [purgePwdSavingId, setPurgePwdSavingId] = useState<string | null>(null);

	// Details dialog states
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsAdmin, setDetailsAdmin] = useState<any | null>(null);
	const [detailsName, setDetailsName] = useState("");
	const [detailsEmail, setDetailsEmail] = useState("");
	const [detailsIsActive, setDetailsIsActive] = useState(true);
	const [detailsPassword, setDetailsPassword] = useState("");
	const [showDetailsPassword, setShowDetailsPassword] = useState(false);
	const [detailsSavingProfile, setDetailsSavingProfile] = useState(false);
	const [detailsSavingPassword, setDetailsSavingPassword] = useState(false);

	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editEmail, setEditEmail] = useState("");

	const filteredAdmins = useMemo(() => {
		const base = selectedBiz && selectedBiz !== "all" ? admins.filter((a) => a.business_id === selectedBiz) : admins;
		const q = searchQuery.trim().toLowerCase();
		if (!q) return base;
		return base.filter((a) => {
			const email = String(a.email ?? "").toLowerCase();
			const name = String(a.name ?? "").toLowerCase();
			const authUserId = String(a.auth_user_id ?? "").toLowerCase();
			return email.includes(q) || name.includes(q) || authUserId.includes(q);
		});
	}, [admins, selectedBiz, searchQuery]);

	async function load() {
		setErr(null);
		const [b, a] = await Promise.all([saListBusinesses(), saListTenantAdmins({})]);
		if (!b.ok) setErr(b.error);
		if (!a.ok) setErr((prev) => prev ?? a.error);
		setBiz(b.ok ? b.data : []);
		setAdmins(a.ok ? a.data : []);
		// Default: show ALL businesses (no filter) unless user explicitly selects one.
	}

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		let cancelled = false;
		async function loadDeleteSnapshot() {
			if (!purgeBusinessId) {
				if (!cancelled) {
					setPurgeBusinessName("");
					setPurgeAdvisorCount(0);
					setPurgeAdmins([]);
					setPurgeAdminPasswords({});
				}
				return;
			}
			const res = await saGetBusinessDeleteSnapshot({ business_id: purgeBusinessId });
			if (cancelled) return;
			if (!res.ok) {
				setErr(res.error);
				setPurgeBusinessName("");
				setPurgeAdvisorCount(0);
				setPurgeAdmins([]);
				setPurgeAdminPasswords({});
				return;
			}
			setPurgeBusinessName(res.data.business_name);
			setPurgeAdvisorCount(res.data.advisor_count);
			setPurgeAdmins(res.data.admins);
			setPurgeAdminPasswords({});
		}
		void loadDeleteSnapshot();
		return () => {
			cancelled = true;
		};
	}, [purgeBusinessId]);

	async function openDetails(a: any) {
		setDetailsAdmin(a);
		setDetailsName(a.name ?? "");
		setDetailsEmail(a.email ?? "");
		setDetailsIsActive(!!a.is_active);
		setDetailsPassword("");
		setShowDetailsPassword(false);
		setDetailsOpen(true);
	}

	const purgeTargetBiz = useMemo(
		() => biz.find((b) => b.id === purgeBusinessId) ?? null,
		[biz, purgeBusinessId]
	);
	const purgeExpectedBusinessName = (purgeBusinessName || purgeTargetBiz?.name || "").trim();
	const purgeExpectedConfirm = purgeExpectedBusinessName ? `DELETE ${purgeExpectedBusinessName}` : "";
	const purgeDoneCount = purgeSteps.filter((s) => s.status === "done").length;
	const purgeProgressValue =
		purgeSteps.length > 0 ? Math.round((purgeDoneCount / purgeSteps.length) * 100) : 0;

	async function runBusinessPurge() {
		setErr(null);
		if (!purgeBusinessId) {
			setErr("Select a business to purge");
			return;
		}
		if (!purgeTargetBiz || purgeConfirmText.trim() !== purgeExpectedConfirm) {
			setErr("Type the exact confirmation text before deleting");
			return;
		}

		setPurging(true);
		purgeAbortRef.current = false;
		try {
			const stepsRes = await saGetBusinessPurgeSteps();
			if (!stepsRes.ok) throw new Error(stepsRes.error);

			let steps: PurgeStepState[] = stepsRes.data.map((s) => ({
				key: s.key,
				label: s.label,
				status: "pending",
				matched: 0,
				deleted: 0,
				deletedAuthUsers: 0,
			}));
			setPurgeSteps(steps);

			for (let i = 0; i < steps.length; i++) {
				if (purgeAbortRef.current) {
					steps = steps.map((s, idx) =>
						idx >= i && s.status === "pending" ? { ...s, status: "stopped" } : s
					);
					setPurgeSteps(steps);
					throw new Error("Deletion stopped by user");
				}

				const step = steps[i];
				steps = steps.map((s, idx) => (idx === i ? { ...s, status: "running" } : s));
				setPurgeSteps(steps);

				const res = await saPurgeBusinessStep({
					business_id: purgeBusinessId,
					step_key: step.key as any,
				});

				if (!res.ok) {
					steps = steps.map((s, idx) =>
						idx === i ? { ...s, status: "error", error: res.error } : s
					);
					setPurgeSteps(steps);
					throw new Error(`${step.label}: ${res.error}`);
				}

				steps = steps.map((s, idx) =>
					idx === i
						? {
								...s,
								status: "done",
								matched: res.data.matched,
								deleted: res.data.deleted,
								deletedAuthUsers: Number(res.data.deleted_auth_users ?? 0),
						  }
						: s
				);
				setPurgeSteps(steps);
			}

			setPurgeConfirmText("");
			await load();
		} catch (e: any) {
			setErr(e?.message ?? "Business purge failed");
		} finally {
			setPurging(false);
		}
	}

	async function saveDetailsProfile() {
		if (!detailsAdmin) return;
		setDetailsSavingProfile(true);
		try {
			const adminId = detailsAdmin.id as string;
			const updateRes = await saUpdateTenantAdmin({
				business_admin_id: adminId,
				name: detailsName,
				email: detailsEmail,
			});
			if (!updateRes.ok) throw new Error(updateRes.error);

			if (detailsAdmin.is_active !== detailsIsActive) {
				const toggleRes = await saSetAdminActive({
					business_admin_id: adminId,
					is_active: detailsIsActive,
				});
				if (!toggleRes.ok) throw new Error(toggleRes.error);
			}

			await load();
			setDetailsAdmin((prev: any) => (prev ? { ...prev, name: detailsName, email: detailsEmail, is_active: detailsIsActive } : prev));
		} catch (e: any) {
			setErr(e?.message ?? "Failed to save admin");
		} finally {
			setDetailsSavingProfile(false);
		}
	}

	async function changeDetailsPassword() {
		if (!detailsAdmin) return;
		setDetailsSavingPassword(true);
		try {
			const res = await saChangeTenantAdminPassword({
				business_admin_id: detailsAdmin.id,
				newPassword: detailsPassword,
			});
			if (!res.ok) throw new Error(res.error);
			setDetailsPassword("");
			await load();
		} catch (e: any) {
			setErr(e?.message ?? "Failed to change password");
		} finally {
			setDetailsSavingPassword(false);
		}
	}

	async function toggleAdminActive(admin: any) {
		if (isPending) return;
		startTransition(async () => {
			setErr(null);
			const nextActive = !admin.is_active;
			const res = await saSetAdminActive({
				business_admin_id: admin.id,
				is_active: nextActive,
			});
			if (!res.ok) {
				setErr(res.error);
			} else {
				await load();
			}
		});
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-300">
			<div>
				<h1 className="text-2xl font-black text-zinc-800 tracking-tight">Tenant Management</h1>
				<p className="text-sm text-zinc-500 mt-1">
					Create, configure, search, and manage SaaS business tenants, admin credentials, and database states.
				</p>
			</div>

			{err ? (
				<div className="rounded-2xl border border-red-100 bg-red-50/60 backdrop-blur-md text-red-700 p-4 text-sm font-semibold shadow-2xs">
					{err}
				</div>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Card: Create Business & Owner */}
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
					<CardHeader className="pb-3 pt-6 px-6">
						<CardTitle className="text-sm font-black text-zinc-800 uppercase tracking-wider">
							Create Business & Owner Admin
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 p-6 pt-0">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Business Name</span>
								<Input 
									value={newBizName} 
									onChange={(e) => setNewBizName(e.target.value)} 
									placeholder="e.g. MG Infra" 
									className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
								/>
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Owner Name</span>
								<Input 
									value={newOwnerName} 
									onChange={(e) => setNewOwnerName(e.target.value)} 
									placeholder="e.g. John Doe" 
									className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
								/>
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Owner Email</span>
								<Input 
									value={newOwnerEmail} 
									onChange={(e) => setNewOwnerEmail(e.target.value)} 
									placeholder="e.g. owner@mginfra.com" 
									className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
								/>
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Owner Password</span>
								<div className="relative">
									<Input
										value={newOwnerPassword}
										onChange={(e) => setNewOwnerPassword(e.target.value)}
										placeholder="Min 6 characters"
										type={showNewOwnerPassword ? "text" : "password"}
										className="rounded-xl border-zinc-200 h-10 pr-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-zinc-600 rounded-lg"
										onClick={() => setShowNewOwnerPassword((v) => !v)}
									>
										{showNewOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</Button>
								</div>
							</div>
						</div>
						<Button
							disabled={
								isPending ||
								!newBizName.trim() ||
								!newOwnerEmail.trim() ||
								newOwnerPassword.trim().length < 6
							}
							onClick={() => {
								startTransition(async () => {
									setErr(null);
									const res = await saCreateBusinessWithOwner({
										business_name: newBizName.trim(),
										admin_name: newOwnerName,
										admin_email: newOwnerEmail,
										admin_password: newOwnerPassword,
									});
									if (!res.ok) setErr(res.error);
									setNewBizName("");
									setNewOwnerName("");
									setNewOwnerEmail("");
									setNewOwnerPassword("");
									await load();
								});
							}}
							className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-5 transition-all w-full sm:w-auto"
						>
							Create Business + Owner
						</Button>
					</CardContent>
				</Card>

				{/* Card: Create Additional Admin */}
				<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
					<CardHeader className="pb-3 pt-6 px-6">
						<CardTitle className="text-sm font-black text-zinc-800 uppercase tracking-wider">
							Create Additional Tenant Admin
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 p-6 pt-0">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Select Business</span>
								<Select value={createAdminBizId} onValueChange={setCreateAdminBizId} disabled={isPending}>
									<SelectTrigger className="rounded-xl border-zinc-200 h-10 w-full focus:ring-teal-500/10 focus:border-teal-650">
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
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Admin Name</span>
								<Input 
									value={adminName} 
									onChange={(e) => setAdminName(e.target.value)} 
									placeholder="e.g. Jane Smith" 
									className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
								/>
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Admin Email</span>
								<Input 
									value={adminEmail} 
									onChange={(e) => setAdminEmail(e.target.value)} 
									placeholder="e.g. admin@mginfra.com" 
									className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
								/>
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Password</span>
								<div className="relative">
									<Input
										value={adminPassword}
										onChange={(e) => setAdminPassword(e.target.value)}
										placeholder="Min 6 characters"
										type={showAdminPassword ? "text" : "password"}
										className="rounded-xl border-zinc-200 h-10 pr-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-zinc-600 rounded-lg"
										onClick={() => setShowAdminPassword((v) => !v)}
									>
										{showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</Button>
								</div>
							</div>
						</div>
						<Button
							disabled={isPending || !createAdminBizId || !adminEmail.trim() || adminPassword.trim().length < 6}
							onClick={() => {
								startTransition(async () => {
									setErr(null);
									const res = await saCreateTenantAdmin({
										business_id: createAdminBizId,
										name: adminName,
										email: adminEmail,
										password: adminPassword,
									});
									if (!res.ok) setErr(res.error);
									setAdminName("");
									setAdminEmail("");
									setAdminPassword("");
									setCreateAdminBizId("");
									await load();
								});
							}}
							className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-5 transition-all w-full sm:w-auto"
						>
							Create Admin
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Card: Danger Zone */}
			<Card className="rounded-2xl border-red-200 shadow-[0_1px_4px_rgba(239,68,68,0.08)] bg-red-50/10 overflow-hidden relative">
				<div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
				<CardHeader className="pb-3 pt-6 px-6">
					<CardTitle className="text-sm font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
						Danger Zone: Delete Single Business Data
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 p-6 pt-0">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Business to delete</span>
							<Select value={purgeBusinessId} onValueChange={setPurgeBusinessId} disabled={purging}>
								<SelectTrigger className="rounded-xl border-zinc-200 h-10 w-full focus:ring-red-500/10 focus:border-red-600 bg-white">
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
						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Confirmation Text</span>
								<div className="text-[10px] text-zinc-500">
									{purgeExpectedConfirm ? (
										<>
											Type exactly: <span className="font-mono font-bold text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-155">{purgeExpectedConfirm}</span>
										</>
									) : (
										"Select a business first"
									)}
								</div>
							</div>
							<Input
								value={purgeConfirmText}
								onChange={(e) => setPurgeConfirmText(e.target.value)}
								placeholder={purgeExpectedConfirm || "Select business first"}
								disabled={purging || !purgeBusinessId}
								className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-red-550/10 focus-visible:border-red-650 bg-white"
							/>
						</div>
					</div>
					<div className="text-xs text-zinc-500">
						* This operation permanently removes database rows mapped to the selected business from all tenant tables sequentially. Live progress will be displayed below.
					</div>

					{purgeBusinessId ? (
						<div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-2xs">
							<div className="text-xs flex items-center gap-1.5">
								<span className="font-bold text-zinc-700">Advisors in this business:</span>
								<span className="font-mono font-black bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200">{purgeAdvisorCount}</span>
							</div>
							<div className="text-xs font-bold text-zinc-700 pt-1 border-t border-zinc-100">Business admins accounts ({purgeAdmins.length})</div>
							{purgeAdmins.length === 0 ? (
								<div className="text-xs text-zinc-500 italic">
									No tenant admin login accounts found for this business.
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{purgeAdmins.map((a) => (
										<div key={a.id} className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-3 space-y-2">
											<div className="flex flex-col gap-0.5">
												<span className="font-bold text-zinc-800 text-xs truncate">
													{a.name || "Unnamed admin"}
												</span>
												<span className="font-mono text-zinc-500 text-[10px] truncate">{a.email || "—"}</span>
											</div>
											<div className="text-[10px] flex items-center gap-1">
												<span className="text-zinc-500">Status:</span>
												<span className={cn("font-bold px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide border", 
													a.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-zinc-100 text-zinc-600 border-zinc-200"
												)}>
													{a.is_active ? "active" : "disabled"}
												</span>
											</div>
											<div className="text-[10px] text-amber-700 leading-normal bg-amber-50/50 border border-amber-100 p-2 rounded-lg">
												Existing password is securely encrypted. Override temporary password if needed:
											</div>
											<div className="flex items-center gap-2">
												<Input
													type="text"
													placeholder="Temp password"
													value={purgeAdminPasswords[a.id] ?? ""}
													onChange={(e) =>
														setPurgeAdminPasswords((prev) => ({
															...prev,
															[a.id]: e.target.value,
														}))
													}
													disabled={purging || purgePwdSavingId === a.id}
													className="h-8 text-xs rounded-lg bg-white border-zinc-200"
												/>
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={
														purging ||
														purgePwdSavingId === a.id ||
														String(purgeAdminPasswords[a.id] ?? "").trim().length < 6
													}
													onClick={() => {
														startTransition(async () => {
															setErr(null);
															setPurgePwdSavingId(a.id);
															try {
																const res = await saChangeTenantAdminPassword({
																	business_admin_id: a.id,
																	newPassword: String(
																		purgeAdminPasswords[a.id] ?? ""
																	).trim(),
																});
																if (!res.ok) {
																	setErr(res.error);
																	return;
																}
																setPurgeAdminPasswords((prev) => ({
																	...prev,
																	[a.id]: "",
																}));
															} finally {
																setPurgePwdSavingId(null);
															}
														});
													}}
													className="h-8 text-[11px] font-bold rounded-lg border-zinc-250 hover:bg-zinc-50 px-2.5 shrink-0"
												>
													{purgePwdSavingId === a.id ? "Saving..." : "Set"}
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					) : null}

					{purgeSteps.length > 0 ? (
						<div className="space-y-2 bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs">
							<div className="flex items-center justify-between text-xs font-bold text-zinc-700">
								<span>Purge pipeline progress</span>
								<span>{purgeProgressValue}% ({purgeDoneCount}/{purgeSteps.length} steps)</span>
							</div>
							<Progress value={purgeProgressValue} className="h-2 bg-zinc-100" />
							<div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-150 divide-y divide-zinc-100 bg-zinc-50/20">
								{purgeSteps.map((s) => (
									<div key={s.key} className="text-[11px] p-2.5 flex items-center justify-between gap-3">
										<span className="font-medium text-zinc-700 truncate">{s.label}</span>
										<span className="font-mono font-bold shrink-0">
											{s.status === "done" ? (
												<span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
													done ({s.deleted}/{s.matched}){s.deletedAuthUsers ? ` +auth:${s.deletedAuthUsers}` : ""}
												</span>
											) : s.status === "running" ? (
												<span className="text-indigo-600 animate-pulse font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
													running...
												</span>
											) : s.status === "stopped" ? (
												<span className="text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">
													stopped
												</span>
											) : s.status === "error" ? (
												<span className="text-red-650 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
													error: {s.error ?? "failed"}
												</span>
											) : (
												<span className="text-zinc-400 bg-white border border-zinc-150 px-1.5 py-0.5 rounded">
													pending
												</span>
											)}
										</span>
									</div>
								))}
							</div>
						</div>
					) : null}

					<div className="flex items-center gap-3 pt-2">
						<Button
							variant="destructive"
							disabled={
								purging ||
								!purgeBusinessId ||
								!purgeTargetBiz ||
								purgeConfirmText.trim() !== purgeExpectedConfirm
							}
							onClick={() => {
								const ok = window.confirm(
									"This will delete only selected business data from all tenant tables. Continue?"
								);
								if (!ok) return;
								startTransition(() => void runBusinessPurge());
							}}
							className="rounded-xl h-10 font-bold px-6 shadow-sm hover:shadow"
						>
							{purging ? "Deleting Business Data..." : "Delete This Business Data"}
						</Button>
						{purging ? (
							<Button
								type="button"
								variant="outline"
								className="rounded-xl h-10 font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
								onClick={() => {
									purgeAbortRef.current = true;
								}}
							>
								Stop Deletion
							</Button>
						) : null}
					</div>
				</CardContent>
			</Card>

			{/* Card: Edit Tenant Admin Profile */}
			{editId ? (
				<Card className="rounded-2xl border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden relative">
					<div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
					<CardHeader className="pb-3 pt-6 px-6">
						<CardTitle className="text-sm font-black text-zinc-800 uppercase tracking-wider">
							Edit Tenant Admin Profile
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 p-6 pt-0">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Admin Name</span>
								<Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" disabled={isPending} className="rounded-xl border-zinc-200 h-10 focus:ring-teal-500/10 focus:border-teal-650" />
							</div>
							<div className="space-y-1">
								<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Admin Email</span>
								<Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" disabled={isPending} className="rounded-xl border-zinc-200 h-10 focus:ring-teal-500/10 focus:border-teal-655" />
							</div>
						</div>
						<div className="flex flex-wrap gap-2.5 pt-1">
							<Button
								disabled={isPending}
								onClick={() => {
									startTransition(async () => {
										setErr(null);
										const res = await saUpdateTenantAdmin({
											business_admin_id: editId,
											name: editName,
											email: editEmail,
										});
										if (!res.ok) setErr(res.error);
										setEditId(null);
										await load();
									});
								}}
								className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-5 transition-all"
							>
								Save Changes
							</Button>
							<Button
								variant="outline"
								disabled={isPending}
								onClick={() => {
									setEditId(null);
								}}
								className="rounded-xl h-10 px-5 border-zinc-250 text-zinc-750 font-bold"
							>
								Cancel
							</Button>
							<Button
								variant="outline"
								disabled={isPending}
								className="rounded-xl h-10 px-5 border-red-200 text-red-700 hover:bg-red-50 font-bold"
								onClick={() => {
									startTransition(async () => {
										const ok = window.confirm("Delete this tenant admin? This will delete their login user.");
										if (!ok) return;
										setErr(null);
										const res = await saDeleteTenantAdmin({ business_admin_id: editId });
										if (!res.ok) setErr(res.error);
										setEditId(null);
										await load();
									});
								}}
							>
								Delete Account
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			{/* Card: Admins List Table */}
			<Card className="rounded-2xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.015)] bg-white overflow-hidden">
				<CardHeader className="pb-3 pt-6 px-6 border-b border-zinc-100 bg-zinc-50/50">
					<CardTitle className="text-sm font-black text-zinc-800 uppercase tracking-wider">
						Registered Tenant Admins
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 space-y-4">
					<div className="flex flex-wrap items-center gap-3.5 pb-2">
						<div className="space-y-1 w-full sm:w-60">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Filter by Business</span>
							<Select value={selectedBiz} onValueChange={setSelectedBiz} disabled={isPending}>
								<SelectTrigger className="rounded-xl border-zinc-200 h-9.5 text-xs bg-white w-full">
									<SelectValue placeholder="All businesses" />
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									<SelectItem value="all" className="rounded-lg">All businesses</SelectItem>
									{biz.map((b) => (
										<SelectItem key={b.id} value={b.id} className="rounded-lg">
											{b.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 flex-1 min-w-[240px]">
							<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Search Records</span>
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search by name, email, auth uuid..."
								className="rounded-xl border-zinc-200 h-9.5 text-xs bg-white focus-visible:ring-teal-500/10 focus-visible:border-teal-600"
							/>
						</div>
						<div className="self-end pt-1">
							<Button 
								variant="outline" 
								size="sm" 
								disabled={isPending} 
								onClick={() => startTransition(load)}
								className="rounded-xl h-9.5 text-xs font-bold border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 px-4"
							>
								Refresh
							</Button>
						</div>
					</div>

					<div className="rounded-xl border border-zinc-200/80 overflow-hidden shadow-2xs">
						<div className="overflow-x-auto w-full">
							<Table>
								<TableHeader className="bg-zinc-50/70">
									<TableRow>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4 min-w-[200px]">Email</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4 min-w-[150px]">Name</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4 w-[120px]">Created At</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4 w-[110px]">Status</TableHead>
										<TableHead className="text-xs font-black uppercase text-zinc-500 h-10 px-4 w-[100px] text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredAdmins.map((a) => (
										<TableRow
											key={a.id}
											className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
											onClick={() => openDetails(a)}
										>
											<TableCell className="font-mono text-xs px-4 py-3 text-zinc-700 min-w-[200px]">{a.email ?? "—"}</TableCell>
											<TableCell className="text-xs font-bold text-zinc-800 px-4 py-3 min-w-[150px]">{a.name ?? "—"}</TableCell>
											<TableCell className="text-xs text-zinc-500 px-4 py-3 w-[120px]">{String(a.created_at ?? "").slice(0, 10)}</TableCell>
											<TableCell className="px-4 py-3 w-[110px]" onClick={(e) => e.stopPropagation()}>
												<Button
													type="button"
													disabled={isPending}
													onClick={() => toggleAdminActive(a)}
													className={cn(
														"rounded-xl h-7 px-3 font-bold text-[10px] shadow-3xs transition-all duration-200 w-full justify-center",
														a.is_active
															? "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/10"
															: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
													)}
												>
													{a.is_active ? "Active" : "Disabled"}
												</Button>
											</TableCell>
											<TableCell className="text-right px-4 py-3 w-[100px]" onClick={(e) => e.stopPropagation()}>
												<Button
													variant="outline"
													size="sm"
													disabled={isPending}
													onClick={() => openDetails(a)}
													className="rounded-lg h-7 px-3 text-[11px] font-bold border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 w-full justify-center"
												>
													Details
												</Button>
											</TableCell>
										</TableRow>
									))}
									{filteredAdmins.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="text-xs text-zinc-400 text-center py-12 italic bg-zinc-50/10">
												No admins found matching current query filters.
											</TableCell>
										</TableRow>
									) : null}
								</TableBody>
							</Table>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Dialog: Admin Details Modal */}
			<Dialog
				open={detailsOpen}
				onOpenChange={(open) => {
					setDetailsOpen(open);
					if (!open) setDetailsAdmin(null);
				}}
			>
				<DialogContent className="rounded-2xl max-w-lg border-zinc-200">
					<DialogHeader>
						<DialogTitle className="text-base font-black text-zinc-800 uppercase tracking-wider">
							Admin details & Credentials
						</DialogTitle>
						<DialogDescription className="text-xs text-zinc-500">
							Manage active permissions, login credentials, and change password for this tenant admin.
						</DialogDescription>
					</DialogHeader>

					{detailsAdmin ? (
						<div className="space-y-6 pt-3">
							<div className="space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-1">
										<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Full Name</span>
										<Input 
											value={detailsName} 
											onChange={(e) => setDetailsName(e.target.value)} 
											disabled={detailsSavingProfile} 
											className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-650"
										/>
									</div>
									<div className="space-y-1">
										<span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Email Address</span>
										<Input 
											value={detailsEmail} 
											onChange={(e) => setDetailsEmail(e.target.value)} 
											disabled={detailsSavingProfile} 
											className="rounded-xl border-zinc-200 h-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-650"
										/>
									</div>
								</div>

								<div className="flex items-center justify-between p-3 rounded-xl border border-zinc-150 bg-zinc-50/50">
									<div className="space-y-0.5">
										<div className="text-xs font-bold text-zinc-850">Login Account Status</div>
										<div className="text-[10px] text-zinc-500">Enable or disable login access to CRM panel</div>
									</div>
									<Switch checked={detailsIsActive} onCheckedChange={(checked) => setDetailsIsActive(checked)} disabled={detailsSavingProfile} />
								</div>

								<div className="text-[10px] text-zinc-400 font-mono bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 break-all select-all">
									Auth UID: {String(detailsAdmin.auth_user_id ?? "—")}
								</div>

								<div className="flex items-center gap-2 pt-1">
									<Button
										disabled={detailsSavingProfile}
										onClick={() => startTransition(() => void saveDetailsProfile())}
										className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-9.5 px-4 text-xs"
									>
										{detailsSavingProfile ? "Saving..." : "Save Profile"}
									</Button>
									<Button
										variant="outline"
										disabled={detailsSavingProfile}
										onClick={() => {
											setDetailsName(detailsAdmin.name ?? "");
											setDetailsEmail(detailsAdmin.email ?? "");
											setDetailsIsActive(!!detailsAdmin.is_active);
										}}
										className="rounded-xl h-9.5 px-4 text-xs border-zinc-250 text-zinc-700 font-bold"
									>
										Reset
									</Button>
									<Button
										variant="outline"
										className="rounded-xl h-9.5 px-4 text-xs border-red-200 text-red-700 hover:bg-red-50 font-bold ml-auto"
										disabled={detailsSavingProfile || detailsSavingPassword}
										onClick={() => {
											const ok = window.confirm("Delete this tenant admin and remove their login user?");
											if (!ok) return;
											startTransition(async () => {
												setErr(null);
												const res = await saDeleteTenantAdmin({ business_admin_id: detailsAdmin.id });
												if (!res.ok) setErr(res.error);
												setDetailsOpen(false);
												setDetailsAdmin(null);
												await load();
											});
										}}
									>
										Delete Admin
									</Button>
								</div>
							</div>

							<div className="border-t border-zinc-200/80 pt-4 space-y-3.5">
								<div className="space-y-0.5">
									<div className="text-xs font-black text-zinc-800 uppercase tracking-wider">Change Password</div>
									<div className="text-[10px] text-zinc-500">Overrides the login password for this tenant admin account.</div>
								</div>

								<div className="relative">
									<Input
										value={detailsPassword}
										onChange={(e) => setDetailsPassword(e.target.value)}
										placeholder="New password (min 6 characters)"
										type={showDetailsPassword ? "text" : "password"}
										className="rounded-xl border-zinc-200 h-10 pr-10 text-sm focus-visible:ring-teal-500/10 focus-visible:border-teal-650"
										disabled={detailsSavingPassword}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-zinc-600 rounded-lg"
										disabled={detailsSavingPassword}
										onClick={() => setShowDetailsPassword((v) => !v)}
									>
										{showDetailsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</Button>
								</div>

								<div className="flex items-center gap-2">
									<Button
										disabled={detailsSavingPassword || detailsPassword.trim().length < 6}
										onClick={() => startTransition(() => void changeDetailsPassword())}
										className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-9.5 px-4 text-xs"
									>
										{detailsSavingPassword ? "Changing..." : "Change Password"}
									</Button>
									<Button
										variant="outline"
										disabled={detailsSavingPassword}
										onClick={() => setDetailsPassword("")}
										className="rounded-xl h-9.5 px-4 text-xs border-zinc-250 text-zinc-700 font-bold"
									>
										Clear
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}

