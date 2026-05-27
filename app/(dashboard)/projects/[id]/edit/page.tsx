import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getProjectById } from "@/app/actions/project-actions";
import { ProjectEditWrapper } from "@/components/projects/project-edit-wrapper";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: Props) {
	const { id } = await params;
	const project = await getProjectById(id);

	if (!project) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Edit Project"
				subtitle={`Editing: ${project.name}`}
				showBackButton
			/>
			<ProjectEditWrapper project={project} />
		</div>
	);
}
