/**
 * /(main)/projects → role-aware projects tab.
 *
 * The fourth-from-left tab in the bottom nav. This is the new home
 * of what was previously called "Browse" — but renamed because for
 * project owners it's literally THEIR projects (not a marketplace).
 *
 *   · owner / admin → <OwnerBrowse /> — paginated list of their own
 *                     projects with a status-filter pill row + + New
 *   · builder       → <BuilderBrowse /> — marketplace search/filter
 *
 * The legacy `(main)/browse.tsx` is kept (hidden from tabs) as a
 * backward-compat redirect target.
 */
import { View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { BuilderBrowse } from "@/components/browse/builder-browse";
import { OwnerBrowse } from "@/components/browse/owner-browse";

export default function ProjectsScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <Screen variant="flat">
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  switch (user.role) {
    case "builder":
      return <BuilderBrowse />;
    case "project_owner":
    case "admin":
      return <OwnerBrowse />;
    default:
      return (
        <Screen variant="flat">
          <View style={{ flex: 1 }} />
        </Screen>
      );
  }
}
