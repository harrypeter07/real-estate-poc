import { AdvisorAppShell } from "@/components/advisor/advisor-app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AdvisorLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	let mainAdvisorBanner: { name: string; code: string | null } | null = null;

	if (supabase) {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		const advisorId = (user?.user_metadata as { advisor_id?: string })?.advisor_id;
		if (advisorId) {
			const { data: adv } = await supabase
				.from("advisors")
				.select("parent_advisor_id")
				.eq("id", advisorId)
				.maybeSingle();
			if (adv?.parent_advisor_id) {
				const { data: parent } = await supabase
					.from("advisors")
					.select("name, code")
					.eq("id", adv.parent_advisor_id)
					.maybeSingle();
				if (parent?.name) {
					mainAdvisorBanner = { name: parent.name, code: parent.code ?? null };
				}
			}
		}
	}

	return (
		<AdvisorAppShell mainAdvisorBanner={mainAdvisorBanner}>{children}</AdvisorAppShell>
	);
}
