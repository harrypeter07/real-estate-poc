"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
	saCreateBusiness,
	saCreateBusinessWithOwner,
	saCreateTenantAdmin,
	saDeleteTenantAdmin,
	saChangeTenantAdminPassword,
	saListBusinesses,
	saListTenantAdmins,
	saGetBusinessModules,
	saSetBusinessModulesBulk,
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
import { Eye, EyeOff } from "lucide-react";

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

	// Details dialog states
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsAdmin, setDetailsAdmin] = useState<any | null>(null);
	const [detailsName, setDetailsName] = useState("");
	const [detailsEmail, setDetailsEmail] = useState("");
	const [detailsIsActive, setDetailsIsActive] = useState(true);
	const [detailsModules, setDetailsModules] = useState<Array<{ module_key: string; enabled: boolean; name: string }>>([]);
	const [detailsPassword, setDetailsPassword] = useState("");
	const [showDetailsPassword, setShowDetailsPassword] = useState(false);
	const [detailsSavingModules, setDetailsSavingModules] = useState(false);
	const [detailsSavingProfile, setDetailsSavingProfile] = useState(false);
	const [detailsSavingPassword, setDetailsSavingPassword] = useState(false);
	const [selectedBizModules, setSelectedBizModules] = useState<Array<{ module_key: string; enabled: boolean; name: string }>>([]);
	const [loadingSelectedModules, setLoadingSelectedModules] = useState(false);

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
		if (!selectedBiz && b.ok && b.data.length) setSelectedBiz(b.data[0].id);
	}

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		async function loadModulesForSelectedBiz() {
			if (!selectedBiz) {
				setSelectedBizModules([]);
				return;
			}
			setLoadingSelectedModules(true);
			try {
				const res = await saGetBusinessModules({ business_id: selectedBiz });
				if (res.ok) setSelectedBizModules(res.data);
			} finally {
				setLoadingSelectedModules(false);
			}
		}
		void loadModulesForSelectedBiz();
	}, [selectedBiz]);

	async function openDetails(a: any) {
		setDetailsAdmin(a);
		setDetailsName(a.name ?? "");
		setDetailsEmail(a.email ?? "");
		setDetailsIsActive(!!a.is_active);
		setDetailsModules([]);
		setDetailsPassword("");
		setShowDetailsPassword(false);
		setDetailsOpen(true);
		// Load module entitlements for this admin's business
		const res = await saGetBusinessModules({ business_id: a.business_id });
		if (res.ok) setDetailsModules(res.data);
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

	async function saveDetailsModules() {
		if (!detailsAdmin) return;
		setDetailsSavingModules(true);
		try {
			const businessId = detailsAdmin.business_id as string;
			const enabledKeys = detailsModules.filter((m) => m.enabled).map((m) => m.module_key);
			const res = await saSetBusinessModulesBulk({ business_id: businessId, enabledModuleKeys: enabledKeys });
			if (!res.ok) throw new Error(res.error);
			const refreshed = await saGetBusinessModules({ business_id: businessId });
			if (refreshed.ok) setDetailsModules(refreshed.data);
			await load();
		} catch (e: any) {
			setErr(e?.message ?? "Failed to save modules");
		} finally {
			setDetailsSavingModules(false);
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
								<TableHead>Modules</TableHead>
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
									<TableCell className="text-sm">
										{loadingSelectedModules ? (
											<span className="text-zinc-400">...</span>
										) : (
											<span className="text-zinc-700">
												{selectedBizModules.filter((m) => m.enabled).length} enabled
											</span>
										)}
									</TableCell>
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
									<TableCell colSpan={5} className="text-sm text-zinc-500 text-center py-8">
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
						<DialogDescription>Manage login, modules, and password for this tenant admin.</DialogDescription>
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
										disabled={detailsSavingProfile || detailsSavingModules || detailsSavingPassword}
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
									<div className="text-sm font-bold">Modules (business-level)</div>
									<div className="text-xs text-zinc-500">
										These toggles apply to the tenant/business entitlements (all admins inside this business share the same module access).
									</div>
								</div>

								<div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-3">
									{detailsModules.length === 0 ? (
										<div className="text-sm text-zinc-500">Loading modules...</div>
									) : (
										detailsModules.map((m) => (
											<div key={m.module_key} className="flex items-center justify-between gap-3">
												<div className="min-w-0">
													<div className="text-sm font-semibold truncate">{m.name}</div>
													<div className="text-xs text-zinc-500 font-mono truncate">{m.module_key}</div>
												</div>
												<Switch
													checked={m.enabled}
													disabled={detailsSavingModules}
													onCheckedChange={(checked) => {
														setDetailsModules((prev) =>
															prev.map((x) => (x.module_key === m.module_key ? { ...x, enabled: checked } : x))
														);
													}}
												/>
											</div>
										))
									)}
								</div>

								<div className="flex flex-wrap gap-2">
									<Button disabled={detailsSavingModules} onClick={() => startTransition(() => void saveDetailsModules())}>
										{detailsSavingModules ? "Saving modules..." : "Save modules"}
									</Button>
									<Button
										variant="outline"
										disabled={detailsSavingModules}
										onClick={async () => {
											if (!detailsAdmin) return;
											const refreshed = await saGetBusinessModules({ business_id: detailsAdmin.business_id });
											if (refreshed.ok) setDetailsModules(refreshed.data);
										}}
									>
										Reset modules
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

