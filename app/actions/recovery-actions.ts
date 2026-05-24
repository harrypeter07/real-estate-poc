"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { formatWhatsAppPhone } from "@/lib/payment-due";

export type RecoveryRow = {
	sale_id: string;
	customer_id: string;
	customer_name: string;
	customer_phone: string;
	whatsapp_phone: string | null;
	project_name: string;
	plot_number: string;
	total_sale_amount: number;
	amount_paid: number;
	remaining_amount: number;
	monthly_emi: number | null;
	next_emi_due: string | null;
	days_overdue: number;
	followup_date: string | null;
	advisor_name: string | null;
	is_urgent: boolean;
};

export async function getRecoveryData(): Promise<{
	urgent: RecoveryRow[];
	overdue: RecoveryRow[];
	allPending: RecoveryRow[];
}> {
	const supabase = await createClient();
	if (!supabase) return { urgent: [], overdue: [], allPending: [] };

	const businessId = await getCurrentBusinessId();
	const today = new Date().toISOString().slice(0, 10);

	let query = supabase
		.from("plot_sales")
		.select(
			`
      id,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      monthly_emi,
      emi_day,
      token_date,
      agreement_date,
      followup_date,
      sale_phase,
      customers(id, name, phone),
      plots(plot_number, projects(name)),
      advisors(name)
    `
		)
		.eq("is_cancelled", false)
		.gt("remaining_amount", 0)
		.order("remaining_amount", { ascending: false });

	if (businessId) {
		query = query.eq("business_id", businessId);
	}

	const { data: sales, error } = await query;
	if (error || !sales) return { urgent: [], overdue: [], allPending: [] };

	// Get last payment dates per sale
	const saleIds = sales.map((s: any) => s.id);
	const { data: lastPayments } = await supabase
		.from("payments")
		.select("sale_id, payment_date")
		.in("sale_id", saleIds)
		.eq("is_confirmed", true)
		.order("payment_date", { ascending: false });

	const lastPayBySale: Record<string, string> = {};
	for (const p of lastPayments ?? []) {
		const sid = (p as any).sale_id;
		if (!lastPayBySale[sid]) lastPayBySale[sid] = (p as any).payment_date;
	}

	function getNextEmiDueStr(sale: any, lastPaid: string | undefined): string | null {
		const emiDay = Number(sale.emi_day ?? 0);
		if (!emiDay || !sale.monthly_emi) return null;

		const baseDate = lastPaid
			? new Date(lastPaid)
			: sale.token_date
			? new Date(sale.token_date)
			: sale.agreement_date
			? new Date(sale.agreement_date)
			: null;

		if (!baseDate) return null;

		const candidate = new Date(baseDate);
		candidate.setMonth(candidate.getMonth() + 1);
		candidate.setDate(emiDay);

		return candidate.toISOString().slice(0, 10);
	}

	function daysOverdue(dueDate: string | null): number {
		if (!dueDate) return 0;
		const diff = new Date(today).getTime() - new Date(dueDate).getTime();
		return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
	}

	const rows: RecoveryRow[] = (sales ?? []).map((s: any) => {
		const lastPaid = lastPayBySale[s.id];
		const nextEmi = getNextEmiDueStr(s, lastPaid);
		const overdueDays = daysOverdue(nextEmi ?? s.followup_date);
		const phone = s.customers?.phone ?? null;

		return {
			sale_id: s.id,
			customer_id: s.customers?.id ?? "",
			customer_name: s.customers?.name ?? "—",
			customer_phone: phone ?? "—",
			whatsapp_phone: formatWhatsAppPhone(phone),
			project_name: s.plots?.projects?.name ?? "—",
			plot_number: s.plots?.plot_number ?? "—",
			total_sale_amount: Number(s.total_sale_amount ?? 0),
			amount_paid: Number(s.amount_paid ?? 0),
			remaining_amount: Number(s.remaining_amount ?? 0),
			monthly_emi: s.monthly_emi ? Number(s.monthly_emi) : null,
			next_emi_due: nextEmi,
			days_overdue: overdueDays,
			followup_date: s.followup_date ?? null,
			advisor_name: s.advisors?.name ?? null,
			is_urgent: overdueDays >= 30,
		};
	});

	const urgent = rows.filter((r) => r.is_urgent).sort((a, b) => b.days_overdue - a.days_overdue);
	const overdue = rows
		.filter((r) => !r.is_urgent && r.days_overdue > 0)
		.sort((a, b) => b.days_overdue - a.days_overdue);
	const allPending = rows.filter((r) => r.days_overdue === 0);

	return { urgent, overdue, allPending };
}
