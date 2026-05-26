import { Suspense } from "react";
import Link from "next/link";
import { getRecoveryData, type RecoveryRow as RecoveryRowType } from "@/app/actions/recovery-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
	AlertTriangle, 
	Clock, 
	PhoneCall, 
	MessageCircle, 
	CreditCard, 
	TrendingDown,
	Building2,
	User,
	Coins,
	Calendar,
	Sparkles,
	CheckCircle2,
	Smile,
	Flame,
	BadgePercent,
	AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(n: number) {
	return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(s: string | null) {
	if (!s) return "—";
	return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function RecoveryRow({ row, urgent }: { row: RecoveryRowType; urgent?: boolean }) {
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

	const nameChar = row.customer_name ? row.customer_name.charAt(0).toUpperCase() : "?";

	return (
		<tr className={cn(
			"border-b border-zinc-200 hover:bg-teal-50/15 transition-all duration-200 group align-middle",
			urgent ? "bg-red-50/5 hover:bg-red-50/10 hover:shadow-[inset_4px_0_0_0_#ef4444]" : "hover:shadow-[inset_4px_0_0_0_#0d9488]"
		)}>
			{/* Customer Cell with avatar */}
			<td className="py-4 pl-4 pr-3 min-w-[200px]">
				<div className="flex items-center gap-2.5">
					<div className={cn(
						"h-8.5 w-8.5 rounded-full flex items-center justify-center font-black text-xs shadow-3xs shrink-0 group-hover:scale-105 transition-all",
						urgent 
							? "bg-gradient-to-tr from-red-500/10 to-red-600/5 text-red-700 border border-red-200/50" 
							: "bg-gradient-to-tr from-teal-600/10 to-teal-500/5 text-teal-700 border border-teal-550/15"
					)}>
						{nameChar}
					</div>
					<div className="flex flex-col gap-0.5">
						<Link
							href={`/customers/${row.customer_id}`}
							className="text-xs font-black text-zinc-800 tracking-tight hover:text-teal-650 hover:underline leading-none"
						>
							{row.customer_name}
						</Link>
						<span className="text-[10px] text-zinc-450 font-bold font-mono leading-none mt-1">
							{row.customer_phone}
						</span>
					</div>
				</div>
			</td>

			{/* Project / Plot Cell */}
			<td className="py-4 pr-3 text-xs text-zinc-700">
				<div className="flex items-center gap-2">
					<div className="h-7.5 w-7.5 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-center text-zinc-400 group-hover:text-teal-600 transition-colors shadow-3xs shrink-0">
						<Building2 className="h-3.5 w-3.5" />
					</div>
					<div className="flex flex-col">
						<span className="font-black text-zinc-850 leading-tight">Plot {row.plot_number}</span>
						<span className="text-[9px] text-zinc-400 font-bold leading-tight mt-0.5">{row.project_name}</span>
					</div>
				</div>
			</td>

			{/* Outstanding Amount Column */}
			<td className="py-4 pr-3 text-right tabular-nums min-w-[140px]">
				<span className={cn(
					"font-black text-xs font-mono tracking-tight",
					row.remaining_amount > 100000 ? "text-red-500 font-bold" : "text-zinc-850"
				)}>
					{formatCurrency(row.remaining_amount)}
				</span>
				{row.monthly_emi && (
					<p className="text-[9px] text-zinc-400 font-black uppercase mt-0.5 font-mono">
						EMI: {formatCurrency(row.monthly_emi)}/mo
					</p>
				)}
			</td>

			{/* Next Due Date Column */}
			<td className="py-4 pr-3 text-xs text-zinc-700">
				{row.next_emi_due ? (
					<div className="flex flex-col gap-0.5">
						<p className="text-[10px] font-black text-zinc-650 font-mono">{formatDate(row.next_emi_due)}</p>
						{row.days_overdue > 0 && (
							<Badge variant="outline" className="bg-red-50/80 text-red-600 border-red-100 font-black text-[8px] uppercase tracking-wider py-0 px-1 rounded shadow-3xs w-fit">
								{row.days_overdue}d overdue
							</Badge>
						)}
					</div>
				) : (
					<span className="text-zinc-400 font-bold font-mono text-[10px]">—</span>
				)}
			</td>

			{/* Actions Buttons with custom icons */}
			<td className="py-4 pr-4 text-right">
				<div className="flex items-center gap-1.5 justify-end">
					<Link href={`tel:${row.customer_phone}`}>
						<Button 
							variant="outline" 
							size="icon" 
							className="h-7 w-7 rounded-lg border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-850 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all cursor-pointer"
							title="Call"
						>
							<PhoneCall className="w-3 h-3" />
						</Button>
					</Link>
					{waLink && (
						<Link href={waLink} target="_blank" rel="noopener noreferrer">
							<Button 
								variant="outline" 
								size="icon" 
								className="h-7 w-7 rounded-lg border-green-200/50 hover:bg-green-50/30 text-green-600 hover:text-green-700 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all cursor-pointer"
								title="WhatsApp"
							>
								<MessageCircle className="w-3.5 h-3.5" />
							</Button>
						</Link>
					)}
					<Link href={`/payments/new?sale_id=${row.sale_id}&customer_id=${row.customer_id}`}>
						<Button 
							variant="outline" 
							size="sm" 
							className="h-7.5 text-[9px] font-black rounded-lg bg-teal-600 hover:bg-teal-700 text-white hover:border-teal-750 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1 cursor-pointer"
							title="Record Payment"
						>
							<CreditCard className="w-2.5 h-2.5" />
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
	isEmptyForUrgent,
}: {
	rows: RecoveryRowType[];
	emptyMsg: string;
	urgent?: boolean;
	isEmptyForUrgent?: boolean;
}) {
	if (rows.length === 0) {
		return (
			<div className="py-12 text-center max-w-sm mx-auto flex flex-col items-center">
				{isEmptyForUrgent ? (
					<>
						<div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3.5 shadow-2xs">
							<CheckCircle2 className="h-5 w-5 text-emerald-600 animate-pulse" />
						</div>
						<h4 className="text-xs font-black text-zinc-750 uppercase tracking-wider">No urgent recovery accounts</h4>
						<p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed font-semibold">
							All customer payments are currently under control.
						</p>
					</>
				) : (
					<>
						<div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3.5 shadow-2xs">
							<Smile className="h-5 w-5 text-teal-600" />
						</div>
						<h4 className="text-xs font-black text-zinc-750 uppercase tracking-wider">No overdue payments right now</h4>
						<p className="text-[11px] text-zinc-450 mt-1.5 leading-relaxed font-semibold">
							Upcoming EMIs and delayed collections will appear here.
						</p>
					</>
				)}
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-zinc-200 text-left text-zinc-500 text-xs">
						<th className="pb-3 pl-4 pr-3 font-black text-[10px] uppercase text-zinc-450 tracking-wider">
							<div className="flex items-center gap-1">
								<User className="h-3 w-3 text-zinc-450" />
								Customer
							</div>
						</th>
						<th className="pb-3 pr-3 font-black text-[10px] uppercase text-zinc-450 tracking-wider">
							<div className="flex items-center gap-1">
								<Building2 className="h-3 w-3 text-zinc-450" />
								Project / Plot
							</div>
						</th>
						<th className="pb-3 pr-3 font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">
							<div className="flex items-center gap-1 justify-end">
								<Coins className="h-3 w-3 text-zinc-450" />
								Outstanding
							</div>
						</th>
						<th className="pb-3 pr-3 font-black text-[10px] uppercase text-zinc-450 tracking-wider">
							<div className="flex items-center gap-1">
								<Calendar className="h-3 w-3 text-zinc-450" />
								Next EMI / Due
							</div>
						</th>
						<th className="pb-3 pr-4 font-black text-[10px] uppercase text-zinc-450 tracking-wider text-right">Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-zinc-200">
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
				<Card className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 hover:-translate-y-1 hover:shadow-md hover:border-teal-500/25 transition-all duration-300 relative overflow-hidden group">
					<CardContent className="pt-5 pb-4 flex flex-col justify-between">
						<p className="text-[10px] text-zinc-450 font-black uppercase tracking-wider">Urgent (30d+ overdue)</p>
						<p className="text-2xl font-black text-red-650 mt-2 font-mono">{totalUrgent}</p>
					</CardContent>
				</Card>
				<Card className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 hover:-translate-y-1 hover:shadow-md hover:border-teal-500/25 transition-all duration-300 relative overflow-hidden group">
					<CardContent className="pt-5 pb-4 flex flex-col justify-between">
						<p className="text-[10px] text-zinc-450 font-black uppercase tracking-wider">Overdue</p>
						<p className="text-2xl font-black text-orange-650 mt-2 font-mono">{totalOverdue}</p>
					</CardContent>
				</Card>
				<Card className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 hover:-translate-y-1 hover:shadow-md hover:border-teal-500/25 transition-all duration-300 relative overflow-hidden group">
					<CardContent className="pt-5 pb-4 flex flex-col justify-between">
						<p className="text-[10px] text-zinc-450 font-black uppercase tracking-wider">Upcoming EMIs</p>
						<p className="text-2xl font-black text-zinc-750 mt-2 font-mono">{totalPending}</p>
					</CardContent>
				</Card>
				<Card className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 hover:-translate-y-1 hover:shadow-md hover:border-teal-500/25 transition-all duration-300 relative overflow-hidden group">
					<CardContent className="pt-5 pb-4 flex flex-col justify-between">
						<p className="text-[10px] text-zinc-450 font-black uppercase tracking-wider">Total Outstanding</p>
						<p className="text-2xl font-black text-zinc-900 mt-2 font-mono">{formatCurrency(totalOutstanding)}</p>
					</CardContent>
				</Card>
			</div>

			{/* Urgent section */}
			<Card className="rounded-2xl border border-red-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
				<CardHeader className="pb-3 border-b border-red-100 bg-gradient-to-r from-red-50/50 to-white">
					<CardTitle className="font-black text-xs uppercase tracking-wider flex items-center justify-between m-0 text-red-650">
						<div className="flex items-center gap-2">
							<Flame className="w-4.5 h-4.5 text-red-500 shrink-0" />
							Urgent — 30+ Days Overdue
						</div>
						{totalUrgent > 0 && (
							<Badge className="bg-red-100 text-red-700 border-red-200/50 font-black text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-md shadow-3xs">
								{totalUrgent} Accounts
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<RecoveryTable
						rows={urgent}
						emptyMsg="No urgent accounts — great work!"
						urgent
						isEmptyForUrgent
					/>
				</CardContent>
			</Card>

			{/* Overdue section */}
			<Card className="rounded-2xl border border-orange-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
				<CardHeader className="pb-3 border-b border-orange-100 bg-gradient-to-r from-orange-50/50 to-white">
					<CardTitle className="font-black text-xs uppercase tracking-wider flex items-center justify-between m-0 text-orange-655">
						<div className="flex items-center gap-2">
							<Clock className="w-4.5 h-4.5 text-orange-500 shrink-0" />
							Overdue Payments
						</div>
						{totalOverdue > 0 && (
							<Badge className="bg-orange-100 text-orange-700 border-orange-200/50 font-black text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-md shadow-3xs">
								{totalOverdue} Accounts
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<RecoveryTable
						rows={overdue}
						emptyMsg="No overdue payments at the moment."
					/>
				</CardContent>
			</Card>

			{/* Upcoming / pending section */}
			<Card className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
				<CardHeader className="pb-3 border-b border-zinc-150 bg-gradient-to-r from-zinc-50/50 to-white">
					<CardTitle className="font-black text-xs uppercase tracking-wider flex items-center justify-between m-0 text-zinc-750">
						<div className="flex items-center gap-2">
							<TrendingDown className="w-4.5 h-4.5 text-teal-650 shrink-0" />
							All Pending EMIs
						</div>
						{totalPending > 0 && (
							<Badge variant="secondary" className="bg-zinc-100 text-zinc-700 border-zinc-200/50 font-black text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-md shadow-3xs">
								{totalPending} EMIs
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
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
