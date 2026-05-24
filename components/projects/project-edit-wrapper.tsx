"use client";

import { ProjectForm } from "@/components/projects/project-form";

interface ProjectEditWrapperProps {
	project: any;
}

export function ProjectEditWrapper({ project }: ProjectEditWrapperProps) {
	return <ProjectForm mode="edit" initialData={project} />;
}
