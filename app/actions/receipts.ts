"use server";

import { createClient } from "@/lib/supabase/server";

export type ReceiptResult = {
	success: boolean;
	url?: string;
	error?: string;
};

function formatCurrency(amount: number): string {
	return `₹ ${amount.toLocaleString("en-IN")}`;
}

function formatDate(d: string | null | undefined): string {
	if (!d) return "—";
	return new Date(d).toISOString().slice(0, 10);
}

export async function generateReceipt(saleId: string): Promise<ReceiptResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };

	const { data: sale, error: saleErr } = await supabase
		.from("plot_sales")
		.select(
			`
      id,
      sale_phase,
      token_date,
      agreement_date,
      total_sale_amount,
      down_payment,
      amount_paid,
      remaining_amount,
      monthly_emi,
      emi_day,
      sold_by_admin,
      plots(plot_number, size_sqft, projects(name, location)),
      customers(name, phone, address),
      advisors(name)
    `
		)
		.eq("id", saleId)
		.single();

	if (saleErr || !sale) {
		return { success: false, error: "Sale not found" };
	}

	const s = sale as any;
	const project = s.plots?.projects;
	const plot = s.plots;
	const customer = s.customers;
	const advisor = s.advisors;
	const soldBy = s.sold_by_admin ? "Admin (Direct)" : advisor?.name ?? "—";

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${plot?.plot_number ?? ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #1f2937; line-height: 1.5; padding: 24px; max-width: 700px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
    .company { font-size: 18px; font-weight: 700; color: #111827; }
    .tagline { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #4b5563; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .amount { text-align: right; font-weight: 600; }
    .total-row { font-weight: 700; background: #f3f4f6; }
    .terms { font-size: 10px; color: #6b7280; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .receipt-id { font-size: 10px; color: #9ca3af; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">MG Infra Nagpur</div>
    <div class="tagline">Land & Plot Development | Nagpur, Maharashtra</div>
  </div>

  <div class="section">
    <div class="section-title">Receipt / Sale Confirmation</div>
    <table>
      <tr><th>Receipt Ref</th><td>#${saleId.slice(0, 8).toUpperCase()}</td></tr>
      <tr><th>Date</th><td>${formatDate(s.token_date || s.agreement_date)}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Customer Details</div>
    <table>
      <tr><th>Name</th><td>${customer?.name ?? "—"}</td></tr>
      <tr><th>Phone</th><td>${customer?.phone ?? "—"}</td></tr>
      <tr><th>Address</th><td>${customer?.address ?? "—"}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Transaction Details</div>
    <table>
      <tr><th>Project</th><td>${project?.name ?? "—"}${project?.location ? `, ${project.location}` : ""}</td></tr>
      <tr><th>Plot</th><td>${plot?.plot_number ?? "—"} (${plot?.size_sqft ?? "—"} sqft)</td></tr>
      <tr><th>Phase</th><td>${String(s.sale_phase ?? "").replace("_", " ")}</td></tr>
      <tr><th>Token Date</th><td>${formatDate(s.token_date)}</td></tr>
      <tr><th>Agreement Date</th><td>${formatDate(s.agreement_date)}</td></tr>
      <tr><th>Sold By</th><td>${soldBy}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Payment Summary</div>
    <table>
      <tr><th>Total Sale Amount</th><td class="amount">${formatCurrency(Number(s.total_sale_amount ?? 0))}</td></tr>
      <tr><th>Down Payment</th><td class="amount">${formatCurrency(Number(s.down_payment ?? 0))}</td></tr>
      <tr><th>Amount Paid</th><td class="amount">${formatCurrency(Number(s.amount_paid ?? 0))}</td></tr>
      <tr class="total-row"><th>Remaining Amount</th><td class="amount">${formatCurrency(Number(s.remaining_amount ?? 0))}</td></tr>
      ${s.monthly_emi ? `<tr><th>Monthly EMI</th><td class="amount">${formatCurrency(Number(s.monthly_emi))} (Day ${s.emi_day ?? "—"})</td></tr>` : ""}
    </table>
  </div>

  <div class="terms">
    <strong>Terms & Conditions:</strong><br>
    • This is a computer-generated receipt and does not require a signature.<br>
    • Please preserve this receipt for your records.<br>
    • For any queries, contact MG Infra Nagpur.<br>
    <div class="receipt-id">Sale ID: ${saleId}</div>
  </div>
</body>
</html>`;

	const path = `sale-receipts/${saleId}-${Date.now()}.html`;

	const { error: uploadErr } = await supabase.storage
		.from("receipts")
		.upload(path, html, {
			contentType: "text/html",
			upsert: true,
		});

	if (uploadErr) {
		return { success: false, error: uploadErr.message };
	}

	const { error: updateErr } = await supabase
		.from("plot_sales")
		.update({ receipt_path: path })
		.eq("id", saleId);

	if (updateErr) {
		return { success: false, error: updateErr.message };
	}

	const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
	return { success: true, url: urlData.publicUrl };
}

export async function getReceiptUrl(saleId: string): Promise<string | null> {
	const supabase = await createClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("plot_sales")
		.select("receipt_path")
		.eq("id", saleId)
		.single();

	if (error || !(data as any)?.receipt_path) return null;
	const path = (data as any).receipt_path;
	const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
	return urlData.publicUrl;
}

export async function getReceiptUrlByPath(path: string): Promise<string | null> {
	const supabase = await createClient();
	if (!supabase || !path) return null;
	const { data } = supabase.storage.from("receipts").getPublicUrl(path);
	return data.publicUrl;
}
