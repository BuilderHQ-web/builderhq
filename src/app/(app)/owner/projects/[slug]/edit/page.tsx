import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  getBySlugForOwner,
  checkPublishability,
} from "@/modules/projects";
import { listForProject } from "@/modules/documents";
import { ProjectWizard } from "./wizard";

export const metadata = { title: "Edit project" };

/**
 * Wizard route. Loads the project + its documents server-side and
 * hands them to the client wizard, which then drives autosave +
 * upload + publish from there.
 */
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/owner/projects/${slug}/edit`);

  const r = await getBySlugForOwner(session.user.id!, slug);
  if (!r.ok) {
    if (r.error.code === "not_found") notFound();
    if (r.error.code === "forbidden") notFound(); // hide existence
    throw new Error(r.error.message);
  }

  const project = r.value;
  const docs = await listForProject(session.user.id!, project.id);
  const report = await checkPublishability(session.user.id!, project.id);

  return (
    <ProjectWizard
      initialProject={project}
      initialDocs={docs}
      initialReport={report.ok ? report.value : null}
    />
  );
}
