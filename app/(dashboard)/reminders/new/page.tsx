import { PageHeader } from "@/components/shared/page-header";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { getCustomers } from "@/app/actions/customers";

export default async function NewReminderPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="New Reminder" 
        subtitle="Schedule a follow-up or important task" 
        showBackButton
      />
      <div className="flex justify-center">
        <ReminderForm customers={customers} />
      </div>
    </div>
  );
}
