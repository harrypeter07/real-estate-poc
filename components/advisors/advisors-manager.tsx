"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Badge,
} from "@/components/ui";
import { AdvisorForm } from "./advisor-form";
import { cn } from "@/lib/utils";
import { digitsOnly } from "@/lib/utils/phone";

type AdvisorRow = {
	id: string;
	name: string;
	code: string;
	phone: string;
	email?: string | null;
	is_active?: boolean | null;
};

export function AdvisorsManager({ advisors }: { advisors: AdvisorRow[] }) {
	const [query, setQuery] = useState("");
	const [openCreate, setOpenCreate] = useState(false);
	const [openEdit, setOpenEdit] = useState(false);
	const [openView, setOpenView] = useState(false);
	const [selected, setSelected] = useState<AdvisorRow | null>(null);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const qDigits = digitsOnly(query);
		if (!q) return advisors;
		return advisors.filter((a) => {
			const phoneDigits = digitsOnly(a.phone);
			return (
				a.name.toLowerCase().includes(q) ||
				a.code.toLowerCase().includes(q) ||
				a.phone.includes(q) ||
				(qDigits.length > 0 && phoneDigits.includes(qDigits)) ||
				(a.email || "").toLowerCase().includes(q)
			);
		});
	}, [advisors, query]);

	return (
		<Card className="border-zinc-200 shadow-sm">
			<CardContent className="p-3 md:p-4 space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div className="flex items-center gap-2 flex-1">
						<div className="relative flex-1 max-w-md">
							<Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search by name, code, phone, email…"
								className="pl-8 h-8 text-sm"
							/>
						</div>
					</div>
					<Button size="sm" onClick={() => setOpenCreate(true)} className="h-8">
						<Plus className="h-4 w-4 mr-2" />
						New Advisor
					</Button>
				</div>

				<div className="overflow-x-auto rounded-md border border-zinc-100">
				<Table>
					<TableHeader>
						<TableRow className="h-8 hover:bg-transparent">
							<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">Advisor</TableHead>
							<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">Phone</TableHead>
							<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">Email (Login)</TableHead>
							<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2">Status</TableHead>
							<TableHead className="text-[11px] uppercase tracking-wide text-zinc-500 py-1.5 px-2 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-xs text-zinc-500 py-8 text-center">
									No advisors found.
								</TableCell>
							</TableRow>
						) : (
							filtered.map((a) => (
								<TableRow
									key={a.id}
									className="cursor-pointer h-9"
									onClick={() => {
										setSelected(a);
										setOpenView(true);
									}}
								>
									<TableCell className="py-1.5 px-2">
										<div className="flex flex-col gap-0">
											<span className="font-medium text-xs leading-tight">{a.name}</span>
											<span className="text-[11px] text-zinc-500 font-mono leading-tight">
												{a.code}
											</span>
										</div>
									</TableCell>
									<TableCell className="py-1.5 px-2 text-xs font-mono tabular-nums">{a.phone}</TableCell>
									<TableCell className="py-1.5 px-2 text-xs text-zinc-600 max-w-[180px] truncate">
										{a.email || (
											<span className="text-[11px] text-zinc-400 italic">
												(auto)
											</span>
										)}
									</TableCell>
									<TableCell className="py-1.5 px-2">
										<Badge
											variant="outline"
											className={cn(
												"border text-[10px] px-1.5 py-0 h-5",
												a.is_active
													? "bg-green-50 text-green-700 border-green-200"
													: "bg-zinc-50 text-zinc-500 border-zinc-200"
											)}
										>
											{a.is_active ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell
										className="text-right py-1.5 px-2"
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex justify-end gap-1">
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => {
													setSelected(a);
													setOpenView(true);
												}}
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-7 w-7 p-0"
												onClick={() => {
													setSelected(a);
													setOpenEdit(true);
												}}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				</div>
			</CardContent>

			{/* View Modal */}
			<Dialog open={openView} onOpenChange={setOpenView}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenView(false)} className="w-fit shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
						{selected && (
							<>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-lg font-bold">{selected.name}</p>
										<p className="text-xs text-zinc-500 font-mono">
											{selected.code}
										</p>
									</div>
									<Badge
										variant="outline"
										className={cn(
											"border",
											selected.is_active
												? "bg-green-50 text-green-700 border-green-200"
												: "bg-zinc-50 text-zinc-500 border-zinc-200"
										)}
									>
										{selected.is_active ? "Active" : "Inactive"}
									</Badge>
								</div>
								<div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 text-sm">
									<p>
										<span className="text-zinc-500">Phone:</span>{" "}
										<span className="font-medium">{selected.phone}</span>
									</p>
									<p className="mt-1">
										<span className="text-zinc-500">Login:</span>{" "}
										<span className="font-medium">
											{selected.email || "(auto-generated)"}
										</span>
									</p>
									<p className="mt-1">
										<span className="text-zinc-500">Default password:</span>{" "}
										<span className="font-medium">Phone number</span>
									</p>
								</div>
								<div className="flex gap-2 pt-2">
									<Button
										variant="outline"
										className="flex-1"
										onClick={() => {
											setOpenView(false);
											setOpenEdit(true);
										}}
									>
										<Pencil className="h-4 w-4 mr-2" />
										Edit
									</Button>
								</div>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Create Modal */}
			<Dialog open={openCreate} onOpenChange={setOpenCreate}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>New Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenCreate(false)} className="w-fit shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
						<AdvisorForm
							mode="create"
							redirectToList={false}
							onSuccess={() => setOpenCreate(false)}
							onCancel={() => setOpenCreate(false)}
						/>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Modal */}
			<Dialog open={openEdit} onOpenChange={setOpenEdit}>
				<DialogContent className="flex max-h-[min(90dvh,calc(100vh-1.5rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0">
					<DialogHeader className="shrink-0 border-b border-border bg-card p-4 sm:p-5 pb-3 sm:pb-4 text-left">
						<DialogTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-base sm:text-lg">
							<span>Edit Advisor</span>
							<Button type="button" size="sm" variant="outline" onClick={() => setOpenEdit(false)} className="w-fit shrink-0">
								Close
							</Button>
						</DialogTitle>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
						{selected && (
							<AdvisorForm
								mode="edit"
								initialData={selected}
								redirectToList={false}
								onSuccess={() => setOpenEdit(false)}
								onCancel={() => setOpenEdit(false)}
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

