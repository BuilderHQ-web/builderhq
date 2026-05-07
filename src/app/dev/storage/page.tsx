import { auth } from "@/modules/auth";
import { redirect } from "next/navigation";

import { listMyDocuments } from "@/modules/documents";
import { StorageDevClient } from "./client";

export const metadata = { title: "Dev · Storage" };

/**
 * /dev/storage — round-trip test page for the documents/R2 module.
 *
 * Sign in as a project_owner, drag-drop a file, watch it upload via
 * presigned PUT and reappear in the list with a working download link.
 *
 * Server-rendered shell loads the user's existing documents (so a
 * refresh keeps the list); the client takes over for upload + the
 * mutating actions.
 */
export default async function DevStoragePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dev/storage");

  const docs = await listMyDocuments(session.user.id!);

  return (
    <main className="mx-auto max-w-[920px] px-6 py-16">
      <div className="mb-10">
        <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
          Dev · Storage
        </span>
        <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[44px] leading-[0.92] text-text">
          R2 round-trip
        </h1>
        <p className="mt-4 max-w-prose text-[14px] leading-[1.7] text-text-subtle">
          Drag-drop a file. The browser will request a presigned URL,
          PUT directly to Cloudflare R2, then we&apos;ll confirm the
          upload server-side and link a short-lived download URL.
        </p>
      </div>

      <StorageDevClient initialDocs={docs} userRole={session.user.role ?? null} />
    </main>
  );
}
