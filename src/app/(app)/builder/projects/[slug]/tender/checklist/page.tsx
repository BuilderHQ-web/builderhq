import { redirect } from "next/navigation";

/**
 * The checklist is no longer a separate page — the tender IS the deck.
 * Old links and bookmarks land on the tender journey itself.
 */
export default async function ChecklistRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/builder/projects/${slug}/tender`);
}
