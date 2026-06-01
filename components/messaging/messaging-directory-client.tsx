"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Send, Filter, Cake } from "lucide-react";
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

	const [customTemplateBodies, setCustomTemplateBodies] = useState<Record<string, string>>(() => {
		if (typeof window === "undefined") return {};
		try {
			const stored = localStorage.getItem("sinfra_custom_template_bodies");
			return stored ? JSON.parse(stored) : {};
		} catch {
			return {};
		}
	});

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
		const tmpl = getTemplateForType(type, getStoredTemplateId(type));
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
		const selectedId = getStoredTemplateId(type) || group.templates[0].id;
		return group.templates.find((t) => t.id === selectedId) || group.templates[0];
	}, [activeCategory, previewRole, advisorsGroup, customersGroup]);

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
		toast.success("Template selected");
	};

	return (
		<div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 md:px-0">
			<PageHeader
				title="Messaging"
				subtitle="Send WhatsApp messages — customers, advisors, and employees"
			/>

			<div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				{(
					[
						["all", "All members"],
						["active", "Active"],
						["inactive", "Inactive"],
					] as const
				).map(([v, label]) => (
					<button
						key={v}
						type="button"
						onClick={() => setStatusTab(v)}
						className={cn(
							"rounded-lg px-4 py-2 text-sm font-medium transition-colors",
							statusTab === v
								? "bg-blue-600 text-white shadow-sm"
								: "text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900"
						)}
					>
						{label}
					</button>
				))}
			</div>

			<Card className="border-zinc-200 shadow-sm dark:border-zinc-800">
				<CardContent className="p-4 md:p-5 space-y-4">
					<div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
						<Filter className="h-4 w-4 text-blue-600" />
						Role &amp; events
					</div>
					<div className="flex flex-wrap gap-2">
						{(
							[
								["all", "All roles"],
								["customer", "Customers"],
								["advisor", "Advisors"],
								["employee", "Employees"],
							] as const
						).map(([v, label]) => (
							<button
								key={v}
								type="button"
								onClick={() => setRoleTab(v)}
								className={cn(
									"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
									roleTab === v
										? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
										: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
								)}
							>
								{label}
							</button>
						))}
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => setBirthdayOnly(false)}
							className={cn(
								"rounded-full border px-3 py-1.5 text-xs font-medium",
								!birthdayOnly
									? "border-zinc-900 bg-zinc-900 text-white"
									: "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800"
							)}
						>
							All dates
						</button>
						<button
							type="button"
							onClick={() => setBirthdayOnly(true)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
								birthdayOnly
									? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
									: "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800"
							)}
						>
							<Cake className="h-3.5 w-3.5" />
							Birthday today
						</button>
					</div>
				</CardContent>
			</Card>

			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by name, phone…"
					className="h-11 rounded-xl border-zinc-200 pl-10 sm:pl-10 pr-12 dark:border-zinc-800"
				/>
				<button
					type="button"
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
					onClick={() => router.refresh()}
					aria-label="Refresh"
				>
					<RefreshCw className="h-4 w-4" />
				</button>
			</div>

			<Card className="border-zinc-200 shadow-sm dark:border-zinc-800 overflow-hidden bg-gradient-to-b from-white to-zinc-50/20 dark:from-zinc-950 dark:to-zinc-950/25">
				<CardContent className="p-4 md:p-5 space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-150 pb-3 dark:border-zinc-800">
						<div>
							<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
								<Send className="h-4 w-4 text-blue-600" />
								Greetings &amp; Message Templates
							</h3>
							<p className="text-[11px] text-zinc-500 mt-0.5">
								Choose or customize greeting messages to send over WhatsApp
							</p>
						</div>
						
						{/* Category selector */}
						<div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg self-start sm:self-auto shrink-0 shadow-3xs">
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
										"rounded-md px-3 py-1 text-xs font-bold transition-all duration-200",
										activeCategory === cat
											? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-3xs border border-zinc-200/20"
											: "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
									)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<div>
							<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
								Customers &amp; employees
							</p>
							<div className="flex flex-wrap gap-2">
								{customersGroup.templates.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => pickTemplate(customerType, t)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
											getStoredTemplateId(customerType) === t.id ||
												(!getStoredTemplateId(customerType) && t.id === customersGroup.templates[0].id)
												? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50"
												: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800"
										)}
									>
										{t.name}
									</button>
								))}
							</div>
						</div>
						<div>
							<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Advisors</p>
							<div className="flex flex-wrap gap-2">
								{advisorsGroup.templates.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => pickTemplate(advisorType, t)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
											getStoredTemplateId(advisorType) === t.id ||
												(!getStoredTemplateId(advisorType) && t.id === advisorsGroup.templates[0].id)
												? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50"
												: "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800"
										)}
									>
										{t.name}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
						{/* Editor */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
								<span>Edit Template Message</span>
								{activeTemplate && (
									<span className="text-emerald-600 normal-case font-bold dark:text-emerald-400">
										Editing: {activeTemplate.name}
									</span>
								)}
							</div>
							<textarea
								rows={4}
								className="w-full text-xs font-mono p-3 rounded-xl border border-zinc-250 bg-white dark:border-zinc-700 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-zinc-100"
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
							<p className="text-[10px] text-muted-foreground leading-normal">
								Customize the template text above. Changes are auto-saved locally.
								<br />
								Placeholders: <code className="font-mono text-zinc-700 dark:text-zinc-350">[name]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-350">[date]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-350">[company]</code>, <code className="font-mono text-zinc-700 dark:text-zinc-350">[company_phone]</code>
							</p>
						</div>

						{/* Preview */}
						<div className="space-y-2">
							<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-zinc-500">
								<span>Real-time Preview</span>
								<div className="flex items-center gap-1">
									<span className="text-zinc-400 normal-case font-normal mr-1">Preview as:</span>
									{(["customer", "advisor"] as const).map((r) => (
										<button
											key={r}
											type="button"
											onClick={() => setPreviewRole(r)}
											className={cn(
												"rounded-md px-1.5 py-0.5 text-[9px] font-bold capitalize transition-colors",
												previewRole === r ? "bg-blue-600 text-white" : "bg-zinc-150 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
											)}
										>
											{r}
										</button>
									))}
								</div>
							</div>
							<div className="rounded-xl border border-emerald-150/40 bg-emerald-50/20 p-3.5 text-xs text-zinc-850 dark:border-emerald-950/20 dark:bg-emerald-950/5 dark:text-zinc-100 whitespace-pre-wrap min-h-[96px] shadow-inner font-sans leading-relaxed">
								{buildPreview(samplePerson, previewTemplateBody)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">{filtered.length}</span> members
					{" · "}
					<span className="font-semibold text-blue-700 dark:text-blue-300">{selectedInView.length}</span> selected
				</p>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={selectAllInView}>
						Select all in view
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
						Clear
					</Button>
					<Button
						type="button"
						size="sm"
						className="bg-blue-600 hover:bg-blue-700"
						onClick={openBulk}
						disabled={filtered.length === 0}
					>
						Send to all ({selectedInView.length > 0 ? selectedInView.length : filtered.length})
					</Button>
				</div>
			</div>

			<div className="space-y-3">
				{filtered.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="py-16 text-center text-sm text-muted-foreground">
							No people match these filters.
						</CardContent>
					</Card>
				) : (
					filtered.map((p) => {
						const k = personKey(p);
						const checked = selected.has(k);
						return (
							<Card
								key={k}
								className="border-zinc-200 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800"
							>
								<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
									<div className="flex items-start gap-3 min-w-0 flex-1">
										<Checkbox
											checked={checked}
											onCheckedChange={() => toggleOne(p)}
											className="mt-1"
										/>
										<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
											{p.name.charAt(0).toUpperCase()}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{p.name}</span>
												{p.is_active ? (
													<Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
												) : (
													<Badge variant="secondary">Inactive</Badge>
												)}
												<Badge variant="outline" className="capitalize">
													{p.role}
												</Badge>
											</div>
											<p className="text-xs text-zinc-500 font-mono mt-0.5">{p.phone ?? "—"}</p>
											{p.subtitle && (
												<p className="text-xs text-zinc-500 mt-0.5 truncate">{p.subtitle}</p>
											)}
										</div>
									</div>
									<Button
										type="button"
										size="icon"
										className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10"
										disabled={!p.phone}
										onClick={() => handleSendOne(p)}
										aria-label="Send WhatsApp"
									>
										<Send className="h-4 w-4 text-white" />
									</Button>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			<BulkSendModal open={bulkOpen} onOpenChange={setBulkOpen} queue={queueForBulk} activeCategory={activeCategory} />
		</div>
	);
}
