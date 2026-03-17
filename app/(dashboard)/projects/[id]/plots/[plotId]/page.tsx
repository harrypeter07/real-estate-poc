import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, BadgeIndianRupee } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getPlotWithPayments } from "@/app/actions/plots";

interface Props {
	params: { id: string; plotId: string };
}

export default async function PlotDetailPage({ params }: Props) {
	const { id: projectId, plotId } = await params;
	const plot = await getPlotWithPayments(plotId);

	if (!plot) notFound();

	const totalAmount = plot.size_sqft * plot.rate_per_sqft;

	return (
		<div className="space-y-6">
			<PageHeader
				title={`Plot ${plot.plot_number}`}
				subtitle={`Status: ${plot.status}`}
				showBackButton
				action={
					<div className="flex gap-2">
						<Link href={`/projects/${projectId}/plots/${plotId}/edit`}>
							<Button size="sm" variant="outline">
								<Pencil className="h-4 w-4 mr-2" />
								Edit Plot
							</Button>
						</Link>
						<Link href="/sales/new">
							<Button size="sm">
								<BadgeIndianRupee className="h-4 w-4 mr-2" />
								Sell / Book
							</Button>
						</Link>
					</div>
				}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base">Plot Details</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
						<Field label="Plot Number" value={plot.plot_number} />
						<Field label="Facing" value={plot.facing || "—"} />
						<Field label="Size" value={`${plot.size_sqft} sqft`} />
						<Field
							label="Rate / sqft"
							value={`${formatCurrency(plot.rate_per_sqft)}/sqft`}
						/>
						<Field label="Total Value" value={formatCurrency(totalAmount)} />
						<div className="space-y-1">
							<p className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
								Status
							</p>
							<Badge variant="secondary" className="capitalize">
								{plot.status}
							</Badge>
						</div>
						{plot.notes ? (
							<div className="sm:col-span-2 space-y-1">
								<p className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
									Notes
								</p>
								<p className="text-sm text-zinc-700 whitespace-pre-wrap">
									{plot.notes}
								</p>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Sale</CardTitle>
					</CardHeader>
					<CardContent className="text-sm">
						{plot.sale ? (
							<div className="space-y-3">
								<Field label="Customer" value={plot.sale.customer_name} />
								<Field label="Advisor" value={plot.sale.advisor_name} />
								<Field label="Phase" value={plot.sale.sale_phase} />
								<Field
									label="Total Sale Amount"
									value={formatCurrency(plot.sale.total_sale_amount)}
								/>
								<Field
									label="Amount Paid"
									value={formatCurrency(plot.sale.amount_paid)}
								/>
								<Field
									label="Pending"
									value={formatCurrency(plot.sale.remaining_amount)}
								/>
							</div>
						) : (
							<p className="text-zinc-500">No active sale for this plot.</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
				{label}
			</p>
			<p className="font-semibold text-zinc-800">{value}</p>
		</div>
	);
}

