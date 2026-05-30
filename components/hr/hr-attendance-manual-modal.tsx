"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { upsertManualAttendance } from "@/app/actions/hr";
import type { HrEmployeeRow } from "@/app/actions/hr";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";

type Props = {
	employees: HrEmployeeRow[];
};

export function HrAttendanceManualModal({ employees }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const [employeeId, setEmployeeId] = useState("");
	const [workDate, setWorkDate] = useState(() => new Date().toISOString().split("T")[0]);
	const [attendanceType, setAttendanceType] = useState<"present" | "leave" | "holiday">("present");
	const [inTime, setInTime] = useState("");
	const [outTime, setOutTime] = useState("");
	const [overtimeHours, setOvertimeHours] = useState("");

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!employeeId) {
			toast.error("Please select an employee");
			return;
		}
		if (!workDate) {
			toast.error("Please select a date");
			return;
		}

		setSaving(true);
		try {
			const res = await upsertManualAttendance({
				employee_id: employeeId,
				work_date: workDate,
				attendance_type: attendanceType,
				in_time: attendanceType === "present" ? inTime || undefined : undefined,
				out_time: attendanceType === "present" ? outTime || undefined : undefined,
				overtime_hours: attendanceType === "present" && overtimeHours ? Number(overtimeHours) || 0 : undefined,
			});

			if (!res.success) {
				toast.error("Failed to save attendance", { description: res.error });
				return;
			}

			toast.success("Attendance marked successfully");
			setOpen(false);
			// Reset form
			setEmployeeId("");
			setAttendanceType("present");
			setInTime("");
			setOutTime("");
			setOvertimeHours("");
			router.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setSaving(false);
		}
	}

	const sortedEmployees = [...employees].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="gap-1.5 border-teal-200/80 hover:border-teal-300 text-teal-700 bg-teal-50/20 hover:bg-teal-50/30">
					<Calendar className="h-3.5 w-3.5" />
					Mark attendance manually
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Mark Attendance Manually</DialogTitle>
					<DialogDescription>
						Select an employee, status, date, and working hours to save or update attendance for that day.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={onSubmit} className="space-y-4 py-2">
					<div className="space-y-1.5">
						<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</label>
						<Select value={employeeId} onValueChange={setEmployeeId} disabled={saving}>
							<SelectTrigger className="w-full h-10 rounded-xl">
								<SelectValue placeholder="Select employee..." />
							</SelectTrigger>
							<SelectContent>
								{sortedEmployees.map((emp) => (
									<SelectItem key={emp.id} value={emp.id}>
										<span className="font-mono text-xs text-muted-foreground mr-1.5">#{emp.employee_code}</span>
										{emp.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</label>
							<Input
								type="date"
								value={workDate}
								disabled={saving}
								required
								onChange={(e) => setWorkDate(e.target.value)}
								className="h-10 rounded-xl"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
							<Select
								value={attendanceType}
								disabled={saving}
								onValueChange={(v) => setAttendanceType(v as any)}
							>
								<SelectTrigger className="w-full h-10 rounded-xl">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="present">Present</SelectItem>
									<SelectItem value="leave">Leave</SelectItem>
									<SelectItem value="holiday">Holiday</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{attendanceType === "present" && (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">In Time</label>
									<Input
										type="time"
										value={inTime}
										disabled={saving}
										placeholder="e.g. 09:00"
										onChange={(e) => setInTime(e.target.value)}
										className="h-10 rounded-xl font-mono"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Out Time</label>
									<Input
										type="time"
										value={outTime}
										disabled={saving}
										placeholder="e.g. 18:00"
										onChange={(e) => setOutTime(e.target.value)}
										className="h-10 rounded-xl font-mono"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Overtime Hours</label>
								<Input
									type="number"
									step="0.1"
									min="0"
									value={overtimeHours}
									disabled={saving}
									placeholder="e.g. 1.5 (Optional)"
									onChange={(e) => setOvertimeHours(e.target.value)}
									className="h-10 rounded-xl"
								/>
							</div>
						</>
					)}

					<DialogFooter className="pt-2">
						<Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl">
							Cancel
						</Button>
						<Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								"Save Attendance"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
