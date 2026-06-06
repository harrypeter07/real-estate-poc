"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
	Search, 
	RefreshCw, 
	Send, 
	Filter, 
	Cake,
	Users,
	CheckCircle,
	XCircle,
	Briefcase,
	Award,
	UserCheck,
	LayoutGrid,
	CalendarDays,
	Sparkles,
	MessageSquareText
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
	Button,
	Badge,
	Card,
	CardContent,
	Input,
	Checkbox,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MessagingPerson } from "@/app/actions/messaging-directory";
import {
	REMINDER_TEMPLATES,
	fillTemplate,
	getStoredTemplateId,
	getTemplateForType,
	setStoredTemplateId,
	type ReminderType,
	type MessageTemplate,
	getReminderTypeForCategory,
	getCustomTemplateBody,
	setCustomTemplateBody,
} from "@/lib/reminder-templates";
import { BulkSendModal } from "@/components/messaging/bulk-send-modal";

function personKey(p: MessagingPerson) {
	return `${p.role}:${p.id}`;
}

function isBirthdayToday(iso: string | null): boolean {
	if (!iso) return false;
	const t = iso.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
	const [y, m, d] = t.split("-").map(Number);
	const bd = new Date(y, m - 1, d);
	const now = new Date();
	return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
}

function openWhatsApp(phone: string | null, text: string) {
	if (!phone) {
		toast.error("No phone number");
		return;
	}
	const formatted = phone.replace(/\D/g, "").replace(/^0/, "");
	const wa = formatted.startsWith("91") ? formatted : `91${formatted}`;
	window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank");
}

function buildPreview(person: MessagingPerson, body: string): string {
	return fillTemplate(body, {
		name: person.name,
		date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" }),
	});
}

