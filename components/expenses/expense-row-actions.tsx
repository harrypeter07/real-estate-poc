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
		<div className="flex items-center justify-end gap-1.5">
			<Button 
				asChild 
				size="icon" 
				variant="ghost" 
				className="h-7 w-7 rounded-full border border-zinc-200/40 bg-zinc-50 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-teal-950/30 dark:hover:text-teal-400 dark:hover:border-teal-900/50 shadow-sm transition-all duration-300 hover:shadow-[0_2px_8px_rgba(20,184,166,0.15)] hover:scale-105"
				title="Edit expense"
			>
				<Link href={`/expenses/${expenseId}/edit`}>
					<Pencil className="h-3.5 w-3.5" />
				</Link>
			</Button>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-7 w-7 rounded-full border border-zinc-200/40 bg-zinc-50 text-zinc-500 hover:text-red-650 hover:bg-red-50 hover:border-red-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900/50 shadow-sm transition-all duration-300 hover:shadow-[0_2px_8px_rgba(239,68,68,0.15)] hover:scale-105 animate-in fade-in duration-350"
				title="Delete expense"
				disabled={deleting}
				onClick={() => void handleDelete()}
			>
				{deleting ? (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
				) : (
					<Trash2 className="h-3.5 w-3.5" />
				)}
			</Button>
		</div>
	);
}
