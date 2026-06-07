"use client";

import { useMemo, useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { 
	Search, 
	Pencil, 
	X, 
	Tag, 
	Trash2, 
	Clock, 
	Check, 
	Undo, 
	Coins,
	Compass,
	Ruler,
	IndianRupee,
	Wallet,
	User,
	Award,
	Activity,
	AlertCircle,
	Home
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import {
	createPlot,
	updatePlot,
	deletePlot,
	revokePlotSale,
	markPlotTemporarySold,
	markPlotAvailable,
	bulkUpdatePlots,
} from "@/app/actions/plots";
import { SaleBookingDialog } from "@/components/sales/sale-booking-dialog";

interface PlotForGrid {
	id: string;
	plot_number: string;
	size_sqft: number;
	rate_per_sqft: number;
	status: "available" | "token" | "agreement" | "sold" | "sold_without_data" | string;
	facing: string | null;
	type?: "plot" | "flat" | "villa" | "farmhouse" | "commercial" | "other" | string | null;
	notes?: string | null;
	sale?: {
		id: string;
		customer_name: string;
		advisor_name: string;
		total_sale_amount: number;
		amount_paid: number;
		remaining_amount: number;
		sale_phase: string;
		token_date: string | null;
		agreement_date: string | null;
		monthly_emi: number | null;
	} | null;
}

interface PlotLayoutGridProps {
	plots: PlotForGrid[];
	projectName?: string;
	projectId: string;
	initialPlotId?: string | null;
	/** Hide plot CRUD, sales, bulk edit (e.g. advisor read-only project view). */
	readOnly?: boolean;
	projectType?: string | null;
}

type StatusKey = "available" | "token" | "sold" | "sold_without_data";

const STATUS_CONFIG: Record<
	StatusKey,
	{
		label: string;
		className: string;
		badgeClassName: string;
		accentColor: string;
		iconColor: string;
		glowClassName: string;
	}
> = {
	available: {
		label: "Available",
		className:
			"bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-300 hover:from-emerald-100 hover:to-emerald-200/60 text-emerald-900 hover:border-emerald-400",
		badgeClassName: "bg-emerald-300",
		accentColor: "bg-emerald-500",
		iconColor: "text-emerald-600/40 group-hover:text-emerald-600/60",
		glowClassName: "shadow-[0_0_12px_rgba(16,185,129,0.08)] hover:shadow-[0_0_16px_rgba(16,185,129,0.18)]",
	},
	token: {
		label: "Token",
		className:
			"bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-300 hover:from-amber-100 hover:to-amber-200/60 text-amber-900 hover:border-amber-400",
		badgeClassName: "bg-amber-300",
		accentColor: "bg-amber-500",
		iconColor: "text-amber-600/40 group-hover:text-amber-600/60",
		glowClassName: "shadow-[0_0_12px_rgba(245,158,11,0.08)] hover:shadow-[0_0_16px_rgba(245,158,11,0.18)]",
	},
	sold: {
		label: "Sold",
		className:
			"bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-300 hover:from-rose-100 hover:to-rose-200/60 text-rose-900 hover:border-rose-400",
		badgeClassName: "bg-rose-300",
		accentColor: "bg-rose-500",
		iconColor: "text-rose-600/40 group-hover:text-rose-600/60",
		glowClassName: "shadow-[0_0_12px_rgba(244,63,94,0.08)] hover:shadow-[0_0_16px_rgba(244,63,94,0.18)]",
	},
	sold_without_data: {
		label: "Temp Sold",
		className:
			"bg-gradient-to-br from-violet-50 to-violet-100/60 border-violet-300 hover:from-violet-100 hover:to-violet-200/60 text-violet-900 hover:border-violet-400",
		badgeClassName: "bg-violet-300",
		accentColor: "bg-violet-500",
		iconColor: "text-violet-600/40 group-hover:text-violet-600/60",
		glowClassName: "shadow-[0_0_12px_rgba(139,92,246,0.08)] hover:shadow-[0_0_16px_rgba(139,92,246,0.18)]",
	},
};

const getThemeClasses = (status: string) => {
	switch (status) {
		case "token":
			return {
				fillLight: "fill-amber-500/20",
				strokeMedium: "stroke-amber-500/35",
				strokeAnnex: "stroke-amber-400/20",
				fillAnnex: "fill-amber-400/5",
				fillWindow: "fill-amber-400/20",
				strokeWindow: "stroke-amber-400/80",
				strokeDivider: "stroke-amber-400/80",
				fillSolid: "fill-amber-500",
				strokeSolid: "stroke-amber-500",
				strokeDeep: "stroke-amber-600",
				strokeLight: "stroke-amber-300",
				fillWindowDeep: "fill-amber-500/40",
				fillWing: "fill-amber-500/30",
			};
		case "sold":
			return {
				fillLight: "fill-rose-500/20",
				strokeMedium: "stroke-rose-500/35",
				strokeAnnex: "stroke-rose-400/20",
				fillAnnex: "fill-rose-400/5",
				fillWindow: "fill-rose-400/20",
				strokeWindow: "stroke-rose-400/80",
				strokeDivider: "stroke-rose-400/80",
				fillSolid: "fill-rose-500",
				strokeSolid: "stroke-rose-500",
				strokeDeep: "stroke-rose-600",
				strokeLight: "stroke-rose-300",
				fillWindowDeep: "fill-rose-500/40",
				fillWing: "fill-rose-500/30",
			};
		case "sold_without_data":
			return {
				fillLight: "fill-violet-500/20",
				strokeMedium: "stroke-violet-500/35",
				strokeAnnex: "stroke-violet-400/20",
				fillAnnex: "fill-violet-400/5",
				fillWindow: "fill-violet-400/20",
				strokeWindow: "stroke-violet-400/80",
				strokeDivider: "stroke-violet-400/80",
				fillSolid: "fill-violet-500",
				strokeSolid: "stroke-violet-500",
				strokeDeep: "stroke-violet-600",
				strokeLight: "stroke-violet-300",
				fillWindowDeep: "fill-violet-500/40",
				fillWing: "fill-violet-500/30",
			};
		case "available":
		default:
			return {
				fillLight: "fill-emerald-500/20",
				strokeMedium: "stroke-emerald-500/35",
				strokeAnnex: "stroke-emerald-400/20",
				fillAnnex: "fill-emerald-400/5",
				fillWindow: "fill-emerald-400/20",
				strokeWindow: "stroke-emerald-400/80",
				strokeDivider: "stroke-emerald-400/80",
				fillSolid: "fill-emerald-500",
				strokeSolid: "stroke-emerald-500",
				strokeDeep: "stroke-emerald-600",
				strokeLight: "stroke-emerald-300",
				fillWindowDeep: "fill-emerald-500/40",
				fillWing: "fill-emerald-500/30",
			};
	}
};

const VillaVisual = ({ status }: { status: string }) => {
	const t = getThemeClasses(status);

	return (
		<svg className="w-full h-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Ground level */}
			<rect x="4" y="38" width="40" height="4" rx="2" className={t.fillLight} />
			{/* Main House Wall */}
			<path d="M10 24V40H38V24L24 12L10 24Z" className={`${t.fillLight} ${t.strokeMedium}`} strokeWidth="1.5" />
			{/* Slanted Roof Accent */}
			<path d="M6 25L24 10L42 25" className={t.strokeSolid} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M24 10L36 20" className={t.strokeLight} strokeWidth="1" strokeLinecap="round" />
			{/* Chimney */}
			<path d="M32 12V6H36V15" className={`${t.strokeSolid} ${t.fillWindowDeep}`} strokeWidth="1.5" />
			{/* Modern Door */}
			<rect x="21" y="30" width="6" height="10" rx="1" className={t.fillSolid} />
			{/* Window Left */}
			<rect x="15" y="20" width="6" height="6" rx="1" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="1" />
			<line x1="18" y1="20" x2="18" y2="26" className={t.strokeDivider} strokeWidth="0.75" />
			<line x1="15" y1="23" x2="21" y2="23" className={t.strokeDivider} strokeWidth="0.75" />
			{/* Window Right */}
			<rect x="27" y="20" width="6" height="6" rx="1" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="1" />
			<line x1="30" y1="20" x2="30" y2="26" className={t.strokeDivider} strokeWidth="0.75" />
			<line x1="27" y1="23" x2="33" y2="23" className={t.strokeDivider} strokeWidth="0.75" />
		</svg>
	);
};

const ApartmentVisual = ({ status }: { status: string }) => {
	const t = getThemeClasses(status);

	return (
		<svg className="w-full h-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Ground */}
			<rect x="6" y="40" width="36" height="3" rx="1.5" className={t.fillLight} />
			{/* Main Tower Structure */}
			<rect x="14" y="8" width="20" height="32" rx="2" className={`${t.fillLight} ${t.strokeMedium}`} strokeWidth="1.5" />
			{/* Left Side Annex */}
			<rect x="8" y="18" width="6" height="22" rx="1" className={`${t.fillAnnex} ${t.strokeAnnex}`} strokeWidth="1" />
			{/* Balcony Railings & Windows */}
			{/* Floor 4 */}
			<rect x="17" y="11" width="4" height="4" rx="0.5" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="0.75" />
			<rect x="27" y="11" width="4" height="4" rx="0.5" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="0.75" />
			{/* Floor 3 */}
			<rect x="17" y="18" width="4" height="4" rx="0.5" className={t.fillWindowDeep} />
			<rect x="27" y="18" width="4" height="4" rx="0.5" className={t.fillWindowDeep} />
			<line x1="16" y1="22" x2="22" y2="22" className={t.strokeSolid} strokeWidth="1" />
			<line x1="26" y1="22" x2="32" y2="22" className={t.strokeSolid} strokeWidth="1" />
			{/* Floor 2 */}
			<rect x="17" y="25" width="4" height="4" rx="0.5" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="0.75" />
			<rect x="27" y="25" width="4" height="4" rx="0.5" className={`${t.fillWindow} ${t.strokeWindow}`} strokeWidth="0.75" />
			{/* Floor 1 / Lobby Entrance */}
			<rect x="21" y="32" width="6" height="8" rx="1" className={t.fillSolid} />
			{/* Entrance Canopy */}
			<path d="M19 32H29" className={t.strokeDeep} strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
};

const SkylineVisual = ({ status }: { status: string }) => {
	const t = getThemeClasses(status);

	return (
		<svg className="w-full h-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Ground */}
			<rect x="4" y="40" width="40" height="3" rx="1.5" className={t.fillLight} />
			{/* Left Building (Small residential block) */}
			<rect x="8" y="24" width="8" height="16" rx="1" className={`${t.fillAnnex} ${t.strokeAnnex}`} strokeWidth="1" />
			<rect x="11" y="28" width="2" height="3" rx="0.5" className={t.fillWing} />
			
			{/* Center Building (Taller, slanted roof modern commercial block) */}
			<path d="M18 16L24 10L30 16V40H18V16Z" className={`${t.fillLight} ${t.strokeMedium}`} strokeWidth="1.5" />
			<line x1="24" y1="11" x2="24" y2="40" className={t.strokeSolid} strokeWidth="1" />
			<rect x="20" y="20" width="2" height="4" rx="0.5" className={t.fillWindowDeep} />
			<rect x="26" y="20" width="2" height="4" rx="0.5" className={t.fillWindowDeep} />
			<rect x="20" y="28" width="2" height="4" rx="0.5" className={t.fillWindowDeep} />
			<rect x="26" y="28" width="2" height="4" rx="0.5" className={t.fillWindowDeep} />

			{/* Right Building (Medium commercial tower) */}
			<rect x="32" y="20" width="8" height="20" rx="1" className={`${t.fillAnnex} ${t.strokeAnnex}`} strokeWidth="1" />
			<line x1="32" y1="26" x2="40" y2="26" className={t.strokeAnnex} strokeWidth="1" />
			<line x1="32" y1="32" x2="40" y2="32" className={t.strokeAnnex} strokeWidth="1" />
		</svg>
	);
};

const LuxuryComplexVisual = ({ status }: { status: string }) => {
	const t = getThemeClasses(status);

	return (
		<svg className="w-full h-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Ground base */}
			<rect x="4" y="42" width="40" height="2" rx="1" className={t.fillLight} />
			
			{/* Central Mega Tower with Curved Crown Roof */}
			<path d="M16 12C16 8 20 4 24 4C28 4 32 8 32 12V42H16V12Z" className={`${t.fillLight} ${t.strokeMedium}`} strokeWidth="1.5" />
			
			{/* Left Wing Tower */}
			<path d="M8 20V42H16V20H8Z" className={`${t.fillAnnex} ${t.strokeAnnex}`} strokeWidth="1" />
			<rect x="11" y="24" width="2" height="4" rx="0.5" className={t.fillWing} />
			<rect x="11" y="32" width="2" height="4" rx="0.5" className={t.fillWing} />

			{/* Right Wing Tower */}
			<path d="M32 20H40V42H32V20Z" className={`${t.fillAnnex} ${t.strokeAnnex}`} strokeWidth="1" />
			<rect x="35" y="24" width="2" height="4" rx="0.5" className={t.fillWing} />
			<rect x="35" y="32" width="2" height="4" rx="0.5" className={t.fillWing} />

			{/* Center Glass Curtain Wall lines */}
			<line x1="21" y1="12" x2="21" y2="42" className={t.strokeSolid} strokeWidth="1.2" />
			<line x1="27" y1="12" x2="27" y2="42" className={t.strokeSolid} strokeWidth="1.2" />
			
			{/* Horizontal Connecting Spans */}
			<path d="M16 16H32" className={t.strokeDivider} strokeWidth="1" />
			<path d="M16 24H32" className={t.strokeDivider} strokeWidth="1" />
			<path d="M16 32H32" className={t.strokeDivider} strokeWidth="1" />

			{/* Modern Tall Lobby Doorway */}
			<rect x="22" y="36" width="4" height="6" rx="0.5" className={t.fillSolid} />
		</svg>
	);
};

const PropertyVisual = ({ type, sizeSqft, statusKey }: { type?: string | null; sizeSqft: number; statusKey: string }) => {
	const normalizedType = String(type ?? "").trim().toLowerCase();
	switch (normalizedType) {
		case "flat":
			return <ApartmentVisual status={statusKey} />;
		case "commercial":
			return <SkylineVisual status={statusKey} />;
		case "villa":
			return <VillaVisual status={statusKey} />;
		case "farmhouse":
			return <LuxuryComplexVisual status={statusKey} />;
		case "plot":
			return <VillaVisual status={statusKey} />;
		case "other":
			return <LuxuryComplexVisual status={statusKey} />;
		default:
			// Fallback to size-based visual if type is not set or not matching
			if (sizeSqft < 3000) {
				return <VillaVisual status={statusKey} />;
			}
			if (sizeSqft >= 3000 && sizeSqft <= 5000) {
				return <ApartmentVisual status={statusKey} />;
			}
			if (sizeSqft > 5000 && sizeSqft <= 10000) {
				return <SkylineVisual status={statusKey} />;
			}
			return <LuxuryComplexVisual status={statusKey} />;
	}
};

function normalizePlotStatus(status: unknown): string {
	return String(status ?? "available").trim().toLowerCase() || "available";
}

function isUuid(id: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		id,
	);
}

export function PlotLayoutGrid({
	plots,
	projectName,
	projectId,
	initialPlotId,
	readOnly = false,
	projectType,
}: PlotLayoutGridProps) {
	const getUnitLabels = (type?: string | null) => {
		const t = (type || "Plot").toLowerCase().trim();
		if (t === "flat") return { singular: "Flat", plural: "Flats" };
		if (t === "row house" || t === "row_house") return { singular: "Row House", plural: "Row Houses" };
		if (t === "farm house" || t === "farmhouse" || t === "farm_house") return { singular: "Farm House", plural: "Farm Houses" };
		if (t === "commercial") return { singular: "Commercial Unit", plural: "Commercial Units" };
		if (t === "mixed") return { singular: "Mixed Property", plural: "Mixed Properties" };
		return { singular: "Plot", plural: "Plots" };
	};

	const { singular, plural } = getUnitLabels(projectType);

	const [selectedPlotId, setSelectedPlotId] = useState<string | null>(initialPlotId ?? null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [sellOpen, setSellOpen] = useState(false);
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const [multiSelectedPlotIds, setMultiSelectedPlotIds] = useState<string[]>([]);
	const [bulkSaving, setBulkSaving] = useState(false);
	const [plotNumberSearch, setPlotNumberSearch] = useState("");

	const [bulkFormState, setBulkFormState] = useState<{
		size_sqft: number | undefined;
		rate_per_sqft: number | undefined;
		facing: string;
		type: string;
		notes: string;
	}>({
		size_sqft: undefined,
		rate_per_sqft: undefined,
		facing: "",
		type: "unchanged",
		notes: "",
	});
	const router = useRouter();

	useEffect(() => {
		if (readOnly && multiSelectMode) {
			setMultiSelectMode(false);
			setMultiSelectedPlotIds([]);
		}
	}, [readOnly, multiSelectMode]);

	useEffect(() => {
		if (initialPlotId && plots.some((p) => p.id === initialPlotId)) {
			setSelectedPlotId(initialPlotId);
		}
	}, [initialPlotId, plots]);

	const sortedPlots = useMemo(
		() => {
			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: "base",
			});
			return [...plots].sort((a, b) =>
				collator.compare(String(a.plot_number), String(b.plot_number)),
			);
		},
		[plots],
	);

	const filteredPlotsForGrid = useMemo(() => {
		const q = plotNumberSearch.trim().toLowerCase();
		if (!q) return sortedPlots;
		return sortedPlots.filter((p) => {
			const numMatch = String(p.plot_number).toLowerCase().includes(q);
			const sqftMatch = String(p.size_sqft).toLowerCase().includes(q);
			const rawStatus = normalizePlotStatus(p.status);
			
			// Map internal status string to user friendly labels for matching
			let statusLabel = "";
			if (rawStatus === "token") statusLabel = "token";
			else if (rawStatus === "sold_without_data") statusLabel = "sold no data temp sold";
			else if (rawStatus === "sold" || rawStatus === "agreement") statusLabel = "sold";
			else statusLabel = "available";
			
			const statusMatch = statusLabel.includes(q);
			
			return numMatch || sqftMatch || statusMatch;
		});
	}, [sortedPlots, plotNumberSearch]);

	const selectedPlot =
		sortedPlots.find((plot) => plot.id === selectedPlotId) ??
		sortedPlots[0] ??
		null;

	const isPlaceholder = selectedPlot?.id?.startsWith?.("planned-") ?? false;
	const selectedStatus = normalizePlotStatus(selectedPlot?.status);
	const canEdit =
		selectedPlot &&
		!isPlaceholder &&
		(selectedStatus === "available" || selectedStatus === "sold_without_data");
	const [creatingPlanned, setCreatingPlanned] = useState(false);

	const [formState, setFormState] = useState<{
		size_sqft: number | undefined;
		rate_per_sqft: number | undefined;
		facing: string;
		type: string;
		notes: string;
	}>({
		size_sqft:
			selectedPlot && selectedPlot.size_sqft > 0 ? selectedPlot.size_sqft : undefined,
		rate_per_sqft:
			selectedPlot && selectedPlot.rate_per_sqft > 0
				? selectedPlot.rate_per_sqft
				: undefined,
		facing: selectedPlot?.facing ?? "",
		type: selectedPlot?.type || "plot",
		notes: "",
	});

	// keep form in sync when selection changes
	useMemo(() => {
		if (!selectedPlot) return;
		setEditing(false);
		setFormState({
			size_sqft: selectedPlot.size_sqft > 0 ? selectedPlot.size_sqft : undefined,
			rate_per_sqft: selectedPlot.rate_per_sqft > 0 ? selectedPlot.rate_per_sqft : undefined,
			facing: selectedPlot.facing ?? "",
			type: selectedPlot.type || "plot",
			notes: selectedPlot.notes ?? "",
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPlotId]);

	useEffect(() => {
		if (!multiSelectMode) return;
		if (multiSelectedPlotIds.length === 0) return;

		const firstId = multiSelectedPlotIds[0];
		const first = sortedPlots.find((p) => p.id === firstId);
		if (!first) return;

		setBulkFormState({
			size_sqft: first.size_sqft > 0 ? first.size_sqft : undefined,
			rate_per_sqft: first.rate_per_sqft > 0 ? first.rate_per_sqft : undefined,
			facing: first.facing ?? "",
			type: "unchanged",
			notes: first.notes ?? "",
		});
	}, [multiSelectMode, multiSelectedPlotIds, sortedPlots]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
						{singular} Layout
					</p>
					<p className="text-sm text-zinc-600">
						{projectName
							? `Interactive layout for ${projectName}`
							: `Tap on a ${singular.toLowerCase()} to view details`}
					</p>
				</div>

				<div className="flex flex-wrap gap-3 items-center text-[11px] text-zinc-600">
					<LegendPill colorClass="bg-emerald-300" label="Available" />
					<LegendPill colorClass="bg-amber-300" label="Token" />
					<LegendPill colorClass="bg-violet-300" label="Sold (No Data)" />
					<LegendPill colorClass="bg-rose-300" label="Sold" />
					{!readOnly ? (
						<Button
							type="button"
							size="sm"
							variant={multiSelectMode ? "default" : "outline"}
							className="h-8 text-[11px]"
							onClick={() => {
								if (multiSelectMode) {
									setMultiSelectMode(false);
									setMultiSelectedPlotIds([]);
									setEditing(false);
									return;
								}
								setMultiSelectMode(true);
								setMultiSelectedPlotIds([]);
								setEditing(false);
							}}
						>
							{multiSelectMode ? "Cancel Multi Select" : "Multiple Select"}
						</Button>
					) : null}
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-4">
				<div className="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 shadow-inner">
					<div className="relative mb-2 shrink-0">
						<label htmlFor="plot-layout-search" className="sr-only">
							Search by {singular.toLowerCase()} number
						</label>
						<Search
							className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
							aria-hidden
						/>
						<Input
							id="plot-layout-search"
							type="search"
							autoComplete="off"
							enterKeyHint="search"
							placeholder={`Search ${singular.toLowerCase()} no, sqft or status...`}
							value={plotNumberSearch}
							onChange={(e) => setPlotNumberSearch(e.target.value)}
							className="h-8 pl-10 sm:pl-10 text-sm"
						/>
					</div>
					{plotNumberSearch.trim() ? (
						<p className="text-[10px] text-zinc-500 mb-1.5 shrink-0">
							{filteredPlotsForGrid.length} of {sortedPlots.length} {plural.toLowerCase()}
						</p>
					) : null}
					<div
						className="grid min-h-0 max-h-[min(220px,32vh)] gap-2 overflow-y-auto overscroll-contain pt-3 pb-10 px-1.5 pr-2 sm:max-h-[min(360px,48vh)] lg:max-h-[70vh]"
						style={{
							gridTemplateColumns: `repeat(auto-fill, minmax(78px, 1fr))`,
						}}
					>
						{filteredPlotsForGrid.length === 0 ? (
							<div className="col-span-full py-6 text-center text-xs text-zinc-500">
								No {plural.toLowerCase()} match &quot;{plotNumberSearch.trim()}&quot;. Clear the search to see
								all {plural.toLowerCase()}.
							</div>
						) : null}
						{filteredPlotsForGrid.map((plot) => {
							const plotId = String(plot.id ?? "");
							const rawStatus = normalizePlotStatus(plot.status);
							const planned = plotId.startsWith("planned-");
							const statusKey: StatusKey =
								rawStatus === "token"
									? "token"
									: rawStatus === "sold_without_data"
										? "sold_without_data"
									: rawStatus === "sold" || rawStatus === "agreement"
										? "sold"
										: "available";
							const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.available;

							const size = Number(plot.size_sqft || 0);

							return (
								<button
									key={plotId}
									type="button"
									onClick={() => {
										if (multiSelectMode) {
											if (planned) {
												toast.error(`This ${singular.toLowerCase()} is not created yet (planned). Create it first.`);
												return;
											}
											if (rawStatus !== "available") {
												toast.error(`Only available ${plural.toLowerCase()} can be edited`);
												return;
											}
											setMultiSelectedPlotIds((prev) =>
												prev.includes(plotId)
													? prev.filter((x) => x !== plotId)
													: [...prev, plotId]
											);
											setSelectedPlotId(plotId);
											return;
										}
										setSelectedPlotId(plotId);
									}}
									title={
										statusKey === "sold"
											? "payment completed sold"
											: statusKey === "sold_without_data"
												? "temporary sold without buyer data"
											: statusKey === "token"
												? "token / booking"
												: "available"
									}
									className={[
										"relative h-[100px] rounded-xl border text-xs font-semibold w-full",
										"flex flex-col items-center justify-between p-2 transition-all duration-200 ease-in-out group overflow-hidden",
										"focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2",
										cfg.className,
										cfg.glowClassName,
										planned ? "opacity-75" : "",
										(multiSelectMode
											? multiSelectedPlotIds.includes(plotId)
											: selectedPlotId === plotId)
											? "ring-2 ring-sky-500 ring-offset-1 scale-[0.97] shadow-md z-25"
											: "hover:-translate-y-0.5 hover:scale-[1.03] z-10 hover:z-30",
									].join(" ")}
								>
									{/* Top Header Row (Number Plate & Glow Dot) */}
									<div className="w-full flex items-center justify-between pointer-events-none z-10">
										<span className="px-1.5 py-0.5 rounded-md bg-white/95 text-zinc-900 border border-zinc-200/80 font-extrabold text-[9px] sm:text-[10px] shadow-sm tracking-tight leading-none">
											#{plot.plot_number}
										</span>
										<span className={`h-1.5 w-1.5 rounded-full ${cfg.accentColor} ${statusKey === 'available' || statusKey === 'token' ? 'animate-pulse' : ''} shadow`} />
									</div>

									{/* Colorful Property Icon Backdrop & Wrapper */}
									<div className="flex-1 flex items-center justify-center pointer-events-none z-10 w-full pt-1.5 pb-1">
										<div className="h-10 w-10 sm:h-11 sm:w-11 transition-all duration-300 group-hover:scale-90 group-hover:opacity-40 flex items-center justify-center">
											<PropertyVisual type={plot.type} sizeSqft={size} statusKey={statusKey} />
										</div>
									</div>

									{/* Bottom Sqft Label */}
									<div className="w-full text-center pointer-events-none z-10 pb-0.5">
										<span className="text-[8px] sm:text-[9.5px] font-extrabold text-zinc-800/90 tracking-wide leading-none">
											{Number(plot.size_sqft || 0).toLocaleString("en-IN")}
											<span className="text-[6.5px] font-semibold text-zinc-500/80 ml-0.5">sqft</span>
										</span>
									</div>

									{/* Premium Smooth Hover Reveal Overlay */}
									<div className="absolute inset-0 bg-zinc-950/95 text-white flex flex-col items-center justify-center p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out scale-95 group-hover:scale-100 backdrop-blur-sm z-20">
										<span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-400 capitalize">{plot.type || "plot"}</span>
										<span className="text-[14px] sm:text-[16px] font-black text-white leading-none mb-1">#{plot.plot_number}</span>
										<span className="text-[9px] sm:text-[10px] font-bold text-zinc-200 tracking-wide leading-none mb-2">
											{Number(plot.size_sqft || 0).toLocaleString("en-IN")} sqft
										</span>
										<span className={`px-1.5 py-0.5 rounded-[4px] text-[7.5px] font-extrabold uppercase tracking-wider ${
											statusKey === 'available' ? 'bg-emerald-500 text-white' :
											statusKey === 'token' ? 'bg-amber-500 text-black' :
											statusKey === 'sold_without_data' ? 'bg-violet-500 text-white' :
											'bg-rose-500 text-white'
										} shadow-sm leading-none`}>
											{planned ? "Planned" : cfg.label}
										</span>
									</div>
								</button>
							);
						})}
					</div>
					{sortedPlots.length > 0 && filteredPlotsForGrid.length > 0 && (
						<div className="mt-2 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-400">
							9m Wide Road
						</div>
					)}
				</div>

				<div className="w-full lg:w-96 shrink-0 rounded-xl border border-teal-500/30 dark:border-teal-500/20 bg-white dark:bg-zinc-950 p-3 sm:p-4 shadow-[0_0_15px_rgba(20,184,166,0.06)] dark:shadow-[0_0_20px_rgba(20,184,166,0.03)] transition-all duration-300">
					{selectedPlot ? (
						<>
							<div className="flex items-center justify-between gap-3 mb-4 border-b border-zinc-100 dark:border-zinc-900 pb-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-0.5">
										{singular} Details
									</p>
									<h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
										{singular} #{selectedPlot.plot_number}
									</h3>
								</div>
								{!multiSelectMode && getPlotStatusBadge(selectedStatus)}
							</div>

							{multiSelectMode && !readOnly ? (
								<div className="space-y-3 mb-3">
									<div className="flex items-center justify-between gap-3">
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
											Bulk Edit {plural}
										</p>
										<p className="text-xs font-semibold text-zinc-700">
											{multiSelectedPlotIds.length} selected
										</p>
									</div>

									{multiSelectedPlotIds.length === 0 ? (
										<p className="text-xs text-zinc-500">
											Select {singular.toLowerCase()} cells on the left to edit.
										</p>
									) : (
										<>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
														Size (sqft)
													</p>
													<Input
														type="number"
														step="any"
														value={bulkFormState.size_sqft ?? ""}
														onChange={(e) => {
															const raw = e.target.value;
															const sanitized = raw.replace(/^0+(?=\d)/, "");
															setBulkFormState((s) => ({
																...s,
																size_sqft:
																	sanitized === ""
																		? undefined
																		: Number.parseFloat(sanitized),
															}));
														}}
													/>
												</div>
												<div>
													<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
														Rate / sqft
													</p>
													<Input
														type="number"
														step="any"
														value={bulkFormState.rate_per_sqft ?? ""}
														onChange={(e) => {
															const raw = e.target.value;
															const sanitized = raw.replace(/^0+(?=\d)/, "");
															setBulkFormState((s) => ({
																...s,
																rate_per_sqft:
																	sanitized === ""
																		? undefined
																		: Number.parseFloat(sanitized),
															}));
														}}
													/>
												</div>
											</div>

											{projectType?.toLowerCase().trim() === "mixed" && (
												<div>
													<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
														Property Type
													</p>
													<Select
														value={bulkFormState.type}
														onValueChange={(val) =>
															setBulkFormState((s) => ({
																...s,
																type: val,
															}))
														}
													>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Select type to update" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="unchanged">Leave Unchanged</SelectItem>
															<SelectItem value="plot">Plot</SelectItem>
															<SelectItem value="flat">Flat</SelectItem>
															<SelectItem value="villa">Villa</SelectItem>
															<SelectItem value="farmhouse">Farmhouse</SelectItem>
															<SelectItem value="commercial">Commercial</SelectItem>
															<SelectItem value="other">Other</SelectItem>
														</SelectContent>
													</Select>
												</div>
											)}

											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
													Facing
												</p>
												<Input
													value={bulkFormState.facing}
													onChange={(e) =>
														setBulkFormState((s) => ({
															...s,
															facing: e.target.value,
														}))
													}
												/>
											</div>

											<div>
												<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
													Notes
												</p>
												<Textarea
													rows={3}
													value={bulkFormState.notes}
													onChange={(e) =>
														setBulkFormState((s) => ({
															...s,
															notes: e.target.value,
														}))
													}
												/>
											</div>

											<div className="flex gap-3 pt-1">
												<Button
													type="button"
													onClick={async () => {
														setBulkSaving(true);
														try {
															const invalid = multiSelectedPlotIds.filter((id) => !isUuid(id));
															if (invalid.length) {
																toast.error("Bulk update failed", {
																	description:
																		`Some selected ${plural.toLowerCase()} are not created yet (planned). Create them first.`,
																});
																return;
															}
															const res = await bulkUpdatePlots(
																multiSelectedPlotIds,
																projectId,
																{
																	size_sqft: bulkFormState.size_sqft,
																	rate_per_sqft: bulkFormState.rate_per_sqft,
																	facing: bulkFormState.facing,
																	type: bulkFormState.type === "unchanged" || !bulkFormState.type ? undefined : (bulkFormState.type as any),
																	notes: bulkFormState.notes,
																}
															);
															if (!res.success) {
																toast.error("Bulk update failed", {
																	description: res.error,
																});
																return;
															}
															toast.success(`${plural} updated`);
															setMultiSelectMode(false);
															setMultiSelectedPlotIds([]);
															router.refresh();
														} finally {
															setBulkSaving(false);
														}
													}}
													disabled={bulkSaving}
												>
													{bulkSaving ? "Updating..." : "Save All"}
												</Button>
											</div>
										</>
									)}
								</div>
							) : null}

							{multiSelectMode || readOnly ? null : (
								<div className="grid grid-cols-2 gap-2 mb-4">
									{/* Row 1: Primary Action (Sell / Book or Collect Payment) */}
									{(selectedStatus === "token" || selectedStatus === "sold_without_data") && selectedPlot.sale ? (
										<Button
											size="sm"
											className="col-span-2 h-9 w-full transition-all duration-200 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)] active:scale-[0.98] flex items-center justify-center gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm"
											disabled={saving}
											onClick={() =>
												router.push(`/payments/new?saleId=${selectedPlot.sale!.id}`)
											}
										>
											<Coins className="h-4 w-4 shrink-0" />
											Update Status / Collect Payment
										</Button>
									) : (
										<Button
											size="sm"
											className="col-span-2 h-9 w-full transition-all duration-200 hover:shadow-[0_4px_12px_rgba(9,9,11,0.15)] active:scale-[0.98] flex items-center justify-center gap-2 font-bold text-xs shadow-sm"
											disabled={saving || !canEdit}
											onClick={() => setSellOpen(true)}
										>
											<Tag className="h-4 w-4 shrink-0" />
											Sell / Book {singular}
										</Button>
									)}

									{/* Row 2: Secondary Action 1 (Edit Plot) */}
									{canEdit && (
										<Button
											size="sm"
											variant="outline"
											className={`${
												selectedStatus === "available" || selectedStatus === "sold_without_data" ? "col-span-1" : "col-span-2"
											} h-9 w-full transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.97] flex items-center justify-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs`}
											onClick={() => setEditing((v) => !v)}
											disabled={saving}
										>
											{editing ? (
												<>
													<X className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
													Cancel
												</>
											) : (
												<>
													<Pencil className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
													Edit {singular}
												</>
											)}
										</Button>
									)}

									{/* Row 2 side-button: Temp Sold or Make Available */}
									{selectedStatus === "available" && !selectedPlot.sale ? (
										<Button
											size="sm"
											variant="outline"
											className="col-span-1 h-9 w-full transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.97] flex items-center justify-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
											disabled={saving || isPlaceholder}
											onClick={async () => {
												setSaving(true);
												try {
													const res = await markPlotTemporarySold(selectedPlot.id, projectId);
													if (!res.success) {
														toast.error(`Could not mark temporary sold`, {
															description: res.error,
														});
														return;
													}
													toast.success(`${singular} marked as sold without data`);
													router.refresh();
												} finally {
													setSaving(false);
												}
											}}
										>
											<Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
											Temp Sold
										</Button>
									) : null}

									{selectedStatus === "sold_without_data" && !selectedPlot.sale ? (
										<Button
											size="sm"
											variant="outline"
											className="col-span-1 h-9 w-full transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.97] flex items-center justify-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
											disabled={saving || isPlaceholder}
											onClick={async () => {
												setSaving(true);
												try {
													const res = await markPlotAvailable(selectedPlot.id, projectId);
													if (!res.success) {
														toast.error(`Could not mark available`, {
															description: res.error,
														});
														return;
													}
													toast.success(`${singular} marked available`);
													router.refresh();
												} finally {
													setSaving(false);
												}
											}}
										>
											<Check className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
											Make Available
										</Button>
									) : null}

									{/* Row 3 or full width Row 2: Revoke Sale or Delete */}
									{selectedPlot.sale && selectedStatus !== "available" ? (
										<Button
											size="sm"
											variant="destructive"
											className="col-span-2 h-9 w-full transition-all duration-200 hover:shadow-[0_4px_12px_rgba(239,68,68,0.15)] active:scale-[0.97] flex items-center justify-center gap-1.5 font-semibold text-xs"
											disabled={saving}
											onClick={async () => {
												const ok = window.confirm(
													`Revoke this ${singular.toLowerCase()} sale?\n\nThe sale will be marked as revoked, but existing payments will be kept.`
												);
												if (!ok) return;
												setSaving(true);
												try {
													const res = await revokePlotSale(selectedPlot.id);
													if (!res.success) {
														toast.error("Revoke failed", {
															description: res.error,
														});
														return;
													}
													toast.success(`${singular} sale revoked`);
													router.refresh();
												} finally {
													setSaving(false);
												}
											}}
										>
											<Undo className="h-3.5 w-3.5 shrink-0" />
											Revoke Sale
										</Button>
									) : (
										<Button
											size="sm"
											variant="destructive"
											className="col-span-2 h-9 w-full transition-all duration-200 hover:shadow-[0_4px_12px_rgba(239,68,68,0.15)] active:scale-[0.97] flex items-center justify-center gap-1.5 font-semibold text-xs"
											disabled={saving || !canEdit}
											onClick={async () => {
												setSaving(true);
												try {
													const res = await deletePlot(selectedPlot.id, projectId);
													if (!res.success) {
														toast.error("Delete failed", { description: res.error });
														return;
													}
													toast.success(`${singular} deleted`);
													router.refresh();
												} finally {
													setSaving(false);
												}
											}}
										>
											<Trash2 className="h-3.5 w-3.5 shrink-0" />
											Delete {singular}
										</Button>
									)}
								</div>
							)}

							{isPlaceholder && !multiSelectMode && !readOnly ? (
								<div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
									<div className="font-semibold">This is a planned {singular.toLowerCase()} (not created yet).</div>
									<div className="text-amber-900/80 mt-0.5">
										Create this {singular.toLowerCase()} first to edit size/rate or sell it.
									</div>
									<div className="mt-2">
										<Button
											type="button"
											size="sm"
											disabled={creatingPlanned}
											onClick={async () => {
												if (!selectedPlot) return;
												setCreatingPlanned(true);
												try {
													// Pick sensible defaults from first existing real plot in this project.
													const seed = sortedPlots.find(
														(p) =>
															isUuid(String(p.id ?? "")) &&
															Number(p.size_sqft ?? 0) > 0 &&
															Number(p.rate_per_sqft ?? 0) > 0,
													);
													const sizeSeed = Number(seed?.size_sqft ?? 0);
													const rateSeed = Number(seed?.rate_per_sqft ?? 0);
													if (sizeSeed <= 0 || rateSeed <= 0) {
														toast.error(`Cannot auto-create ${singular.toLowerCase()}`, {
															description:
																`Set size and rate for at least one existing ${singular.toLowerCase()} first, or create this ${singular.toLowerCase()} manually.`,
														});
														router.push(`/projects/${projectId}/plots/new`);
														return;
													}

													const res = await createPlot(projectId, {
														plot_number: String(selectedPlot.plot_number),
														size_sqft: sizeSeed,
														rate_per_sqft: rateSeed,
														facing: "",
														type: selectedPlot.type || "plot",
														notes: "",
													} as any);
													if (!res.success) {
														toast.error(`Create ${singular.toLowerCase()} failed`, {
															description: res.error,
														});
														return;
													}
													toast.success(`${singular} #${selectedPlot.plot_number} created`);
													setMultiSelectMode(false);
													setMultiSelectedPlotIds([]);
													setEditing(false);
													router.refresh();
												} finally {
													setCreatingPlanned(false);
												}
											}}
										>
											{creatingPlanned ? "Creating..." : `Create ${singular.toLowerCase()} (1-click)`}
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="ml-2"
											onClick={() => router.push(`/projects/${projectId}/plots/new`)}
											disabled={creatingPlanned}
										>
											Open full form
										</Button>
									</div>
								</div>
							) : null}


							{!multiSelectMode && (!readOnly && editing ? (
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
												Size (sqft)
											</p>
											<Input
												type="number"
												step="any"
												value={formState.size_sqft ?? ""}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setFormState((s) => ({
														...s,
														size_sqft:
															sanitized === "" ? undefined : Number.parseFloat(sanitized),
													}));
												}}
											/>
										</div>
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
												Rate / sqft
											</p>
											<Input
												type="number"
												step="any"
												value={formState.rate_per_sqft ?? ""}
												onChange={(e) => {
													const raw = e.target.value;
													const sanitized = raw.replace(/^0+(?=\d)/, "");
													setFormState((s) => ({
														...s,
														rate_per_sqft:
															sanitized === "" ? undefined : Number.parseFloat(sanitized),
													}));
												}}
											/>
										</div>
									</div>
									{projectType?.toLowerCase().trim() === "mixed" && (
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
												Property Type
											</p>
											<Select
												value={formState.type}
												onValueChange={(val) => setFormState((s) => ({ ...s, type: val }))}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="plot">Plot</SelectItem>
													<SelectItem value="flat">Flat</SelectItem>
													<SelectItem value="villa">Villa</SelectItem>
													<SelectItem value="farmhouse">Farmhouse</SelectItem>
													<SelectItem value="commercial">Commercial</SelectItem>
													<SelectItem value="other">Other</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}

									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
											Facing
										</p>
										<Input
											value={formState.facing}
											onChange={(e) =>
												setFormState((s) => ({ ...s, facing: e.target.value }))
											}
										/>
									</div>
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
											Notes
										</p>
										<Textarea
											rows={3}
											value={formState.notes}
											onChange={(e) =>
												setFormState((s) => ({ ...s, notes: e.target.value }))
											}
										/>
									</div>
									<Button
										disabled={saving}
										onClick={async () => {
											setSaving(true);
											try {
												const res = await updatePlot(selectedPlot.id, projectId, {
													plot_number: selectedPlot.plot_number,
													size_sqft: formState.size_sqft,
													rate_per_sqft: formState.rate_per_sqft,
													facing: formState.facing,
													type: formState.type,
													notes: formState.notes,
												} as any);
												if (!res.success) {
													toast.error("Save failed", { description: res.error });
													return;
												}
												toast.success(`${singular} updated`);
												setEditing(false);
												router.refresh();
											} finally {
												setSaving(false);
											}
										}}
									>
										Save Changes
									</Button>
								</div>
							) : (
								<div className="grid grid-cols-2 gap-2 text-sm">
									{projectType?.toLowerCase().trim() === "mixed" && (
										<ModalField label="Property Type" icon={Home}>
											<span className="capitalize">{selectedPlot.type || "plot"}</span>
										</ModalField>
									)}
									<ModalField label="Facing" icon={Compass}>
										{selectedPlot.facing || "—"}
									</ModalField>
									<ModalField label="Size" icon={Ruler}>
										{selectedPlot.size_sqft || 0} sqft
									</ModalField>
									<ModalField label="Rate / sqft" icon={IndianRupee}>
										₹ {(selectedPlot.rate_per_sqft || 0).toLocaleString("en-IN")}
									</ModalField>
									<ModalField label="Total Value" icon={Wallet}>
										₹{" "}
										{(
											(selectedPlot.size_sqft || 0) *
											(selectedPlot.rate_per_sqft || 0)
										).toLocaleString("en-IN")}
									</ModalField>
									{selectedPlot.notes && (
										<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-3 col-span-full">
											<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
												Notes
											</p>
											<p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
												{selectedPlot.notes}
											</p>
										</div>
									)}
								</div>
							))}

							{!multiSelectMode && selectedPlot.sale && (
								<div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-3">
									<p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
										Sale Details
									</p>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<ModalField label="Customer" icon={User}>
											{selectedPlot.sale.customer_name}
										</ModalField>
										<ModalField label="Advisor" icon={Award}>
											{selectedPlot.sale.advisor_name}
										</ModalField>
										<ModalField label="Sale Phase" icon={Activity}>
											{selectedPlot.status === "token" ? "TOKEN" : "SOLD"}
										</ModalField>
										<ModalField label="Total Amount" icon={Wallet}>
											₹ {selectedPlot.sale.total_sale_amount.toLocaleString("en-IN")}
										</ModalField>
										<ModalField label="Amount Paid" icon={Coins}>
											₹ {selectedPlot.sale.amount_paid.toLocaleString("en-IN")}
										</ModalField>
										<ModalField label="Pending Amount" icon={AlertCircle}>
											₹ {selectedPlot.sale.remaining_amount.toLocaleString("en-IN")}
										</ModalField>
									</div>
								</div>
							)}

							{!multiSelectMode && !readOnly && projectName && (
								<SaleBookingDialog
									open={sellOpen}
									onOpenChange={setSellOpen}
									projectName={projectName}
									projectId={projectId}
									plot={selectedPlot as any}
								/>
							)}
						</>
					) : (
						<div className="flex h-full flex-col items-center justify-center text-center text-xs text-zinc-500">
							<p className="mb-1 font-medium">No plot selected</p>
							<p>Tap a plot on the left to view details.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function LegendPill({
	colorClass,
	label,
}: {
	colorClass: string;
	label: string;
}) {
	let bgClass = "bg-zinc-50 border-zinc-200 text-zinc-700";
	let dotClass = "bg-zinc-400";
	
	if (colorClass.includes("emerald")) {
		bgClass = "bg-emerald-50/60 border-emerald-250 text-emerald-800";
		dotClass = "bg-emerald-500 animate-pulse";
	} else if (colorClass.includes("amber")) {
		bgClass = "bg-amber-50/60 border-amber-250 text-amber-800";
		dotClass = "bg-amber-500 animate-pulse";
	} else if (colorClass.includes("violet")) {
		bgClass = "bg-violet-50/60 border-violet-250 text-violet-800";
		dotClass = "bg-violet-500";
	} else if (colorClass.includes("rose")) {
		bgClass = "bg-rose-50/60 border-rose-250 text-rose-800";
		dotClass = "bg-rose-500";
	}
	
	return (
		<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold leading-none shadow-sm transition-colors ${bgClass}`}>
			<span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
			{label}
		</span>
	);
}

function DetailRow({
	label,
	children,
	icon: Icon,
}: {
	label: string;
	children: React.ReactNode;
	icon?: LucideIcon;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-1.5 text-zinc-500">
				{Icon && <Icon className="h-3 w-3" />}
				<span>{label}</span>
			</div>
			<div className="font-medium text-zinc-900">{children}</div>
		</div>
	);
}

const getPlotStatusBadge = (statusStr: string) => {
	const status = (statusStr || "").toLowerCase().trim();
	const baseClass = "px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded-full border transition-all duration-200 hover:scale-[1.02] flex items-center w-fit shadow-sm";

	switch (status) {
		case "available":
			return (
				<Badge variant="outline" className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 hover:bg-emerald-100/60 shadow-[0_0_10px_rgba(16,185,129,0.06)]`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
					AVAILABLE
				</Badge>
			);
		case "token":
			return (
				<Badge variant="outline" className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 hover:bg-amber-100/60 shadow-[0_0_10px_rgba(245,158,11,0.06)]`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
					TOKEN
				</Badge>
			);
		case "sold":
		case "agreement":
			return (
				<Badge variant="outline" className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 hover:bg-rose-100/60 shadow-[0_0_10px_rgba(244,63,94,0.06)]`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
					SOLD
				</Badge>
			);
		case "sold_without_data":
			return (
				<Badge variant="outline" className={`${baseClass} bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/40 hover:bg-violet-100/60 shadow-[0_0_10px_rgba(139,92,246,0.06)]`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
					TEMP SOLD
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className={`${baseClass} bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700`}>
					<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400" />
					{status.toUpperCase()}
				</Badge>
			);
	}
};

function ModalField({
	label,
	children,
	icon: Icon,
}: {
	label: string;
	children: React.ReactNode;
	icon?: LucideIcon;
}) {
	return (
		<div className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2.5 hover:shadow-md hover:border-teal-500/40 dark:hover:border-teal-500/30 transition-all duration-200 ease-in-out select-none">
			<div className="flex items-center justify-between gap-2">
				<p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 truncate">
					{label}
				</p>
				{Icon && (
					<Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-teal-500 shrink-0" />
				)}
			</div>
			<p className="mt-1 font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm group-hover:text-zinc-950 dark:group-hover:text-white transition-colors truncate">
				{children}
			</p>
		</div>
	);
}

