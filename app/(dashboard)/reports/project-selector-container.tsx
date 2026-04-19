import { createClient } from "@/lib/supabase/server";
import { ProjectSelector } from "@/components/reports/project-selector";

export default async function ProjectSelectorContainer() {
	const supabase = await createClient();
	if (!supabase) {
		return <ProjectSelector projects={[]} />;
	}

	const { data: projects } = await supabase
		.from("projects")
		.select("id, name")
		.eq("is_active", true)
		.order("name");

	return <ProjectSelector projects={projects ?? []} />;
}

