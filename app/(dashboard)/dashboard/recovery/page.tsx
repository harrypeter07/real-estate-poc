import { Suspense } from "react";
import Link from "next/link";
import { getRecoveryData, type RecoveryRow } from "@/app/actions/recovery-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, PhoneCall, MessageCircle, CreditCard, TrendingDown } from "lucide-react";

function formatCurrency(n: number) {
	return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(s: string | null) {
	if (!s) return "—";
	return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function RecoveryRow({ row, urgent }: { row: RecoveryRow; urgent?: boolean }) {
	const whatsappMsg = encodeURIComponent(
		`Hello ${row.customer_name}, this is a reminder that your EMI payment of ${formatCurrency(
			row.monthly_emi ?? row.remaining_amount
		)} is overdue for Plot ${row.plot_number} (${row.project_name}). Remaining balance: ${formatCurrency(
			row.remaining_amount
		)}. Please arrange payment at the earliest. Thank you.`
	);
	const waLink = row.whatsapp_phone
		? `https://wa.me/${row.whatsapp_phone}?text=${whatsappMsg}`
		: null;

	return (
		<tr className={`border-b last:border-0 ${urgent ? "bg-red-50/40" : ""}`}>
			<td className="py-3 pr-3 min-w-[160px]">
				<Link
					href={`/customers/${row.customer_id}`}
					className="text-sm font-medium text-zinc-900 hover:underline"
				>
					{row.customer_name}
				</Link>
				<p className="text-xs text-zinc-500 mt-0.5">{row.customer_phone}</p>
			</td>
			<td className="py-3 pr-3 text-sm text-zinc-700">
				<span className="font-medium">{row.project_name}</span>
				<p className="text-xs text-zinc-400">Plot {row.plot_number}</p>
			</td>
			<td className="py-3 pr-3 text-sm text-right tabular-nums">
				<span className="font-semibold text-zinc-900">{formatCurrency(row.remaining_amount)}</span>
				{row.monthly_emi && (
					<p className="text-xs text-zinc-400">EMI: {formatCurrency(row.monthly_emi)}/mo</p>
				)}
			</td>
			<td className="py-3 pr-3 text-sm text-zinc-700">
				{row.next_emi_due ? (
					<>
						<p className="text-xs font-medium text-zinc-700">{formatDate(row.next_emi_due)}</p>
						{row.days_overdue > 0 && (
							<p className="text-xs text-red-600 font-medium">{row.days_overdue}d overdue</p>
						)}
					</>
				) : (
					<span className="text-zinc-400 text-xs">—</span>
				)}
			</td>
			<td className="py-3 text-right">
				<div className="flex items-center gap-1 justify-end">
					<Link href={`tel:${row.customer_phone}`}>
						<Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
							<PhoneCall className="w-3.5 h-3.5" />
						</Button>
					</Link>
					{waLink && (
						<Link href={waLink} target="_blank" rel="noopener noreferrer">
							<Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="WhatsApp">
								<MessageCircle className="w-3.5 h-3.5" />
							</Button>
						</Link>
					)}
					<Link href={`/payments/new?sale_id=${row.sale_id}&customer_id=${row.customer_id}`}>
						<Button variant="outline" size="sm" className="h-7 text-xs px-2" title="Record Payment">
							<CreditCard className="w-3 h-3 mr-1" />
							Pay
						</Button>
					</Link>
				</div>
			</td>
		</tr>
	);
}

function RecoveryTable({
	rows,
	emptyMsg,
	urgent,
}: {
	rows: RecoveryRow[];
	emptyMsg: string;
	urgent?: boolean;
}) {
	if (rows.length === 0) {
		return (
			<p className="text-sm text-zinc-400 py-6 text-center">{emptyMsg}</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b text-left text-zinc-500 text-xs">
						<th className="pb-2 pr-3 font-medium">Customer</th>
						<th className="pb-2 pr-3 font-medium">Project / Plot</th>
						<th className="pb-2 pr-3 font-medium text-right">Outstanding</th>
						<th className="pb-2 pr-3 font-medium">Next EMI / Due</th>
						<th className="pb-2 font-medium text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<RecoveryRow key={row.sale_id} row={row} urgent={urgent} />
					))}
				</tbody>
			</table>
		</div>
	);
}

async function RecoveryContent() {
	const { urgent, overdue, allPending } = await getRecoveryData();

	const totalUrgent = urgent.length;
	const totalOverdue = overdue.length;
	const totalPending = allPending.length;
	const totalOutstanding =
		[...urgent, ...overdue, ...allPending].reduce((s, r) => s + r.remaining_amount, 0);

	return (
		<div className="space-y-6">
			{/* KPI row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="pt-5 pb-4">
						<p className="text-xs text-zinc-500 uppercase tracking-wide">Urgent (30d+ overdue)</p>
						<p className="text-2xl font-bold text-red-600 mt-1">{totalUrgent}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-5 pb-4">
						<p className="text-xs text-zinc-500 uppercase tracking-wide">Overdue</p>
						<p className="text-2xl font-bold text-orange-500 mt-1">{totalOverdue}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-5 pb-4">
						<p className="text-xs text-zinc-500 uppercase tracking-wide">Upcoming EMIs</p>
						<p className="text-2xl font-bold text-zinc-700 mt-1">{totalPending}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-5 pb-4">
						<p className="text-xs text-zinc-500 uppercase tracking-wide">Total Outstanding</p>
						<p className="text-2xl font-bold text-zinc-900 mt-1">{formatCurrency(totalOutstanding)}</p>
					</CardContent>
				</Card>
			</div>

			{/* Urgent section */}
			<Card className="border-red-200">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
						<AlertTriangle className="w-4 h-4" />
						Urgent — 30+ Days Overdue
						{totalUrgent > 0 && (
							<Badge className="bg-red-100 text-red-700 border-red-200 ml-1">{totalUrgent}</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-1">
					<RecoveryTable
						rows={urgent}
						emptyMsg="No urgent accounts — great work!"
						urgent
					/>
				</CardContent>
			</Card>

			{/* Overdue section */}
			<Card className="border-orange-200">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600">
						<Clock className="w-4 h-4" />
						Overdue Payments
						{totalOverdue > 0 && (
							<Badge className="bg-orange-100 text-orange-700 border-orange-200 ml-1">
								{totalOverdue}
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-1">
					<RecoveryTable
						rows={overdue}
						emptyMsg="No overdue payments at the moment."
					/>
				</CardContent>
			</Card>

			{/* Upcoming / pending section */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-700">
						<TrendingDown className="w-4 h-4" />
						All Pending EMIs
						{totalPending > 0 && (
							<Badge variant="secondary" className="ml-1">{totalPending}</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-1">
					<RecoveryTable
						rows={allPending}
						emptyMsg="No pending EMI payments found."
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export default async function RecoveryDashboardPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Recovery Dashboard"
				subtitle="Monitor overdue payments, urgent accounts, and take action to collect outstanding balances"
			/>
			<Suspense
				fallback={
					<div className="space-y-4">
						<div className="grid grid-cols-4 gap-4">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />
							))}
						</div>
						<div className="h-48 bg-zinc-100 rounded-lg animate-pulse" />
						<div className="h-32 bg-zinc-100 rounded-lg animate-pulse" />
					</div>
				}
			>
				<RecoveryContent />
			</Suspense>
		</div>
	);
}
