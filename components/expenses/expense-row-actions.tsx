"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteExpense } from "@/app/actions/expenses";
import { toast } from "sonner";

export function ExpenseRowActions({ expenseId }: { expenseId: string }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	async function handleDelete() {
		const ok = window.confirm("Delete this expense? This action cannot be undone.");
		if (!ok) return;
		setDeleting(true);
		try {
			const res = await deleteExpense(expenseId);
			if (!res.success) {
				toast.error("Delete failed", { description: res.error });
				return;
			}
			toast.success("Expense deleted");
			router.refresh();
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="flex items-center justify-end gap-1">
			<Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit expense">
				<Link href={`/expenses/${expenseId}/edit`}>
					<Pencil className="h-4 w-4" />
				</Link>
			</Button>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
				title="Delete expense"
				disabled={deleting}
				onClick={() => void handleDelete()}
			>
				{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
			</Button>
		</div>
	);
}
