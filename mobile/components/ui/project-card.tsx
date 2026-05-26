/**
 * <ProjectCard /> — premium card for project lists.
 *
 * Airbnb-aesthetic: big readable title, location with pin, type +
 * status pills, generous space, scannable at a glance. Used in:
 *   · OwnerHome "Your projects" section
 *   · OwnerHome project carousel
 *   · Projects tab list
 *   · Browse marketplace
 *
 * Visual treatment:
 *   · One solid Surface card with hairline border
 *   · Optional top hairline accent for the featured/active project
 *   · Big title (titleSmall, white, semibold)
 *   · Location row with map pin icon — subtle muted text
 *   · Pill row underneath — type + status, both small
 *   · Bottom stats strip: icon + count for each relevant metric
 *     (tenders / unlocks / unread). Strip is hidden when all are zero.
 *   · Press-aware via <Press> with soft haptic
 *
 * Composition:
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │  Project title here                                │
 *   │  📍 Brunswick · VIC · 3056                          │
 *   │  [Single dwelling]  [Tendering]                    │
 *   │  ─────────────────────────────────────────         │
 *   │  ⚒ 4 tenders   ✓ 3 unlocks   💬 2 unread          │
 *   └────────────────────────────────────────────────────┘
 */
import * as React from "react";
import { Text, View } from "react-native";

import { Icon } from "@/lib/icons";
import { palette, type } from "@/lib/theme";

import { Pill } from "./pill";
import { Press } from "./press";
import { Surface } from "./surface";

interface Props {
  title: string;
  /** Combined location string ("Brunswick · VIC · 3056"). Empty hides the row. */
  location?: string;
  /** Human label for the project type ("Single dwelling"). */
  typeLabel?: string;
  /** Human label for the project status ("Live" / "Tendering" / etc.). */
  statusLabel?: string;
  /** Tone for the status pill — drives accent color. */
  statusTone?: "neutral" | "accent" | "success" | "warning" | "danger";
  /** Stats strip — pass any combination; zero values are hidden. */
  stats?: {
    tenders?: number;
    unlocks?: number;
    unread?: number;
    /** For builder side: builders unlocked / total slots ("3 / 3"). */
    unlockedOf?: { current: number; total: number };
  };
  /** Marks this card as featured/most-active — adds the hairline accent. */
  featured?: boolean;
  /** Tap handler. */
  onPress?: () => void;
  /** Long-press handler — wires the Instagram-style context menu intent. */
  onLongPress?: () => void;
}

export function ProjectCard({
  title,
  location,
  typeLabel,
  statusLabel,
  statusTone = "neutral",
  stats,
  featured = false,
  onPress,
  onLongPress,
}: Props) {
  const hasStats =
    stats &&
    ((stats.tenders ?? 0) > 0 ||
      (stats.unlocks ?? 0) > 0 ||
      (stats.unread ?? 0) > 0 ||
      stats.unlockedOf != null);

  const body = (
    <Surface
      variant={featured ? "accent" : "default"}
      padding={20}
      hairline={featured}
    >
      {/* Title */}
      <Text
        numberOfLines={2}
        style={{
          ...type.title,
          color: palette.text,
          fontWeight: "600",
          letterSpacing: -0.15,
        }}
      >
        {title}
      </Text>

      {/* Location */}
      {location ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          <Icon.Location size={13} color={palette.textDim} />
          <Text
            numberOfLines={1}
            style={{
              ...type.bodySmall,
              color: palette.textMuted,
              flex: 1,
            }}
          >
            {location}
          </Text>
        </View>
      ) : null}

      {/* Pill row */}
      {(typeLabel || statusLabel) && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 14,
          }}
        >
          {typeLabel ? <Pill tone="neutral">{typeLabel}</Pill> : null}
          {statusLabel ? (
            <Pill tone={statusTone}>{statusLabel}</Pill>
          ) : null}
        </View>
      )}

      {/* Stats strip */}
      {hasStats ? (
        <View style={{ marginTop: 16 }}>
          {/* Subtle divider above the stats — visually separates them
              from the meta pills without adding chrome weight. */}
          <View
            style={{
              height: 1,
              backgroundColor: featured
                ? palette.hairlineAccent
                : palette.hairline,
              marginBottom: 14,
              opacity: 0.6,
            }}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
            {(stats!.tenders ?? 0) > 0 && (
              <StatBlock
                icon={<Icon.Tender size={14} color={palette.accentLight} />}
                value={String(stats!.tenders)}
                label={(stats!.tenders ?? 0) === 1 ? "tender" : "tenders"}
                accent
              />
            )}
            {(stats!.unlocks ?? 0) > 0 && (
              <StatBlock
                icon={<Icon.Verified size={14} color={palette.textMuted} />}
                value={String(stats!.unlocks)}
                label={(stats!.unlocks ?? 0) === 1 ? "unlock" : "unlocks"}
              />
            )}
            {(stats!.unread ?? 0) > 0 && (
              <StatBlock
                icon={<Icon.Message size={14} color={palette.accent} />}
                value={String(stats!.unread)}
                label="unread"
                accent
              />
            )}
            {stats!.unlockedOf ? (
              <StatBlock
                icon={<Icon.Lock size={14} color={palette.textMuted} />}
                value={`${stats!.unlockedOf.current}/${stats!.unlockedOf.total}`}
                label="unlocked"
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Surface>
  );

  if (!onPress && !onLongPress) return body;

  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="soft"
      scaleTo={0.98}
    >
      {body}
    </Press>
  );
}

function StatBlock({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      {icon}
      <Text
        style={{
          ...type.bodySmall,
          color: accent ? palette.accentLight : palette.text,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          ...type.bodySmall,
          color: palette.textMuted,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
