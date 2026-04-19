"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuditActionLabel, formatAuditTimestamp } from "@/lib/superadmin/audit-labels";
import { isRedirectError } from "next/dist/client/components/redirect-error";

type SAResult<T> = { ok: true; data: T } | { ok: false; error: string };

function roleOf(user: any): string {
	return String(user?.user_metadata?.role ?? "").trim().toLowerCase();
}

async function requireSA() {
	const supabase = await createClient();
	if (!supabase) throw new Error("Database unavailable");
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || roleOf(user) !== "superadmin") throw new Error("Forbidden");
	return { supabase, user };
}

async function audit(params: {
	actorId: string;
	action: string;
	targetBusinessId?: string | null;
	targetAdminAuthUserId?: string | null;
	before?: any;
	after?: any;
}) {
	const admin = createAdminClient();
	if (!admin) return;
	await admin.from("superadmin_audit_logs").insert({
		actor_auth_user_id: params.actorId,
		action: params.action,
		target_business_id: params.targetBusinessId ?? null,
		target_admin_auth_user_id: params.targetAdminAuthUserId ?? null,
		before: params.before ?? null,
		after: params.after ?? null,
	});
}

export async function saListBusinesses(): Promise<SAResult<Array<{ id: string; name: string; status: string }>>> {
	try {
		const { supabase } = await requireSA();
		const { data, error } = await supabase
			.from("businesses")
			.select("id, name, status")
			.order("created_at", { ascending: false });
		if (error) return { ok: false, error: error.message };
		return { ok: true, data: (data ?? []) as any };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saCreateBusiness(input: {
	name: string;
	status?: "active" | "disabled";
	notes?: string;
}): Promise<SAResult<{ id: string }>> {
	try {
		const { supabase, user } = await requireSA();
		const payload = {
			name: (input.name ?? "").trim(),
			status: input.status ?? "active",
			notes: (input.notes ?? "").trim() || null,
		};
		if (!payload.name) return { ok: false, error: "Business name is required" };
		const { data, error } = await supabase
			.from("businesses")
			.insert(payload)
			.select("id")
			.single();
		if (error) return { ok: false, error: error.message };

		// Initialize module entitlements to enabled for all known modules.
		const { data: modules } = await supabase.from("modules").select("key");
		const entRows = (modules ?? []).map((m: any) => ({
			business_id: data.id,
			module_key: m.key,
			enabled: true,
		}));
		if (entRows.length) await supabase.from("business_modules").upsert(entRows);

		await audit({
			actorId: user.id,
			action: "business.create",
			targetBusinessId: data.id,
			after: payload,
		});
		return { ok: true, data: { id: data.id } };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saCreateTenantAdmin(input: {
	business_id: string;
	name: string;
	email: string;
	password: string;
}): Promise<SAResult<{ auth_user_id: string }>> {
	try {
		const { supabase, user } = await requireSA();
		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };

		const businessId = String(input.business_id ?? "").trim();
		const name = (input.name ?? "").trim();
		const email = (input.email ?? "").trim().toLowerCase();
		const password = (input.password ?? "").trim();
		if (!businessId) return { ok: false, error: "Business is required" };
		if (!email.includes("@")) return { ok: false, error: "Valid email is required" };
		if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

		const { data: authRes, error: authErr } = await admin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				role: "admin",
				business_id: businessId,
				name,
			},
		});
		if (authErr || !authRes?.user?.id) return { ok: false, error: authErr?.message ?? "Failed to create auth user" };

		const authUserId = authRes.user.id;

		// Insert mapping row
		const { error: mapErr } = await supabase.from("business_admins").insert({
			business_id: businessId,
			auth_user_id: authUserId,
			name: name || null,
			email,
			is_active: true,
		});
		if (mapErr) return { ok: false, error: mapErr.message };

		await audit({
			actorId: user.id,
			action: "admin.create",
			targetBusinessId: businessId,
			targetAdminAuthUserId: authUserId,
			after: { email, name },
		});
		return { ok: true, data: { auth_user_id: authUserId } };
	} catch (e: any) {
		if (isRedirectError(e)) throw e;
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saCreateBusinessWithOwner(input: {
	business_name: string;
	admin_name: string;
	admin_email: string;
	admin_password: string;
}): Promise<SAResult<{ business_id: string; admin_auth_user_id: string }>> {
	try {
		const { supabase, user } = await requireSA();
		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };

		const businessName = (input.business_name ?? "").trim();
		const adminName = (input.admin_name ?? "").trim();
		const adminEmail = (input.admin_email ?? "").trim().toLowerCase();
		const adminPassword = (input.admin_password ?? "").trim();

		if (!businessName) return { ok: false, error: "Business name is required" };
		if (!adminEmail || !adminEmail.includes("@")) return { ok: false, error: "Valid admin email is required" };
		if (adminPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

		// 1) Create business
		const { data: biz, error: bizErr } = await supabase
			.from("businesses")
			.insert({ name: businessName, status: "active" })
			.select("id")
			.single();
		if (bizErr || !biz?.id) return { ok: false, error: bizErr?.message ?? "Failed to create business" };

		// 2) Seed modules for business
		const { data: modules } = await supabase.from("modules").select("key");
		const entRows = (modules ?? []).map((m: any) => ({
			business_id: biz.id,
			module_key: m.key,
			enabled: true,
		}));
		if (entRows.length) await supabase.from("business_modules").upsert(entRows);

		// 3) Create auth user as admin for this business
		const { data: authRes, error: authErr } = await admin.auth.admin.createUser({
			email: adminEmail,
			password: adminPassword,
			email_confirm: true,
			user_metadata: {
				role: "admin",
				business_id: biz.id,
				name: adminName,
			},
		});
		if (authErr || !authRes?.user?.id) return { ok: false, error: authErr?.message ?? "Failed to create admin user" };

		const authUserId = authRes.user.id;

		// 4) Insert mapping into business_admins
		const { error: mapErr } = await supabase.from("business_admins").insert({
			business_id: biz.id,
			auth_user_id: authUserId,
			name: adminName || null,
			email: adminEmail,
			is_active: true,
		});
		if (mapErr) return { ok: false, error: mapErr.message };

		// 5) Audit
		await audit({
			actorId: user.id,
			action: "business_with_owner.create",
			targetBusinessId: biz.id,
			targetAdminAuthUserId: authUserId,
			after: {
				business_name: businessName,
				admin_email: adminEmail,
				admin_name: adminName,
			},
		});

		return { ok: true, data: { business_id: biz.id, admin_auth_user_id: authUserId } };
	} catch (e: any) {
		if (isRedirectError(e)) throw e;
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saListTenantAdmins(params: {
	business_id?: string;
}): Promise<
	SAResult<
		Array<{
			id: string;
			business_id: string;
			auth_user_id: string;
			name: string | null;
			email: string | null;
			is_active: boolean;
			created_at: string;
		}>
	>
> {
	try {
		const { supabase } = await requireSA();
		let q = supabase
			.from("business_admins")
			.select("id, business_id, auth_user_id, name, email, is_active, created_at")
			.order("created_at", { ascending: false });
		if (params.business_id) q = q.eq("business_id", params.business_id);
		const { data, error } = await q;
		if (error) return { ok: false, error: error.message };
		return { ok: true, data: (data ?? []) as any };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saSetAdminActive(input: {
	business_admin_id: string;
	is_active: boolean;
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const id = String(input.business_admin_id ?? "").trim();
		if (!id) return { ok: false, error: "Admin id is required" };
		const { data: before } = await supabase
			.from("business_admins")
			.select("id, business_id, auth_user_id, is_active")
			.eq("id", id)
			.single();
		const { error } = await supabase
			.from("business_admins")
			.update({ is_active: input.is_active })
			.eq("id", id);
		if (error) return { ok: false, error: error.message };
		await audit({
			actorId: user.id,
			action: "admin.set_active",
			targetBusinessId: (before as any)?.business_id ?? null,
			targetAdminAuthUserId: (before as any)?.auth_user_id ?? null,
			before,
			after: { is_active: input.is_active },
		});
		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saUpdateTenantAdmin(input: {
	business_admin_id: string;
	name?: string;
	email?: string;
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const id = String(input.business_admin_id ?? "").trim();
		if (!id) return { ok: false, error: "Admin id is required" };

		const { data: before } = await supabase
			.from("business_admins")
			.select("id, business_id, auth_user_id, name, email")
			.eq("id", id)
			.single();
		if (!before) return { ok: false, error: "Admin not found" };

		const nextName = (input.name ?? "").trim();
		const nextEmail = (input.email ?? "").trim().toLowerCase();

		const updates: any = {};
		if (input.name !== undefined) updates.name = nextName || null;
		if (input.email !== undefined) {
			if (!nextEmail || !nextEmail.includes("@")) return { ok: false, error: "Valid email is required" };
			updates.email = nextEmail;
		}

		const { error: mapErr } = await supabase.from("business_admins").update(updates).eq("id", id);
		if (mapErr) return { ok: false, error: mapErr.message };

		// Update auth user if email/name changed.
		const admin = createAdminClient();
		if (admin) {
			// Keep it minimal: update email (if changed) + metadata name/business_id.
			await admin.auth.admin.updateUserById(before.auth_user_id, {
				email: updates.email ?? undefined,
				user_metadata: {
					role: "admin",
					business_id: (before as any).business_id,
					name: updates.name ?? (before as any).name,
				},
			});
		}

		await audit({
			actorId: user.id,
			action: "admin.update",
			targetBusinessId: (before as any)?.business_id ?? null,
			targetAdminAuthUserId: (before as any)?.auth_user_id ?? null,
			before,
			after: updates,
		});

		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saDeleteTenantAdmin(input: {
	business_admin_id: string;
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const id = String(input.business_admin_id ?? "").trim();
		if (!id) return { ok: false, error: "Admin id is required" };

		const { data: before } = await supabase
			.from("business_admins")
			.select("id, business_id, auth_user_id")
			.eq("id", id)
			.single();
		if (!before) return { ok: false, error: "Admin not found" };

		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };

		// Delete mapping first
		const { error: mapErr } = await supabase.from("business_admins").delete().eq("id", id);
		if (mapErr) return { ok: false, error: mapErr.message };

		// Then delete auth user (removes ability to login).
		await admin.auth.admin.deleteUser(before.auth_user_id);

		await audit({
			actorId: user.id,
			action: "admin.delete",
			targetBusinessId: (before as any)?.business_id ?? null,
			targetAdminAuthUserId: (before as any)?.auth_user_id ?? null,
			before,
			after: { deleted: true },
		});

		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saGetBusinessModules(params: {
	business_id: string;
}): Promise<SAResult<Array<{ module_key: string; enabled: boolean; name: string }>>> {
	try {
		const { supabase } = await requireSA();
		const businessId = String(params.business_id ?? "").trim();
		if (!businessId) return { ok: false, error: "Business is required" };

		const { data, error } = await supabase
			.from("business_modules")
			.select("module_key, enabled, modules(name)")
			.eq("business_id", businessId)
			.order("module_key", { ascending: true });
		if (error) return { ok: false, error: error.message };
		const mapped =
			(data ?? []).map((r: any) => ({
				module_key: r.module_key,
				enabled: !!r.enabled,
				name: r.modules?.name ?? r.module_key,
			})) ?? [];
		return { ok: true, data: mapped };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saToggleBusinessModule(input: {
	business_id: string;
	module_key: string;
	enabled: boolean;
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const businessId = String(input.business_id ?? "").trim();
		const moduleKey = String(input.module_key ?? "").trim();
		if (!businessId) return { ok: false, error: "Business is required" };
		if (!moduleKey) return { ok: false, error: "Module is required" };

		const { data: before } = await supabase
			.from("business_modules")
			.select("business_id, module_key, enabled")
			.eq("business_id", businessId)
			.eq("module_key", moduleKey)
			.maybeSingle();

		const { error } = await supabase
			.from("business_modules")
			.upsert({ business_id: businessId, module_key: moduleKey, enabled: input.enabled });
		if (error) return { ok: false, error: error.message };

		await audit({
			actorId: user.id,
			action: "module.toggle",
			targetBusinessId: businessId,
			before,
			after: { business_id: businessId, module_key: moduleKey, enabled: input.enabled },
		});
		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saSetBusinessModulesBulk(input: {
	business_id: string;
	enabledModuleKeys: string[];
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const businessId = String(input.business_id ?? "").trim();
		if (!businessId) return { ok: false, error: "Business is required" };

		const enabledSet = new Set((input.enabledModuleKeys ?? []).map((k) => String(k).trim()));

		// Snapshot before
		const { data: beforeRows } = await supabase
			.from("business_modules")
			.select("module_key, enabled")
			.eq("business_id", businessId);

		const { data: modules } = await supabase.from("modules").select("key");
		const entRows = (modules ?? []).map((m: any) => ({
			business_id: businessId,
			module_key: m.key,
			enabled: enabledSet.has(m.key),
		}));

		if (entRows.length) {
			const { error } = await supabase.from("business_modules").upsert(entRows);
			if (error) return { ok: false, error: error.message };
		}

		await audit({
			actorId: user.id,
			action: "module.set_bulk",
			targetBusinessId: businessId,
			before: beforeRows ?? null,
			after: { enabledModuleKeys: Array.from(enabledSet.values()) },
		});

		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saChangeTenantAdminPassword(input: {
	business_admin_id: string;
	newPassword: string;
}): Promise<SAResult<true>> {
	try {
		const { supabase, user } = await requireSA();
		const id = String(input.business_admin_id ?? "").trim();
		const newPassword = String(input.newPassword ?? "").trim();
		if (!id) return { ok: false, error: "Admin id is required" };
		if (newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

		const { data: row, error } = await supabase
			.from("business_admins")
			.select("id, auth_user_id")
			.eq("id", id)
			.single();
		if (error || !row?.auth_user_id) return { ok: false, error: error?.message ?? "Admin not found" };

		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };

		await admin.auth.admin.updateUserById(row.auth_user_id, {
			password: newPassword,
		});

		await audit({
			actorId: user.id,
			action: "admin.password.change",
			targetBusinessId: null,
			targetAdminAuthUserId: row.auth_user_id,
			before: null,
			after: { changed: true },
		});

		return { ok: true, data: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export type AuditLogRow = {
	id: string;
	created_at: string;
	created_at_label: string;
	action: string;
	action_label: string;
	actor_auth_user_id: string;
	actor_label: string;
	target_business_id: string | null;
	business_name: string | null;
	target_admin_auth_user_id: string | null;
	target_admin_label: string | null;
	before: any;
	after: any;
};

type AuditLogRowDb = Omit<
	AuditLogRow,
	"created_at_label" | "action_label" | "actor_label" | "business_name" | "target_admin_label"
>;

function pickPersonLabel(name: string | null | undefined, email: string | null | undefined): string {
	const n = String(name ?? "").trim();
	const e = String(email ?? "").trim();
	if (n && e) return `${n} (${e})`;
	return e || n || "—";
}

async function enrichAuditLogRows(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	rows: AuditLogRowDb[],
): Promise<AuditLogRow[]> {
	if (!rows.length) return [];

	const bizIds = [...new Set(rows.map((r) => r.target_business_id).filter(Boolean))] as string[];
	const businessNameById: Record<string, string> = {};
	if (bizIds.length) {
		const { data: bizRows } = await supabase.from("businesses").select("id,name").in("id", bizIds);
		for (const b of bizRows ?? []) {
			const row = b as { id: string; name: string | null };
			businessNameById[row.id] = String(row.name ?? "—");
		}
	}

	const authIds = new Set<string>();
	for (const r of rows) {
		if (r.actor_auth_user_id) authIds.add(r.actor_auth_user_id);
		if (r.target_admin_auth_user_id) authIds.add(r.target_admin_auth_user_id);
	}
	const idList = [...authIds];

	const labelByAuthId: Record<string, string> = {};

	if (idList.length) {
		const { data: admRows } = await supabase
			.from("business_admins")
			.select("auth_user_id,name,email")
			.in("auth_user_id", idList);

		for (const a of admRows ?? []) {
			const row = a as { auth_user_id: string; name: string | null; email: string | null };
			labelByAuthId[row.auth_user_id] = pickPersonLabel(row.name, row.email);
		}

		const admin = createAdminClient();
		const missing = idList.filter((id) => !labelByAuthId[id]);
		if (admin && missing.length) {
			await Promise.all(
				missing.map(async (id) => {
					try {
						const { data, error } = await admin.auth.admin.getUserById(id);
						if (error || !data?.user) {
							labelByAuthId[id] = `Unknown user (${id.slice(0, 8)}…)`;
							return;
						}
						const u = data.user;
						const email = String(u.email ?? "").trim();
						const name = String((u.user_metadata as { name?: string })?.name ?? "").trim();
						labelByAuthId[id] = pickPersonLabel(name || null, email || null);
					} catch {
						labelByAuthId[id] = `Unknown user (${id.slice(0, 8)}…)`;
					}
				}),
			);
		}
	}

	return rows.map((r) => ({
		...r,
		action_label: formatAuditActionLabel(r.action),
		created_at_label: formatAuditTimestamp(r.created_at),
		actor_label:
			labelByAuthId[r.actor_auth_user_id] ??
			`Unknown user (${String(r.actor_auth_user_id).slice(0, 8)}…)`,
		business_name: r.target_business_id
			? businessNameById[r.target_business_id] ?? "Unknown business"
			: null,
		target_admin_label: r.target_admin_auth_user_id
			? labelByAuthId[r.target_admin_auth_user_id] ??
				`Unknown user (${String(r.target_admin_auth_user_id).slice(0, 8)}…)`
			: null,
	}));
}

export async function saListAuditLogs(params: {
	business_id?: string;
	limit?: number;
}): Promise<SAResult<AuditLogRow[]>> {
	try {
		const { supabase } = await requireSA();
		let q = supabase
			.from("superadmin_audit_logs")
			.select("id, created_at, action, actor_auth_user_id, target_business_id, target_admin_auth_user_id, before, after")
			.order("created_at", { ascending: false })
			.limit(params.limit ?? 100);
		if (params.business_id) q = q.eq("target_business_id", params.business_id);
		const { data, error } = await q;
		if (error) return { ok: false, error: error.message };
		const enriched = await enrichAuditLogRows(supabase, (data ?? []) as AuditLogRowDb[]);
		return { ok: true, data: enriched };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

