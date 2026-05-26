/**
 * <FoundingAccessCard /> — premium FBA showcase, mobile-grade.
 *
 * Aims higher than the web equivalent: subtle radial accent glow,
 * circular progress ring with the remaining count in the middle, two
 * stat tiles flanking, a horizontal cycle-progress bar, plus the
 * "FOUNDING MEMBER" + "CYCLE N OF M" badges up top.
 *
 *   ┌─ FOUNDING MEMBER · CYCLE 1 OF 3 ────────  WINDOW ENDS 10 AUG ┐
 *   │                                                                │
 *   │            ╭─ progress ring ─╮     SAVED SO FAR                │
 *   │            │      4 OF 5      │    $199                        │
 *   │            ╰──────────────────╯     LIFETIME UNLOCKS           │
 *   │              Free unlocks                1                     │
 *   │              this cycle                                        │
 *   │                                                                │
 *   │   ────────────── 53% cycle progress ──────────                 │
 *   │   Unused credits expire when this cycle ends.                  │
 *   └────────────────────────────────────────────────────────────────┘
 */

import * as React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

import { palette, type } from "@/lib/theme";
import { Icon } from "@/lib/icons";

interface Props {
  remaining: number;
  monthlyQuota: number;
  daysToRefresh: number;
  daysToGrantEnd: number;
  cycleIndex: number; // 1-based
  totalCycles: number;
  totalSavedAud: number;
  lifetimeUnlocks?: number;
  /** ISO date the founding window ends — formatted in the corner. */
  windowEnd?: Date;
}

const RING_SIZE = 132;
const RING_STROKE = 10;

function formatAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FoundingAccessCard({
  remaining,
  monthlyQuota,
  daysToRefresh,
  cycleIndex,
  totalCycles,
  totalSavedAud,
  lifetimeUnlocks = 0,
  windowEnd,
}: Props) {
  const cycleProgress = monthlyQuota > 0
    ? Math.round(((monthlyQuota - remaining) / monthlyQuota) * 100)
    : 0;
  const ringFraction = monthlyQuota > 0 ? remaining / monthlyQuota : 0;

  const windowEndLabel = windowEnd
    ? windowEnd
        .toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        .toUpperCase()
    : null;

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: palette.hairlineAccent,
        backgroundColor: palette.surface,
      }}
    >
      {/* Soft accent radial wash behind everything — sells "premium" */}
      <AccentWash />

      <View style={{ padding: 20 }}>
        {/* Top badges row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: palette.accentMuted,
                borderWidth: 1,
                borderColor: palette.hairlineAccent,
              }}
            >
              <Icon.Spark size={11} color={palette.accent} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1.6,
                  color: palette.accentLight,
                }}
              >
                FOUNDING MEMBER
              </Text>
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 1.4,
                color: palette.textDim,
              }}
            >
              CYCLE {cycleIndex}/{totalCycles}
            </Text>
          </View>
          {windowEndLabel ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  letterSpacing: 1.4,
                  color: palette.textDim,
                }}
              >
                WINDOW ENDS
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: palette.textMuted,
                  marginTop: 2,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {windowEndLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ring + stats — single row, ring on left, stats stacked on right */}
        <View
          style={{
            marginTop: 22,
            flexDirection: "row",
            alignItems: "center",
            gap: 22,
          }}
        >
          <ProgressRing fraction={ringFraction}>
            <Text
              style={{
                fontSize: 30,
                lineHeight: 32,
                fontWeight: "700",
                color: palette.text,
                fontVariant: ["tabular-nums"],
                letterSpacing: -0.6,
              }}
            >
              {remaining}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 1.4,
                color: palette.textDim,
                marginTop: 2,
              }}
            >
              OF {monthlyQuota} LEFT
            </Text>
          </ProgressRing>

          <View style={{ flex: 1, gap: 14 }}>
            <StatCell
              label="SAVED SO FAR"
              value={totalSavedAud > 0 ? formatAud(totalSavedAud) : "$0"}
              accent
            />
            <StatCell label="LIFETIME UNLOCKS" value={String(lifetimeUnlocks)} />
          </View>
        </View>

        {/* Cycle progress bar */}
        <View style={{ marginTop: 22 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 1.4,
                color: palette.textDim,
              }}
            >
              CURRENT CYCLE PROGRESS
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: palette.accentLight,
                fontVariant: ["tabular-nums"],
              }}
            >
              {cycleProgress}%
            </Text>
          </View>
          <View
            style={{
              marginTop: 8,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${cycleProgress}%`,
                height: "100%",
                backgroundColor: palette.accent,
              }}
            />
          </View>
        </View>

        {/* Refresh hint */}
        <Text
          style={{
            ...type.bodySmall,
            color: palette.textDim,
            marginTop: 14,
            letterSpacing: -0.05,
          }}
        >
          Refreshes in {daysToRefresh} day{daysToRefresh === 1 ? "" : "s"}.
          Unused credits expire when this cycle ends.
        </Text>
      </View>
    </View>
  );
}

/**
 * SVG-based circular progress ring with a teal-to-light gradient stroke.
 * The fraction (0–1) is the proportion of the ring that's filled —
 * remaining/total. Children render in the centre.
 */
function ProgressRing({
  fraction,
  children,
}: {
  fraction: number;
  children: React.ReactNode;
}) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dashOffset = c * (1 - clamped);

  return (
    <View
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ position: "absolute" }}
      >
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.accentLight} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Progress arc (rotated -90° so it starts from 12 o'clock) */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={RING_STROKE}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>{children}</View>
    </View>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 9.5,
          fontWeight: "600",
          letterSpacing: 1.6,
          color: palette.textDim,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 22,
          lineHeight: 26,
          fontWeight: "700",
          color: accent ? palette.accentLight : palette.text,
          fontVariant: ["tabular-nums"],
          marginTop: 4,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Faint teal radial wash that lifts the card from the canvas. Sized
 * to bleed beyond the top of the card so the gradient feels like
 * external light, not a painted overlay.
 */
function AccentWash() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -80,
        left: -40,
        right: -40,
        height: 220,
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <SvgGradient id="wash" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={palette.accent} stopOpacity="0.18" />
            <Stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Circle cx="50%" cy="50%" r="60%" fill="url(#wash)" />
      </Svg>
    </View>
  );
}
