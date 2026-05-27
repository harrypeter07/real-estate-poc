import { Suspense } from "react";
import Link from "next/link";
import { searchGlobal, type SearchResultItem, type SearchResults } from "@/app/actions/search-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Building2,
	LayoutGrid,
	UserCheck,
	Users,
	Handshake,
	TrendingUp,
	Search,
} from "lucide-react";

interface Props {
	searchParams: Promise<{ q?: string }>;
}

const SECTION_META: Record<
	keyof Omit<SearchResults, "total">,
	{ label: string; icon: React.ElementType; color: string }
> = {
	projects: { label: "Projects", icon: Building2, color: "text-blue-600" },
	plots: { label: "Plots", icon: LayoutGrid, color: "text-emerald-600" },
	advisors: { label: "Advisors", icon: UserCheck, color: "text-violet-600" },
	customers: { label: "Customers", icon: Users, color: "text-amber-600" },
	enquiries: { label: "Enquiries", icon: Handshake, color: "text-orange-600" },
	sales: { label: "Sales", icon: TrendingUp, color: "text-rose-600" },
};

function ResultCard({ item }: { item: SearchResultItem }) {
	return (
		<Link
			href={item.href}
			className="flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-100 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-colors group"
		>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-700">
					{item.title}
				</p>
				<p className="text-xs text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
			</div>
			{item.badge && (
				<Badge variant="secondary" className="shrink-0 capitalize text-[10px]">
					{item.badge}
				</Badge>
			)}
		</Link>
	);
}

function SectionGroup({
	sectionKey,
	items,
}: {
	sectionKey: keyof Omit<SearchResults, "total">;
	items: SearchResultItem[];
}) {
	if (items.length === 0) return null;
	const meta = SECTION_META[sectionKey];
	const Icon = meta.icon;

	return (
		<Card>
			<CardHeader className="pb-2 pt-4 px-4">
				<CardTitle className="text-sm font-semibold flex items-center gap-2">
					<Icon className={`w-4 h-4 ${meta.color}`} />
					{meta.label}
					<span className="text-xs font-normal text-zinc-400 ml-1">({items.length})</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="px-4 pb-4 space-y-1.5">
				{items.map((item) => (
					<ResultCard key={item.id} item={item} />
				))}
			</CardContent>
		</Card>
	);
}

async function SearchResults({ query }: { query: string }) {
	const results = await searchGlobal(query);

	if (results.total === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<Search className="w-10 h-10 text-zinc-300 mb-4" />
				<p className="text-zinc-500 font-medium">No results for &ldquo;{query}&rdquo;</p>
				<p className="text-zinc-400 text-sm mt-1">
					Try searching by name, phone number, or plot number.
				</p>
			</div>
		);
	}

	const sections = Object.keys(SECTION_META) as Array<keyof Omit<SearchResults, "total">>;

	return (
		<>
			<p className="text-sm text-zinc-500 mb-4">
				Found <strong>{results.total}</strong> result{results.total !== 1 ? "s" : ""} for{" "}
				&ldquo;{query}&rdquo;
			</p>
			<div className="space-y-4">
				{sections.map((key) => (
					<SectionGroup key={key} sectionKey={key} items={results[key]} />
				))}
			</div>
		</>
	);
}

export default async function SearchPage({ searchParams }: Props) {
	const sp = await searchParams;
	const query = String(sp.q ?? "").trim();

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<PageHeader
				title="Global Search"
				subtitle="Search across projects, plots, advisors, customers, enquiries and sales"
			/>

			{/* Search input */}
			<form method="GET" action="/search" className="flex gap-3 items-center">
				<div className="relative flex-1 group">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-all duration-300 group-hover:text-zinc-600 group-focus-within:text-teal-650 group-focus-within:scale-105" />
					<input
						id="global-search-input"
						name="q"
						type="text"
						defaultValue={query}
						placeholder="Search by name, phone, plot number… (Ctrl+K)"
						autoFocus
						autoComplete="off"
						className="w-full pl-10 pr-4 py-2.5 text-xs font-bold border border-zinc-200/80 rounded-2xl bg-white hover:border-zinc-300 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/8 transition-all duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)] focus:shadow-[0_8px_20px_rgba(13,148,136,0.05)] placeholder:text-zinc-400"
					/>
				</div>
				<button
					type="submit"
					className="px-5 py-2.5 bg-gradient-to-r from-teal-600 via-teal-650 to-emerald-600 text-white text-xs font-black rounded-2xl hover:from-teal-500 hover:via-teal-550 hover:to-emerald-500 border border-teal-500/20 shadow-sm hover:shadow-[0_4px_15px_rgba(13,148,136,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-300 cursor-pointer h-10 flex items-center justify-center shrink-0"
				>
					Search
				</button>
			</form>

			{/* Results */}
			{query.length >= 2 ? (
				<Suspense
					fallback={
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />
							))}
						</div>
					}
				>
					<SearchResults query={query} />
				</Suspense>
			) : (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<Search className="w-10 h-10 text-zinc-200 mb-4" />
					<p className="text-zinc-400 text-sm">
						Type at least 2 characters to search. Press{" "}
						<kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono">
							Ctrl+K
						</kbd>{" "}
						from anywhere to open search.
					</p>
				</div>
			)}
		</div>
	);
}
