import type { HrEmployeeRow, HrSalaryType } from "./types";

export type WeekBucket = {
	weekKey: string;
	start: string;
	end: string;
	workedHours: number;
	overtimeHours: number;
	requiredHours: number;
	shortHours: number;
	deduction: number;
};

function mondayOfWeek(d: Date): Date {
	const day = d.getDay();
	const diff = (day === 0 ? -6 : 1) - day;
	const x = new Date(d);
	x.setDate(d.getDate() + diff);
	x.setHours(0, 0, 0, 0);
	return x;
}

function addDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}

function countDaysInPeriod(weekStart: Date, rangeStart: Date, rangeEnd: Date): number {
	let n = 0;
	for (let i = 0; i < 7; i++) {
		const day = addDays(weekStart, i);
		if (day >= rangeStart && day <= rangeEnd) n++;
	}
	return n;
}

/**
 * Prorate required weekly hours for partial weeks at month boundaries.
 */
export function buildWeeklyBuckets(
	periodStart: Date,
	periodEnd: Date,
	dailyWorkedHours: Record<string, number>,
	dailyOvertimeHours: Record<string, number>,
	dailyType: Record<string, "present" | "leave" | "holiday">,
	requiredHoursPerWeek: number,
	graceHours: number,
	deductionEnabled: boolean,
	salaryType: HrSalaryType,
	salaryRate: number
): WeekBucket[] {
	const buckets: WeekBucket[] = [];
	let cursor = mondayOfWeek(periodStart);
	const end = new Date(periodEnd);
	end.setHours(23, 59, 59, 999);

	while (cursor <= end) {
		const weekStart = new Date(cursor);
		const weekEnd = addDays(weekStart, 6);
		const weekKey = weekStart.toISOString().slice(0, 10);

		let worked = 0;
		let ot = 0;
		for (let i = 0; i < 7; i++) {
			const day = addDays(weekStart, i);
			if (day < periodStart || day > periodEnd) continue;
			const key = day.toISOString().slice(0, 10);
			const t = dailyType[key] ?? "present";
			if (t === "holiday" || t === "leave") continue;
			worked += dailyWorkedHours[key] ?? 0;
			ot += dailyOvertimeHours[key] ?? 0;
		}

		const overlapDays = countDaysInPeriod(weekStart, periodStart, end);
		const factor = overlapDays / 7;
		const required = requiredHoursPerWeek * factor;
		let short = Math.max(0, required - worked);
		if (short <= graceHours) short = 0;

		let hourlyEquivalent = 0;
		if (salaryType === "monthly") {
			const approxMonthHours = requiredHoursPerWeek * 4.33;
			hourlyEquivalent = approxMonthHours > 0 ? salaryRate / approxMonthHours : 0;
		} else if (salaryType === "daily") {
			hourlyEquivalent = salaryRate / 8;
		} else {
			hourlyEquivalent = salaryRate;
		}

		const deduction = deductionEnabled ? short * hourlyEquivalent : 0;

		buckets.push({
			weekKey,
			start: weekStart.toISOString().slice(0, 10),
			end: weekEnd.toISOString().slice(0, 10),
			workedHours: worked,
			overtimeHours: ot,
			requiredHours: required,
			shortHours: short,
			deduction,
		});

		cursor = addDays(weekStart, 7);
	}

	return buckets;
}

export function computePayoutForEmployee(
	emp: HrEmployeeRow,
	buckets: WeekBucket[],
	presentDays: number,
	totalWorkedHours: number,
	totalOvertimeHours: number
): {
	baseSalary: number;
	overtimePay: number;
	deductionAmount: number;
	finalSalary: number;
	weekly_breakdown: WeekBucket[];
} {
	const weekly_breakdown = buckets;
	const totalDeduction = deductionEnabledSum(weekly_breakdown, emp.deduction_enabled);
	const otPay = totalOvertimeHours * Number(emp.overtime_rate ?? 0);

	let base = 0;
	if (emp.salary_type === "monthly") {
		base = Number(emp.salary_rate);
	} else if (emp.salary_type === "daily") {
		base = presentDays * Number(emp.salary_rate);
	} else {
		base = totalWorkedHours * Number(emp.salary_rate);
	}

	const finalSalary = Math.max(0, base + otPay - totalDeduction);

	return {
		baseSalary: base,
		overtimePay: otPay,
		deductionAmount: totalDeduction,
		finalSalary,
		weekly_breakdown,
	};
}

function deductionEnabledSum(buckets: WeekBucket[], enabled: boolean): number {
	if (!enabled) return 0;
	return buckets.reduce((s, b) => s + b.deduction, 0);
}
