"use client";

import { useEffect, useState } from "react";
import { 
	Pencil, 
	Plus, 
	Loader2, 
	User, 
	UserPlus, 
	UserCog, 
	Hash, 
	Phone, 
	Briefcase, 
	Coins, 
	Clock, 
	Timer, 
	IndianRupee 
} from "lucide-react";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui";
import { createHrEmployee, updateHrEmployee, type HrEmployeeRow } from "@/app/actions/hr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CreateProps = {
	variant?: "create";
	employee?: undefined;
	open?: undefined;
	onOpenChange?: undefined;
};

type EditProps = {
	variant: "edit";
	employee: HrEmployeeRow;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type HrEmployeeDialogProps = (CreateProps | EditProps) & {
	onSuccess?: () => void;
};

function defaultForm() {
	return {
		name: "",
		employee_code: "",
		phone: "",
		salary_type: "monthly",
		salary_rate: "",
		overtime_rate: "",
		required_hours_per_week: "48",
		grace_hours: "0",
	};
}

function formFromEmployee(e: HrEmployeeRow) {
	return {
		name: e.name ?? "",
		employee_code: e.employee_code ?? "",
		phone: e.phone ?? "",
		salary_type: e.salary_type ?? "monthly",
		salary_rate: String(e.salary_rate ?? ""),
		overtime_rate: String(e.overtime_rate ?? ""),
		required_hours_per_week: String(e.required_hours_per_week ?? 48),
		grace_hours: String(e.grace_hours ?? 0),
	};
}

export function HrEmployeeDialog(props: HrEmployeeDialogProps) {
	const { onSuccess } = props;
	const router = useRouter();
	const isEdit = props.variant === "edit";
	const [internalOpen, setInternalOpen] = useState(false);
	const open = isEdit ? props.open : internalOpen;
	const setOpen = isEdit ? props.onOpenChange : setInternalOpen;

	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState(defaultForm);

	useEffect(() => {
		if (!open) return;
		if (isEdit && props.variant === "edit") {
			setForm(formFromEmployee(props.employee));
			return;
		}
		setForm(defaultForm());
	}, [open, isEdit, isEdit && props.variant === "edit" ? props.employee.id : "create"]);

	const submit = async () => {
		setLoading(true);
		try {
			const payload = {
				name: form.name,
				employee_code: form.employee_code,
				phone: form.phone || undefined,
				salary_type: form.salary_type,
				salary_rate: Number(form.salary_rate),
				overtime_rate: Number(form.overtime_rate || 0),
				required_hours_per_week: Number(form.required_hours_per_week || 48),
				grace_hours: Number(form.grace_hours || 0),
			};
			const res = isEdit
				? await updateHrEmployee(props.employee.id, payload)
				: await createHrEmployee(payload);
			if (!res.success) {
				toast.error(res.error ?? "Failed");
				return;
			}
			toast.success(isEdit ? "Employee updated successfully" : "Employee profile created");
			setOpen(false);
			onSuccess?.();
			await router.refresh();
		} finally {
			setLoading(false);
		}
	};

	const title = isEdit ? "Edit Employee Profile" : "Create New Employee";

	return (
		<>
			{!isEdit && (
				<Button 
					size="sm" 
					onClick={() => setOpen(true)} 
					className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-xs hover:shadow transition-all duration-300 h-9 px-3.5"
				>
					<Plus className="h-4 w-4 shrink-0" />
					Add employee
				</Button>
			)}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-[485px] rounded-2xl p-6 overflow-y-auto">
					<DialogHeader className="flex flex-col items-center text-center pb-4 border-b border-zinc-100">
						<div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-xs mb-3 ${
							isEdit 
								? 'bg-violet-50 text-violet-600 border border-violet-100/60' 
								: 'bg-teal-50 text-teal-600 border border-teal-100/60'
						}`}>
							{isEdit ? <UserCog className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
						</div>
						<DialogTitle className="text-lg font-black tracking-tight text-zinc-800">
							{title}
						</DialogTitle>
						<p className="text-xs text-zinc-500 mt-1 max-w-[320px] leading-relaxed">
							{isEdit 
								? "Modify staffing codes, contact numbers, base wage profiles, and attendance details." 
								: "Initialize an active staff record to configure salary structures and monitor timesheets."}
						</p>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Name input */}
						<div className="grid gap-1.5">
							<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
								Employee Name
							</span>
							<div className="relative">
								<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
									<User className="h-4 w-4" />
								</div>
								<Input
									placeholder="e.g. Samad Khan"
									value={form.name}
									onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
									className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
								/>
							</div>
						</div>

						{/* Grid row: Employee Code & Phone */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							{/* Employee Code input */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Employee Code
								</span>
								<div className="relative">
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
										<Hash className="h-4 w-4" />
									</div>
									<Input
										placeholder="e.g. S123"
										value={form.employee_code}
										onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
										className="!pl-10 h-10 rounded-xl font-mono text-xs border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
									/>
								</div>
								<span className="text-[9px] font-medium text-zinc-400 -mt-0.5 leading-snug">
									Matching code used in attendance sheet upload.
								</span>
							</div>

							{/* Phone Number input */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Phone (10 digits)
								</span>
								<div className="relative">
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
										<Phone className="h-4 w-4" />
									</div>
									<Input
										inputMode="numeric"
										autoComplete="tel"
										maxLength={10}
										placeholder="9876543210"
										value={form.phone}
										onChange={(e) => {
											let val = e.target.value.replace(/\D/g, "");
											while (val.startsWith("0")) {
												val = val.substring(1);
											}
											setForm((f) => ({ ...f, phone: val.slice(0, 10) }));
										}}
										className="!pl-10 h-10 rounded-xl font-mono border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
									/>
								</div>
							</div>
						</div>

						{/* Divider */}
						<div className="border-t border-zinc-100 my-1" />

						{/* Grid row: Salary Type & Salary Rate */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							{/* Salary type dropdown */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Salary Scheme Type
								</span>
								<Select
									value={form.salary_type}
									onValueChange={(v) => setForm((f) => ({ ...f, salary_type: v }))}
								>
									<SelectTrigger className="h-10 rounded-xl border-zinc-200 focus:ring-4 focus:ring-teal-500/8 focus:border-teal-500 hover:border-zinc-300 font-bold transition-all text-xs bg-white">
										<div className="flex items-center gap-2">
											<Briefcase className="h-4 w-4 text-zinc-450 shrink-0" />
											<SelectValue />
										</div>
									</SelectTrigger>
									<SelectContent className="rounded-xl border-zinc-200 shadow-lg font-bold text-xs">
										<SelectItem value="monthly" className="rounded-lg">Monthly Basis</SelectItem>
										<SelectItem value="daily" className="rounded-lg">Daily Basis</SelectItem>
										<SelectItem value="hourly" className="rounded-lg">Hourly Basis</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Salary Rate input */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Salary rate (₹)
								</span>
								<div className="relative">
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
										<IndianRupee className="h-4 w-4" />
									</div>
									<Input
										type="number"
										placeholder="0.00"
										value={form.salary_rate}
										onChange={(e) => setForm((f) => ({ ...f, salary_rate: e.target.value }))}
										className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
									/>
								</div>
							</div>
						</div>

						{/* Grid row: Overtime rate & Required hours */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							{/* Overtime rate input */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Overtime Rate / hr (₹)
								</span>
								<div className="relative">
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
										<Coins className="h-4 w-4" />
									</div>
									<Input
										type="number"
										placeholder="0.00"
										value={form.overtime_rate}
										onChange={(e) => setForm((f) => ({ ...f, overtime_rate: e.target.value }))}
										className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
									/>
								</div>
							</div>

							{/* Required Hours input */}
							<div className="grid gap-1.5">
								<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
									Required hours / week
								</span>
								<div className="relative">
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
										<Timer className="h-4 w-4" />
									</div>
									<Input
										type="number"
										value={form.required_hours_per_week}
										onChange={(e) =>
											setForm((f) => ({ ...f, required_hours_per_week: e.target.value }))
										}
										className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
									/>
								</div>
							</div>
						</div>

						{/* Grace Hours input */}
						<div className="grid gap-1.5">
							<span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
								Grace Hours / month
							</span>
							<div className="relative">
								<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
									<Clock className="h-4 w-4" />
								</div>
								<Input
									type="number"
									value={form.grace_hours}
									onChange={(e) => setForm((f) => ({ ...f, grace_hours: e.target.value }))}
									className="!pl-10 h-10 rounded-xl border-zinc-200 focus-visible:ring-4 focus-visible:ring-teal-500/8 focus-visible:border-teal-500 hover:border-zinc-300 font-bold transition-all placeholder:text-zinc-400"
								/>
							</div>
						</div>

						{/* Save / Update Button */}
						<Button 
							disabled={loading || !form.name || !form.employee_code} 
							onClick={submit}
							className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold h-11 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none disabled:hover:-translate-y-0 transition-all duration-200 select-none flex items-center justify-center gap-2 mt-2"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin shrink-0" />
									<span>Processing...</span>
								</>
							) : (
								<>
									{isEdit ? <Pencil className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
									<span>{isEdit ? "Update profile details" : "Save and register employee"}</span>
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
