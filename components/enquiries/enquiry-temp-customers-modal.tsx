"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Badge, Progress, Input } from "@/components/ui";
import { getEnquiryTempCustomersForModal, upgradeTempCustomerToCustomer, type EnquiryTempCustomerForModal } from "@/app/actions/enquiries";
import { useRouter } from "next/navigation";
import { Search, Users, Loader2, UserCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const getInitials = (name: string) => {
	const parts = (name || "").trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return "👤";
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
	return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarGradient = (name: string) => {
	const code = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const gradients = [
		"from-blue-500 to-indigo-500 text-blue-100",
		"from-emerald-500 to-teal-500 text-emerald-100",
		"from-violet-500 to-purple-500 text-violet-100",
		"from-amber-500 to-orange-500 text-amber-100",
		"from-rose-500 to-pink-500 text-rose-100",
		"from-sky-500 to-cyan-500 text-sky-100",
	];
	return gradients[code % gradients.length];
};

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
			toast.success("Customer upgraded successfully!");
			await load();
			router.refresh();
		} finally {
			setUpgradingId(null);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-4xl flex-col gap-0 overflow-hidden p-0 border border-zinc-200/80 shadow-2xl rounded-2xl bg-white backdrop-blur-md">
				{/* Modal Header */}
				<DialogHeader className="shrink-0 border-b border-zinc-150 bg-gradient-to-r from-zinc-50 to-white px-6 py-5 flex flex-row items-center justify-between gap-3 text-left relative">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100/50 flex items-center justify-center text-teal-600 shadow-xs">
							<Users className="h-5 w-5" />
						</div>
						<div>
							<DialogTitle className="text-base font-black text-zinc-800 tracking-tight flex items-center gap-2">
								Enquiry Customers
								<Badge className="bg-teal-600/10 text-teal-700 hover:bg-teal-600/15 border-0 font-extrabold text-[10px] px-2 py-0.5 rounded-full shrink-0">
									{tempCount} Active
								</Badge>
							</DialogTitle>
							<p className="text-[11px] text-zinc-400 font-medium mt-0.5">Manage and promote prospective leads to customers.</p>
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="h-8.5 text-[11px] font-black border-zinc-200 text-zinc-500 hover:text-zinc-700 bg-white rounded-xl shadow-xs transition-all cursor-pointer px-4"
					>
						Close
					</Button>
				</DialogHeader>

				{/* Modal Body */}
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 bg-zinc-50/30 space-y-5">
					{/* Search input container */}
					<div className="relative group">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-450 transition-all duration-300 group-hover:text-zinc-650 group-focus-within:text-teal-605 pointer-events-none" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search customer by name, phone..."
							style={{ paddingLeft: "2.5rem" }}
							className="h-10 w-full bg-white border-zinc-200/80 rounded-xl text-xs transition-all duration-300 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 hover:shadow-sm placeholder:text-zinc-450 font-bold focus-visible:ring-offset-0"
						/>
					</div>

					{loading ? (
						<div className="space-y-4 py-8 text-center max-w-sm mx-auto">
							<div className="flex justify-center">
								<Loader2 className="h-8 w-8 animate-spin text-teal-500" />
							</div>
							<div className="space-y-1">
								<p className="text-xs font-black text-zinc-700 uppercase tracking-wide">Loading Customers</p>
								<p className="text-[10px] text-zinc-400 font-medium">Fetching details from real-time lead sync...</p>
							</div>
							<Progress value={45} className="h-1 bg-zinc-200/80" />
						</div>
					) : filteredRows.length === 0 ? (
						<div className="border border-dashed border-zinc-200/80 rounded-2xl p-12 text-center bg-white flex flex-col items-center justify-center transition-all duration-300 shadow-xs">
							<div className="h-12 w-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
								<Users className="h-5 w-5 text-zinc-400 animate-pulse" />
							</div>
							<p className="text-xs font-black text-zinc-700 uppercase tracking-wider">📭 No enquiry customers found</p>
							<p className="text-[10px] text-zinc-400 mt-1 max-w-[220px] leading-relaxed font-medium">
								New enquiries will appear here once created.
							</p>
						</div>
					) : (
						/* Table container */
						<div className="rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm bg-white">
							<Table>
								<TableHeader className="bg-zinc-50/50 border-b border-zinc-150">
									<TableRow className="hover:bg-transparent">
										<TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 pl-5 h-11">Customer</TableHead>
										<TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 h-11">Phone</TableHead>
										<TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 h-11">Latest Enquiry</TableHead>
										<TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right pr-5 h-11">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRows.map((c) => {
										const initials = getInitials(c.name || "");
										const gradient = getAvatarGradient(c.name || "");
										return (
											<TableRow 
												key={c.id} 
												className="group border-b border-zinc-100 hover:bg-zinc-50/30 relative transition-all duration-300"
											>
												<TableCell className="py-4 pl-5">
													<div className="flex items-center gap-3">
														<div className={cn("h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0 border border-white", gradient)}>
															{initials}
														</div>
														<div className="min-w-0">
															<span className="font-extrabold text-zinc-800 text-xs block group-hover:text-teal-650 transition-colors truncate">
																{c.name}
															</span>
															<span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
																Enquiry ID: {c.enquiry_temp_id ? String(c.enquiry_temp_id).slice(0, 8) : "—"}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="py-4">
													<span className="font-bold text-zinc-700 text-xs font-mono tracking-tight">{c.phone}</span>
												</TableCell>
												<TableCell className="py-4">
													<div className="flex flex-col gap-1 max-w-[280px]">
														{c.latest_enquiry_category ? (
															<Badge variant="secondary" className="w-fit text-[9px] font-extrabold uppercase bg-teal-50 border border-teal-100/50 text-teal-700 px-1.5 py-0 shrink-0">
																{c.latest_enquiry_category}
															</Badge>
														) : (
															<Badge variant="outline" className="w-fit text-[9px] font-bold text-zinc-450 border-zinc-200/50 px-1.5 py-0 shrink-0">
																—
															</Badge>
														)}
														<p className="text-[11px] text-zinc-500 font-medium truncate">
															{c.latest_enquiry_details ?? "—"}
														</p>
													</div>
												</TableCell>
												<TableCell className="py-4 text-right pr-5">
													<Button
														type="button"
														size="sm"
														onClick={() => onUpgrade(c.id)}
														disabled={upgradingId === c.id}
														className={cn(
															"h-8.5 px-3.5 text-[11px] font-black rounded-xl transition-all duration-300 cursor-pointer shadow-xs active:scale-97 shrink-0",
															upgradingId === c.id
																? "bg-zinc-100 text-zinc-400 border border-zinc-200"
																: "bg-teal-600 hover:bg-teal-700 text-white hover:shadow-[0_4px_12px_rgba(13,148,136,0.15)]"
														)}
													>
														{upgradingId === c.id ? (
															<span className="flex items-center gap-1.5">
																<Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
																Upgrading...
															</span>
														) : (
															<span className="flex items-center gap-1.5">
																<UserCheck className="h-3.5 w-3.5" />
																Upgrade to Customer
															</span>
														)}
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
