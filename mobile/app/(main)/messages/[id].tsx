/**
 * /(main)/messages/[id] — chat thread screen.
 *
 * WhatsApp-tier UX:
 *   · Dynamic glass header: back, avatar, other-side name, project
 *     subline (smaller), action slot. Background fades into content
 *     on scroll (no hard line).
 *   · Self bubbles right-aligned with brand-gradient; other bubbles
 *     left-aligned with glass tint. Bubbles slide in from below on
 *     mount + arrival.
 *   · Date separators ("Today", "Yesterday", "14 May") between
 *     message groups.
 *   · Read receipts: clock (pending) → single check (delivered) →
 *     double check teal (read by other side). Driven by the
 *     other.lastReadAt timestamp on the conversation row.
 *   · Auto-scroll to bottom on mount + new message; pull-to-refresh
 *     drops to refetch.
 *   · Keyboard-aware composer that grows up to 5 lines, with a
 *     gradient send button that materialises when text present.
 *   · Light haptic on send. Soft success haptic on receive (polling
 *     diff). Real sound effects are a follow-up (need bundled mp3s).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCheck,
  Clock,
  Info,
  Sparkles,
} from "lucide-react-native";

import { Avatar } from "@/components/ui/avatar";
import {
  GlassHeader,
  useGlassHeaderHeight,
} from "@/components/ui/glass-header";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { haptics } from "@/lib/haptics";
import { useThread } from "@/lib/messaging";
import { brandGradient, colors } from "@/lib/theme";
import type {
  MobileConversationListItem,
  MobileMessage,
} from "@/components/messaging/types";

const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = typeof id === "string" ? id : "";
  const { data, isLoading, error, send, markRead, refresh } =
    useThread(conversationId || null);
  const { user } = useAuth();
  const headerHeight = useGlassHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastMessageCount = useRef(0);

  // Mark thread as read on mount + whenever the message count grows.
  useEffect(() => {
    if (data) void markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.conversation.id]);

  // Auto-scroll to bottom on first paint + when new messages arrive.
  useEffect(() => {
    if (!data) return;
    const count = data.messages.length;
    if (count > lastMessageCount.current) {
      // Defer to next tick so the bubble layout has measured.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
      // Polling-driven message arrival (not our own send): soft haptic.
      const newest = data.messages[count - 1];
      if (
        lastMessageCount.current > 0 &&
        newest &&
        newest.senderId === data.conversation.other.id &&
        !newest.pending
      ) {
        void haptics.soft();
      }
    }
    lastMessageCount.current = count;
  }, [data]);

  const onBack = useCallback(() => {
    void haptics.tap();
    if (router.canGoBack()) router.back();
    else router.replace("/(main)/messages");
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void haptics.tap();
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  if (!data) {
    return (
      <Screen variant="flat" edges={[]}>
        <GlassHeader
          left={<BackButton onPress={onBack} />}
          center={
            <Text
              style={{
                color: colors.textFaint,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 13,
              }}
            >
              {isLoading ? "Loading…" : error ?? ""}
            </Text>
          }
        />
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  return (
    <Screen variant="flat" edges={[]}>
      <ThreadHeader conv={data.conversation} onBack={onBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingTop: headerHeight + 12,
            paddingHorizontal: 14,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentLight}
              progressBackgroundColor={colors.bgRaised}
              progressViewOffset={headerHeight}
            />
          }
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          <ThreadBubbles
            messages={data.messages}
            myUserId={user?.id ?? null}
            other={data.conversation.other}
          />
        </ScrollView>

        <Composer onSend={send} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ── Header ──────────────────────────────────────────────────────────

function ThreadHeader({
  conv,
  onBack,
}: {
  conv: MobileConversationListItem;
  onBack: () => void;
}) {
  const presence = useMemo(() => {
    if (!conv.other.lastReadAtIso) return null;
    const diff = Date.now() - Date.parse(conv.other.lastReadAtIso);
    if (diff < PRESENCE_WINDOW_MS) return "active";
    return formatLastSeen(conv.other.lastReadAtIso);
  }, [conv.other.lastReadAtIso]);

  return (
    <GlassHeader
      left={<BackButton onPress={onBack} />}
      center={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Avatar
            name={conv.other.displayName}
            initials={conv.other.initials}
            size={32}
          />
          <View style={{ minWidth: 0, maxWidth: 200 }}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 14,
                fontWeight: "600",
                letterSpacing: -0.1,
              }}
            >
              {conv.other.displayName}
            </Text>
            {presence ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 1,
                }}
              >
                {presence === "active" ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.accent,
                    }}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    color:
                      presence === "active"
                        ? colors.accentLight
                        : colors.textFaint,
                    fontFamily: "DMSans_400Regular",
                    fontSize: 10.5,
                    fontWeight: presence === "active" ? "600" : "400",
                  }}
                >
                  {presence === "active" ? "Active now" : presence}
                </Text>
              </View>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textFaint,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10.5,
                }}
              >
                {conv.projectTitle}
              </Text>
            )}
          </View>
        </View>
      }
      right={
        <Pressable
          onPress={() => {
            void haptics.tap();
            router.push(`/(main)/projects/${conv.projectSlug}` as never);
          }}
          accessibilityRole="button"
          accessibilityLabel="View project"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Info size={15} color={colors.textMuted} strokeWidth={1.7} />
        </Pressable>
      }
    />
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <ArrowLeft size={16} color={colors.text} strokeWidth={1.8} />
    </Pressable>
  );
}

// ── Bubbles ─────────────────────────────────────────────────────────

interface BubbleGroup {
  /** ISO date label ("Today", "Yesterday", "14 May") */
  dateLabel: string;
  messages: MobileMessage[];
}

