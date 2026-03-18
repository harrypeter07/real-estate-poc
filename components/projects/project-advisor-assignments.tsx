"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import type { AdvisorProjectAssignment } from "@/app/actions/advisor-projects";
import {
	removeAdvisorAssignment,
	upsertAdvisorAssignment,
} from "@/app/actions/advisor-projects";

type Advisor = { id: string; name: string; code: string; phone: string };

export function ProjectAdvisorAssignments({
	projectId,
	advisors,
	assignments,
}: {
	projectId: string;
	advisors: Advisor[];
	assignments: AdvisorProjectAssignment[];
}) {
	const [saving, setSaving] = useState(false);
	const [advisorId, setAdvisorId] = useState<string>("");
	const [token, setToken] = useState<number>(0);
	const [agreement, setAgreement] = useState<number>(0);
	const [registry, setRegistry] = useState<number>(0);
	const [fullPayment, setFullPayment] = useState<number>(0);

	const assignedAdvisorIds = useMemo(
		() => new Set(assignments.map((a) => a.advisor_id)),
		[assignments],
	);

	const availableAdvisors = useMemo(
		() => advisors.filter((a) => !assignedAdvisorIds.has(a.id)),
		[advisors, assignedAdvisorIds],
	);

	async function onAdd() {
		if (!advisorId) {
			toast.error("Select an advisor");
			return;
		}
		setSaving(true);
		try {
			const res = await upsertAdvisorAssignment(projectId, {
				advisor_id: advisorId,
				commission_token: token,
				commission_agreement: agreement,
				commission_registry: registry,
				commission_full_payment: fullPayment,
			});
			if (!res.success) {
				toast.error("Failed to assign", { description: res.error });
				return;
			}
			toast.success("Advisor assigned to project");
			setAdvisorId("");
			setToken(0);
			setAgreement(0);
			setRegistry(0);
			setFullPayment(0);
		} finally {
			setSaving(false);
		}
	}

	async function onRemove(aid: string) {
		setSaving(true);
		try {
			const res = await removeAdvisorAssignment(projectId, aid);
			if (!res.success) {
				toast.error("Failed to remove", { description: res.error });
				return;
			}
			toast.success("Advisor removed from project");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
				<div className="lg:col-span-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
						Advisor
					</label>
					<Select value={advisorId} onValueChange={setAdvisorId}>
						<SelectTrigger className="mt-1">
							<SelectValue placeholder="Select advisor to assign" />
						</SelectTrigger>
						<SelectContent>
							{availableAdvisors.map((a) => (
								<SelectItem key={a.id} value={a.id}>
									{a.name} ({a.code})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-[11px] text-zinc-500 mt-1">
						Commission can be different for each advisor in the same project.
					</p>
				</div>

				<RateInput label="Face 1 Rate (₹/sqft)" value={token} onChange={setToken} />
				<RateInput
					label="Face 2 Rate (₹/sqft)"
					value={agreement}
					onChange={setAgreement}
				/>
				<RateInput label="Face 3 Rate (₹/sqft)" value={registry} onChange={setRegistry} />
				<RateInput
					label="Face 4 Rate (₹/sqft)"
					value={fullPayment}
					onChange={setFullPayment}
				/>
				<div className="lg:col-span-5 flex justify-end">
					<Button onClick={onAdd} disabled={saving || !advisorId} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						Assign Advisor
					</Button>
				</div>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Advisor</TableHead>
						<TableHead className="text-right">Face 1 (₹/sqft)</TableHead>
						<TableHead className="text-right">Face 2 (₹/sqft)</TableHead>
						<TableHead className="text-right">Face 3 (₹/sqft)</TableHead>
						<TableHead className="text-right">Face 4 (₹/sqft)</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{assignments.length === 0 ? (
						<TableRow>
							<TableCell colSpan={6} className="text-sm text-zinc-500">
								No advisors assigned yet.
							</TableCell>
						</TableRow>
					) : (
						assignments.map((a) => (
							<TableRow key={a.id}>
								<TableCell className="font-medium">
									{a.advisor?.name ?? a.advisor_id}
									{a.advisor?.code ? (
										<span className="ml-2 text-xs text-zinc-500">
											({a.advisor.code})
										</span>
									) : null}
								</TableCell>
								<TableCell className="text-right">
									₹ {Number(a.commission_token ?? 0).toLocaleString("en-IN")}
								</TableCell>
								<TableCell className="text-right">
									₹ {Number(a.commission_agreement ?? 0).toLocaleString("en-IN")}
								</TableCell>
								<TableCell className="text-right">
									₹ {Number(a.commission_registry ?? 0).toLocaleString("en-IN")}
								</TableCell>
								<TableCell className="text-right">
									₹ {Number(a.commission_full_payment ?? 0).toLocaleString("en-IN")}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="icon"
										disabled={saving}
										onClick={() => onRemove(a.advisor_id)}
									>
										<Trash2 className="h-4 w-4 text-zinc-500" />
									</Button>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function RateInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<div>
			<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
				{label}
			</label>
			<Input
				className="mt-1"
				type="number"
				min={0}
				step={0.5}
				value={value}
				onChange={(e) => onChange(Number(e.target.value || 0))}
			/>
		</div>
	);
}

