"use server";

import { createClient } from "@/lib/supabase/server";
import { getNextEmiDueDate } from "@/lib/utils/emi";

type EmiDueMonth = {
	month: string; // YYYY-MM
	dueDate: string; // YYYY-MM-DD
	dueAmount: number;
	paidAmount: number;
	isPaid: boolean;
	isOverdue: boolean;
};

export type EmiDueRow = {
	sale_id: string;
	customer: { id: string; name: string; phone: string | null };
	plot: { plot_number: string; project_name: string };
	seller: { label: string }; // advisor name or Admin (Direct)
	monthly_emi: number;
	emi_day: number;
	anchor_date: string; // agreement_date ?? token_date
	remaining_amount: number;
	next_emi_due: string | null;
	missed_months: number;
	collapsed_due_amount: number;
	months: EmiDueMonth[];
	latest_payments: Array<{
		id: string;
		payment_date: string;
		amount: number;
		is_confirmed: boolean;
		payment_mode: string;
	}>;
};

function ymd(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function toUtcDate(ymdStr: string): Date {
	const [y, m, d] = ymdStr.split("-").map((x) => parseInt(x, 10));
	return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function monthKey(ymdStr: string): string {
	return String(ymdStr).slice(0, 7);
}

function lastDayOfMonth(year: number, month0: number): number {
	return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function addMonthsUtc(d: Date, months: number): Date {
	const year = d.getUTCFullYear();
	const month0 = d.getUTCMonth();
	const day = d.getUTCDate();
	const targetMonth0 = month0 + months;
	const tmp = new Date(Date.UTC(year, targetMonth0, 1));
	const ld = lastDayOfMonth(tmp.getUTCFullYear(), tmp.getUTCMonth());
	return new Date(Date.UTC(tmp.getUTCFullYear(), tmp.getUTCMonth(), Math.min(day, ld)));
}

function dueDateForMonth(anchor: Date, monthOffset: number, emiDay: number): string {
	const m = addMonthsUtc(anchor, monthOffset);
	const ld = lastDayOfMonth(m.getUTCFullYear(), m.getUTCMonth());
	const day = Math.min(Math.max(1, emiDay), ld);
	return ymd(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), day)));
}

