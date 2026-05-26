/**
 * <ActivityRow /> — premium notification timeline row.
 *
 * Composition:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  ⊙   Title (semibold)                              · 2h    │
 *   │      Subtitle line goes here, muted color                   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The leading glyph is the key visual signal — its background +
 * icon color are tuned per notification kind so you know what TYPE
 * of event at a single glance:
 *   · Trophy/awarded   — solid accent + accent-contrast trophy
 *   · Tender submitted — accent muted + accent tender icon
 *   · Shortlisted      — warning muted + warning check
 *   · Rejected/closed  — danger muted + danger X
 *   · Message          — accent muted + accent message bubble
 *   · System/other     — surface elev + dim bell
 *
 * Unread rows get a tiny accent dot in the trailing time area so the
 * "what's new" affordance lives at the time column.
 */
import * as React from "react";
import { Text, View } from "react-native";

import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";

import { Press } from "./press";

type ActivityKind =
  | "tender_submitted"
  | "tender_shortlisted"
  | "tender_awarded"
  | "tender_rejected"
  | "tender_withdrawn"
  | "message"
  | "project_published"
  | "system";

interface Props {
  kind: string;
  title: string;
  subtitle?: string | null;
  /** Pre-formatted relative time string ("2h", "yesterday"). */
  time?: string;
  /** Read state — drives the accent dot in the trailing slot. */
  unread?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ActivityRow({
  kind,
  title,
  subtitle,
  time,
  unread = false,
  onPress,
  onLongPress,
}: Props) {
  const visual = visualFor(kind as ActivityKind);

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
      }}
    >
      {/* Leading glyph — kind-specific background + icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: visual.bg,
          borderWidth: 1,
          borderColor: visual.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {visual.icon}
      </View>

      {/* Body */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            ...type.bodySmall,
            color: palette.text,
            fontWeight: "600",
            letterSpacing: -0.1,
            fontSize: 14,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              ...type.bodySmall,
              color: palette.textMuted,
              marginTop: 2,
              fontSize: 12.5,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Trailing: time + optional unread dot */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {unread ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: palette.accent,
            }}
          />
        ) : null}
        {time ? (
          <Text
            style={{
              ...type.caption,
              color: unread ? palette.accentLight : palette.textDim,
              letterSpacing: 0.3,
              fontWeight: "600",
            }}
          >
            {time}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress && !onLongPress) return body;

  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="soft"
      scaleTo={0.99}
    >
      {body}
    </Press>
  );
}

interface Visual {
  bg: string;
  border: string;
  icon: React.ReactNode;
}

function visualFor(kind: ActivityKind | string): Visual {
  switch (kind) {
    case "tender_awarded":
      return {
        bg: palette.accent,
        border: palette.accent,
        icon: <Icon.Trophy size={18} color={palette.accentContrast} />,
      };
    case "tender_submitted":
      return {
        bg: palette.accentMuted,
        border: palette.hairlineAccent,
        icon: <Icon.Tender size={18} color={palette.accentLight} />,
      };
    case "tender_shortlisted":
      return {
        bg: palette.warningMuted,
        border: "rgba(251, 191, 36, 0.30)",
        icon: <Icon.CheckCircle size={18} color={palette.warning} />,
      };
    case "tender_rejected":
    case "tender_withdrawn":
      return {
        bg: palette.dangerMuted,
        border: "rgba(251, 113, 133, 0.30)",
        icon: <Icon.Close size={18} color={palette.danger} />,
      };
    case "message":
      return {
        bg: palette.accentMuted,
        border: palette.hairlineAccent,
        icon: <Icon.Message size={18} color={palette.accent} />,
      };
    case "project_published":
      return {
        bg: palette.successMuted,
        border: "rgba(94, 234, 212, 0.30)",
        icon: <Icon.Spark size={18} color={palette.success} />,
      };
    default:
      return {
        bg: palette.surfaceElev,
        border: palette.hairline,
        icon: <Icon.Bell size={18} color={palette.textDim} />,
      };
  }
}
