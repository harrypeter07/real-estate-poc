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
	const [selectedBiz, setSelectedBiz] = useState<string>("");
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
		const base = selectedBiz ? admins.filter((a) => a.business_id === selectedBiz) : admins;
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

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold tracking-tight">Tenant Admins</h1>
				<p className="text-sm text-zinc-600">Create businesses and admins, enable/disable access.</p>
			</div>

			{err ? (
				<div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{err}</div>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold">Create business & owner admin</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<Input value={newBizName} onChange={(e) => setNewBizName(e.target.value)} placeholder="Business name" />
							<Input value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} placeholder="Owner admin name" />
							<Input value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} placeholder="Owner admin email" />
							<div className="relative">
								<Input
									value={newOwnerPassword}
									onChange={(e) => setNewOwnerPassword(e.target.value)}
									placeholder="Owner password (min 6)"
									type={showNewOwnerPassword ? "text" : "password"}
									className="pr-9"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-1 top-1/2 -translate-y-1/2"
									onClick={() => setShowNewOwnerPassword((v) => !v)}
								>
									{showNewOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
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
						>
							Create business + owner admin
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold">Create additional tenant admin</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<div className="text-xs font-semibold text-zinc-600">Business</div>
								<Select value={selectedBiz} onValueChange={setSelectedBiz} disabled={isPending}>
									<SelectTrigger>
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
							</div>
							<Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin name" />
							<Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin email" />
							<div className="relative">
								<Input
									value={adminPassword}
									onChange={(e) => setAdminPassword(e.target.value)}
									placeholder="Password (min 6)"
									type={showAdminPassword ? "text" : "password"}
									className="pr-9"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-1 top-1/2 -translate-y-1/2"
									onClick={() => setShowAdminPassword((v) => !v)}
								>
									{showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
						</div>
						<Button
							disabled={isPending || !selectedBiz || !adminEmail.trim() || adminPassword.trim().length < 6}
							onClick={() => {
								startTransition(async () => {
									setErr(null);
									const res = await saCreateTenantAdmin({
										business_id: selectedBiz,
										name: adminName,
										email: adminEmail,
										password: adminPassword,
									});
									if (!res.ok) setErr(res.error);
									setAdminName("");
									setAdminEmail("");
									setAdminPassword("");
									await load();
								});
							}}
						>
							Create admin
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card className="border-red-200">
				<CardHeader>
					<CardTitle className="text-sm font-bold text-red-700">
						Danger Zone: Delete Single Business Data
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
							<div className="text-xs font-semibold text-zinc-600">Business to delete</div>
							<Select value={purgeBusinessId} onValueChange={setPurgeBusinessId} disabled={purging}>
								<SelectTrigger>
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
						</div>
						<div className="space-y-1">
							<div className="text-xs font-semibold text-zinc-600">
								Confirmation text
							</div>
							<div className="text-[11px] text-zinc-500">
								{purgeExpectedConfirm ? (
									<>
										Type exactly:{" "}
										<span className="font-mono font-semibold text-red-700">
											{purgeExpectedConfirm}
										</span>
									</>
								) : (
									"Select a business first to see required confirmation text."
								)}
							</div>
							<Input
								value={purgeConfirmText}
								onChange={(e) => setPurgeConfirmText(e.target.value)}
								placeholder={purgeExpectedConfirm || "Select business first"}
								disabled={purging || !purgeBusinessId}
							/>
						</div>
					</div>
					<div className="text-xs text-zinc-600">
						This deletes only rows mapped to the selected business, table-by-table with
						live progress.
					</div>
					{purgeBusinessId ? (
						<div className="rounded-md border bg-zinc-50 p-3 space-y-2">
							<div className="text-xs">
								<span className="font-semibold text-zinc-700">Advisors in this business:</span>{" "}
								<span className="font-mono">{purgeAdvisorCount}</span>
							</div>
							<div className="text-xs font-semibold text-zinc-700">Business admins</div>
							{purgeAdmins.length === 0 ? (
								<div className="text-xs text-zinc-500">
									No tenant admin login accounts found for this business.
								</div>
							) : (
								<div className="space-y-2">
									{purgeAdmins.map((a) => (
										<div key={a.id} className="rounded border bg-white p-2 space-y-2">
											<div className="text-xs flex items-center justify-between gap-2">
												<span className="font-medium text-zinc-800">
													{a.name || "Unnamed admin"}
												</span>
												<span className="font-mono text-zinc-600">{a.email || "—"}</span>
											</div>
											<div className="text-[11px] text-zinc-500">
												Status: {a.is_active ? "active" : "disabled"}
											</div>
											<div className="text-[11px] text-amber-700">
												Existing password is not readable (securely stored). Set a temporary password below if needed.
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<Input
													type="text"
													placeholder="Set temporary password (min 6)"
													value={purgeAdminPasswords[a.id] ?? ""}
													onChange={(e) =>
														setPurgeAdminPasswords((prev) => ({
															...prev,
															[a.id]: e.target.value,
														}))
													}
													disabled={purging || purgePwdSavingId === a.id}
													className="h-8 max-w-xs"
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
												>
													{purgePwdSavingId === a.id ? "Saving..." : "Set temp password"}
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					) : null}
					{purgeSteps.length > 0 ? (
						<div className="space-y-2">
							<Progress value={purgeProgressValue} />
							<div className="text-xs text-zinc-600">
								{purgeDoneCount}/{purgeSteps.length} steps completed
							</div>
							<div className="max-h-52 overflow-auto rounded-md border p-2 space-y-1">
								{purgeSteps.map((s) => (
									<div key={s.key} className="text-xs flex items-center justify-between gap-3">
										<span className="truncate">{s.label}</span>
										<span className="font-mono text-zinc-600">
											{s.status === "done"
												? `done (${s.deleted}/${s.matched})${s.deletedAuthUsers ? ` +auth:${s.deletedAuthUsers}` : ""}`
												: s.status === "running"
													? "running..."
													: s.status === "stopped"
														? "stopped"
													: s.status === "error"
														? `error: ${s.error ?? "failed"}`
														: "pending"}
										</span>
									</div>
								))}
							</div>
						</div>
					) : null}
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
					>
						{purging ? "Deleting business data..." : "Delete this business data"}
					</Button>
					{purging ? (
						<Button
							type="button"
							variant="outline"
							className="ml-2 border-amber-300 text-amber-800 hover:bg-amber-50"
							onClick={() => {
								purgeAbortRef.current = true;
							}}
						>
							Stop deletion
						</Button>
					) : null}
				</CardContent>
			</Card>

			{editId ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold">Edit tenant admin</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Admin name" disabled={isPending} />
							<Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Admin email" disabled={isPending} />
						</div>
						<div className="flex flex-wrap gap-2">
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
							>
								Save changes
							</Button>
							<Button
								variant="outline"
								disabled={isPending}
								onClick={() => {
									setEditId(null);
								}}
							>
								Cancel
							</Button>
							<Button
								variant="outline"
								disabled={isPending}
								className="border-red-200 text-red-700 hover:bg-red-50"
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
								Delete
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-bold">Admins</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="mb-3 flex flex-wrap items-center gap-3">
						<div className="text-xs font-semibold text-zinc-600">Filter by business</div>
						<Select value={selectedBiz} onValueChange={setSelectedBiz} disabled={isPending}>
							<SelectTrigger className="w-64">
								<SelectValue placeholder="All businesses" />
							</SelectTrigger>
							<SelectContent>
								{biz.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex-1 min-w-[220px]">
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search by email, name, auth user id..."
								className="w-full"
							/>
						</div>
						<Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(load)}>
							Refresh
						</Button>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredAdmins.map((a) => (
								<TableRow
									key={a.id}
									className="cursor-pointer"
									onClick={() => openDetails(a)}
								>
									<TableCell className="font-mono text-xs">{a.email ?? "—"}</TableCell>
									<TableCell className="text-sm">{a.name ?? "—"}</TableCell>
									<TableCell className="text-xs text-zinc-500">{String(a.created_at ?? "").slice(0, 10)}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											disabled={isPending}
											onClick={(e) => {
												e.stopPropagation();
												openDetails(a);
											}}
										>
											Details
										</Button>
									</TableCell>
								</TableRow>
							))}
							{filteredAdmins.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="text-sm text-zinc-500 text-center py-8">
										No admins found.
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog
				open={detailsOpen}
				onOpenChange={(open) => {
					setDetailsOpen(open);
					if (!open) setDetailsAdmin(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Admin details</DialogTitle>
						<DialogDescription>Manage login and password for this tenant admin.</DialogDescription>
					</DialogHeader>

					{detailsAdmin ? (
						<div className="space-y-6">
							<div className="space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="space-y-1">
										<div className="text-xs font-semibold text-zinc-600">Name</div>
										<Input value={detailsName} onChange={(e) => setDetailsName(e.target.value)} disabled={detailsSavingProfile} />
									</div>
									<div className="space-y-1">
										<div className="text-xs font-semibold text-zinc-600">Email</div>
										<Input value={detailsEmail} onChange={(e) => setDetailsEmail(e.target.value)} disabled={detailsSavingProfile} />
									</div>
								</div>

								<div className="flex items-center justify-between gap-4">
									<div>
										<div className="text-xs font-semibold text-zinc-600">Login enabled</div>
										<div className="text-xs text-zinc-500 font-mono">{detailsIsActive ? "enabled" : "disabled"}</div>
									</div>
									<Switch checked={detailsIsActive} onCheckedChange={(checked) => setDetailsIsActive(checked)} disabled={detailsSavingProfile} />
								</div>

								<div className="text-xs text-zinc-500 font-mono break-all">
									Auth user id: {String(detailsAdmin.auth_user_id ?? "—")}
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										disabled={detailsSavingProfile}
										onClick={() => startTransition(() => void saveDetailsProfile())}
									>
										{detailsSavingProfile ? "Saving..." : "Save profile"}
									</Button>
									<Button
										variant="outline"
										disabled={detailsSavingProfile}
										onClick={() => {
											setDetailsName(detailsAdmin.name ?? "");
											setDetailsEmail(detailsAdmin.email ?? "");
											setDetailsIsActive(!!detailsAdmin.is_active);
										}}
									>
										Reset
									</Button>
									<Button
										variant="outline"
										className="border-red-200 text-red-700 hover:bg-red-50"
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
										Delete admin
									</Button>
								</div>
							</div>

							<div className="space-y-3">
								<div>
									<div className="text-sm font-bold">Change password</div>
									<div className="text-xs text-zinc-500">Updates the login password for this tenant admin.</div>
								</div>

								<div className="relative">
									<Input
										value={detailsPassword}
										onChange={(e) => setDetailsPassword(e.target.value)}
										placeholder="New password (min 6)"
										type={showDetailsPassword ? "text" : "password"}
											className="pr-9"
										disabled={detailsSavingPassword}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-1 top-1/2 -translate-y-1/2"
										disabled={detailsSavingPassword}
										onClick={() => setShowDetailsPassword((v) => !v)}
									>
										{showDetailsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</Button>
								</div>

								<div className="flex flex-wrap gap-2">
									<Button
										disabled={detailsSavingPassword || detailsPassword.trim().length < 6}
										onClick={() => startTransition(() => void changeDetailsPassword())}
									>
										{detailsSavingPassword ? "Changing..." : "Change password"}
									</Button>
									<Button
										variant="outline"
										disabled={detailsSavingPassword}
										onClick={() => setDetailsPassword("")}
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

