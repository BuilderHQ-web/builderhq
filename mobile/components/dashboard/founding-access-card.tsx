/**
 * <FoundingAccessCard /> — premium FBA showcase, mobile-grade.
 *
 * v3 — simplified background after user feedback:
 *   · Previous version used a diagonal gradient (start 0.2,0 → end
 *     0.8,1) which produced a visible diagonal seam.
 *   · v3 uses a single very subtle top-to-bottom gradient — slight
 *     accent tint at the top fades to pure surface at the bottom.
 *     Reads as a quiet wash of light, not "two colours".
 *
 * Layout is decompressed: FOUNDING MEMBER on its own row, then
 * CYCLE / WINDOW ENDS on a second row with breathing room, then
 * ring + stats, then progress bar.
 */

import * as React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

import { palette, type } from "@/lib/theme";
import { Icon } from "@/lib/icons";

interface Props {
  remaining: number;
  monthlyQuota: number;
  daysToRefresh: number;
  daysToGrantEnd: number;
  cycleIndex: number;
  totalCycles: number;
  totalSavedAud: number;
  lifetimeUnlocks?: number;
  windowEnd?: Date;
}

const RING_SIZE = 124;
const RING_STROKE = 9;

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
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: palette.hairlineAccent,
        backgroundColor: palette.surface,
        // 3D float
        shadowColor: palette.accent,
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 16 },
        shadowRadius: 32,
        elevation: 12,
      }}
    >
      {/* Subtle top-to-bottom wash — accent at the top, surface at the
          bottom. Single axis, very subtle. No diagonal seam. */}
      <LinearGradient
        colors={[
          "rgba(0, 212, 200, 0.07)",
          "rgba(0, 212, 200, 0.02)",
          "rgba(14, 19, 31, 0)",
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ padding: 22 }}
      >
        {/* Founding member badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: palette.accentMuted,
            borderWidth: 1,
            borderColor: palette.hairlineAccent,
            alignSelf: "flex-start",
          }}
        >
          <Icon.Spark size={12} color={palette.accent} />
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "700",
              letterSpacing: 1.8,
              color: palette.accentLight,
            }}
          >
            FOUNDING MEMBER
          </Text>
        </View>

        {/* Cycle + window end */}
        <View
          style={{
            marginTop: 22,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 1.6,
                color: palette.textDim,
              }}
            >
              CYCLE
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: palette.text,
                fontVariant: ["tabular-nums"],
                marginTop: 8,
                letterSpacing: -0.3,
              }}
            >
              {cycleIndex} of {totalCycles}
            </Text>
          </View>
          {windowEndLabel ? (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 1.6,
                  color: palette.textDim,
                }}
              >
                WINDOW ENDS
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: palette.text,
                  marginTop: 8,
                  fontVariant: ["tabular-nums"],
                  letterSpacing: -0.1,
                }}
              >
                {windowEndLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ring + stats */}
        <View
          style={{
            marginTop: 30,
            flexDirection: "row",
            alignItems: "center",
            gap: 24,
          }}
        >
          <ProgressRing fraction={ringFraction}>
            <Text
              style={{
                fontSize: 32,
                lineHeight: 34,
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
                fontSize: 9.5,
                fontWeight: "600",
                letterSpacing: 1.6,
                color: palette.textDim,
                marginTop: 2,
              }}
            >
              OF {monthlyQuota} LEFT
            </Text>
          </ProgressRing>

          <View style={{ flex: 1, gap: 18 }}>
            <StatCell
              label="SAVED SO FAR"
              value={totalSavedAud > 0 ? formatAud(totalSavedAud) : "$0"}
              accent
            />
            <StatCell
              label="LIFETIME UNLOCKS"
              value={String(lifetimeUnlocks)}
            />
          </View>
        </View>

        {/* Cycle progress bar */}
        <View style={{ marginTop: 30 }}>
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
                letterSpacing: 1.6,
                color: palette.textDim,
              }}
            >
              CYCLE PROGRESS
            </Text>
            <Text
              style={{
                fontSize: 12,
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
              marginTop: 10,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={[palette.accent, palette.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: `${cycleProgress}%`,
                height: "100%",
              }}
            />
          </View>
        </View>

        <Text
          style={{
            ...type.bodySmall,
            color: palette.textMuted,
            marginTop: 14,
            letterSpacing: -0.05,
            fontSize: 12.5,
            lineHeight: 18,
          }}
        >
          Refreshes in {daysToRefresh} day{daysToRefresh === 1 ? "" : "s"}.
          Unused credits expire when this cycle ends.
        </Text>
      </LinearGradient>
    </View>
  );
}

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
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
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
          fontSize: 10,
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
          marginTop: 6,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
