import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarClock, Wallet, ChevronRight, ArrowRight, UserCheck, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HrHubPage() {
	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<PageHeader
				title="HR & Attendance Hub"
				subtitle="Manage your agency employees, track attendance files, and execute monthly payroll payouts"
			/>
			
			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{/* Card 1: Employees */}
				<Card className="group rounded-2xl border border-zinc-200 bg-white hover:border-teal-500/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
					<div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 to-emerald-400 opacity-80" />
					
					<div>
						<CardHeader className="pb-3 pt-6 px-6">
							<div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-150 flex items-center justify-center text-teal-600 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300 shadow-3xs mb-4 shrink-0">
								<Users className="h-5.5 w-5.5" />
							</div>
							<CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
								Employees
							</CardTitle>
						</CardHeader>
						<CardContent className="px-6 pb-6 pt-0">
							<p className="text-xs text-zinc-555 font-semibold leading-relaxed">
								Manage staff profile records, allocate organizational codes, and configure custom monthly base salary structures.
							</p>
						</CardContent>
					</div>

					<div className="px-6 pb-6 pt-0 mt-auto">
						<Button asChild size="sm" variant="outline" className="h-8.5 text-[10px] font-black rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-650 hover:bg-teal-600 text-teal-700 hover:text-white hover:border-teal-600 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1.5 cursor-pointer w-full group/btn">
							<Link href="/hr/employees">
								Open Dashboard
								<ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
							</Link>
						</Button>
					</div>
				</Card>

				{/* Card 2: Attendance */}
				<Card className="group rounded-2xl border border-zinc-200 bg-white hover:border-violet-500/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
					<div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-400 opacity-80" />
					
					<div>
						<CardHeader className="pb-3 pt-6 px-6">
							<div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-150 flex items-center justify-center text-violet-600 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-3xs mb-4 shrink-0">
								<CalendarClock className="h-5.5 w-5.5" />
							</div>
							<CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
								Attendance
							</CardTitle>
						</CardHeader>
						<CardContent className="px-6 pb-6 pt-0">
							<p className="text-xs text-zinc-550 font-semibold leading-relaxed">
								Process and upload monthly attendance Excel sheets, analyze raw employee timesheets, and audit active working periods.
							</p>
						</CardContent>
					</div>

					<div className="px-6 pb-6 pt-0 mt-auto">
						<Button asChild size="sm" variant="outline" className="h-8.5 text-[10px] font-black rounded-xl border border-violet-200 bg-violet-50/40 hover:bg-violet-600 text-violet-750 hover:text-white hover:border-violet-600 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1.5 cursor-pointer w-full group/btn">
							<Link href="/hr/attendance">
								Open Dashboard
								<ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
							</Link>
						</Button>
					</div>
				</Card>

				{/* Card 3: Payouts */}
				<Card className="group rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
					<div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />
					
					<div>
						<CardHeader className="pb-3 pt-6 px-6">
							<div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-3xs mb-4 shrink-0">
								<Wallet className="h-5.5 w-5.5" />
							</div>
							<CardTitle className="text-sm font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
								Payouts
							</CardTitle>
						</CardHeader>
						<CardContent className="px-6 pb-6 pt-0">
							<p className="text-xs text-zinc-555 font-semibold leading-relaxed">
								Calculate monthly payroll payouts based on tracked attendance inputs, authorize salary payout ledgers, and download historical reports.
							</p>
						</CardContent>
					</div>

					<div className="px-6 pb-6 pt-0 mt-auto">
						<Button asChild size="sm" variant="outline" className="h-8.5 text-[10px] font-black rounded-xl border border-emerald-250 bg-emerald-50/40 hover:bg-emerald-600 text-emerald-700 hover:text-white hover:border-emerald-600 shadow-3xs hover:-translate-y-0.5 active:scale-97 transition-all flex items-center gap-1.5 cursor-pointer w-full group/btn">
							<Link href="/hr/payouts">
								Open Dashboard
								<ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
							</Link>
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
