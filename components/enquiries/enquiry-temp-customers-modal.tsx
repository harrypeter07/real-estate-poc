"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Badge, Progress, Input } from "@/components/ui";
import { getEnquiryTempCustomersForModal, upgradeTempCustomerToCustomer, type EnquiryTempCustomerForModal } from "@/app/actions/enquiries";
import { useRouter } from "next/navigation";

export function EnquiryTempCustomersModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [upgradingId, setUpgradingId] = useState<string | null>(null);
	const [rows, setRows] = useState<EnquiryTempCustomerForModal[]>([]);
	const [query, setQuery] = useState("");

	const tempCount = rows.length;

	async function load() {
		setLoading(true);
		try {
			const data = await getEnquiryTempCustomersForModal();
			setRows(data);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!open) return;
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const filteredRows = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) =>
			`${r.name ?? ""} ${r.phone ?? ""} ${r.latest_enquiry_details ?? ""}`
				.toLowerCase()
				.includes(q)
		);
	}, [rows, query]);

	async function onUpgrade(customerId: string) {
		setUpgradingId(customerId);
		try {
			const res = await upgradeTempCustomerToCustomer({ customerId });
			if (!res.success) {
				toast.error("Upgrade failed", { description: res.error });
				return;
			}
			toast.success("Customer upgraded");
			await load();
			router.refresh();
		} finally {
			setUpgradingId(null);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 flex flex-row flex-wrap items-center justify-between gap-3 text-left">
					<DialogTitle className="text-base sm:text-lg leading-snug pr-2">
						Enquiry Customers <span className="text-muted-foreground text-sm font-normal">({tempCount})</span>
					</DialogTitle>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search customer name/phone..."
					/>
					{loading ? (
						<div className="space-y-3">
							<Progress value={25} className="h-2" />
							<div className="text-sm text-zinc-500">Loading enquiry customers...</div>
						</div>
					) : filteredRows.length === 0 ? (
						<div className="text-sm text-zinc-500">No temporary customers yet.</div>
					) : (
						<div className="rounded-lg border border-border overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Customer</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead>Latest enquiry</TableHead>
										<TableHead className="text-right">Upgrade</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRows.map((c) => (
										<TableRow key={c.id} className="hover:bg-zinc-50">
											<TableCell>
												<div className="min-w-0">
													<div className="font-semibold text-sm truncate">{c.name}</div>
													<div className="text-xs text-zinc-500 font-mono mt-0.5">
														Enquiry ID: {c.enquiry_temp_id ? String(c.enquiry_temp_id).slice(0, 8) : "—"}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<span className="font-mono text-sm">{c.phone}</span>
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-1">
													{c.latest_enquiry_category ? (
														<Badge variant="secondary" className="w-fit">
															{c.latest_enquiry_category}
														</Badge>
													) : (
														<Badge variant="outline" className="w-fit">
															—
														</Badge>
													)}
													<div className="text-xs text-zinc-600 truncate max-w-[320px]">
														{c.latest_enquiry_details ?? "—"}
													</div>
												</div>
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													size="sm"
													onClick={() => onUpgrade(c.id)}
													disabled={upgradingId === c.id}
													variant={upgradingId === c.id ? "secondary" : "default"}
												>
													{upgradingId === c.id ? "Upgrading..." : "Upgrade to Customer"}
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

