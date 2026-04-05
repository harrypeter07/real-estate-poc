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

	// 3. Commission rows (one per participant: main + optional sub-advisors)
	if (!soldByAdmin && parsed.data.advisor_id) {
		const profitTotal = finance.profit;
		if (profitTotal > 0.001) {
			const mainId = parsed.data.advisor_id;
			let splits = parsed.data.commission_splits;

			const { data: subRows } = await supabase
				.from("advisors")
				.select("id")
				.eq("parent_advisor_id", mainId);
			const allowedSub = new Set((subRows ?? []).map((r: { id: string }) => r.id));

			if (!splits?.length) {
				splits = [{ advisor_id: mainId, amount: profitTotal }];
			} else {
				const sum = splits.reduce((s, r) => s + r.amount, 0);
				if (Math.abs(sum - profitTotal) > 0.05) {
					return {
						success: false,
						error: `Commission split must total ₹ ${profitTotal.toLocaleString(
							"en-IN",
						)} (currently ₹ ${sum.toLocaleString("en-IN")}).`,
					};
				}
				const seen = new Set<string>();
				for (const row of splits) {
					if (row.amount < -0.0001) {
						return { success: false, error: "Commission amounts cannot be negative." };
					}
					if (seen.has(row.advisor_id)) {
						return { success: false, error: "Duplicate advisor in commission split." };
					}
					seen.add(row.advisor_id);
					if (row.advisor_id !== mainId && !allowedSub.has(row.advisor_id)) {
						return {
							success: false,
							error:
								"Commission split can only include the main advisor and their sub-advisors.",
						};
					}
				}
				if (!splits.some((r) => r.advisor_id === mainId)) {
					return { success: false, error: "Commission split must include the main advisor." };
				}
			}

			for (const row of splits) {
				const { error: cErr } = await supabase.from("advisor_commissions").insert({
					business_id: businessId,
					advisor_id: row.advisor_id,
					sale_id: sale.id,
					commission_percentage: 0,
					total_commission_amount: row.amount,
					amount_paid: 0,
					notes:
						row.advisor_id === mainId
							? `Profit-share (main) plot ${plotRow.plot_number}`
							: `Profit-share (sub) plot ${plotRow.plot_number}`,
				});
				if (cErr) {
					return { success: false, error: cErr.message };
				}
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
			.select("sale_id, advisor_id, total_commission_amount, advisors(name, phone)")
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
        advisors(name, phone)
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

	// Advisors should only see sales for their own customers.
	let query = supabase
		.from("plot_sales")
		.select(
			`
      id,
      sale_phase,
      token_date,
      agreement_date,
      total_sale_amount,
      amount_paid,
      remaining_amount,
      created_at,
      plots(plot_number, projects(name))
    `
		)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (role === "advisor" && advisorId) {
		query = query.eq("advisor_id", advisorId);
	}

	const { data, error } = await query;

	if (error) throw new Error(error.message);
	return data || [];
}
