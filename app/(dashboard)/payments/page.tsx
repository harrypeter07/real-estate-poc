import Link from "next/link";
import {
	Plus,
	CreditCard,
	CheckCircle2,
	Clock,
	User,
	Home,
} from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Badge,
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getPayments } from "@/app/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { PaymentRowActions } from "@/components/payments/payment-row-actions";

export default async function PaymentsPage() {
	const payments = await getPayments();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payments"
				subtitle={`${payments.length} transactions processed`}
				action={
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				}
			/>

			{payments.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-16 text-center">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
						<CreditCard className="h-8 w-8 text-zinc-400" />
					</div>
					<h3 className="text-lg font-semibold">No payments yet</h3>
					<p className="text-sm text-zinc-500 mt-1 mb-4">
						Record your first payment installment
					</p>
					<Link href="/payments/new">
						<Button size="sm">
							<Plus className="h-4 w-4 mr-2" />
							Record Payment
						</Button>
					</Link>
				</div>
			) : (
				<Card>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Customer / Plot</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Mode</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{payments.map((payment) => (
									<TableRow key={payment.id}>
										<TableCell className="font-medium">
											{formatDate(payment.payment_date)}
										</TableCell>
										<TableCell>
											<div className="flex flex-col">
												<span className="font-semibold text-sm flex items-center gap-1">
													<User className="h-3 w-3 text-zinc-400" />{" "}
													{payment.customers.name}
												</span>
												<span className="text-xs text-zinc-500 flex items-center gap-1">
													<Home className="h-3 w-3 text-zinc-400" />
													{payment.plot_sales.plots.projects.name} -{" "}
													{payment.plot_sales.plots.plot_number}
												</span>
											</div>
										</TableCell>
										<TableCell className="font-bold text-zinc-900">
											{formatCurrency(payment.amount)}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className="capitalize text-[10px] font-bold"
											>
												{payment.payment_mode}
											</Badge>
											{payment.slip_number && (
												<p className="text-[10px] text-zinc-400 mt-0.5 uppercase">
													#{payment.slip_number}
												</p>
											)}
										</TableCell>
										<TableCell>
											{payment.is_confirmed ? (
												<Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 border-green-200">
													<CheckCircle2 className="h-3 w-3" /> Confirmed
												</Badge>
											) : (
												<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1 border-yellow-200">
													<Clock className="h-3 w-3" /> Pending
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<PaymentRowActions payment={payment} />
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
