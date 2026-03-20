"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Progress,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
} from "@/components/ui";
import { getEnquiryLinkedCustomers, upgradeEnquiryToCustomer, type EnquiryCustomerRow, type EnquiryRow } from "@/app/actions/enquiries";

export function EnquiryUpgradeModal({
	open,
	onOpenChange,
	enquiry,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enquiry: EnquiryRow;
}) {
	const [loading, setLoading] = useState(false);
	const [upgradingId, setUpgradingId] = useState<string | null>(null);
	const [customers, setCustomers] = useState<EnquiryCustomerRow[]>([]);

	const phone = enquiry.phone;

	const upgradedCount = useMemo(
		() => customers.filter((c) => c.is_active && c.upgraded_from_enquiry_id === enquiry.id).length,
		[customers, enquiry.id]
	);

	async function loadCustomers() {
		setLoading(true);
		try {
			const rows = await getEnquiryLinkedCustomers(enquiry.id);
			// Ensure stable order in UI
			setCustomers(rows);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!open) return;
		void loadCustomers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, enquiry.id]);

	async function onUpgrade(customerId: string) {
		setUpgradingId(customerId);
		try {
			const res = await upgradeEnquiryToCustomer({ enquiryId: enquiry.id, customerId });
			if (!res.success) {
				toast.error("Upgrade failed", { description: res.error });
				return;
			}
			toast.success("Customer upgraded");
			await loadCustomers();
		} finally {
			setUpgradingId(null);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl p-0 overflow-hidden">
				<DialogHeader className="p-5 pb-4 border-b border-zinc-100 flex items-center justify-between gap-3">
					<DialogTitle>
						Customers for {enquiry.name} <span className="text-zinc-500 text-sm">({phone})</span>
					</DialogTitle>
					<Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogHeader>

				<div className="p-5 space-y-4">
					{loading ? (
						<div className="space-y-3">
							<Progress value={30} className="h-2" />
							<div className="text-sm text-zinc-500">Loading customers...</div>
						</div>
					) : customers.length === 0 ? (
						<div className="text-sm text-zinc-500">No matching customers found yet.</div>
					) : (
						<div className="rounded-lg border border-zinc-200 overflow-x-auto">
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Customer</TableCell>
										<TableCell>Status</TableCell>
										<TableCell>Upgrade</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{customers.map((c) => {
										const alreadyUpgraded = !!c.upgraded_from_enquiry_id && c.upgraded_from_enquiry_id === enquiry.id;
										const isActive = c.is_active;
										return (
											<TableRow key={c.id} className="hover:bg-zinc-50">
												<TableCell>
													<div className="min-w-0">
														<div className="font-semibold text-sm truncate">{c.name}</div>
														<div className="text-xs text-zinc-500 font-mono">{c.phone}</div>
													</div>
												</TableCell>
												<TableCell>
													{alreadyUpgraded ? (
														<Badge className="bg-green-100 text-green-800 border-green-200">
															Active (upgraded)
														</Badge>
													) : isActive ? (
														<Badge variant="secondary">Active</Badge>
													) : (
														<Badge variant="outline">Temporary</Badge>
													)}
												</TableCell>
												<TableCell>
													<Button
														type="button"
														size="sm"
														variant={alreadyUpgraded ? "outline" : "default"}
														disabled={alreadyUpgraded || upgradingId === c.id}
														onClick={() => onUpgrade(c.id)}
													>
														{alreadyUpgraded ? "Upgraded" : upgradingId === c.id ? "Upgrading..." : "Upgrade to Customer"}
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}

					{!loading && (
						<div className="text-xs text-zinc-500">
							Upgraded by this enquiry: <span className="font-semibold">{upgradedCount}</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

