/**
 * EMI “As of date” simulation on the Payments page is for local/dev QA only.
 * In production builds, `asOf` is ignored server-side and the picker is hidden.
 */
export function isPaymentsAsOfDateEnabled(): boolean {
	return process.env.NODE_ENV === "development";
}