function ThreadBubbles({
  messages,
  myUserId,
  other,
}: {
  messages: MobileMessage[];
  myUserId: string | null;
  other: MobileConversationListItem["other"];
}) {
  // Group by date for separators.
  const groups = useMemo<BubbleGroup[]>(() => {
    const grouped: BubbleGroup[] = [];
    let currentLabel: string | null = null;
    for (const msg of messages) {
      const label = formatDayLabel(msg.createdAtIso);
      if (label !== currentLabel) {
        grouped.push({ dateLabel: label, messages: [msg] });
        currentLabel = label;
      } else {
        grouped[grouped.length - 1]!.messages.push(msg);
      }
    }
    return grouped;
  }, [messages]);

  if (groups.length === 0) {
    return (
      <View
        style={{
          alignItems: "center",
          paddingVertical: 80,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 212, 200, 0.10)",
            borderWidth: 1,
            borderColor: "rgba(0, 212, 200, 0.30)",
          }}
        >
          <Sparkles size={22} color={colors.accentLight} strokeWidth={1.6} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontFamily: "BebasNeue_400Regular",
            fontSize: 24,
            letterSpacing: -0.3,
            marginTop: 14,
            textTransform: "uppercase",
          }}
        >
          Say hello
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            textAlign: "center",
            lineHeight: 19,
            marginTop: 6,
            maxWidth: 260,
          }}
        >
          Send the first message to {other.displayName}.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      {groups.map((group, gi) => (
        <View key={`${gi}-${group.dateLabel}`}>
          <DateSeparator label={group.dateLabel} />
          {group.messages.map((msg, mi) => {
            const isOther = msg.senderId === other.id;
            const isSystem = msg.kind === "system";
            const previous = group.messages[mi - 1];
            const startsGroup =
              !previous ||
              previous.senderId !== msg.senderId ||
              previous.kind !== msg.kind;
            const next = group.messages[mi + 1];
            const endsGroup =
              !next ||
              next.senderId !== msg.senderId ||
              next.kind !== msg.kind;
            const isLastInThread =
              mi === group.messages.length - 1 &&
              gi === groups.length - 1;

            if (isSystem) {
              return (
                <SystemRow key={msg.id} message={msg} />
              );
            }

            return (
              <Bubble
                key={msg.id}
                message={msg}
                isOther={isOther}
                startsGroup={startsGroup}
                endsGroup={endsGroup}
                showReadReceipt={!isOther && isLastInThread}
                otherLastReadAtIso={other.lastReadAtIso}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        marginVertical: 12,
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          height: 24,
          borderRadius: 12,
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 10.5,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function Bubble({
  message,
  isOther,
  startsGroup,
  endsGroup,
  showReadReceipt,
  otherLastReadAtIso,
}: {
  message: MobileMessage;
  isOther: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  showReadReceipt: boolean;
  otherLastReadAtIso: string | null;
}) {
  // Corner shape: the corner that touches the previous bubble in the
  // same sender's group gets a tighter radius for the iMessage-style
  // grouped feel.
  const radius = 20;
  const tightRadius = 6;
  const bubbleStyle = {
    borderTopLeftRadius: isOther && !startsGroup ? tightRadius : radius,
    borderTopRightRadius: !isOther && !startsGroup ? tightRadius : radius,
    borderBottomLeftRadius: isOther && !endsGroup ? tightRadius : radius,
    borderBottomRightRadius: !isOther && !endsGroup ? tightRadius : radius,
  };
  const time = useMemo(
    () =>
      new Date(message.createdAtIso).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      }),
    [message.createdAtIso],
  );

  // Read state — only shown on the last bubble I sent.
  const isRead =
    !isOther &&
    !message.pending &&
    otherLastReadAtIso != null &&
    Date.parse(otherLastReadAtIso) > Date.parse(message.createdAtIso);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify()}
      style={{
        alignSelf: isOther ? "flex-start" : "flex-end",
        maxWidth: "82%",
        marginTop: startsGroup ? 6 : 2,
      }}
    >
      <View
        style={[
          {
            paddingHorizontal: 14,
            paddingVertical: 9,
            overflow: "hidden",
          },
          bubbleStyle,
        ]}
      >
        {isOther ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              },
              bubbleStyle,
            ]}
          />
        ) : (
          <LinearGradient
            colors={brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, bubbleStyle]}
          />
        )}
        <Text
          style={{
            color: isOther ? colors.text : colors.textInverse,
            fontFamily: "DMSans_400Regular",
            fontSize: 14.5,
            lineHeight: 20,
          }}
        >
          {message.body}
        </Text>
      </View>

      {endsGroup ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 3,
            paddingHorizontal: 6,
            alignSelf: isOther ? "flex-start" : "flex-end",
          }}
        >
          <Text
            style={{
              color: colors.textDim,
              fontFamily: "DMSans_400Regular",
              fontSize: 10,
            }}
          >
            {time}
          </Text>
          {showReadReceipt ? (
            message.pending ? (
              <Clock size={11} color={colors.textDim} strokeWidth={1.7} />
            ) : isRead ? (
              <CheckCheck size={12} color={colors.accentLight} strokeWidth={2} />
            ) : (
              <Check size={12} color={colors.textDim} strokeWidth={2} />
            )
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

function SystemRow({ message }: { message: MobileMessage }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 14,
          backgroundColor: "rgba(0, 212, 200, 0.10)",
          borderWidth: 1,
          borderColor: "rgba(0, 212, 200, 0.28)",
        }}
      >
        <Text
          style={{
            color: colors.accentLight,
            fontFamily: "SpaceGrotesk_500Medium",
            fontSize: 11.5,
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          {message.body}
        </Text>
      </View>
    </View>
  );
}

// ── Composer ────────────────────────────────────────────────────────

function Composer({
  onSend,
}: {
  onSend: (body: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const hasText = draft.trim().length > 0;

  const sendScale = useSharedValue(0);
  const sendAnim = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(hasText ? 1 : 0, {
          mass: 0.35,
          damping: 14,
        }),
      },
    ],
  }));
  void sendScale; // satisfies TS — the animation reads `hasText` directly.

  const submit = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    void haptics.impact();
    const r = await onSend(body);
    setSending(false);
    if (!r.ok) {
      void haptics.error();
      // Restore the text so the user can retry.
      setDraft(body);
    }
  }, [draft, onSend, sending]);

  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
        backgroundColor: "rgba(7, 13, 24, 0.55)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 22,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.10)",
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
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor="rgba(245, 247, 255, 0.32)"
            multiline
            blurOnSubmit={false}
            style={{
              color: colors.text,
              fontFamily: "DMSans_400Regular",
              fontSize: 15,
              lineHeight: 20,
              paddingVertical: 0,
              maxHeight: 100,
            }}
            accessibilityLabel="Type a message"
          />
        </View>
        <Animated.View style={sendAnim}>
          <Pressable
            onPress={submit}
            disabled={!hasText || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <ArrowUp size={20} color={colors.textInverse} strokeWidth={2.4} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) {
    return d.toLocaleDateString("en-AU", { weekday: "long" });
  }
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatLastSeen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "Active just now";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `Last seen ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Last seen ${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `Last seen ${days}d ago`;
  return `Last seen ${d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
}
