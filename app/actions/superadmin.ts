"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuditActionLabel, formatAuditTimestamp } from "@/lib/superadmin/audit-labels";
import { isRedirectError } from "next/dist/client/components/redirect-error";

type SAResult<T> = { ok: true; data: T } | { ok: false; error: string };

type DeleteStepKey =
	| "advisor_commission_payments"
	| "advisor_commissions"
	| "payments"
	| "plot_sales"
	| "customer_documents"
	| "project_documents"
	| "reminders"
	| "office_expenses"
	| "enquiry_customers"
	| "advisor_project_commissions"
	| "plots"
	| "customers"
	| "hr_employee_payouts"
	| "hr_attendance"
	| "hr_payout_batches"
	| "hr_employees"
	| "staff_attendance"
	| "staff"
	| "advisors"
	| "projects"
	| "business_modules";

type DeleteStepSpec = {
	key: DeleteStepKey;
	label: string;
	table: string;
	column: "business_id" | "target_business_id" | "id" | "project_id";
};

const BUSINESS_PURGE_STEPS: DeleteStepSpec[] = [
	{
		key: "advisor_commission_payments",
		label: "Advisor commission payments",
		table: "advisor_commission_payments",
		column: "business_id",
	},
	{ key: "advisor_commissions", label: "Advisor commissions", table: "advisor_commissions", column: "business_id" },
	{ key: "payments", label: "Customer payments", table: "payments", column: "business_id" },
	{ key: "plot_sales", label: "Plot sales", table: "plot_sales", column: "business_id" },
	{ key: "customer_documents", label: "Customer documents", table: "customer_documents", column: "business_id" },
	{ key: "project_documents", label: "Project documents", table: "project_documents", column: "project_id" },
	{ key: "reminders", label: "Reminders", table: "reminders", column: "business_id" },
	{ key: "office_expenses", label: "Office expenses", table: "office_expenses", column: "business_id" },
	{ key: "enquiry_customers", label: "Enquiry customers", table: "enquiry_customers", column: "business_id" },
	{
		key: "advisor_project_commissions",
		label: "Advisor project commissions",
		table: "advisor_project_commissions",
		column: "business_id",
	},
	{ key: "plots", label: "Plots", table: "plots", column: "business_id" },
	{ key: "customers", label: "Customers", table: "customers", column: "business_id" },
	{ key: "hr_employee_payouts", label: "HR employee payouts", table: "hr_employee_payouts", column: "business_id" },
	{ key: "hr_attendance", label: "HR attendance", table: "hr_attendance", column: "business_id" },
	{ key: "hr_payout_batches", label: "HR payout batches", table: "hr_payout_batches", column: "business_id" },
	{ key: "hr_employees", label: "HR employees", table: "hr_employees", column: "business_id" },
	{ key: "staff_attendance", label: "Legacy staff attendance", table: "staff_attendance", column: "business_id" },
	{ key: "staff", label: "Legacy staff", table: "staff", column: "business_id" },
	{ key: "advisors", label: "Advisors", table: "advisors", column: "business_id" },
	{ key: "projects", label: "Projects", table: "projects", column: "business_id" },
	{ key: "business_modules", label: "Business modules", table: "business_modules", column: "business_id" },
];

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

async function countByEq(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	table: string,
	column: string,
	value: string,
) {
	const { count, error } = await (supabase as any)
		.from(table)
		.select("id", { head: true, count: "exact" })
		.eq(column, value);
	if (error) throw new Error(error.message);
	return Number(count ?? 0);
}

async function deleteByEq(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	table: string,
	column: string,
	value: string,
) {
	const { error } = await (supabase as any).from(table).delete().eq(column, value);
	if (error) throw new Error(error.message);
}

export async function saGetBusinessPurgeSteps(): Promise<
	SAResult<Array<{ key: DeleteStepKey; label: string }>>
> {
	try {
		await requireSA();
		return {
			ok: true,
			data: BUSINESS_PURGE_STEPS.map((s) => ({ key: s.key, label: s.label })),
		};
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saGetBusinessDeleteSnapshot(input: {
	business_id: string;
}): Promise<
	SAResult<{
		business_name: string;
		advisor_count: number;
		admins: Array<{
			id: string;
			name: string | null;
			email: string | null;
			is_active: boolean;
		}>;
	}>
> {
	try {
		const { supabase } = await requireSA();
		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };
		const businessId = String(input.business_id ?? "").trim();
		if (!businessId) return { ok: false, error: "Business is required" };

		const { data: business, error: businessErr } = await supabase
			.from("businesses")
			.select("id, name")
			.eq("id", businessId)
			.maybeSingle();
		if (businessErr) return { ok: false, error: businessErr.message };
		if (!business?.id) return { ok: false, error: "Business not found" };

		const { count: advisorCount, error: advisorErr } = await supabase
			.from("advisors")
			.select("id", { head: true, count: "exact" })
			.eq("business_id", businessId);
		if (advisorErr) return { ok: false, error: advisorErr.message };

		const { data: admins, error: adminErr } = await supabase
			.from("business_admins")
			.select("id, name, email, is_active, auth_user_id")
			.eq("business_id", businessId)
			.order("created_at", { ascending: true });
		if (adminErr) return { ok: false, error: adminErr.message };

		const mapped = (admins ?? []) as Array<{
			id: string;
			name: string | null;
			email: string | null;
			is_active: boolean;
			auth_user_id: string;
		}>;
		const roleByAuthId = new Map<string, string>();

		await Promise.all(
			mapped.map(async (a) => {
				const authId = String(a.auth_user_id ?? "").trim();
				if (!authId) return;
				try {
					const { data } = await admin.auth.admin.getUserById(authId);
					const role = String((data?.user?.user_metadata as any)?.role ?? "")
						.trim()
						.toLowerCase();
					roleByAuthId.set(authId, role);
				} catch {
					roleByAuthId.set(authId, "");
				}
			}),
		);

		// Show only true tenant admin accounts (exclude advisor-linked rows).
		const tenantAdmins = mapped
			.filter((a) => {
				const role = roleByAuthId.get(String(a.auth_user_id ?? "").trim()) ?? "";
				return role === "admin" || role === "superadmin";
			})
			.map((a) => ({
				id: a.id,
				name: a.name,
				email: a.email,
				is_active: a.is_active,
			}));

		return {
			ok: true,
			data: {
				business_name: String(business.name ?? ""),
				advisor_count: Number(advisorCount ?? 0),
				admins: tenantAdmins,
			},
		};
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "Failed" };
	}
}

