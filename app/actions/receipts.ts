"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentBusinessId } from "@/lib/auth/current-business";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export type ReceiptResult = {
	success: boolean;
	url?: string;
	path?: string;
	sizeKb?: number;
	error?: string;
};

function formatCurrency(amount: number): string {
	// Standard PDF WinAnsi fonts do not support the rupee symbol reliably.
	return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDate(d: string | null | undefined): string {
	if (!d) return "—";
	return new Date(d).toISOString().slice(0, 10);
}

function makeWatermarkText(bizTitle: string) {
	const raw = String(bizTitle ?? "").trim();
	if (!raw) return "BUSINESS";
	const cleaned = raw.replace(/[^\p{L}\p{N}\s&.-]+/gu, " ").replace(/\s+/g, " ").trim();
	const words = cleaned.split(" ").filter(Boolean);

	// Prefer initials for long names: "MG Infra Constructions Pvt Ltd" -> "MICPL"
	if (words.length >= 3) {
		const initials = words
			.slice(0, 6)
			.map((w) => w[0])
			.join("")
			.toUpperCase();
		if (initials.length >= 3) return initials;
	}

	// Otherwise a short uppercased chunk, without overflowing
	return cleaned.toUpperCase();
}

async function resolveBusinessIdForReceipt(): Promise<{
	businessId: string | null;
	debug: Record<string, unknown>;
}> {
	const debug: Record<string, unknown> = {};
	const fromMetaOrDefault = await getCurrentBusinessId();
	debug.fromMetaOrDefault = fromMetaOrDefault ?? null;
	if (fromMetaOrDefault) return { businessId: fromMetaOrDefault, debug };

	const supabase = await createClient();
	const admin = createAdminClient();
	debug.hasSupabase = Boolean(supabase);
	debug.hasAdmin = Boolean(admin);
	if (!supabase || !admin) return { businessId: null, debug };

	const {
		data: { user },
	} = await supabase.auth.getUser();
	debug.userId = user?.id ?? null;
	if (!user?.id) return { businessId: null, debug };

	const { data, error } = await admin
		.from("business_admins")
		.select("business_id")
		.eq("auth_user_id", user.id)
		.maybeSingle();
	debug.adminMapError = error?.message ?? null;
	const bid = String((data as any)?.business_id ?? "").trim();
	debug.adminMappedBusinessId = bid || null;
	return { businessId: bid || null, debug };
}

export async function generateReceipt(saleId: string): Promise<ReceiptResult> {
	const supabase = await createClient();
	if (!supabase) return { success: false, error: "Database connection failed" };
	const sb = supabase;

	const saleSelect = `
      id,
      business_id,
      advisor_id,
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
      advisors(name),
      businesses(
        name,
        display_name,
        tagline,
        logo_path,
        address,
        phone,
        email,
        gst_number,
        pan_number,
        receipt_footer
      ),
      advisor_commissions(
        total_commission_amount,
        advisor_id,
        advisors(name, code)
      )
    `;

	const { data: sale, error: saleErr } = await supabase
		.from("plot_sales")
		.select(saleSelect)
		.eq("id", saleId)
		.maybeSingle();

	if (saleErr || !sale) {
		// Older rows can fail RLS if business_id is NULL (or metadata missing).
		// Use a guarded admin fallback: only allow if the sale is in current business
		// OR the sale has NULL business_id (legacy) for this logged-in business.
		const resolved = await resolveBusinessIdForReceipt();
		const businessId = resolved.businessId;
		const admin = createAdminClient();
		if (!businessId || !admin) {
			console.warn("[receipt] Sale not found (no business/admin)", {
				saleId,
				saleErr: saleErr?.message ?? null,
				businessId,
				...resolved.debug,
			});
			return { success: false, error: "Sale not found" };
		}

		const { data: saleHead } = await admin
			.from("plot_sales")
			.select("id, business_id")
			.eq("id", saleId)
			.maybeSingle();
		if (!saleHead?.id) {
			console.warn("[receipt] Sale id missing in DB", {
				saleId,
				saleErr: saleErr?.message ?? null,
				businessId,
			});
			return { success: false, error: "Sale not found" };
		}

		const saleBiz = String((saleHead as any)?.business_id ?? "").trim();
		if (saleBiz && saleBiz !== businessId) {
			console.warn("[receipt] Sale belongs to different business", {
				saleId,
				saleBiz,
				businessId,
			});
			return { success: false, error: "Sale not found" };
		}

		const { data: full } = await admin
			.from("plot_sales")
			// NOTE: older rows sometimes have broken/missing relationships.
			// Fetch base sale first and then hydrate related entities separately.
			.select(
				"id, business_id, advisor_id, sale_phase, token_date, agreement_date, total_sale_amount, down_payment, amount_paid, remaining_amount, monthly_emi, emi_day, sold_by_admin, plot_id, customer_id"
			)
			.eq("id", saleId)
			.maybeSingle();

		if (!full) {
			console.warn("[receipt] Admin base sale fetch failed", {
				saleId,
				saleBiz: saleBiz || null,
				businessId,
			});
			return { success: false, error: "Sale not found" };
		}

		const base = full as any;
		const plotId = String(base.plot_id ?? "").trim();
		const customerId = String(base.customer_id ?? "").trim();
		const advisorId = String(base.advisor_id ?? "").trim();

		const [{ data: plotRow }, { data: custRow }, { data: advRow }, { data: bizRow }, { data: commRows }] =
			await Promise.all([
				plotId
					? admin
							.from("plots")
							.select("plot_number, size_sqft, projects(name, location)")
							.eq("id", plotId)
							.maybeSingle()
					: Promise.resolve({ data: null } as any),
				customerId
					? admin
							.from("customers")
							.select("name, phone, address")
							.eq("id", customerId)
							.maybeSingle()
					: Promise.resolve({ data: null } as any),
				advisorId
					? admin.from("advisors").select("name").eq("id", advisorId).maybeSingle()
					: Promise.resolve({ data: null } as any),
				base.business_id
					? admin
							.from("businesses")
							.select(
								"name, display_name, tagline, logo_path, address, phone, email, gst_number, pan_number, receipt_footer"
							)
							.eq("id", base.business_id)
							.maybeSingle()
					: Promise.resolve({ data: null } as any),
				admin
					.from("advisor_commissions")
					.select("total_commission_amount, advisor_id, advisors(name, code)")
					.eq("sale_id", saleId),
			]);

		const hydrated = {
			...base,
			plots: plotRow ?? null,
			customers: custRow ?? null,
			advisors: advRow ?? null,
			businesses: bizRow ?? null,
			advisor_commissions: commRows ?? [],
		};

		return await generateReceiptFromSaleRow({
			saleId,
			supabase: sb,
			saleRow: hydrated,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const s = sale as any;
	return await generateReceiptFromSaleRow({ saleId, supabase: sb, saleRow: s });
}

async function generateReceiptFromSaleRow({
	saleId,
	supabase,
	saleRow,
}: {
	saleId: string;
	supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	saleRow: any;
}): Promise<ReceiptResult> {
	const sb = supabase;
	const s = saleRow;
	const project = s.plots?.projects;
	const plot = s.plots;
	const customer = s.customers;
	const advisor = s.advisors;
	const biz = s.businesses as
		| {
				name?: string | null;
				display_name?: string | null;
				tagline?: string | null;
				logo_path?: string | null;
				address?: string | null;
				phone?: string | null;
				email?: string | null;
				gst_number?: string | null;
				pan_number?: string | null;
				receipt_footer?: string | null;
		  }
		| null
		| undefined;

	const bizTitle =
		(biz?.display_name || biz?.name || "Business name not set").trim() ||
		"Business name not set";
	const bizSub =
		(biz?.tagline || "Real Estate | Land & Plot Development").trim() ||
		"Real Estate | Land & Plot Development";
	const watermarkRaw = makeWatermarkText(bizTitle);

	const commissionRows = (Array.isArray(s.advisor_commissions)
		? s.advisor_commissions
		: []
	) as Array<{
		total_commission_amount?: number | null;
		advisor_id?: string | null;
		advisors?: { name?: string | null; code?: string | null };
	}>;
	const mainAid = s.advisor_id as string | null | undefined;
	const sortedCommissions = [...commissionRows].sort((a, b) => {
		const aMain = mainAid && a.advisor_id === mainAid ? 1 : 0;
		const bMain = mainAid && b.advisor_id === mainAid ? 1 : 0;
		return bMain - aMain;
	});

	const contactLine =
		[biz?.address, biz?.phone, biz?.email].filter(Boolean).join(" · ") ||
		`Contact ${bizTitle} for any queries.`;

	const soldBy = s.sold_by_admin
		? "Admin (Direct)"
		: advisor?.name ?? "—";

	// Build a styled PDF bill with proper table layout
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595, 842]); // A4 portrait
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const { width, height } = page.getSize();
	let isFirstSection = true;

	async function tryEmbedLogo() {
		const p = String(biz?.logo_path ?? "").trim();
		if (!p) return null;
		try {
			const { data, error } = await sb.storage.from("receipts").download(p);
			if (error || !data) return null;
			const ab = await (data as any).arrayBuffer();
			const bytes = new Uint8Array(ab);
			return await pdfDoc.embedJpg(bytes);
		} catch {
			return null;
		}
	}

	// Watermark (short business name)
	const wmText = watermarkRaw.slice(0, 18);
	const wmBaseSize = 72;
	const wmMaxWidth = 430; // visual target width on page at this rotation
	const wmWidth = fontBold.widthOfTextAtSize(wmText, wmBaseSize);
	const wmSize = Math.max(44, Math.min(wmBaseSize, (wmBaseSize * wmMaxWidth) / Math.max(1, wmWidth)));
	page.drawText(wmText, {
		x: 170,
		y: 420,
		size: wmSize,
		font: fontBold,
		color: rgb(0.93, 0.94, 0.97),
		rotate: degrees(32),
	});

	// Header block
	page.drawRectangle({
		x: 0,
		y: height - 120,
		width,
		height: 120,
		color: rgb(0.08, 0.36, 0.62),
	});
	const logoImg = await tryEmbedLogo();
	const logoW = 34;
	const logoH = 34;
	const titleX = logoImg ? 38 + logoW + 10 : 38;
	if (logoImg) {
		page.drawImage(logoImg, {
			x: 38,
			y: height - 92,
			width: logoW,
			height: logoH,
		});
	}
	page.drawText(bizTitle.slice(0, 42), {
		x: titleX,
		y: height - 50,
		size: 24,
		font: fontBold,
		color: rgb(1, 1, 1),
	});
	page.drawText(bizSub.slice(0, 80), {
		x: titleX + 2,
		y: height - 74,
		size: 11,
		font,
		color: rgb(0.93, 0.98, 1),
	});
	page.drawText(`Receipt Ref: #${saleId.slice(0, 8).toUpperCase()}`, {
		x: width - 220,
		y: height - 52,
		size: 10,
		font: fontBold,
		color: rgb(1, 1, 1),
	});
	page.drawText(`Date: ${formatDate(s.token_date || s.agreement_date)}`, {
		x: width - 220,
		y: height - 70,
		size: 10,
		font,
		color: rgb(0.95, 0.98, 1),
	});

	// Exact app icon (from favicon.svg) in header top-right.
	const logoScale = 1.05;
	const logoX = width - 108;
	const logoY = height - 76;
	const logoStroke = {
		borderColor: rgb(1, 1, 1),
		borderWidth: 1.4,
		scale: logoScale,
		x: logoX,
		y: logoY,
	};
	page.drawSvgPath("M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", logoStroke);
	page.drawSvgPath("M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", logoStroke);
	page.drawSvgPath("M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", logoStroke);
	page.drawSvgPath("M10 6h4", logoStroke);
	page.drawSvgPath("M10 10h4", logoStroke);
	page.drawSvgPath("M10 14h4", logoStroke);
	page.drawSvgPath("M10 18h4", logoStroke);

	const left = 36;
	let y = height - 146;
	const tableWidth = width - 72;
	const col1 = 170;
	const rowHeight = 23;

	const drawTable = (
		title: string,
		rows: Array<{ key: string; value: string; strong?: boolean }>
	) => {
		// Add extra breathing space between table sections to avoid visual sticking.
		if (!isFirstSection) y -= 8;

		// Section title bar
		page.drawRectangle({
			x: left,
			y: y - 2,
			width: tableWidth,
			height: 20,
			color: rgb(0.93, 0.95, 0.98),
		});
		page.drawText(title, {
			x: left + 8,
			y: y + 3,
			size: 11,
			font: fontBold,
			color: rgb(0.12, 0.2, 0.34),
		});
		y -= 24;

		// Outer border
		const bodyHeight = rows.length * rowHeight;
		page.drawRectangle({
			x: left,
			y: y - bodyHeight,
			width: tableWidth,
			height: bodyHeight,
			borderColor: rgb(0.84, 0.87, 0.91),
			borderWidth: 1,
		});

		// Vertical column divider
		page.drawLine({
			start: { x: left + col1, y },
			end: { x: left + col1, y: y - bodyHeight },
			thickness: 1,
			color: rgb(0.88, 0.9, 0.93),
		});

		for (let i = 0; i < rows.length; i++) {
			const rowYTop = y - i * rowHeight;
			const textY = rowYTop - 15;
			const r = rows[i];

			// Horizontal divider
			if (i > 0) {
				page.drawLine({
					start: { x: left, y: rowYTop },
					end: { x: left + tableWidth, y: rowYTop },
					thickness: 1,
					color: rgb(0.9, 0.92, 0.95),
				});
			}

			page.drawText(r.key, {
				x: left + 8,
				y: textY,
				size: 10.2,
				font,
				color: rgb(0.35, 0.39, 0.45),
			});
			page.drawText(r.value, {
				x: left + col1 + 8,
				y: textY,
				size: 10.2,
				font: r.strong ? fontBold : font,
				color: rgb(0.12, 0.12, 0.12),
			});
		}

		y -= bodyHeight + 18;
		isFirstSection = false;
	};

	drawTable("Customer Details", [
		{ key: "Name", value: customer?.name ?? "—" },
		{ key: "Phone", value: customer?.phone ?? "—" },
		{ key: "Address", value: customer?.address ?? "—" },
	]);

	const issuerRows: Array<{ key: string; value: string }> = [];
	if (biz?.address)
		issuerRows.push({ key: "Address", value: String(biz.address).slice(0, 220) });
	if (biz?.gst_number)
		issuerRows.push({ key: "GST", value: String(biz.gst_number) });
	if (biz?.pan_number)
		issuerRows.push({ key: "PAN", value: String(biz.pan_number) });
	if (issuerRows.length) drawTable("Business details", issuerRows);

	drawTable("Transaction Details", [
		{ key: "Project", value: `${project?.name ?? "—"}${project?.location ? `, ${project.location}` : ""}` },
		{ key: "Plot", value: `${plot?.plot_number ?? "—"} (${plot?.size_sqft ?? "—"} sqft)` },
		{ key: "Phase", value: String(s.sale_phase ?? "").replace("_", " ") },
		{ key: "Token Date", value: formatDate(s.token_date) },
		{ key: "Agreement Date", value: formatDate(s.agreement_date) },
		{ key: "Sold By", value: soldBy },
	]);

	if (sortedCommissions.length > 0) {
		drawTable(
			"Commission allocation (this sale)",
			sortedCommissions.map((c) => {
				const isMain = Boolean(mainAid && c.advisor_id === mainAid);
				const name = c.advisors?.name ?? "—";
				const code = c.advisors?.code ? ` (${c.advisors.code})` : "";
				return {
					key: `${String(name).slice(0, 40)}${code}${isMain ? " — main" : ""}`,
					value: formatCurrency(Number(c.total_commission_amount ?? 0)),
					strong: isMain,
				};
			}),
		);
	}

	const paymentRows: Array<{ key: string; value: string; strong?: boolean }> = [
		{ key: "Total Sale Amount", value: formatCurrency(Number(s.total_sale_amount ?? 0)) },
		{ key: "Down Payment", value: formatCurrency(Number(s.down_payment ?? 0)) },
		{ key: "Amount Paid", value: formatCurrency(Number(s.amount_paid ?? 0)) },
		{ key: "Remaining Amount", value: formatCurrency(Number(s.remaining_amount ?? 0)), strong: true },
	];
	if (s.monthly_emi) {
		paymentRows.push({
			key: "Monthly EMI",
			value: `${formatCurrency(Number(s.monthly_emi))} (Day ${s.emi_day ?? "—"})`,
		});
	}
	drawTable("Payment Summary", paymentRows);

	const termsRows: Array<{ key: string; value: string; strong?: boolean }> = [];
	if (biz?.receipt_footer?.trim()) {
		for (const line of biz.receipt_footer
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean)) {
			termsRows.push({ key: "•", value: line.slice(0, 500) });
		}
	} else {
		termsRows.push(
			{
				key: "•",
				value: "This is a computer-generated receipt and does not require signature.",
			},
			{ key: "•", value: "Please preserve this receipt for your records." },
			{ key: "•", value: contactLine.slice(0, 500) },
		);
	}
	termsRows.push({ key: "Sale ID", value: saleId, strong: true });
	drawTable("Terms & Conditions", termsRows);

	// Footer strip
	page.drawRectangle({
		x: 0,
		y: 0,
		width,
		height: 40,
		color: rgb(0.97, 0.97, 0.98),
	});
	page.drawText("Online copy of bill", {
		x: 42,
		y: 15,
		size: 9,
		font,
		color: rgb(0.55, 0.58, 0.62),
	});
	page.drawText(`Generated by ${bizTitle.slice(0, 28)} CRM`, {
		x: width - 220,
		y: 15,
		size: 9,
		font,
		color: rgb(0.55, 0.58, 0.62),
	});

	const pdfBytes = await pdfDoc.save({
		useObjectStreams: true,
	});
	const sizeKb = Math.ceil((pdfBytes.byteLength / 1024) * 10) / 10;
	if (pdfBytes.byteLength > 100 * 1024) {
		return {
			success: false,
			error: `Generated PDF is ${sizeKb} KB, which exceeds 100 KB limit.`,
		};
	}
	const path = `sale-receipts/${saleId}-${Date.now()}.pdf`;

	const { error: uploadErr } = await supabase.storage
		.from("receipts")
		.upload(path, pdfBytes, {
			contentType: "application/pdf",
			cacheControl: "31536000",
			upsert: false,
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
	return { success: true, url: urlData.publicUrl, path, sizeKb };
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
