"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
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
import { createHrEmployee } from "@/app/actions/hr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HrEmployeeDialog() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		name: "",
		employee_code: "",
		phone: "",
		salary_type: "monthly",
		salary_rate: "",
		overtime_rate: "",
		required_hours_per_week: "48",
		grace_hours: "0",
	});

	const submit = async () => {
		setLoading(true);
		try {
			const res = await createHrEmployee({
				name: form.name,
				employee_code: form.employee_code,
				phone: form.phone || undefined,
				salary_type: form.salary_type,
				salary_rate: Number(form.salary_rate),
				overtime_rate: Number(form.overtime_rate || 0),
				required_hours_per_week: Number(form.required_hours_per_week || 48),
				grace_hours: Number(form.grace_hours || 0),
			});
			if (!res.success) {
				toast.error(res.error ?? "Failed");
				return;
			}
			toast.success("Employee created");
			setOpen(false);
			router.refresh();
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button size="sm" onClick={() => setOpen(true)} className="gap-2">
				<Plus className="h-4 w-4" />
				Add employee
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New employee</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<span className="text-sm font-medium">Name</span>
							<Input
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Employee code</span>
							<Input
								value={form.employee_code}
								onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
								className="font-mono"
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Phone</span>
							<Input
								value={form.phone}
								onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
							/>
						</div>
						<div className="grid gap-1">
							<span className="text-sm font-medium">Salary type</span>
							<Select
								value={form.salary_type}
								onValueChange={(v) => setForm((f) => ({ ...f, salary_type: v }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="daily">Daily</SelectItem>
									<SelectItem value="hourly">Hourly</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="grid gap-1">
								<span className="text-sm font-medium">Salary rate</span>
								<Input
									type="number"
									value={form.salary_rate}
									onChange={(e) => setForm((f) => ({ ...f, salary_rate: e.target.value }))}
								/>
							</div>
							<div className="grid gap-1">
								<span className="text-sm font-medium">Overtime rate / hr</span>
								<Input
									type="number"
									value={form.overtime_rate}
									onChange={(e) => setForm((f) => ({ ...f, overtime_rate: e.target.value }))}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="grid gap-1">
								<span className="text-sm font-medium">Required hrs / week</span>
								<Input
									type="number"
									value={form.required_hours_per_week}
									onChange={(e) =>
										setForm((f) => ({ ...f, required_hours_per_week: e.target.value }))
									}
								/>
							</div>
							<div className="grid gap-1">
								<span className="text-sm font-medium">Grace hours</span>
								<Input
									type="number"
									value={form.grace_hours}
									onChange={(e) => setForm((f) => ({ ...f, grace_hours: e.target.value }))}
								/>
							</div>
						</div>
						<Button disabled={loading || !form.name || !form.employee_code} onClick={submit}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
