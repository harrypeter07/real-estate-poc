import { PageHeader } from "@/components/shared/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Add Expense" 
        subtitle="Record a new office or operational expense" 
        showBackButton
      />
      <div className="flex justify-center">
        <ExpenseForm />
      </div>
    </div>
  );
}