export function MessagingDirectoryClient({ initialPeople }: { initialPeople: MessagingPerson[] }) {
	const router = useRouter();
	const [people] = useState(initialPeople);
	const [query, setQuery] = useState("");
	const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
	const [roleTab, setRoleTab] = useState<"all" | "customer" | "advisor" | "employee">("all");
	const [birthdayOnly, setBirthdayOnly] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkOpen, setBulkOpen] = useState(false);
	const [previewRole, setPreviewRole] = useState<MessagingPerson["role"]>("customer");
	const [activeCategory, setActiveCategory] = useState<"birthday" | "welcome" | "deal_closed">("birthday");

	const [customTemplateBodies, setCustomTemplateBodies] = useState<Record<string, string>>({});
	const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, string>>({});

	useEffect(() => {
		try {
			const storedBodies = localStorage.getItem("sinfra_custom_template_bodies");
			if (storedBodies) {
				setCustomTemplateBodies(JSON.parse(storedBodies));
			}
			const storedTemplates = localStorage.getItem("sinfra_reminder_templates");
			if (storedTemplates) {
				setSelectedTemplateIds(JSON.parse(storedTemplates));
			}
		} catch (e) {
			console.error("Failed to load templates from localStorage", e);
		}
	}, []);

	const customerType = getReminderTypeForCategory(activeCategory, "customer");
	const advisorType = getReminderTypeForCategory(activeCategory, "advisor");

	const customersGroup = REMINDER_TEMPLATES.find((g) => g.type === customerType)!;
	const advisorsGroup = REMINDER_TEMPLATES.find((g) => g.type === advisorType)!;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return people.filter((p) => {
			if (statusTab === "active" && !p.is_active) return false;
			if (statusTab === "inactive" && p.is_active) return false;
			if (roleTab !== "all" && p.role !== roleTab) return false;
			if (birthdayOnly && !isBirthdayToday(p.birth_date)) return false;
			if (!q) return true;
			const hay = `${p.name} ${p.phone ?? ""} ${p.subtitle ?? ""}`.toLowerCase();
			return hay.includes(q);
		});
	}, [people, query, statusTab, roleTab, birthdayOnly]);

	const selectedInView = useMemo(() => {
		return filtered.filter((p) => selected.has(personKey(p)));
	}, [filtered, selected]);

	const toggleOne = (p: MessagingPerson) => {
		const k = personKey(p);
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(k)) next.delete(k);
			else next.add(k);
			return next;
		});
	};

	const selectAllInView = () => {
		setSelected(new Set(filtered.map(personKey)));
	};

	const clearSelection = () => setSelected(new Set());

	const handleSendOne = (p: MessagingPerson) => {
		const type = getReminderTypeForCategory(activeCategory, p.role);
		const tmplId = selectedTemplateIds[type];
		const tmpl = getTemplateForType(type, tmplId);
		if (!tmpl) {
			toast.error("No template");
			return;
		}
		const bodyText = customTemplateBodies[tmpl.id] !== undefined
			? customTemplateBodies[tmpl.id]
			: tmpl.body;
		const msg = buildPreview(p, bodyText);
		openWhatsApp(p.phone, msg);
	};

	const queueForBulk = useMemo(() => {
		if (selectedInView.length > 0) return selectedInView;
		return filtered;
	}, [selectedInView, filtered]);

	const openBulk = () => {
		const q = selectedInView.length > 0 ? selectedInView : filtered;
		if (q.length === 0) {
			toast.error("No people in the current list");
			return;
		}
		setBulkOpen(true);
	};

	const activeTemplate = useMemo(() => {
		const type = getReminderTypeForCategory(activeCategory, previewRole === "advisor" ? "advisor" : "customer");
		const group = previewRole === "advisor" ? advisorsGroup : customersGroup;
		const selectedId = selectedTemplateIds[type] || group.templates[0].id;
		return group.templates.find((t) => t.id === selectedId) || group.templates[0];
	}, [activeCategory, previewRole, advisorsGroup, customersGroup, selectedTemplateIds]);

	const previewTemplateBody = useMemo(() => {
		if (!activeTemplate) return "";
		return customTemplateBodies[activeTemplate.id] !== undefined
			? customTemplateBodies[activeTemplate.id]
			: activeTemplate.body;
	}, [activeTemplate, customTemplateBodies]);

	const samplePerson: MessagingPerson = useMemo(
		() => ({
			id: "sample",
			role: previewRole === "advisor" ? "advisor" : previewRole === "employee" ? "employee" : "customer",
			name: "Sample Name",
			phone: "9876543210",
			birth_date: null,
			is_active: true,
		}),
		[previewRole]
	);

	const pickTemplate = (type: ReminderType, t: MessageTemplate) => {
		setStoredTemplateId(type, t.id);
		setSelectedTemplateIds((prev) => ({
			...prev,
			[type]: t.id,
		}));
		toast.success("Template selected");
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Messaging"
				subtitle="Send WhatsApp messages — customers, advisors, and employees"
			/>

			<div className="flex flex-wrap gap-1.5 rounded-2xl border border-zinc-200/80 bg-white/80 p-1.5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/20">
				{(
					[
						["all", "All Members", Users],
						["active", "Active Members", CheckCircle],
						["inactive", "Inactive Members", XCircle],
					] as const
				).map(([v, label, Icon]) => (
					<button
						key={v}
						type="button"
						onClick={() => setStatusTab(v)}
						className={cn(
							"flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none",
							statusTab === v
								? "bg-teal-600 text-white shadow-sm shadow-teal-600/10 dark:bg-teal-500"
								: "text-zinc-500 hover:text-zinc-850 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/40"
						)}
					>
						<Icon className="h-3.5 w-3.5 shrink-0" />
						{label}
					</button>
				))}
			</div>
			<Card className="border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white/70 dark:bg-zinc-950/10 backdrop-blur-md">
				<CardContent className="p-4 sm:p-5 space-y-4">
					<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
						<Filter className="h-4 w-4 text-teal-600 dark:text-teal-500" />
						Filter by Role &amp; Events
					</div>
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap gap-2 items-center">
							<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1.5">Roles:</span>
							{(
								[
									["all", "All Roles", LayoutGrid],
									["customer", "Customers", UserCheck],
									["advisor", "Advisors", Award],
									["employee", "Employees", Briefcase],
								] as const
							).map(([v, label, Icon]) => (
								<button
									key={v}
									type="button"
									onClick={() => setRoleTab(v)}
									className={cn(
										"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer select-none",
										roleTab === v
											? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-350"
											: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
									)}
								>
									<Icon className={cn("h-3.5 w-3.5", roleTab === v ? "text-teal-600" : "text-zinc-400")} />
									{label}
								</button>
							))}
						</div>
						<div className="flex flex-wrap gap-2 items-center pt-2.5 border-t border-zinc-100 dark:border-zinc-900/60">
							<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1.5">Events:</span>
							<button
								type="button"
								onClick={() => setBirthdayOnly(false)}
								className={cn(
									"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer",
									!birthdayOnly
										? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
										: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
								)}
							>
								<CalendarDays className="h-3.5 w-3.5" />
								All Dates
							</button>
							<button
								type="button"
								onClick={() => setBirthdayOnly(true)}
								className={cn(
									"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer",
									birthdayOnly
										? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-350"
										: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
								)}
							>
								<Cake className="h-3.5 w-3.5 text-rose-500" />
								Birthday Today
							</button>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="relative group">
				<Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-300 group-hover:text-zinc-600 group-focus-within:text-teal-600 group-focus-within:scale-105" aria-hidden />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by name, phone…"
					className="h-11 rounded-2xl border-zinc-200/80 bg-white !pl-10 pr-12 dark:border-zinc-800 dark:bg-zinc-950/40 text-xs transition-all duration-300 focus-visible:ring-4 focus-visible:ring-teal-500/10 focus-visible:border-teal-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] shadow-sm focus-visible:ring-offset-0 font-bold"
				/>
				<button
					type="button"
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-250 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
					onClick={() => router.refresh()}
					aria-label="Refresh"
				>
					<RefreshCw className="h-4 w-4" />
				</button>
			</div>

			<Card className="border-zinc-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.015)] dark:border-zinc-800/80 overflow-hidden bg-gradient-to-tr from-white to-zinc-50/20 dark:from-zinc-950 dark:to-zinc-900/10 rounded-2xl">
				<CardContent className="p-4 md:p-6 space-y-5">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-150 dark:border-zinc-850 pb-4">
						<div className="flex items-start gap-2.5">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-650 dark:text-teal-400 shrink-0 border border-teal-200/40">
								<MessageSquareText className="h-4.5 w-4.5" />
							</div>
							<div>
								<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
									Greetings &amp; Message Templates
								</h3>
								<p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium">
									Choose or customize greeting messages to send over WhatsApp
								</p>
							</div>
						</div>
						
						{/* Category selector */}
						<div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl self-start sm:self-auto shrink-0 shadow-inner">
							{(
								[
									["birthday", "🎂 Birthday"],
									["welcome", "👋 Welcome"],
									["deal_closed", "🎉 Deal Closed"],
								] as const
							).map(([cat, label]) => (
								<button
									key={cat}
									type="button"
									onClick={() => setActiveCategory(cat)}
									className={cn(
										"rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 cursor-pointer select-none",
										activeCategory === cat
											? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/10"
											: "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
						<div className="space-y-4">
							<div>
								<p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
									Customers &amp; Employees Templates
								</p>
								<div className="flex flex-wrap gap-2">
									{customersGroup.templates.map((t) => {
										const isSelected = selectedTemplateIds[customerType] === t.id ||
											(!selectedTemplateIds[customerType] && t.id === customersGroup.templates[0].id);
										return (
											<button
												key={t.id}
												type="button"
												onClick={() => pickTemplate(customerType, t)}
												className={cn(
													"rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
													isSelected
														? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-350 shadow-[0_0_8px_rgba(20,184,166,0.06)]"
														: "border-zinc-200 bg-white text-zinc-650 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
												)}
											>
												{t.name}
											</button>
										);
									})}
								</div>
							</div>
							<div>
								<p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Advisors Templates</p>
								<div className="flex flex-wrap gap-2">
									{advisorsGroup.templates.map((t) => {
										const isSelected = selectedTemplateIds[advisorType] === t.id ||
											(!selectedTemplateIds[advisorType] && t.id === advisorsGroup.templates[0].id);
										return (
											<button
												key={t.id}
												type="button"
												onClick={() => pickTemplate(advisorType, t)}
												className={cn(
													"rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
													isSelected
														? "border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-350 shadow-[0_0_8px_rgba(20,184,166,0.06)]"
														: "border-zinc-200 bg-white text-zinc-650 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
												)}
											>
												{t.name}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Editor & Preview Side-by-Side */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2 pt-4 border-t border-zinc-100 dark:border-zinc-850">
							{/* Editor */}
							<div className="space-y-2">
								<div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
									<span>Edit Template Message</span>
									{activeTemplate && (
										<span className="text-teal-650 normal-case font-bold dark:text-teal-400 flex items-center gap-1">
											<Sparkles className="h-3 w-3 shrink-0" />
											Editing: {activeTemplate.name}
										</span>
									)}
								</div>
								<textarea
									rows={5}
									className="w-full text-xs font-mono p-3 rounded-xl border border-zinc-250 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 transition-all duration-200 min-h-[100px]"
									value={previewTemplateBody}
									onChange={(e) => {
										if (!activeTemplate) return;
										const newBody = e.target.value;
										setCustomTemplateBodies((prev) => ({
											...prev,
											[activeTemplate.id]: newBody,
										}));
										setCustomTemplateBody(activeTemplate.id, newBody);
									}}
								/>
								<p className="text-[10px] text-zinc-400 leading-normal font-semibold">
									Customize the template text above. Changes are auto-saved locally.
									<br />
									Placeholders: <code className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">[name]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">[date]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">[company]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-300 font-bold">[company_phone]</code>
								</p>
							</div>

							{/* Preview */}
							<div className="space-y-2">
								<div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
									<span>Real-time Preview</span>
									<div className="flex items-center gap-1.5">
										<span className="text-zinc-400 normal-case font-semibold">Preview as:</span>
										<div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg shadow-inner">
											{(["customer", "advisor"] as const).map((r) => (
												<button
													key={r}
													type="button"
													onClick={() => setPreviewRole(r)}
													className={cn(
														"rounded px-2.5 py-1 text-[10px] font-bold capitalize transition-all duration-200 cursor-pointer select-none",
														previewRole === r
															? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-200/10"
															: "text-zinc-500 hover:text-zinc-750 dark:hover:text-zinc-300"
													)}
												>
													{r}
												</button>
											))}
										</div>
									</div>
								</div>
								<div className="rounded-xl border border-emerald-150/40 bg-emerald-50/10 p-3.5 text-xs text-zinc-850 dark:border-emerald-950/20 dark:bg-emerald-950/5 dark:text-zinc-100 whitespace-pre-wrap min-h-[100px] shadow-inner font-sans leading-relaxed border-dashed">
									{buildPreview(samplePerson, previewTemplateBody)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-zinc-50/50 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-855">
				<p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
					Showing <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{filtered.length}</span> members
					{" · "}
					<span className="font-extrabold text-teal-655 dark:text-teal-400">{selectedInView.length}</span> selected
				</p>
				<div className="flex flex-wrap gap-2">
					<Button 
						type="button" 
						variant="outline" 
						size="sm" 
						onClick={selectAllInView}
						className="rounded-xl text-xs font-semibold px-3 h-9 hover:bg-zinc-50 border-zinc-200"
					>
						Select All in View
					</Button>
					<Button 
						type="button" 
						variant="ghost" 
						size="sm" 
						onClick={clearSelection}
						className="rounded-xl text-xs font-semibold px-3 h-9"
					>
						Clear Selection
					</Button>
					<Button
						type="button"
						size="sm"
						className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md shadow-teal-650/10 transition-all duration-200"
						onClick={openBulk}
						disabled={filtered.length === 0}
					>
						Send to all ({selectedInView.length > 0 ? selectedInView.length : filtered.length})
					</Button>
				</div>
			</div>

			<div className="space-y-3">
				{filtered.length === 0 ? (
					<Card className="border-dashed border-zinc-250 dark:border-zinc-800 rounded-2xl">
						<CardContent className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center space-y-3">
							<div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-905 flex items-center justify-center text-zinc-450 shadow-inner">
								<Users className="h-5 w-5" />
							</div>
							<p className="font-semibold text-zinc-600 dark:text-zinc-400">No members match these filters.</p>
						</CardContent>
					</Card>
				) : (
					filtered.map((p) => {
						const k = personKey(p);
						const checked = selected.has(k);
						return (
							<Card
								key={k}
								className={cn(
									"border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-200 overflow-hidden relative group cursor-pointer hover:shadow-md hover:border-teal-500/20",
									checked ? "border-teal-500/50 bg-teal-50/[0.015] dark:border-teal-500/30 shadow-[0_4px_12px_rgba(20,184,166,0.02)]" : ""
								)}
								onClick={() => toggleOne(p)}
							>
								{/* Subtle teal left accent border on card hover */}
								<div className={cn(
									"absolute left-0 top-0 bottom-0 w-[3px] bg-teal-500 transform transition-transform duration-200 origin-center",
									checked ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
								)} />

								<CardContent className="flex flex-col gap-3.5 p-4 sm:flex-row sm:items-center justify-between">
									<div className="flex items-center gap-3.5 min-w-0 flex-1">
										{/* Checkbox wrapper */}
										<div className="flex items-center h-full pointer-events-none">
											<Checkbox
												checked={checked}
												onCheckedChange={() => {}} // Click is handled by Card parent
												className="rounded border-zinc-300 dark:border-zinc-700 text-teal-650 focus:ring-teal-500/20 h-4.5 w-4.5 animate-none"
											/>
										</div>
										
										{/* Avatar */}
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105 select-none">
											{p.name.charAt(0).toUpperCase()}
										</div>
										
										{/* Details */}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-extrabold text-zinc-850 dark:text-zinc-50 group-hover:text-teal-650 transition-colors text-sm truncate max-w-[200px]">{p.name}</span>
												{p.is_active ? (
													<Badge className="bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/15 border-emerald-200/30 text-[9px] font-extrabold py-0.5 px-2 rounded-full uppercase tracking-wider shrink-0">Active</Badge>
												) : (
													<Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-zinc-200 text-[9px] font-extrabold py-0.5 px-2 rounded-full uppercase tracking-wider shrink-0">Inactive</Badge>
												)}
												<Badge variant="outline" className="capitalize text-[9px] font-bold py-0.5 px-2 rounded-full tracking-wide shrink-0">
													{p.role}
												</Badge>
											</div>
											<div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 text-xs text-zinc-500 font-medium">
												{p.phone && (
													<span className="flex items-center gap-1 font-mono tracking-tight text-[11.5px] text-zinc-650 dark:text-zinc-400">
														<span className="text-zinc-400">📞</span>
														{p.phone}
													</span>
												)}
												{p.subtitle && (
													<span className="flex items-center gap-1 truncate max-w-[250px]">
														<span className="text-zinc-400">🏷️</span>
														{p.subtitle}
													</span>
												)}
											</div>
										</div>
									</div>
									
									<Button
										type="button"
										size="icon"
										className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all duration-200 h-9 w-9 shadow-sm"
										disabled={!p.phone}
										onClick={(e) => {
											e.stopPropagation(); // Prevent card selection toggle when clicking Send button
											handleSendOne(p);
										}}
										aria-label="Send WhatsApp"
									>
										<Send className="h-3.5 w-3.5 text-white" />
									</Button>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			<BulkSendModal 
				open={bulkOpen} 
				onOpenChange={setBulkOpen} 
				queue={queueForBulk} 
				activeCategory={activeCategory} 
				selectedTemplateIds={selectedTemplateIds}
				customTemplateBodies={customTemplateBodies}
			/>
		</div>
	);
}
