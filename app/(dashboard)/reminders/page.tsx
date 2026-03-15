import { PageHeader } from "@/components/shared/page-header";
import { getReminders } from "@/app/actions/reminders";
import { getCustomers } from "@/app/actions/customers";
import { ReminderItem } from "../../../components/reminders/reminder-item";
import { Plus, Clock, CheckCircle2, Bell, Search, Filter } from "lucide-react";
import {
	Button,
	Badge,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Card,
	CardContent,
} from "@/components/ui";
import Link from "next/link";

export default async function RemindersPage({
	searchParams,
}: {
	searchParams: Promise<{ type?: string; date?: string }>;
}) {
	const params = await searchParams;
	const typeFilter = params.type || "all";
	const dateFilter = params.date || "all";

	const [reminders, customers] = await Promise.all([
		getReminders(),
		getCustomers(),
	]);

	const filteredReminders = reminders.filter((r) => {
		// Type Filter
		if (typeFilter !== "all" && r.type !== typeFilter) return false;

		// Date Filter
		if (dateFilter !== "all") {
			const reminderDate = new Date(r.reminder_date);
			reminderDate.setHours(0, 0, 0, 0);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (dateFilter === "today") {
				if (reminderDate.getTime() !== today.getTime()) return false;
			} else if (dateFilter === "last_week") {
				const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
				if (reminderDate < lastWeek || reminderDate > today) return false;
			} else if (dateFilter === "last_month") {
				const lastMonth = new Date(
					today.getFullYear(),
					today.getMonth() - 1,
					today.getDate()
				);
				if (reminderDate < lastMonth || reminderDate > today) return false;
			}
		}

		return true;
	});

	const pendingReminders = filteredReminders.filter((r) => !r.is_completed);
	const completedReminders = filteredReminders.filter((r) => r.is_completed);

	return (
		<div className="max-w-6xl mx-auto space-y-6 px-4 py-6 md:px-0">
			<PageHeader
				title="Reminders"
				subtitle={`${pendingReminders.length} tasks matching filters`}
				action={
					<div className="flex items-center gap-2">
						<Link href="/reminders/new">
							<Button size="sm" className="shadow-sm">
								<Plus className="h-4 w-4 mr-2" />
								New Reminder
							</Button>
						</Link>
					</div>
				}
			/>

			{/* Filters Bar - Since this is a server component, we use links for filters */}
			<Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
				<CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
					<div className="space-y-1.5 flex-1">
						<p className="text-[10px] font-bold uppercase text-zinc-500 ml-1">
							Filter by Type
						</p>
						<div className="flex flex-wrap gap-2">
							{[
								{ label: "All", value: "all" },
								{ label: "Birthdays", value: "birthday_customer" },
								{ label: "Payments", value: "payment" },
								{ label: "CRM", value: "crm_followup" },
							].map((filter) => (
								<Link
									key={filter.value}
									href={`/reminders?type=${filter.value}&date=${dateFilter}`}
									className={cn(
										"text-xs px-3 py-1.5 rounded-full border transition-colors",
										typeFilter === filter.value
											? "bg-zinc-900 text-white border-zinc-900"
											: "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
									)}
								>
									{filter.label}
								</Link>
							))}
						</div>
					</div>

					<div className="space-y-1.5 flex-1">
						<p className="text-[10px] font-bold uppercase text-zinc-500 ml-1">
							Date Range
						</p>
						<div className="flex flex-wrap gap-2">
							{[
								{ label: "All Time", value: "all" },
								{ label: "Today", value: "today" },
								{ label: "Last Week", value: "last_week" },
							].map((filter) => (
								<Link
									key={filter.value}
									href={`/reminders?type=${typeFilter}&date=${filter.value}`}
									className={cn(
										"text-xs px-3 py-1.5 rounded-full border transition-colors",
										dateFilter === filter.value
											? "bg-zinc-900 text-white border-zinc-900"
											: "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
									)}
								>
									{filter.label}
								</Link>
							))}
						</div>
					</div>

					<Link href="/reminders">
						<Button
							variant="ghost"
							size="sm"
							className="text-zinc-500 h-9 hover:bg-zinc-100"
						>
							Reset Filters
						</Button>
					</Link>
				</CardContent>
			</Card>

			{filteredReminders.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 md:p-20 text-center animate-in fade-in zoom-in-95 duration-500">
					<div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm mb-6 border border-zinc-100">
						<Bell className="h-10 w-10 text-zinc-300" />
					</div>
					<h3 className="text-xl font-semibold text-zinc-900">
						No reminders found
					</h3>
					<p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto">
						Try changing your filters or create a new reminder to get started.
					</p>
				</div>
			) : (
				<div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
					{/* Pending Section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
								<Clock className="h-4 w-4" /> Pending Tasks
							</h3>
							<Badge
								variant="outline"
								className="bg-blue-50 text-blue-700 border-blue-100"
							>
								{pendingReminders.length} Tasks
							</Badge>
						</div>
						<div className="grid grid-cols-1 gap-4">
							{pendingReminders.length > 0 ? (
								pendingReminders.map((reminder) => (
									<ReminderItem
										key={reminder.id}
										reminder={reminder}
										customers={customers}
									/>
								))
							) : (
								<div className="py-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
									<p className="text-sm text-zinc-400 italic">
										No pending tasks matching filters
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Completed Section */}
					{completedReminders.length > 0 && (
						<div className="space-y-4 pt-6 border-t border-zinc-100">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
									<CheckCircle2 className="h-4 w-4" /> Completed
								</h3>
								<Badge
									variant="outline"
									className="bg-zinc-50 text-zinc-500 border-zinc-200"
								>
									{completedReminders.length}
								</Badge>
							</div>
							<div className="grid grid-cols-1 gap-4 opacity-70">
								{completedReminders.map((reminder) => (
									<ReminderItem
										key={reminder.id}
										reminder={reminder}
										customers={customers}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
