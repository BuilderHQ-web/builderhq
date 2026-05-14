/**
 * /(main)/messages — inbox screen.
 *
 * Lists all conversations the caller participates in. Glass header,
 * conversation rows with avatar, name, project subline, last message
 * preview, time, and unread badge. Tap → /(main)/messages/[id].
 */
import { useCallback, useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { MessageSquare } from "lucide-react-native";

import { Screen } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import {
  GlassHeader,
  useGlassHeaderHeight,
} from "@/components/ui/glass-header";
import { RadarPulse } from "@/components/ui/radar-pulse";
import { colors } from "@/lib/theme";
import { haptics } from "@/lib/haptics";
import { useInbox } from "@/lib/messaging";
import type { MobileConversationListItem } from "@/components/messaging/types";

export default function MessagesScreen() {
  const { data, isLoading, error, refresh, isRefreshing } = useInbox();
  const headerHeight = useGlassHeaderHeight();

  return (
    <Screen variant="flat" edges={[]}>
      <GlassHeader
        center={
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 9.5,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Inbox
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 15,
                fontWeight: "600",
                letterSpacing: -0.1,
                marginTop: 1,
              }}
            >
              {data?.totalUnread
                ? `${data.totalUnread} unread`
                : "All conversations"}
            </Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 8,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void haptics.tap();
              void refresh();
            }}
            tintColor={colors.accentLight}
            progressBackgroundColor={colors.bgRaised}
            progressViewOffset={headerHeight}
          />
        }
      >
        <Animated.View entering={FadeInUp.delay(40).duration(420).springify()}>
          <Text
            style={{
              color: colors.accent,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 11,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Messages
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(420).springify()}>
          <Text
            style={{
              color: colors.text,
              fontFamily: "BebasNeue_400Regular",
              fontSize: 52,
              lineHeight: 54,
              letterSpacing: -0.6,
              marginTop: 6,
            }}
          >
            Chats
            <Text style={{ color: colors.accentLight }}>.</Text>
          </Text>
        </Animated.View>

        {isLoading && !data ? (
          <View style={{ marginTop: 32, gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.06)",
                }}
              />
            ))}
          </View>
        ) : error && !data ? (
          <EmptyConversations
            title="Couldn't load"
            copy={error}
            ctaLabel="Try again"
            onCta={() => void refresh()}
          />
        ) : !data?.items.length ? (
          <EmptyConversations
            title="No conversations yet"
            copy="Threads appear here once a builder unlocks a project. They start the conversation; you reply when you're ready."
          />
        ) : (
          <View style={{ marginTop: 24, gap: 10 }}>
            {data.items.map((conv, i) => (
              <Animated.View
                key={conv.id}
                entering={FadeInUp.delay(80 + i * 40).duration(380).springify()}
              >
                <ConversationRow conv={conv} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ── Conversation row ────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: MobileConversationListItem }) {
  const unread = conv.unreadCount > 0;
  const timeLabel = useMemo(
    () => formatChatTime(conv.lastMessageAtIso),
    [conv.lastMessageAtIso],
  );

  const onPress = useCallback(() => {
    void haptics.tap();
    router.push(`/(main)/messages/${conv.id}` as never);
  }, [conv.id]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${conv.other.displayName} about ${conv.projectTitle}`}
      style={{
        padding: 14,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
      <Avatar
        name={conv.other.displayName}
        initials={conv.other.initials}
        size={48}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 14.5,
              fontWeight: unread ? "700" : "600",
            }}
          >
            {conv.other.displayName}
          </Text>
          <Text
            style={{
              color: unread ? colors.accentLight : colors.textDim,
              fontFamily: "DMSans_400Regular",
              fontSize: 11,
              fontWeight: unread ? "600" : "400",
            }}
          >
            {timeLabel}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: colors.textFaint,
            fontFamily: "DMSans_400Regular",
            fontSize: 11.5,
            marginTop: 1,
          }}
        >
          {conv.projectTitle}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
            gap: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: unread ? colors.textMuted : colors.textDim,
              fontFamily: "DMSans_400Regular",
              fontSize: 12.5,
              fontWeight: unread ? "500" : "400",
            }}
          >
            {conv.lastMessagePreview ?? "Conversation started"}
          </Text>
          {unread ? (
            <View
              style={{
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
              }}
            >
              <Text
                style={{
                  color: colors.textInverse,
                  fontFamily: "SpaceGrotesk_500Medium",
                  fontSize: 10,
                  fontWeight: "700",
                  lineHeight: 14,
                }}
              >
                {conv.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ── Empty state ─────────────────────────────────────────────────────

function EmptyConversations({
  title,
  copy,
  ctaLabel,
  onCta,
}: {
  title: string;
  copy: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View
      style={{
        marginTop: 40,
        padding: 28,
        borderRadius: 24,
        backgroundColor: "rgba(255, 255, 255, 0.035)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.10)",
        }}
      />
      <RadarPulse size={96} />
      <Text
        style={{
          color: colors.text,
          fontFamily: "BebasNeue_400Regular",
          fontSize: 26,
          letterSpacing: -0.3,
          marginTop: 18,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
          marginTop: 8,
          maxWidth: 280,
        }}
      >
        {copy}
      </Text>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          style={{
            marginTop: 16,
            paddingHorizontal: 16,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 212, 200, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(0, 212, 200, 0.40)",
          }}
        >
          <Text
            style={{
              color: colors.accentLight,
              fontFamily: "SpaceGrotesk_500Medium",
              fontSize: 12.5,
              fontWeight: "600",
            }}
          >
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatChatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isSameDay) {
    return d.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) {
    return d.toLocaleDateString("en-AU", { weekday: "short" });
  }
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// MessageSquare imported only to keep it as part of the registered
// route's icon catalog (unused locally — Activity row icons are inside
// dashboards). Keeps tree-shake happy.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _quiet = MessageSquare;
