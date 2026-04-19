import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { getProjects } from "@/app/actions/project-actions";
import { getExpenseById } from "@/app/actions/expenses";

export default async function EditExpensePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [projects, expense] = await Promise.all([
		getProjects(),
		getExpenseById(id),
	]);

	if (!expense) notFound();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Expense"
				subtitle="Update recorded office or operational expense"
				showBackButton
			/>
			<div className="flex justify-center">
				<ExpenseForm
					mode="edit"
					initialData={expense}
					projects={projects as any[]}
				/>
			</div>
		</div>
	);
}
