import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import {
  canRead,
  getById,
  getListItem,
  listForUser,
  listMessages,
} from "@/modules/messaging";
import { MessagesShell } from "@/components/app/messaging/messages-shell";

export const metadata = { title: "Messages" };

/** Builder inbox. Mirror of /owner/messages with scope="builder". */
export default async function BuilderMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/builder/messages");
  const userId = session.user.id;

  const conversations = await listForUser(userId);
  const { c: activeId = null } = await searchParams;

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
      scope="builder"
      meId={userId}
      initialConversations={conversations}
      initialActiveId={resolvedActiveId}
      initialActiveThread={initialActiveThread}
    />
  );
}
