/**
 * /(main)/browse → role-aware browse tab.
 *
 *   · builder → <BuilderBrowse /> — the marketplace (search, filters,
 *               saved hearts, infinite scroll).
 *   · owner / admin → <OwnerBrowse /> — paginated list of their own
 *               projects with a status-filter pill row and a + New FAB.
 *
 * Each variant owns its own data fetch + UX. This file is just a
 * dispatcher so future role splits stay clean.
 */
import { View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { BuilderBrowse } from "@/components/browse/builder-browse";
import { OwnerBrowse } from "@/components/browse/owner-browse";

export default function BrowseScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <Screen variant="flat">
        <View className="flex-1" />
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
          <View className="flex-1" />
        </Screen>
      );
  }
}