export async function getEmiDueRows(input?: {
	asOf?: string;
	limit?: number;
}): Promise<EmiDueRow[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const asOf =
		typeof input?.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.asOf)
			? input.asOf
			: ymd(new Date());
	const asOfDate = toUtcDate(asOf);

	const limit = Math.min(500, Math.max(10, Number(input?.limit ?? 200)));

	const { data: sales, error } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      remaining_amount,
      monthly_emi,
      emi_day,
      token_date,
      agreement_date,
      sold_by_admin,
      is_cancelled,
      customers(id, name, phone),
      advisors(name),
      plots(plot_number, projects(name))
    `
		)
		.eq("is_cancelled", false)
		.not("monthly_emi", "is", null)
		.not("emi_day", "is", null)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) throw new Error(error.message);

	const saleRows = (sales ?? []).filter((s: any) => Number(s.remaining_amount ?? 0) > 0);
	const saleIds = saleRows.map((s: any) => s.id);
	if (!saleIds.length) return [];

	const { data: payments, error: payErr } = await supabase
		.from("payments")
		.select("id, sale_id, payment_date, amount, is_confirmed, payment_mode")
		.in("sale_id", saleIds)
		.order("payment_date", { ascending: false });
	if (payErr) throw new Error(payErr.message);

	// Group confirmed payments by sale_id + month, and keep recent payments.
	const bySaleMonth: Record<string, Record<string, number>> = {};
	const latestBySale: Record<string, EmiDueRow["latest_payments"]> = {};
	const lastConfirmedYmdBySale: Record<string, string> = {};

	for (const p of payments ?? []) {
		const sid = String((p as any).sale_id);
		const pd = String((p as any).payment_date).slice(0, 10);
		const amt = Number((p as any).amount ?? 0);
		const confirmed = !!(p as any).is_confirmed;

		(latestBySale[sid] ||= []).push({
			id: String((p as any).id),
			payment_date: pd,
			amount: amt,
			is_confirmed: confirmed,
			payment_mode: String((p as any).payment_mode ?? "—"),
		});

		if (confirmed) {
			if (!lastConfirmedYmdBySale[sid]) lastConfirmedYmdBySale[sid] = pd;
			const mk = monthKey(pd);
			(bySaleMonth[sid] ||= {});
			bySaleMonth[sid][mk] = (bySaleMonth[sid][mk] ?? 0) + amt;
		}
	}

	const rows: EmiDueRow[] = [];

	for (const s of saleRows as any[]) {
		const saleId = String(s.id);
		const remaining = Number(s.remaining_amount ?? 0);
		const monthlyEmi = Number(s.monthly_emi ?? 0);
		const emiDay = Number(s.emi_day ?? 0);
		if (!monthlyEmi || monthlyEmi <= 0 || !emiDay) continue;

		const anchorStr = String(s.agreement_date ?? s.token_date ?? "").slice(0, 10);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorStr)) continue;

		const anchor = toUtcDate(anchorStr);
		// Determine first due date month offset based on anchor day vs emi_day (matches getNextEmiDueDate logic).
		const anchorDay = anchor.getUTCDate();
		let firstOffset = 0;
		if (anchorDay > emiDay) firstOffset = 1;

		// Iterate months from firstOffset until asOf.
		const months: EmiDueMonth[] = [];
		let offset = firstOffset;
		// Safety cap so we don't loop forever on bad dates.
		for (let guard = 0; guard < 240; guard++) {
			const due = dueDateForMonth(anchor, offset, emiDay);
			const dueDate = toUtcDate(due);
			if (dueDate > asOfDate) break;

			const mk = monthKey(due);
			const paid = Number(bySaleMonth[saleId]?.[mk] ?? 0);
			const isPaid = paid + 0.0001 >= monthlyEmi;
			const isOverdue = due < asOf && !isPaid;
			months.push({
				month: mk,
				dueDate: due,
				dueAmount: monthlyEmi,
				paidAmount: paid,
				isPaid,
				isOverdue,
			});

			offset += 1;
		}

		const missedMonths = months.filter((m) => !m.isPaid).length;
		if (missedMonths <= 0) continue;

		const nextDue = getNextEmiDueDate(
			{ emi_day: emiDay, token_date: s.token_date, agreement_date: s.agreement_date },
			lastConfirmedYmdBySale[saleId] ?? null,
			asOf
		);

		const collapsedDue = Math.min(remaining, missedMonths * monthlyEmi);
		const sellerLabel = s.sold_by_admin ? "Admin (Direct)" : String(s.advisors?.name ?? "—");

		rows.push({
			sale_id: saleId,
			customer: {
				id: String(s.customers?.id ?? ""),
				name: String(s.customers?.name ?? "—"),
				phone: s.customers?.phone ?? null,
			},
			plot: {
				plot_number: String(s.plots?.plot_number ?? "—"),
				project_name: String(s.plots?.projects?.name ?? "—"),
			},
			seller: { label: sellerLabel },
			monthly_emi: monthlyEmi,
			emi_day: emiDay,
			anchor_date: anchorStr,
			remaining_amount: remaining,
			next_emi_due: nextDue,
			missed_months: missedMonths,
			collapsed_due_amount: collapsedDue,
			months,
			latest_payments: (latestBySale[saleId] ?? []).slice(0, 12),
		});
	}

	// Sort: most missed months first, then earlier next due first.
	rows.sort((a, b) => {
		if (b.missed_months !== a.missed_months) return b.missed_months - a.missed_months;
		return String(a.next_emi_due ?? "").localeCompare(String(b.next_emi_due ?? ""));
	});

	return rows;
}

