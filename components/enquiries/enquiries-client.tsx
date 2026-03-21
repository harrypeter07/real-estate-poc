"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import type { EnquiryRow } from "@/app/actions/enquiries";
import { EnquiryCreateModal } from "@/components/enquiries/enquiry-create-modal";
import { EnquiryTempCustomersModal } from "@/components/enquiries/enquiry-temp-customers-modal";
import { Calendar, Building2, User } from "lucide-react";
import { useRouter } from "next/navigation";

export function EnquiriesClient({
	initialEnquiries,
	projects,
}: {
	initialEnquiries: EnquiryRow[];
	projects: Array<{ id: string; name: string }>;
}) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [tempCustomersOpen, setTempCustomersOpen] = useState(false);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return initialEnquiries;
		return initialEnquiries.filter((e) => {
			const hay = `${e.name} ${e.phone} ${e.category} ${e.project_name ?? ""}`.toLowerCase();
			return hay.includes(q);
		});
	}, [initialEnquiries, query]);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Enquiries"
				subtitle={`${initialEnquiries.length} active enquiries`}
				action={
					<div className="flex gap-2 flex-wrap">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setTempCustomersOpen(true)}
						>
							Enquiry Customers
						</Button>
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							New Enquiry
						</Button>
					</div>
				}
			/>

			<div className="flex flex-wrap gap-3 items-center justify-between">
				<div className="flex-1">
					<Input
						value={query}
						placeholder="Search by name, phone, category..."
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							toast.success("Refreshing...");
							router.refresh();
						}}
					>
						Refresh
					</Button>
				</div>
			</div>

			<Card>
				<CardContent className="p-0 overflow-x-auto">
					<Table>
						<TableHeader>
								<TableRow>
									<TableHead>Customer</TableHead>
									<TableHead>Enquiry</TableHead>
									<TableHead>Project</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center text-zinc-500 py-10">
										No enquiries found.
									</TableCell>
								</TableRow>
							) : (
								filtered.map((enq) => (
									<TableRow key={enq.id} className="hover:bg-zinc-50">
										<TableCell>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<User className="h-4 w-4 text-zinc-400" />
													<div className="font-semibold text-sm truncate">{enq.name}</div>
												</div>
												<div className="text-xs text-zinc-500 font-mono mt-0.5">{enq.phone}</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												<div className="flex items-center gap-2">
													<Badge variant="secondary">{enq.category}</Badge>
												</div>
												<div className="text-xs text-zinc-600 truncate max-w-[260px]">{enq.details ?? "—"}</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Building2 className="h-4 w-4 text-zinc-400" />
												<span className="text-sm text-zinc-700 truncate max-w-[180px]">
													{enq.project_name ?? "—"}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2 text-sm text-zinc-700">
												<Calendar className="h-4 w-4 text-zinc-400" />
												{String(enq.created_at).slice(0, 10)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<EnquiryCreateModal
				open={createOpen}
				onOpenChange={setCreateOpen}
				projects={projects}
			/>

			<EnquiryTempCustomersModal
				open={tempCustomersOpen}
				onOpenChange={setTempCustomersOpen}
			/>
		</div>
	);
}

