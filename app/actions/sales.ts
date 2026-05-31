"use server";

import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { createClient } from "@/lib/supabase/server";
import { computePaymentDueMeta } from "@/lib/payment-due";
import { revalidatePath } from "next/cache";
import { saleSchema, type SaleFormValues } from "@/lib/validations/sale";
import { calculateFinance } from "@/lib/utils/finance";

export type ActionResponse = {
	success: boolean;
	error?: string;
	saleId?: string;
};

export async function getAdvisorCommissionRate(
	supabase: any,
	advisorId: string,
	projectId: string,
	phase: "token" | "full_payment"
): Promise<number> {
	// 1. Try to find project-specific override
	const { data: projComm } = await supabase
		.from("advisor_project_commissions")
		.select("commission_token, commission_full_payment")
		.eq("project_id", projectId)
		.eq("advisor_id", advisorId)
		.maybeSingle();

	let rate = 0;
	if (projComm) {
		rate = Number(phase === "token" ? projComm.commission_token : projComm.commission_full_payment);
	}

	// 2. If rate is 0/null, fall back to global advisor settings
	if (!rate) {
		const { data: adv } = await supabase
			.from("advisors")
			.select("commission_token, commission_full_payment")
			.eq("id", advisorId)
			.maybeSingle();
		if (adv) {
			rate = Number(phase === "token" ? adv.commission_token : adv.commission_full_payment);
		}
	}

	// 3. Fallback to default of 5% if it's still 0
	return rate > 0 ? rate : 5;
}

export interface CommissionSplitResult {
	advisor_id: string;
	advisor_name: string;
	commission_percentage: number;
	amount: number;
	notes: string;
}

export async function calculateHierarchicalCommissions(
	supabase: any,
	sellingAdvisorId: string,
	projectId: string,
	phase: "token" | "full_payment",
	totalSaleAmount: number,
	plotNumber: string,
	profit: number
): Promise<CommissionSplitResult[]> {
	const splits: CommissionSplitResult[] = [];
	let currentAdvisorId: string | null = sellingAdvisorId;
	let level = 0;

	// Base commission percentage for Level 0
	const baseRate = await getAdvisorCommissionRate(supabase, sellingAdvisorId, projectId, phase);
	
	// Cap the baseRate by the margin percentage (profit / totalSaleAmount)
	const marginPercentage = totalSaleAmount > 0 ? (profit / totalSaleAmount) * 100 : 0;
	const cappedBaseRate = Math.max(0, Math.min(baseRate, marginPercentage));
	const baseCommissionAmount = (cappedBaseRate / 100) * totalSaleAmount;

	// Multipliers for parent levels (L0 gets 100%, L1 gets 20% of L0's, L2 gets 10% of L0's, L3 gets 5% of L0's)
	const levelMultipliers = [1.0, 0.20, 0.10, 0.05];

	while (currentAdvisorId && level < 4) {
		const { data } = await supabase
			.from("advisors")
			.select("id, name, parent_advisor_id")
			.eq("id", currentAdvisorId)
			.maybeSingle();

		if (!data) break;
		const adv = data as { id: string; name: string | null; parent_advisor_id: string | null };

		const multiplier = levelMultipliers[level] ?? 0.05;
		const commPct = cappedBaseRate * multiplier;
		const amount = baseCommissionAmount * multiplier;

		splits.push({
			advisor_id: adv.id,
			advisor_name: (adv as any).name || "Advisor",
			commission_percentage: commPct,
			amount: Math.round(amount * 100) / 100,
			notes: level === 0
				? `Direct Seller Commission (${cappedBaseRate.toFixed(2)}% on Plot ${plotNumber})`
				: `Hierarchical Override (L${level} parent of ${(adv as any).name || "Advisor"}, ${commPct.toFixed(2)}% on Plot ${plotNumber})`
		});

		currentAdvisorId = (adv as any).parent_advisor_id;
		level++;
	}

	return splits;
}

