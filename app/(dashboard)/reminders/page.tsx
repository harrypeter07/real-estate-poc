"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	Plus,
	Bell,
	Calendar,
	User,
	CheckCircle2,
	Clock,
	Filter,
	Search,
	ChevronDown,
	MessageSquare,
	Send,
} from "lucide-react";
import {
	Button,
	Card,
	CardContent,
	Badge,
	Checkbox,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import { PageHeader } from "@/components/shared/page-header";
import { getReminders } from "@/app/actions/reminders";
import { getCustomers } from "@/app/actions/customers";
import { formatDate } from "@/lib/utils/formatters";
import { ReminderItem } from "../../../components/reminders/reminder-item";
import { toast } from "sonner";

export default function RemindersPage() {
	const [reminders, setReminders] = useState<any[]>([]);
	const [customers, setCustomers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [typeFilter, setTypeFilter] = useState("all");
	const [dateFilter, setDateFilter] = useState("all");

	useEffect(() => {
		async function loadData() {
			try {
				const [remindersData, customersData] = await Promise.all([
					getReminders(),
					getCustomers(),
				]);
				setReminders(remindersData);
				setCustomers(customersData);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, []);

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

	if (loading)
		return <div className="p-8 text-center">Loading reminders...</div>;

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

			{/* Filters Bar */}
			<Card className="bg-white border-zinc-200 shadow-sm overflow-hidden">
				<CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
					<div className="space-y-1.5 flex-1">
						<p className="text-[10px] font-bold uppercase text-zinc-500 ml-1">
							Filter by Type
						</p>
						<Select onValueChange={setTypeFilter} value={typeFilter}>
							<SelectTrigger className="bg-zinc-50/50">
								<SelectValue placeholder="All Types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								<SelectItem value="birthday_customer">
									Birthdays (Customer)
								</SelectItem>
								<SelectItem value="birthday_advisor">
									Birthdays (Advisor)
								</SelectItem>
								<SelectItem value="payment">Payments</SelectItem>
								<SelectItem value="token_expiry">Token Expiry</SelectItem>
								<SelectItem value="agreement_expiry">
									Agreement Expiry
								</SelectItem>
								<SelectItem value="installment_due">Installment Due</SelectItem>
								<SelectItem value="crm_followup">CRM Follow-up</SelectItem>
								<SelectItem value="calling">Calling</SelectItem>
								<SelectItem value="other">Others</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5 flex-1">
						<p className="text-[10px] font-bold uppercase text-zinc-500 ml-1">
							Date Range
						</p>
						<Select onValueChange={setDateFilter} value={dateFilter}>
							<SelectTrigger className="bg-zinc-50/50">
								<SelectValue placeholder="All Time" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Time</SelectItem>
								<SelectItem value="today">Today</SelectItem>
								<SelectItem value="last_week">Last 7 Days</SelectItem>
								<SelectItem value="last_month">Last 30 Days</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button
						variant="ghost"
						size="sm"
						className="text-zinc-500 h-10 hover:bg-zinc-100 self-center md:self-auto"
						onClick={() => {
							setTypeFilter("all");
							setDateFilter("all");
						}}
					>
						Reset Filters
					</Button>
				</CardContent>
			</Card>

			{filteredReminders.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 md:p-20 text-center">
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
				<div className="space-y-10">
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
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
							{pendingReminders.length > 0 ? (
								pendingReminders.map((reminder) => (
									<ReminderItem
										key={reminder.id}
										reminder={reminder}
										customers={customers}
									/>
								))
							) : (
								<div className="col-span-full py-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
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
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 opacity-70">
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
