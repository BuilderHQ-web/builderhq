/**
 * /(main)/index → Dashboard router.
 *
 * The dashboard tab is role-aware: project owners and builders see
 * fundamentally different home screens because they care about
 * different things. The role lives on `useAuth().user.role`, hydrated
 * from /api/mobile/auth/me on boot.
 *
 * This file is purposefully thin — it does role detection only and
 * delegates to the role-specific home component. Each home owns its
 * own data fetch, polish, and empty states.
 *
 * If the user object hasn't hydrated yet (e.g. token in SecureStore
 * but /me hasn't returned), we render an empty Screen — the parent
 * (main)/_layout already guards against unauthenticated access, so
 * the gap is sub-second and unobtrusive.
 */
import { View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { OwnerHome } from "@/components/dashboard/owner-home";

export default function DashboardScreen() {
  const { user, isLoading } = useAuth();

  // Boot frame — user not yet hydrated.
  if (isLoading || !user) {
    return (
      <Screen variant="flat">
        <View className="flex-1" />
      </Screen>
    );
  }

  switch (user.role) {
    case "project_owner":
    case "admin":
      return <OwnerHome />;
    case "builder":
      // Builder home lands in the next pass — share the same data /
      // animation pattern as OwnerHome. For now, fall back to the
      // owner home which gracefully handles a builder via the 403
      // path (the dashboard call returns role=builder hint).
      return <OwnerHome />;
    default:
      return (
        <Screen variant="flat">
          <View className="flex-1" />
        </Screen>
      );
  }
}
