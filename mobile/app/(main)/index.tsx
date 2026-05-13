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
import { BuilderHome } from "@/components/dashboard/builder-home";
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
      return <OwnerHome />;
    case "builder":
      return <BuilderHome />;
    case "admin":
      // Admins are rare and ops-heavy; we surface the owner dashboard
      // by default since admin accounts typically also own test
      // projects. A proper admin tools screen can land later.
      return <OwnerHome />;
    default:
      return (
        <Screen variant="flat">
          <View className="flex-1" />
        </Screen>
      );
  }
}
