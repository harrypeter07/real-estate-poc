import { format, parseISO } from "date-fns";

/**
 * Format amount as Indian Rupee: ₹1,00,000
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string to "14 Mar 2026"
 */
export function formatDate(date: string | Date): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(parsed, "dd MMM yyyy");
}

/**
 * Format phone number: "+91 98765 43210"
 */
export function formatPhone(phone: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}