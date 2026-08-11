import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { projectsBase } from "@/lib/dashboard-route";
import {
  canRead,
  getById,
  getListItem,
  listForUser,
  listMessages,
} from "@/modules/messaging";
import { MessagesShell } from "@/components/app/messaging/messages-shell";

export const metadata = { title: "Messages" };

/**
 * Owner inbox. Hands off to the shared messaging shell with the
 * caller's role baked in (drives sub-labels + project links).
 *
 * Active conversation is driven by `?c=<id>` so deep links survive
 * a refresh. We do the gate + initial thread load server-side to
 * avoid a flash of empty pane on slow connections.
 */
export default async function OwnerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/owner/messages");
  const userId = session.user.id;

  const conversations = await listForUser(userId);
  const { c: activeId = null } = await searchParams;

  // Server-side load of the active thread when the URL specifies one.
  let initialActiveThread = null;
  let resolvedActiveId: string | null = null;
  if (activeId) {
    const conv = await getById(activeId);
    if (conv && canRead(userId, conv)) {
      const [item, msgs] = await Promise.all([
        getListItem(userId, activeId),
        listMessages(activeId),
      ]);
      if (item) {
        initialActiveThread = { conversation: item, messages: msgs };
        resolvedActiveId = activeId;
      }
    }
  }

  return (
    <MessagesShell
      scope="owner"
      projectBase={projectsBase(session.user.role)}
      meId={userId}
      initialConversations={conversations}
      initialActiveId={resolvedActiveId}
      initialActiveThread={initialActiveThread}
    />
  );
}
