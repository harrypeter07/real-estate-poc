"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/hr/auth-route";

async function requireAdminSupabase() {
	const supabase = await createClient();
	if (!supabase) return { error: "No database" as const, supabase: null };
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || !isAdminUser(user)) {
		return { error: "Forbidden" as const, supabase: null };
	}
	return { supabase, user };
}

export async function listHrEmployees() {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	const { data, error } = await r.supabase.from("hr_employees").select("*").order("name");
	if (error) return [];
	return data ?? [];
}

export async function listHrAttendance(filters?: { from?: string; to?: string }) {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	let q = r.supabase
		.from("hr_attendance")
		.select("*, hr_employees(name, employee_code)")
		.order("work_date", { ascending: false })
		.limit(1500);
	if (filters?.from) q = q.gte("work_date", filters.from);
	if (filters?.to) q = q.lte("work_date", filters.to);
	const { data, error } = await q;
	if (error) return [];
	return data ?? [];
}

export async function listHrPayoutBatches() {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return [];
	const { data, error } = await r.supabase
		.from("hr_payout_batches")
		.select("*, hr_employee_payouts(*, hr_employees(name, employee_code))")
		.order("created_at", { ascending: false })
		.limit(20);
	if (error) return [];
	return data ?? [];
}

export async function createHrEmployee(form: {
	name: string;
	employee_code: string;
	phone?: string;
	salary_type?: string;
	salary_rate: number;
	overtime_rate?: number;
	required_hours_per_week?: number;
	grace_hours?: number;
}) {
	const r = await requireAdminSupabase();
	if (r.error || !r.supabase) return { success: false, error: r.error ?? "Forbidden" };
	const { error } = await r.supabase.from("hr_employees").insert({
		name: form.name,
		employee_code: form.employee_code.trim(),
		phone: form.phone ?? null,
		salary_type: form.salary_type ?? "monthly",
		salary_rate: form.salary_rate,
		overtime_rate: form.overtime_rate ?? 0,
		required_hours_per_week: form.required_hours_per_week ?? 48,
		grace_hours: form.grace_hours ?? 0,
	});
	if (error) return { success: false, error: error.message };
	revalidatePath("/hr");
	revalidatePath("/hr/employees");
	return { success: true };
}
