"use client";

import { useState } from "react";
import { UserCheck, Search, Calendar, ChevronLeft } from "lucide-react";
import { Button, Input, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui";
import { toast } from "sonner";
import Link from "next/link";

interface EmployeeItem {
	id: string;
	code: string;
	name: string;
	email: string;
	phone: string;
	role: string;
	department: string;
	joiningDate: string;
	status: string;
}

interface LeaveItem {
	id: string;
	employeeName: string;
	leaveFrom: string;
	leaveTo: string;
	days: number;
	leaveType: string;
	reason: string;
	status: string;
	approvedBy: string | null;
	approvedAt: string | null;
	rejectReason: string;
}

const INITIAL_EMPLOYEES: EmployeeItem[] = [
	{ id: "emp-1", code: "MGI-001", name: "Vikram Rathore", email: "vikram@mginfra.com", phone: "9827012345", role: "Sales Manager", department: "Sales & Marketing", joiningDate: "2024-02-15", status: "active" },
	{ id: "emp-2", code: "MGI-002", name: "Ananya Deshmukh", email: "ananya@mginfra.com", phone: "9009581234", role: "Accountant", department: "Finance & Accounts", joiningDate: "2024-06-10", status: "active" },
	{ id: "emp-3", code: "MGI-003", name: "Siddharth Sen", email: "siddharth@mginfra.com", phone: "7002012903", role: "Recovery Executive", department: "Customer Support", joiningDate: "2025-01-18", status: "active" }
];

const INITIAL_LEAVES: LeaveItem[] = [
	{ id: "leave-1", employeeName: "Vikram Rathore", leaveFrom: "2026-05-28", leaveTo: "2026-05-30", days: 3, leaveType: "casual", reason: "Family function in hometown", status: "pending", approvedBy: null, approvedAt: null, rejectReason: "" },
	{ id: "leave-2", employeeName: "Ananya Deshmukh", leaveFrom: "2026-05-22", leaveTo: "2026-05-22", days: 1, leaveType: "sick", reason: "Severe migraine", status: "approved", approvedBy: "Admin Kumar", approvedAt: "2026-05-22", rejectReason: "" }
];

export default function LeaveConsolePage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
	const [leaves, setLeaves] = useState<LeaveItem[]>(INITIAL_LEAVES);
	const [selectedLeave, setSelectedLeave] = useState<any>(null);
	const [leaveActionOpen, setLeaveActionOpen] = useState(false);
	const [leaveRejectReason, setLeaveRejectReason] = useState("");

	const handleLeaveAction = (leave: any, newStatus: "approved" | "rejected") => {
		setSelectedLeave(leave);
		if (newStatus === "approved") {
			setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: "approved", approvedBy: "Admin Kumar", approvedAt: new Date().toISOString().split("T")[0] } : l));
			toast.success(`Leave approved for ${leave.employeeName}`);
		} else {
			setLeaveActionOpen(true);
		}
	};

	const submitLeaveReject = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedLeave) return;

		setLeaves(prev => prev.map(l => l.id === selectedLeave.id ? { ...l, status: "rejected", rejectReason: leaveRejectReason } : l));
		setLeaveActionOpen(false);
		setLeaveRejectReason("");
		toast.success(`Leave rejected for ${selectedLeave.employeeName}`);
	};

	return (
		<div className="space-y-6">
			{/* Back link & Header */}
			<div className="flex flex-col gap-2">
				<Link href="/hr" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors w-fit">
					<ChevronLeft className="h-3 w-3" /> Back to HR Hub
				</Link>
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
					<div>
						<h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
							<UserCheck className="h-5 w-5 text-amber-500" />
							HR Leave Console & Directory
						</h2>
						<p className="text-xs text-zinc-500">Monitor employee attendances, department designations, and leave pipelines</p>
					</div>
					<div className="relative w-64">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search employee name..."
							className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
						/>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Employee Roster */}
				<div className="lg:col-span-2 space-y-4">
					<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Staff Directory</h3>
					<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Code</TableHead>
										<TableHead>Employee Name</TableHead>
										<TableHead>Role & Department</TableHead>
										<TableHead>Joining Date</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{employees
										.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
										.map((emp) => (
											<TableRow key={emp.id}>
												<TableCell className="font-mono text-xs text-zinc-500">{emp.code}</TableCell>
												<TableCell>
													<div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{emp.name}</div>
													<div className="text-[10px] text-zinc-400 font-mono mt-0.5">{emp.email} • {emp.phone}</div>
												</TableCell>
												<TableCell>
													<div className="text-xs text-zinc-700 dark:text-zinc-300">{emp.role}</div>
													<div className="text-[10px] text-zinc-400 mt-0.5">{emp.department}</div>
												</TableCell>
												<TableCell className="text-xs font-mono text-zinc-505">{emp.joiningDate}</TableCell>
												<TableCell>
													<Badge className="bg-green-50 text-green-700 border-green-200 font-normal">
														{emp.status}
													</Badge>
												</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						</div>
					</Card>
				</div>

				{/* Department Management Panel */}
				<div className="space-y-4">
					<h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Department Segments</h3>
					<Card className="bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800/80 shadow-sm p-4 space-y-4">
						{[
							{ name: "Sales & Marketing", head: "Vikram Rathore", count: 4 },
							{ name: "Finance & Accounts", head: "Ananya Deshmukh", count: 2 },
							{ name: "Customer Support & Recovery", head: "Siddharth Sen", count: 3 }
						].map((dept) => (
							<div key={dept.name} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
								<div>
									<h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-150">{dept.name}</h4>
									<p className="text-[10px] text-zinc-400 mt-0.5">Head: {dept.head}</p>
								</div>
								<Badge variant="outline" className="font-mono text-[10px] text-indigo-700 border-indigo-200 bg-indigo-50/10">
									{dept.count} members
								</Badge>
							</div>
						))}
						<Button size="xs" variant="outline" className="w-full font-semibold border-zinc-205 text-zinc-600 mt-2" onClick={() => toast.success("Opening Department Manager Editor")}>
							Edit Departments
						</Button>
					</Card>
				</div>
			</div>

			{/* Leave Requests approvals Queue */}
			<Card className="border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
				<div className="p-4 border-b border-zinc-100 dark:border-zinc-850 font-bold text-xs uppercase tracking-wider">Leave Applications Queue</div>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Employee Name</TableHead>
								<TableHead>Leave Dates (From - To)</TableHead>
								<TableHead className="text-center">Days</TableHead>
								<TableHead>Leave Type</TableHead>
								<TableHead>Reason</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leaves.map((leave) => {
								let badgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200";
								if (leave.status === "approved") badgeColor = "bg-green-50 text-green-700 border-green-200";
								else if (leave.status === "rejected") badgeColor = "bg-red-50 text-red-700 border-red-200";
								else if (leave.status === "pending") badgeColor = "bg-amber-50 text-amber-700 border-amber-250";

								return (
									<TableRow key={leave.id}>
										<TableCell className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{leave.employeeName}</TableCell>
										<TableCell className="font-mono text-xs text-zinc-500">{leave.leaveFrom} → {leave.leaveTo}</TableCell>
										<TableCell className="text-center font-semibold font-mono text-xs">{leave.days} days</TableCell>
										<TableCell className="capitalize text-xs font-semibold">{leave.leaveType} leave</TableCell>
										<TableCell className="text-xs text-zinc-650 max-w-xs">{leave.reason}</TableCell>
										<TableCell>
											<Badge variant="outline" className={`font-normal uppercase text-[9px] ${badgeColor}`}>
												{leave.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{leave.status === "pending" ? (
												<div className="flex gap-1 justify-end">
													<Button size="xs" className="bg-green-600 hover:bg-green-700 text-white font-medium" onClick={() => handleLeaveAction(leave, "approved")}>Approve</Button>
													<Button size="xs" variant="outline" className="text-red-600 border-red-200 bg-red-50/10 hover:bg-red-50" onClick={() => handleLeaveAction(leave, "rejected")}>Reject</Button>
												</div>
											) : (
												<div className="text-[10px] text-zinc-400 italic">
													{leave.status === "approved" ? `Approved by ${leave.approvedBy}` : `Rejected: ${leave.rejectReason}`}
												</div>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</Card>

			{/* REJECT LEAVE REQUEST MODAL */}
			{leaveActionOpen && selectedLeave && (
				<div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLeaveActionOpen(false)} />
					<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full z-10 overflow-hidden text-zinc-900 dark:text-zinc-50">
						<div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-800 dark:text-zinc-150 text-sm">
							Reject Employee Leave Application
						</div>
						<form onSubmit={submitLeaveReject} className="p-5 space-y-4">
							<div className="text-xs">
								<p className="font-semibold">Employee: {selectedLeave.employeeName}</p>
								<p className="text-zinc-450">Duration: {selectedLeave.leaveFrom} to {selectedLeave.leaveTo} ({selectedLeave.days} days)</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] uppercase font-bold text-zinc-450">Rejection Justification</label>
								<Input
									value={leaveRejectReason}
									onChange={(e) => setLeaveRejectReason(e.target.value)}
									required
									placeholder="e.g. High pending workload at sales end"
									className="h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<Button size="sm" type="button" variant="outline" onClick={() => setLeaveActionOpen(false)}>
									Cancel
								</Button>
								<Button size="sm" type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
									Confirm Reject
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