export async function saPurgeBusinessStep(input: {
	business_id: string;
	step_key: DeleteStepKey;
}): Promise<
	SAResult<{
		step_key: DeleteStepKey;
		label: string;
		matched: number;
		deleted: number;
		deleted_auth_users?: number;
	}>
> {
	try {
		const { supabase, user } = await requireSA();
		const admin = createAdminClient();
		if (!admin) return { ok: false, error: "Missing service role key" };

		const businessId = String(input.business_id ?? "").trim();
		const step = BUSINESS_PURGE_STEPS.find((s) => s.key === input.step_key);
		if (!businessId) return { ok: false, error: "Business is required" };
		if (!step) return { ok: false, error: "Invalid step key" };

		const authUserIdsToTryDelete = new Set<string>();
		let matched = 0;
		let deleted = 0;

		if (step.key === "project_documents") {
			const { data: projects, error: projectErr } = await supabase
				.from("projects")
				.select("id")
				.eq("business_id", businessId);
			if (projectErr) return { ok: false, error: projectErr.message };
			const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
			if (!projectIds.length) {
				return { ok: true, data: { step_key: step.key, label: step.label, matched: 0, deleted: 0 } };
			}
			const { count, error: countErr } = await (supabase as any)
				.from("project_documents")
				.select("id", { head: true, count: "exact" })
				.in("project_id", projectIds);
			if (countErr) return { ok: false, error: countErr.message };
			matched = Number(count ?? 0);
			const { error: delErr } = await (supabase as any)
				.from("project_documents")
				.delete()
				.in("project_id", projectIds);
			if (delErr) return { ok: false, error: delErr.message };
			deleted = matched;
		} else {
			// Capture auth IDs before deleting advisor/admin rows.
			if (step.key === "business_admins" || step.key === "advisors") {
				const { data: authRows, error: authRowsErr } = await (supabase as any)
					.from(step.table)
					.select("auth_user_id")
					.eq(step.column, businessId)
					.not("auth_user_id", "is", null);
				if (authRowsErr) return { ok: false, error: authRowsErr.message };
				for (const r of authRows ?? []) {
					const id = String((r as { auth_user_id?: string }).auth_user_id ?? "").trim();
					if (id) authUserIdsToTryDelete.add(id);
				}
			}

			matched = await countByEq(supabase, step.table, step.column, businessId);
			await deleteByEq(supabase, step.table, step.column, businessId);
			deleted = matched;
		}

		let deletedAuthUsers = 0;
		if (authUserIdsToTryDelete.size > 0) {
			for (const authUserId of authUserIdsToTryDelete) {
				const remainingAdminRefs = await countByEq(
					supabase,
					"business_admins",
					"auth_user_id",
					authUserId,
				);
				const remainingAdvisorRefs = await countByEq(supabase, "advisors", "auth_user_id", authUserId);
				if (remainingAdminRefs > 0 || remainingAdvisorRefs > 0) continue;
				const { error: authDelErr } = await admin.auth.admin.deleteUser(authUserId);
				if (!authDelErr) deletedAuthUsers++;
			}
		}

		await audit({
			actorId: user.id,
			action: "business.data_purge.step",
			targetBusinessId: businessId,
			after: {
				step_key: step.key,
				table: step.table,
				matched,
				deleted,
				deleted_auth_users: deletedAuthUsers,
			},
		});

		return {
			ok: true,
			data: {
				step_key: step.key,
				label: step.label,
				matched,
				deleted,
				deleted_auth_users: deletedAuthUsers,
			},
		};
	} catch (e: any) {
		if (isRedirectError(e)) throw e;
		return { ok: false, error: e?.message ?? "Failed" };
	}
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
			.select("id, name, display_name, status")
			.order("created_at", { ascending: false });
		if (error) return { ok: false, error: error.message };
		const mapped =
			(data ?? []).map((b: any) => ({
				id: String(b.id),
				name: String((b.display_name ?? b.name ?? "")).trim() || String(b.name ?? "Unnamed business"),
				status: String(b.status ?? "active"),
			})) ?? [];
		return { ok: true, data: mapped };
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