export async function createSale(
	values: SaleFormValues
): Promise<ActionResponse> {
	const parsed = saleSchema.safeParse(values);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message || "Validation failed",
		};
	}

	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const jwtBusinessId = await getCurrentBusinessId();
	if (!jwtBusinessId) {
		return {
			success: false,
			error:
				"Business context is missing. Sign out and sign in again, or contact support if this persists.",
		};
	}

	// Fetch plot details (per-plot rate is the canonical base rate)
	const { data: plotRow, error: plotFetchError } = await supabase
		.from("plots")
		.select("id, project_id, size_sqft, rate_per_sqft, plot_number, business_id")
		.eq("id", parsed.data.plot_id)
		.single();

	if (plotFetchError || !plotRow) {
		return { success: false, error: "Plot not found" };
	}

	const businessId =
		(plotRow as { business_id?: string | null }).business_id?.trim() || jwtBusinessId;

	const plotBaseRate = Number((plotRow as any).rate_per_sqft ?? 0);
	const plotSize = Number(plotRow.size_sqft ?? 0);
	const soldByAdmin = parsed.data.sold_by_admin ?? false;

	let faceRate = plotBaseRate;
	if (!soldByAdmin) {
		// Advisor must be assigned to this project (project-wise commission)
		const { data: assignment } = await supabase
			.from("advisor_project_commissions")
			.select("*")
			.eq("project_id", plotRow.project_id)
			.eq("advisor_id", parsed.data.advisor_id ?? "")
			.maybeSingle();

		if (!assignment) {
			return {
				success: false,
				error:
					"Advisor is not assigned to this project. Assign advisor in the project dashboard first.",
			};
		}

		const assignmentRate = Number(
			(assignment as any).commission_rate ??
				(assignment as any).commission_token ??
				0
		);
		const overrideRaw = parsed.data.advisor_selling_price_per_sqft;
		const override = Number(overrideRaw ?? NaN);
		faceRate =
			Number.isFinite(override) && override > 0 ? override : assignmentRate;
		if (plotBaseRate > 0 && faceRate > 0 && faceRate < plotBaseRate) {
			return {
				success: false,
				error: `Advisor selling price (₹ ${faceRate.toLocaleString(
					"en-IN",
				)}/sqft) cannot be less than this plot's admin rate (₹ ${plotBaseRate.toLocaleString(
					"en-IN",
				)}/sqft). Raise the selling price or pick a different plot.`,
			};
		}
	}

	const isFullPayment = parsed.data.sale_phase === "full_payment";
	const rawDown = Number(parsed.data.down_payment ?? 0);
	// Full payment: treat entire selling price as received so profit ratio / commission math is correct.
	const sellingPriceGuess = plotSize * faceRate;
	const downForFinance = isFullPayment ? sellingPriceGuess : rawDown;

	if (!isFullPayment && rawDown > sellingPriceGuess + 1e-6) {
		return {
			success: false,
			error: "Amount cannot be greater than payment amount",
		};
	}

	let finance: ReturnType<typeof calculateFinance>;
	try {
		finance = calculateFinance({
			plotSizeSqft: plotSize,
			baseRatePerSqft: plotBaseRate,
			advisorRatePerSqft: faceRate,
			downPayment: downForFinance,
			otherPayments: 0,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "";
		if (msg.includes("downPayment cannot exceed") || msg.includes("received cannot exceed")) {
			return { success: false, error: "Amount cannot be greater than payment amount" };
		}
		return { success: false, error: msg || "Invalid sale amounts" };
	}
	if (finance.sellingPrice <= 0) {
		return { success: false, error: "Invalid selling price. Check advisor rate and plot size." };
	}

	const phaseDate = parsed.data.token_date || parsed.data.agreement_date || null;
	const tokenDateToStore =
		parsed.data.sale_phase === "token" ? (phaseDate ?? null) : null;
	const nonTokenDateToStore =
		parsed.data.sale_phase === "token" ? null : (phaseDate ?? null);

	const downToStore = isFullPayment ? finance.sellingPrice : rawDown;

	// 1. Create the sale record (business_id required for RLS: plot_sales_tenant_access)
	const { data: sale, error: saleError } = await supabase
		.from("plot_sales")
		.insert({
			business_id: businessId,
			plot_id: parsed.data.plot_id,
			customer_id: parsed.data.customer_id,
			advisor_id: soldByAdmin ? null : (parsed.data.advisor_id ?? null),
			sold_by_admin: soldByAdmin,
			sale_phase: parsed.data.sale_phase,
			token_date: tokenDateToStore,
			agreement_date: nonTokenDateToStore,
			total_sale_amount: finance.sellingPrice,
			down_payment: downToStore,
			monthly_emi: isFullPayment ? null : parsed.data.monthly_emi || null,
			emi_day: isFullPayment ? null : parsed.data.emi_day || null,
			followup_date: isFullPayment ? null : parsed.data.followup_date || null,
			notes: parsed.data.notes || null,
		})
		.select()
		.single();

	if (saleError) {
		if (saleError.code === "23505") {
			return { success: false, error: "This plot is already sold or booked." };
		}
		return { success: false, error: saleError.message };
	}

	// 2. Update the plot status
	const plotStatus = parsed.data.sale_phase === "token" ? "token" : "sold";

	const { error: plotError } = await supabase
		.from("plots")
		.update({ status: plotStatus })
		.eq("id", parsed.data.plot_id);

	if (plotError) {
		return {
			success: false,
			error:
				"Sale created but failed to update plot status: " + plotError.message,
		};
	}

	// 3. If down payment is provided, record it as a confirmed payment
	const downPayment = downToStore;
	if (downPayment > 0) {
		const paymentDate =
			phaseDate ||
			new Date().toISOString().slice(0, 10);

		const { error: dpError } = await supabase.from("payments").insert({
			business_id: businessId,
			sale_id: sale.id,
			customer_id: parsed.data.customer_id,
			slip_number: null,
			receipt_path: null,
			amount: downPayment,
			payment_date: paymentDate,
			payment_mode: "cash",
			is_confirmed: true,
			notes: isFullPayment ? "Full payment" : "Down payment",
		});

		if (dpError) {
			return { success: false, error: dpError.message };
		}
	}

	// 3. Hierarchical Commission splits (auto-calculated up the parent advisor chain)
	if (!soldByAdmin && parsed.data.advisor_id) {
		const mainId = parsed.data.advisor_id;
		const hierarchicalSplits = await calculateHierarchicalCommissions(
			supabase,
			mainId,
			plotRow.project_id,
			parsed.data.sale_phase,
			finance.sellingPrice,
			plotRow.plot_number,
			finance.profit
		);

		for (const row of hierarchicalSplits) {
			const { error: cErr } = await supabase.from("advisor_commissions").insert({
				business_id: businessId,
				advisor_id: row.advisor_id,
				sale_id: sale.id,
				commission_percentage: row.commission_percentage,
				total_commission_amount: row.amount,
				amount_paid: 0,
				notes: row.notes,
			});
			if (cErr) {
				return { success: false, error: cErr.message };
			}
		}
	}

	// Payment follow-ups use Payments / Sales WhatsApp actions (not messaging reminders).

	revalidatePath("/sales");
	revalidatePath("/messaging");
	revalidatePath("/commissions");
	revalidatePath(`/projects`);
	return { success: true, saleId: sale.id };
}

async function lastConfirmedPaymentDateBySaleId(
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
	saleIds: string[]
): Promise<Record<string, string>> {
	if (!saleIds.length) return {};
	const { data, error } = await supabase
		.from("payments")
		.select("sale_id, payment_date")
		.in("sale_id", saleIds)
		.eq("is_confirmed", true)
		.order("payment_date", { ascending: false });
	if (error) throw new Error(error.message);
	const map: Record<string, string> = {};
	for (const row of data ?? []) {
		const sid = (row as { sale_id: string }).sale_id;
		if (!map[sid]) {
			map[sid] = String((row as { payment_date: string }).payment_date).slice(0, 10);
		}
	}
	return map;
}

export async function getSales() {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data, error } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(plot_number, projects(id, name)),
      customers(name, phone),
      advisors(name)
    `
		)
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	const rows = data || [];
	const saleIds = rows.map((s: { id: string }) => s.id);
	const lastBySale = await lastConfirmedPaymentDateBySaleId(supabase, saleIds);

	const subCountBySale: Record<string, number> = {};
	const commissionParticipantsBySale: Record<
		string,
		{
			advisor_id: string;
			name: string;
			phone: string;
			amount: number;
			is_main: boolean;
		}[]
	> = {};
	if (saleIds.length > 0) {
		const { data: comms } = await supabase
			.from("advisor_commissions")
			.select("sale_id, advisor_id, total_commission_amount, advisors:advisors!advisor_id(name, phone)")
			.in("sale_id", saleIds);
		for (const sale of rows as { id: string; advisor_id?: string | null }[]) {
			const list = (comms ?? []).filter((c: any) => c.sale_id === sale.id);
			const mainId = sale.advisor_id;
			const subs = list.filter((c: any) => c.advisor_id && c.advisor_id !== mainId);
			subCountBySale[sale.id] = subs.length;
			const mapped = list.map((c: any) => ({
				advisor_id: String(c.advisor_id ?? ""),
				name: String(c.advisors?.name ?? "—"),
				phone: String(c.advisors?.phone ?? "—"),
				amount: Number(c.total_commission_amount ?? 0),
				is_main: Boolean(mainId && c.advisor_id === mainId),
			}));
			mapped.sort((a, b) => {
				if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
				return a.name.localeCompare(b.name);
			});
			commissionParticipantsBySale[sale.id] = mapped;
		}
	}

	return rows.map((sale: any) => ({
		...sale,
		payment_due_meta: computePaymentDueMeta(sale, lastBySale[sale.id]),
		sub_advisor_commission_count: subCountBySale[sale.id] ?? 0,
		commission_participants: commissionParticipantsBySale[sale.id] ?? [],
	}));
}

export type SaleCommissionParticipant = {
	advisor_id: string;
	name: string;
	phone: string;
	amount: number;
	is_main: boolean;
};

/** Loads advisor_commissions for a sale (for older rows after backfill, or live data). */
export async function getSaleCommissionParticipants(
	saleId: string,
): Promise<SaleCommissionParticipant[]> {
	const supabase = await createClient();
	if (!supabase) return [];

	const { data: sale } = await supabase
		.from("plot_sales")
		.select("advisor_id")
		.eq("id", saleId)
		.maybeSingle();
	const mainId = (sale as { advisor_id?: string | null } | null)?.advisor_id ?? null;

	const { data: rows, error } = await supabase
		.from("advisor_commissions")
		.select("advisor_id, total_commission_amount, advisors:advisors!advisor_id(name, phone)")
		.eq("sale_id", saleId);
	if (error) return [];

	const mapped = (rows ?? []).map((c: any) => ({
		advisor_id: String(c.advisor_id ?? ""),
		name: String(c.advisors?.name ?? "—"),
		phone: String(c.advisors?.phone ?? "—"),
		amount: Number(c.total_commission_amount ?? 0),
		is_main: Boolean(mainId && c.advisor_id === mainId),
	}));
	mapped.sort((a, b) => {
		if (a.is_main !== b.is_main) return a.is_main ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	return mapped;
}

export async function getSaleById(id: string) {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(*, projects(name)),
      customers(*),
      advisors(*),
      advisor_commissions(
        advisor_id,
        total_commission_amount,
        advisors:advisors!advisor_id(name, phone)
      )
    `
		)
		.eq("id", id)
		.single();

	if (error) return null;
	return data;
}

export async function getCustomerPlotSales(customerId: string) {
	const supabase = await createClient();
	if (!supabase) return [];

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) return [];

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as
		| string
		| undefined;

	let query = supabase
		.from("plot_sales")
		.select(
			`
      *,
      plots(plot_number, projects(id, name))
    `
		)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;
	if (error) throw new Error(error.message);

	const saleIds = (data ?? []).map((s: any) => s.id);
	let lastPayments: any[] = [];
	if (saleIds.length > 0) {
		const { data: lp } = await supabase
			.from("payments")
			.select("id, sale_id, amount, payment_date, slip_number, payment_mode, is_confirmed")
			.in("sale_id", saleIds)
			.eq("is_confirmed", true)
			.order("payment_date", { ascending: false });
		lastPayments = lp ?? [];
	}

	return (data ?? []).map((sale: any) => {
		const lastPayment = lastPayments.find((p) => p.sale_id === sale.id);
		return {
			...sale,
			last_payment: lastPayment || null,
			payment_due_meta: computePaymentDueMeta(sale, lastPayment?.payment_date),
		};
	});
}
