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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ welcome?: string }>;
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

  // `?welcome=finish` lands here from the ads-funnel magic-link click
  // when the project couldn't auto-publish (e.g. missing street
  // address). In that case we flag missing required fields with a
  // red error state on first paint so the user instantly sees what's
  // outstanding.
  const sp = (await searchParams) ?? {};
  const flagMissingRequired = sp.welcome === "finish";

  return (
    <ProjectWizard
      initialProject={project}
      initialDocs={docs}
      initialReport={report.ok ? report.value : null}
      flagMissingRequired={flagMissingRequired}
    />
  );
}
