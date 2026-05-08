import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  getMarketplacePreview,
  getFullForUnlockedBuilder,
  unlockPriceFor,
} from "@/modules/projects";
import { listActiveForProjectUnchecked } from "@/modules/documents";
import { isUnlocked, isSaved } from "@/modules/unlocks";
import { getOwnerContactPublic } from "@/modules/profiles";
import { getStatus } from "@/modules/credits";
import { ProjectDetail } from "./detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug };
}

export default async function BuilderProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?next=/builder/projects/${slug}`);
  const userId = session.user.id!;

  const previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) notFound();
  const preview = previewR.value;

  const [unlocked, saved] = await Promise.all([
    isUnlocked(userId, preview.id),
    isSaved(userId, preview.id),
  ]);

  // If unlocked, fetch the full row + docs for download + owner contact.
  const fullR = unlocked ? await getFullForUnlockedBuilder(slug) : null;
  const docs = await listActiveForProjectUnchecked(preview.id);
  const ownerContact =
    unlocked && fullR?.ok
      ? await getOwnerContactPublic(fullR.value.ownerId)
      : null;
  const fbaStatus = await getStatus(userId);
  const priceAud = unlockPriceFor(preview.type);

  return (
    <ProjectDetail
      preview={preview}
      full={fullR?.ok ? fullR.value : null}
      unlocked={unlocked}
      saved={saved}
      documents={docs}
      ownerContact={ownerContact}
      fbaStatus={fbaStatus}
      priceAud={priceAud}
    />
  );
}
