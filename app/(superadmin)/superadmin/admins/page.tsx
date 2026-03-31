"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saCreateBusiness, saCreateTenantAdmin, saListBusinesses, saListTenantAdmins, saSetAdminActive } from "@/app/actions/superadmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SuperAdminAdminsPage() {
	const [biz, setBiz] = useState<Array<{ id: string; name: string; status: string }>>([]);
	const [admins, setAdmins] = useState<any[]>([]);
	const [err, setErr] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const [newBizName, setNewBizName] = useState("");
	const [selectedBiz, setSelectedBiz] = useState<string>("");
	const [adminName, setAdminName] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [adminPassword, setAdminPassword] = useState("");

	const filteredAdmins = useMemo(() => {
		if (!selectedBiz) return admins;
		return admins.filter((a) => a.business_id === selectedBiz);
	}, [admins, selectedBiz]);

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
						<CardTitle className="text-sm font-bold">Create business</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Input value={newBizName} onChange={(e) => setNewBizName(e.target.value)} placeholder="Business name" />
						<Button
							disabled={isPending || !newBizName.trim()}
							onClick={() => {
								startTransition(async () => {
									setErr(null);
									const res = await saCreateBusiness({ name: newBizName.trim() });
									if (!res.ok) setErr(res.error);
									setNewBizName("");
									await load();
								});
							}}
						>
							Create business
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-bold">Create tenant admin</CardTitle>
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
							<Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password (min 6)" type="password" />
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
						<Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(load)}>
							Refresh
						</Button>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Active</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredAdmins.map((a) => (
								<TableRow key={a.id}>
									<TableCell className="font-mono text-xs">{a.email ?? "—"}</TableCell>
									<TableCell className="text-sm">{a.name ?? "—"}</TableCell>
									<TableCell className="text-sm">{a.is_active ? "Yes" : "No"}</TableCell>
									<TableCell className="text-xs text-zinc-500">{String(a.created_at ?? "").slice(0, 10)}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											disabled={isPending}
											onClick={() => {
												startTransition(async () => {
													setErr(null);
													const res = await saSetAdminActive({
														business_admin_id: a.id,
														is_active: !a.is_active,
													});
													if (!res.ok) setErr(res.error);
													await load();
												});
											}}
										>
											{a.is_active ? "Disable" : "Enable"}
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
		</div>
	);
}

