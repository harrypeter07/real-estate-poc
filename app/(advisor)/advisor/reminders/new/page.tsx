import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui";
import { ReminderForm } from "@/components/reminders/reminder-form";

export default async function AdvisorNewReminderPage() {
	const supabase = await createClient();
	if (!supabase) redirect("/login");

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const role = (user.user_metadata as any)?.role;
	const advisorId = (user.user_metadata as any)?.advisor_id as string | undefined;
	if (role !== "advisor" || !advisorId) redirect("/dashboard");

	const { data: customers } = await supabase
		.from("customers")
		.select("id, name, phone, route, birth_date")
		.eq("advisor_id", advisorId)
		.eq("is_active", true)
		.order("created_at", { ascending: false });

	return (
		<div className="space-y-6">
			<PageHeader
				title="New Reminder"
				subtitle="Schedule a follow-up for your own customers"
				showBackButton
				action={null}
			/>
			<div className="flex justify-center">
				<ReminderForm
					customers={(customers ?? []) as any[]}
					redirectTo="/advisor/reminders"
				/>
			</div>
		</div>
	);
}

