"use client";

import {
	fillPaymentTemplate,
	getStoredPaymentTemplateId,
	PAYMENT_MESSAGE_TEMPLATES,
	type PaymentTemplateId,
} from "@/lib/payment-message-templates";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { formatWhatsAppPhone } from "@/lib/payment-due";

export function openWhatsAppPaymentReminder(input: {
	phone: string | null | undefined;
	businessName?: string | null;
	customerName: string;
	plot: string;
	project: string;
	remainingAmount: number;
	monthlyEmi?: number | null;
	nextDue?: string | null;
	templateId?: PaymentTemplateId;
}) {
	const wa = formatWhatsAppPhone(input.phone);
	if (!wa) return false;

	const id = input.templateId ?? getStoredPaymentTemplateId();
	const template = PAYMENT_MESSAGE_TEMPLATES.find((t) => t.id === id) ?? PAYMENT_MESSAGE_TEMPLATES[0];

	const remaining = formatCurrency(input.remainingAmount);
	const emi = formatCurrency(Number(input.monthlyEmi ?? 0));
	const due = input.nextDue ? formatDate(input.nextDue) : "—";
	const business =
		String(
			input.businessName ??
				(typeof window !== "undefined"
					? localStorage.getItem("app_business_display_name")
					: "") ??
				"",
		).trim() || "Business name not set";

	const message = fillPaymentTemplate(template.body, {
		business,
		name: input.customerName || "Customer",
		plot: input.plot || "—",
		project: input.project || "—",
		remaining,
		emi_amount: emi,
		due_date: due,
	});

	window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank");
	return true;
}
