"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, X, Save, Users, IndianRupee, TrendingUp } from "lucide-react";
import {
	Button,
	Input,
	SearchableCombobox,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import type { AdvisorProjectAssignment } from "@/app/actions/advisor-projects";
import {
	removeAdvisorAssignment,
	upsertAdvisorAssignment,
} from "@/app/actions/advisor-projects";
import { formatCurrencyShort } from "@/lib/utils/formatters";

type Advisor = { id: string; name: string; code: string; phone: string; parent_advisor_id?: string | null };

/** Stored value is advisor selling price ₹/sqft; preview share vs lowest admin plot rate in project. */
function advisorShareMetrics(
	sellingPerSqft: number,
	minAdminPerSqft: number,
) {
	const share = sellingPerSqft - minAdminPerSqft;
	const pctOfSelling =
		sellingPerSqft > 0 ? (Math.max(0, share) / sellingPerSqft) * 100 : 0;
	return { share, pctOfSelling };
}

function SellingPricePreview({
	sellingPerSqft,
	minPlotRatePerSqft,
}: {
	sellingPerSqft: number;
	minPlotRatePerSqft: number;
}) {
	const { share, pctOfSelling } = advisorShareMetrics(
		sellingPerSqft,
		minPlotRatePerSqft,
	);
	const belowMin =
		minPlotRatePerSqft > 0 && sellingPerSqft < minPlotRatePerSqft;

	return (
		<div className="mt-2 space-y-0.5 rounded-md border border-zinc-200 bg-zinc-50/80 px-2.5 py-2 text-[11px] dark:border-zinc-800 dark:bg-zinc-900/50">
			<div className="flex justify-between gap-2">
				<span className="text-zinc-500">Advisor share (vs min plot rate)</span>
				<span
					className={
						belowMin ? "font-semibold text-amber-700 dark:text-amber-500" : "font-semibold text-zinc-900 dark:text-zinc-100"
					}
				>
					{formatCurrencyShort(share)}/sqft
				</span>
			</div>
			<div className="flex justify-between gap-2">
				<span className="text-zinc-500">Commission (of selling price)</span>
				<span className="font-semibold text-zinc-900 dark:text-zinc-100">
					{pctOfSelling.toFixed(1)}%
				</span>
			</div>
			{minPlotRatePerSqft <= 0 ? (
				<p className="text-[10px] text-zinc-500 pt-0.5">
					Set plot rates in this project to preview share against the lowest rate.
				</p>
			) : belowMin ? (
				<p className="text-[10px] text-amber-700 dark:text-amber-500 pt-0.5">
					Below this project&apos;s lowest plot rate — some plots may block the sale until
					raised.
				</p>
			) : null}
		</div>
	);
}

export function ProjectAdvisorAssignments({
	projectId,
	advisors,
	assignments,
	minPlotRatePerSqft,
}: {
	projectId: string;
	advisors: Advisor[];
	assignments: AdvisorProjectAssignment[];
	minPlotRatePerSqft: number;
}) {
	const MAX_RATE = 9_999_999_999.99;
	const [saving, setSaving] = useState(false);
	const [advisorId, setAdvisorId] = useState<string>("");
	const [commissionRate, setCommissionRate] = useState<number>(0);
	const [commissionPct, setCommissionPct] = useState<number | "">(5);
	const [subAdvisorCommissionRate, setSubAdvisorCommissionRate] = useState<number | "">(1);
	const [editAdvisorId, setEditAdvisorId] = useState<string>("");
	const [editCommissionRate, setEditCommissionRate] = useState<number>(0);
	const [editCommissionPct, setEditCommissionPct] = useState<number | "">(5);
	const [editSubAdvisorCommissionRate, setEditSubAdvisorCommissionRate] = useState<number | "">(1);

	const assignedAdvisorIds = useMemo(
		() => new Set(assignments.map((a) => a.advisor_id)),
		[assignments],
	);

	const selectedAdvisorHasSub = useMemo(() => {
		if (!advisorId) return false;
		return advisors.some((a) => a.parent_advisor_id === advisorId);
	}, [advisorId, advisors]);

	const availableAdvisors = useMemo(
		() => advisors.filter((a) => !assignedAdvisorIds.has(a.id)),
		[advisors, assignedAdvisorIds],
	);

	const statsStrip = useMemo(() => {
		const totalAssigned = assignments.length;
		const avgSellingPrice = totalAssigned > 0 
			? assignments.reduce((sum, a) => sum + Number((a as any).commission_rate ?? 0), 0) / totalAssigned 
			: 0;
		const avgCommission = totalAssigned > 0 
			? assignments.reduce((sum, a) => sum + advisorShareMetrics(Number((a as any).commission_rate ?? 0), minPlotRatePerSqft).pctOfSelling, 0) / totalAssigned 
			: 0;

		return (
			<div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 mb-2 dark:border-zinc-800/60 dark:bg-zinc-900/20 shadow-sm">
				{/* Total Advisors */}
				<div className="flex items-center gap-2 px-1">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50/85 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shrink-0 border border-indigo-100/50 dark:border-indigo-900/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
						<Users className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">Assigned</p>
						<p className="text-[11px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
							{totalAssigned} {totalAssigned === 1 ? "Advisor" : "Advisors"}
						</p>
					</div>
				</div>
				{/* Avg Selling Price */}
				<div className="flex items-center gap-2 px-1 border-l border-zinc-100 dark:border-zinc-800/60">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50/85 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0 border border-emerald-100/50 dark:border-emerald-900/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
						<IndianRupee className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">Avg Price</p>
						<p className="text-[11px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
							{formatCurrencyShort(avgSellingPrice)}/sqft
						</p>
					</div>
				</div>
				{/* Avg Commission */}
				<div className="flex items-center gap-2 px-1 border-l border-zinc-100 dark:border-zinc-800/60">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50/85 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0 border border-amber-100/50 dark:border-amber-900/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
						<TrendingUp className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider truncate">Avg Comm.</p>
						<p className="text-[11px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
							{avgCommission.toFixed(1)}%
						</p>
					</div>
				</div>
			</div>
		);
	}, [assignments, minPlotRatePerSqft]);

	async function onAdd() {
		if (!advisorId) {
			toast.error("Select an advisor");
			return;
		}
		if (!Number.isFinite(commissionRate) || commissionRate < 0) {
			toast.error("Invalid selling price", {
				description: `Advisor selling price must be a valid positive number (₹/sqft)`,
			});
			return;
		}
		if (commissionRate > MAX_RATE) {
			toast.error("Rate too large", {
				description: `Max allowed is ₹ ${MAX_RATE.toLocaleString("en-IN")}/sqft`,
			});
			return;
		}
		if (
			minPlotRatePerSqft > 0 &&
			commissionRate + 1e-9 < minPlotRatePerSqft
		) {
			toast.error("Selling price below minimum plot rate", {
				description: `Advisor selling price must be at least ₹ ${minPlotRatePerSqft.toLocaleString(
					"en-IN",
				)}/sqft — the lowest admin rate among plots in this project. Raise the price or lower plot rates first.`,
			});
			return;
		}
		setSaving(true);
		try {
			const res = await upsertAdvisorAssignment(projectId, {
				advisor_id: advisorId,
				commission_rate: commissionRate,
				commission_pct: selectedAdvisorHasSub 
					? (commissionPct === "" ? 0 : commissionPct) 
					: 100,
				sub_advisor_commission_rate: selectedAdvisorHasSub 
					? (subAdvisorCommissionRate === "" ? 0 : subAdvisorCommissionRate) 
					: 0,
			});
			if (!res.success) {
				toast.error("Failed to assign", { description: res.error });
				return;
			}
			toast.success("Advisor assigned to project");
			setAdvisorId("");
			setCommissionRate(0);
			setCommissionPct(5);
			setSubAdvisorCommissionRate(1);
		} finally {
			setSaving(false);
		}
	}

	async function onRemove(aid: string) {
		setSaving(true);
		try {
			const res = await removeAdvisorAssignment(projectId, aid);
			if (!res.success) {
				toast.error("Failed to remove", { description: res.error });
				return;
			}
			toast.success("Advisor removed from project");
		} finally {
			setSaving(false);
		}
	}

	function onStartEdit(a: AdvisorProjectAssignment) {
		const editingAdvisorHasSub = advisors.some((adv) => adv.parent_advisor_id === a.advisor_id);
		setEditAdvisorId(a.advisor_id);
		setEditCommissionRate(Number((a as any).commission_rate ?? 0));
		setEditCommissionPct(editingAdvisorHasSub ? Number(a.commission_token ?? 5) : 100);
		setEditSubAdvisorCommissionRate(editingAdvisorHasSub ? Number(a.sub_advisor_commission_rate ?? 1) : 0);
	}

	function onCancelEdit() {
		setEditAdvisorId("");
		setEditCommissionRate(0);
		setEditCommissionPct(5);
		setEditSubAdvisorCommissionRate(1);
	}

	async function onSaveEdit() {
		if (!editAdvisorId) return;
		if (!Number.isFinite(editCommissionRate) || editCommissionRate < 0) {
			toast.error("Invalid selling price", {
				description: `Advisor selling price must be a valid positive number (₹/sqft)`,
			});
			return;
		}
		if (editCommissionRate > MAX_RATE) {
			toast.error("Rate too large", {
				description: `Max allowed is ₹ ${MAX_RATE.toLocaleString("en-IN")}/sqft`,
			});
			return;
		}
		if (
			minPlotRatePerSqft > 0 &&
			editCommissionRate + 1e-9 < minPlotRatePerSqft
		) {
			toast.error("Selling price below minimum plot rate", {
				description: `Advisor selling price must be at least ₹ ${minPlotRatePerSqft.toLocaleString(
					"en-IN",
				)}/sqft — the lowest admin rate among plots in this project. Raise the price or lower plot rates first.`,
			});
			return;
		}
		setSaving(true);
		const editingAdvisorHasSub = advisors.some((adv) => adv.parent_advisor_id === editAdvisorId);
		try {
			const res = await upsertAdvisorAssignment(projectId, {
				advisor_id: editAdvisorId,
				commission_rate: editCommissionRate,
				commission_pct: editingAdvisorHasSub 
					? (editCommissionPct === "" ? 0 : editCommissionPct) 
					: 100,
				sub_advisor_commission_rate: editingAdvisorHasSub 
					? (editSubAdvisorCommissionRate === "" ? 0 : editSubAdvisorCommissionRate) 
					: 0,
			});
			if (!res.success) {
				toast.error("Failed to update", { description: res.error });
				return;
			}
			toast.success("Rates updated");
			onCancelEdit();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-5">
			{statsStrip}

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
				<div className="lg:col-span-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
						Advisor
					</label>
					<div className="mt-1">
						<SearchableCombobox
							options={availableAdvisors.map((a) => ({
								value: a.id,
								label: a.name,
								subtitle: a.code,
								keywords: `${a.phone} ${a.code}`,
							}))}
							value={advisorId}
							onChange={(val) => {
								setAdvisorId(val);
								const hasSub = advisors.some((a) => a.parent_advisor_id === val);
								setSubAdvisorCommissionRate(hasSub ? 1 : 0);
								setCommissionPct(hasSub ? 5 : 100);
							}}
							placeholder="Search advisor by name, code, phone…"
							emptyMessage="No unassigned advisor matches."
						/>
					</div>
					<p className="text-[11px] text-zinc-500 mt-1">
						Default per-sqft selling price for this advisor on this project (overridable when
						recording a sale).
					</p>
				</div>

				<div className="lg:col-span-1 space-y-0">
					<RateInput
						label="Price (₹/sqft)"
						value={commissionRate}
						onChange={setCommissionRate}
					/>
					{commissionRate > 0 ? (
						<SellingPricePreview
							sellingPerSqft={commissionRate}
							minPlotRatePerSqft={minPlotRatePerSqft}
						/>
					) : null}
				</div>

				{selectedAdvisorHasSub && (
					<>
						<div className="lg:col-span-1">
							<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Advisor Comm. %
							</label>
							<Input
								className="mt-1"
								type="number"
								min={0}
								max={100}
								step={0.1}
								value={commissionPct}
								onChange={(e) => {
									const raw = e.target.value;
									const sanitized = raw.replace(/^0+(?=\d)/, "");
									setCommissionPct(sanitized === "" ? "" : Number(sanitized));
								}}
							/>
						</div>

						<div className="lg:col-span-1">
							<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
								Sub-Advisor Comm. %
							</label>
							<Input
								className="mt-1"
								type="number"
								min={0}
								max={100}
								step={0.1}
								value={subAdvisorCommissionRate}
								onChange={(e) => {
									const raw = e.target.value;
									const sanitized = raw.replace(/^0+(?=\d)/, "");
									setSubAdvisorCommissionRate(sanitized === "" ? "" : Number(sanitized));
								}}
							/>
						</div>
					</>
				)}

				<div className="lg:col-span-5 flex justify-end">
					<Button onClick={onAdd} disabled={saving || !advisorId} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						Assign Advisor
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead>Advisor</TableHead>
						<TableHead className="text-right whitespace-nowrap">
							Selling price (₹/sqft)
						</TableHead>
						<TableHead className="text-right whitespace-nowrap hidden sm:table-cell">
							Advisor share
						</TableHead>
						<TableHead className="text-right whitespace-nowrap">
							Advisor Comm %
						</TableHead>
						<TableHead className="text-right whitespace-nowrap">
							Sub-Advisor Comm %
						</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{assignments.length === 0 ? (
						<TableRow className="hover:bg-transparent">
							<TableCell colSpan={6} className="py-10 text-center">
								<div className="flex flex-col items-center justify-center text-center p-5">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 border border-zinc-100 text-zinc-400 mb-3 shadow-inner dark:bg-zinc-900 dark:border-zinc-800">
										<Users className="h-5 w-5 stroke-[1.5]" />
									</div>
									<h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No advisors assigned yet</h3>
									<p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 dark:text-zinc-400">
										Assign advisors and set their default per-sqft selling prices using the form above to enable advisor-specific sales.
									</p>
									<div className="text-[11px] font-medium text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 rounded-full px-3 py-0.5 dark:text-indigo-400 dark:bg-indigo-950/20 dark:border-indigo-900/30">
										💡 Select an advisor from the dropdown above to get started.
									</div>
								</div>
							</TableCell>
						</TableRow>
					) : (
						assignments.map((a) =>
							editAdvisorId === a.advisor_id ? (
								<TableRow key={a.id} className="bg-indigo-50/30 dark:bg-indigo-950/10 border-l-2 border-l-indigo-500 transition-all duration-200">
									<TableCell className="font-medium align-top py-3">
										{a.advisor?.name ?? a.advisor_id}
										{a.advisor?.code ? (
											<span className="ml-2 text-xs text-zinc-500">
												({a.advisor.code})
											</span>
										) : null}
									</TableCell>
									<TableCell className="text-right align-top py-3">
										<InlineRateInput
											value={editCommissionRate}
											onChange={setEditCommissionRate}
										/>
									</TableCell>
									<TableCell className="text-right align-top hidden sm:table-cell py-3">
										{formatCurrencyShort(
											advisorShareMetrics(editCommissionRate, minPlotRatePerSqft).share,
										)}
										/sqft
									</TableCell>
									<TableCell className="text-right align-top py-3">
										{advisors.some((adv) => adv.parent_advisor_id === editAdvisorId) ? (
											<Input
												className="h-8 w-[70px] ml-auto text-right"
												type="number"
												min={0}
												max={100}
												value={editCommissionPct}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setEditCommissionPct(sanitized === "" ? "" : Number(sanitized));
												}}
											/>
										) : (
											<span className="text-xs text-zinc-400">100.0%</span>
										)}
									</TableCell>
									<TableCell className="text-right align-top py-3">
										{advisors.some((adv) => adv.parent_advisor_id === editAdvisorId) ? (
											<Input
												className="h-8 w-[70px] ml-auto text-right"
												type="number"
												min={0}
												max={100}
												value={editSubAdvisorCommissionRate}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setEditSubAdvisorCommissionRate(sanitized === "" ? "" : Number(sanitized));
												}}
											/>
										) : (
											<span className="text-xs text-zinc-400">—</span>
										)}
									</TableCell>
									<TableCell className="text-right align-top py-3">
										<div className="flex items-center justify-end gap-1.5">
											<Button
												variant="ghost"
												size="icon"
												disabled={saving}
												onClick={onSaveEdit}
												title="Save Changes"
												className="h-8 w-8 rounded-full text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:shadow-[0_0_8px_rgba(16,185,129,0.1)] transition-all duration-200"
											>
												<Save className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												disabled={saving}
												onClick={onCancelEdit}
												title="Cancel Edit"
												className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							) : (
								<TableRow 
									key={a.id}
									className="transition-all duration-200 border-l-2 border-l-transparent hover:border-l-indigo-500 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]"
								>
									<TableCell className="font-medium py-3">
										{a.advisor?.name ?? a.advisor_id}
										{a.advisor?.code ? (
											<span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-normal">
												({a.advisor.code})
											</span>
										) : null}
									</TableCell>
									<TableCell className="text-right py-3 font-semibold text-zinc-800 dark:text-zinc-200">
										{formatCurrencyShort(
											Number((a as any).commission_rate ?? 0),
										)}
									</TableCell>
									<TableCell className="text-right hidden sm:table-cell py-3 text-zinc-600 dark:text-zinc-300">
										{formatCurrencyShort(
											advisorShareMetrics(
												Number((a as any).commission_rate ?? 0),
												minPlotRatePerSqft,
											).share,
										)}
										/sqft
									</TableCell>
									<TableCell className="text-right py-3">
										<span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
											{Number(a.commission_token ?? 5).toFixed(1)}%
										</span>
									</TableCell>
									<TableCell className="text-right py-3">
										{advisors.some((adv) => adv.parent_advisor_id === a.advisor_id) ? (
											<span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
												{Number(a.sub_advisor_commission_rate ?? 1).toFixed(1)}%
											</span>
										) : (
											<span className="text-xs text-zinc-400">—</span>
										)}
									</TableCell>
									<TableCell className="text-right py-3">
										<div className="flex items-center justify-end gap-1.5">
											<Button
												variant="ghost"
												size="icon"
												disabled={saving || !!editAdvisorId}
												onClick={() => onStartEdit(a)}
												title="Edit Rate"
												className="h-8 w-8 rounded-full text-zinc-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:shadow-[0_0_8px_rgba(13,148,136,0.1)] transition-all duration-200"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												disabled={saving || !!editAdvisorId}
												onClick={() => onRemove(a.advisor_id)}
												title="Remove Assignment"
												className="h-8 w-8 rounded-full text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:shadow-[0_0_8px_rgba(239,68,68,0.1)] transition-all duration-200"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							),
						)
					)}
				</TableBody>
			</Table>
			</div>
		</div>
	);
}

function RateInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div>
			<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
				{label}
			</label>
			<Input
				className="mt-1"
				type="number"
				min={0}
				max={9_999_999_999.99}
				step={0.5}
				value={value || ""}
				onChange={(e) => {
					const raw = e.target.value;
					const sanitized = raw.replace(/^0+(?=\d)/, "");
					onChange(sanitized === "" ? 0 : Number(sanitized) || 0);
				}}
			/>
		</div>
	);
}

function InlineRateInput({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<Input
			className="h-8 w-[110px] ml-auto text-right"
			type="number"
			min={0}
			max={9_999_999_999.99}
			step={0.5}
			value={value || ""}
			onChange={(e) => {
				const raw = e.target.value;
				const sanitized = raw.replace(/^0+(?=\d)/, "");
				onChange(sanitized === "" ? 0 : Number(sanitized) || 0);
			}}
		/>
	);
}

