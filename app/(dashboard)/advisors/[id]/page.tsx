import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { getAdvisorAnalytics } from "@/app/actions/advisors";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Button,
	Badge,
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "@/components/ui";
import {
	User,
	Phone,
	MapPin,
	Handshake,
	IndianRupee,
	TrendingUp,
	Clock,
	Pencil,
	Home,
	User as UserIcon,
} from "lucide-react";
import { PasswordResetButton } from "@/components/advisors/password-reset-button";

const phaseLabels: Record<string, string> = {
	token: "Token",
	agreement: "Agreement",
	registry: "Registry",
	full_payment: "Full Payment",
	face1: "Token",
	face2: "Agreement",
	face3: "Registry",
	face4: "Full Payment",
	face5: "Face 5",
	face6: "Face 6",
};

export default async function AdvisorDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await getAdvisorAnalytics(id);

	if (!data) notFound();

	const { advisor, salesCount, totalRevenue, totalCommission, commissionPaid, commissionPending, sales, commissions } = data;

	return (
		<div className="space-y-6">
			<PageHeader
				title={advisor.name}
				subtitle={`Code: ${advisor.code} • ${advisor.is_active ? "Active" : "Inactive"}`}
				action={
					<Link href={`/advisors/${id}/edit`}>
						<Button variant="outline" size="sm">
							<Pencil className="h-4 w-4 mr-2" />
							Edit Advisor
						</Button>
					</Link>
				}
			/>

			{/* Profile Card */}
			<Card>
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-zinc-400" />
								<span className="text-sm font-medium">{advisor.phone}</span>
							</div>
							{advisor.address && (
								<div className="flex items-start gap-2">
									<MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
									<span className="text-sm text-zinc-600">{advisor.address}</span>
								</div>
							)}
							{advisor.birth_date && (
								<p className="text-sm text-zinc-500">
									Birth Date: {formatDate(advisor.birth_date)}
								</p>
							)}
							{advisor.email && (
								<p className="text-xs text-zinc-400">
									Login: {advisor.email}
								</p>
							)}
							<div className="pt-2">
								<PasswordResetButton
									advisorId={advisor.id}
									advisorPhone={advisor.phone}
									className="h-9"
								/>
							</div>
						</div>
						{advisor.notes && (
							<div>
								<p className="text-xs font-bold uppercase text-zinc-400 mb-1">Notes</p>
								<p className="text-sm text-zinc-600">{advisor.notes}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Analytics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card className="group bg-gradient-to-br from-white to-zinc-50/40 dark:from-zinc-950 dark:to-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.05)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500/10 to-slate-500/5 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<Handshake className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Sales
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">
								{salesCount}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-blue-50/[0.12] dark:from-zinc-950 dark:to-blue-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 hover:shadow-[0_12px_32px_-4px_rgba(59,130,246,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<TrendingUp className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Revenue
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 leading-tight truncate">
								{formatCurrency(totalRevenue)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-zinc-50/40 dark:from-zinc-950 dark:to-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-zinc-300 hover:shadow-[0_12px_32px_-4px_rgba(113,113,122,0.05)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500/10 to-slate-500/5 text-zinc-600 dark:text-zinc-400 border border-zinc-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<IndianRupee className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Total Commission
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight truncate">
								{formatCurrency(totalCommission)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-emerald-50/[0.12] dark:from-zinc-950 dark:to-emerald-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:shadow-[0_12px_32px_-4px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<IndianRupee className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Paid
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-green-700 dark:text-emerald-400 leading-tight truncate">
								{formatCurrency(commissionPaid)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="group bg-gradient-to-br from-white to-amber-50/[0.12] dark:from-zinc-950 dark:to-amber-950/[0.04] border border-zinc-200/60 dark:border-zinc-800/80 hover:border-amber-200 dark:hover:border-amber-900/30 hover:shadow-[0_12px_32px_-4px_rgba(245,158,11,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out select-none overflow-hidden flex flex-col justify-between h-full">
					<CardContent className="p-6 flex flex-col justify-between h-full w-full">
						<div className="flex items-center gap-3.5 w-full">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10 shadow-sm transition-transform duration-300 group-hover:scale-105">
								<Clock className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate flex-1">
								Pending
							</p>
						</div>
						<div className="mt-4 flex flex-col justify-end">
							<p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-700 dark:text-amber-500 leading-tight truncate">
								{formatCurrency(commissionPending)}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Sales Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Sales</CardTitle>
					<Link href="/sales/new">
						<Button variant="outline" size="sm">New Sale</Button>
					</Link>
				</CardHeader>
				<CardContent className="p-0">
					{sales.length === 0 ? (
						<div className="py-12 text-center text-zinc-500 text-sm">
							No sales recorded yet
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plot</TableHead>
									<TableHead>Project</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Paid / Due</TableHead>
									<TableHead>Phase</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sales.map((s) => (
									<TableRow key={s.id}>
										<TableCell className="font-medium">{s.plot_number}</TableCell>
										<TableCell>{s.project_name}</TableCell>
										<TableCell>{s.customer_name}</TableCell>
										<TableCell className="font-semibold">{formatCurrency(s.total_sale_amount)}</TableCell>
										<TableCell>
											<span className="text-green-600">{formatCurrency(s.amount_paid)}</span>
											{" / "}
											<span className="text-red-600">{formatCurrency(s.remaining_amount)}</span>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{phaseLabels[s.sale_phase] ?? s.sale_phase}
											</Badge>
										</TableCell>
										<TableCell>{s.token_date ? formatDate(s.token_date) : "—"}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Commissions Table */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Commission Details</CardTitle>
					<Link href="/commissions">
						<Button variant="outline" size="sm">View All</Button>
					</Link>
				</CardHeader>
				<CardContent className="p-0">
					{commissions.length === 0 ? (
						<div className="py-12 text-center text-zinc-500 text-sm">
							No commission records
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Plot</TableHead>
									<TableHead>Total Commission</TableHead>
									<TableHead>Paid</TableHead>
									<TableHead>Pending</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{commissions.map((c) => (
									<TableRow key={c.id}>
										<TableCell className="font-medium">{c.plot_number}</TableCell>
										<TableCell>{formatCurrency(c.total_commission_amount)}</TableCell>
										<TableCell className="text-green-600">{formatCurrency(c.amount_paid)}</TableCell>
										<TableCell className="text-amber-600 font-medium">{formatCurrency(c.remaining_commission)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
