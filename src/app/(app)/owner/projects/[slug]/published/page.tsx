import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { getBySlugForOwner } from "@/modules/projects";

import { PublishedCelebration } from "./published-celebration";

export const metadata = {
  title: "You're live — BuilderHQ",
  robots: { index: false, follow: false },
};

/**
 * The post-publish moment. The wizard redirects here the instant a draft
 * goes live, so the owner lands on a full-screen "you're live" celebration
 * instead of a bare toast — then is handed onward to their project or the
 * dashboard. Re-checks ownership + published status so a stray visit (or a
 * draft) just bounces back to the right place.
 */
export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?next=/owner/projects/${slug}/published`);
  }

  const r = await getBySlugForOwner(session.user.id!, slug);
  if (!r.ok) {
    if (r.error.code === "not_found" || r.error.code === "forbidden") notFound();
    throw new Error(r.error.message);
  }
  const project = r.value;

  // Nothing to celebrate on a draft — send them back to finish it.
  if (project.status === "draft") {
    redirect(`/owner/projects/${slug}/edit`);
  }

  return (
    <PublishedCelebration
      title={project.title}
      slug={project.slug}
      state={project.state}
    />
  );
}
