/**
 * Shared primitives for the project detail screen.
 *
 * Three modes render the same chrome (sticky header, hero, stat strip,
 * section cards). Splitting them out here keeps the per-mode body
 * components focused on the data they care about — owner cares about
 * tenders received, builder cares about price and unlock state, etc.
 *
 * Mapping tables stay co-located because every body needs them, and
 * the per-status colour rules MUST stay in lockstep across modes (a
 * "submitted" tender pill should be the same teal in every place).
 */
import {
  Building,
  ChevronRight,
  FileText,
  Home as HomeIcon,
  Layers,
  Wrench,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { haptics } from "@/lib/haptics";
import type {
  BuilderTenderSnapshot,
  ProjectConversationRow,
  ProjectDocumentRow,
  ProjectTenderRow,
} from "@/components/dashboard/types";

// ── Mapping tables ───────────────────────────────────────────────────

export const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};
export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
  rejected: "Rejected",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  withdrawn: "Withdrawn",
};
export const STATUS_TONE: Record<
  string,
  { bg: string; ring: string; text: string }
> = {
  draft: {
    bg: "rgba(238,246,255,0.06)",
    ring: "rgba(238,246,255,0.12)",
    text: "#98b8d0",
  },
  published: {
    bg: "rgba(0,212,200,0.10)",
    ring: "rgba(0,212,200,0.30)",
    text: "#7ef5ed",
  },
  tendering: {
    bg: "rgba(0,212,200,0.14)",
    ring: "rgba(0,212,200,0.45)",
    text: "#00d4c8",
  },
  awarded: {
    bg: "rgba(134,239,172,0.10)",
    ring: "rgba(134,239,172,0.30)",
    text: "#86efac",
  },
  archived: {
    bg: "rgba(238,246,255,0.04)",
    ring: "rgba(238,246,255,0.08)",
    text: "#567080",
  },
  rejected: {
    bg: "rgba(255,122,138,0.10)",
    ring: "rgba(255,122,138,0.30)",
    text: "#ff7a8a",
  },
  submitted: {
    bg: "rgba(0,212,200,0.10)",
    ring: "rgba(0,212,200,0.30)",
    text: "#7ef5ed",
  },
  shortlisted: {
    bg: "rgba(125,211,252,0.10)",
    ring: "rgba(125,211,252,0.30)",
    text: "#7dd3fc",
  },
  withdrawn: {
    bg: "rgba(238,246,255,0.04)",
    ring: "rgba(238,246,255,0.08)",
    text: "#567080",
  },
};
export const BUDGET_LABEL: Record<string, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k – $1M",
  "1m_1_5m": "$1M – $1.5M",
  "1_5m_2m": "$1.5M – $2M",
  "2m_3m": "$2M – $3M",
  "3m_5m": "$3M – $5M",
  over_5m: "Over $5M",
};
export const LAND_LABEL: Record<string, string> = {
  under_200: "Under 200 m²",
  "200_400": "200 – 400 m²",
  "400_600": "400 – 600 m²",
  "600_800": "600 – 800 m²",
  "800_1000": "800 – 1000 m²",
  over_1000: "1000 m²+",
};
export const BUILD_LABEL: Record<string, string> = {
  under_100: "Under 100 m²",
  "100_150": "100 – 150 m²",
  "150_200": "150 – 200 m²",
  "200_250": "200 – 250 m²",
  "250_300": "250 – 300 m²",
  "300_400": "300 – 400 m²",
  over_400: "400 m²+",
};
export const RENO_LABEL: Record<string, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  kitchen_and_bathroom: "Kitchen + bathroom",
  full_internal: "Full internal",
  full_internal_and_external: "Internal + external",
  structural: "Structural",
};
export const EXT_TYPE_LABEL: Record<string, string> = {
  ground_floor: "Ground floor",
  first_floor: "First floor",
  ground_and_first: "Ground + first",
  rear: "Rear",
  side: "Side",
};
export const EXT_SIZE_LABEL: Record<string, string> = {
  under_20: "Under 20 m²",
  "20_40": "20 – 40 m²",
  "40_60": "40 – 60 m²",
  "60_80": "60 – 80 m²",
  "80_100": "80 – 100 m²",
  over_100: "100 m²+",
};
export const AGE_LABEL: Record<string, string> = {
  under_10: "Under 10 yrs",
  "10_25": "10 – 25 yrs",
  "25_50": "25 – 50 yrs",
  "50_75": "50 – 75 yrs",
  over_75: "Over 75 yrs",
};

export function typeIcon(type: string, size = 16) {
  const p = { size, color: "#7ef5ed", strokeWidth: 1.6 };
  switch (type) {
    case "single_dwelling":
      return <HomeIcon {...p} />;
    case "multi_dwelling":
      return <Building {...p} />;
    case "renovation":
      return <Wrench {...p} />;
    case "extension":
      return <Layers {...p} />;
    default:
      return <HomeIcon {...p} />;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAud(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

export function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Composables ──────────────────────────────────────────────────────

export function SectionCard({
  kicker,
  icon,
  title,
  children,
}: {
  kicker: string;
  icon: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface-1/40 p-4">
      <View className="flex-row items-center gap-2">
        <View
          className="size-7 rounded-md border border-border-subtle items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.018)" }}
        >
          {icon}
        </View>
        <View>
          <Text className="text-accent text-[9.5px] tracking-[0.22em] uppercase font-ui font-medium">
            {kicker}
          </Text>
          {title ? (
            <Text className="text-text font-ui font-semibold text-[13.5px] mt-0.5">
              {title}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-3">{children}</View>
    </View>
  );
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "accent";
}) {
  const accent = tone === "accent";
  return (
    <View
      className="flex-1 rounded-xl border bg-surface-1/40 px-4 py-3.5"
      style={{
        borderColor: accent
          ? "rgba(0, 212, 200, 0.30)"
          : "rgba(100, 180, 255, 0.10)",
      }}
    >
      <Text className="text-text-faint text-[9.5px] tracking-[0.18em] uppercase font-ui font-medium">
        {label}
      </Text>
      <Text
        className="font-display text-[28px] leading-[1.0] mt-1.5 tracking-[-0.005em]"
        style={{ color: accent ? "#7ef5ed" : "#eef6ff" }}
      >
        {value}
      </Text>
    </View>
  );
}

export function KvGrid({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap -mr-4">{children}</View>;
}

export function Kv({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : value;
  return (
    <View className="w-1/2 pr-4 mb-3">
      <Text className="text-text-faint text-[9px] tracking-[0.16em] uppercase font-ui">
        {label}
      </Text>
      <Text className="text-text font-ui font-medium text-[13.5px] mt-1">
        {display}
      </Text>
    </View>
  );
}

export function DocumentRow({ doc }: { doc: ProjectDocumentRow }) {
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-center gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View
        className="size-9 rounded-md border border-border-subtle items-center justify-center"
        style={{ backgroundColor: "rgba(0, 212, 200, 0.05)" }}
      >
        <FileText size={14} color="#7ef5ed" strokeWidth={1.6} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-text text-[13px] font-ui" numberOfLines={1}>
          {doc.filename}
        </Text>
        <Text className="text-text-faint text-[10.5px] mt-0.5">
          {doc.category.replace(/_/g, " ")} · v{doc.version} ·{" "}
          {formatBytes(doc.sizeBytes)}
        </Text>
      </View>
      <ChevronRight size={14} color="#567080" strokeWidth={1.7} />
    </Pressable>
  );
}

export function OwnerTenderRow({ tender }: { tender: ProjectTenderRow }) {
  const tone = STATUS_TONE[tender.status] ?? STATUS_TONE.archived!;
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-center gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View className="flex-1 min-w-0">
        <Text
          className="text-text text-[13.5px] font-ui font-semibold"
          numberOfLines={1}
        >
          {tender.builder.displayName}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <Text className="text-text-faint text-[11px]">
            {tender.totalPriceAud != null
              ? formatAud(tender.totalPriceAud)
              : "—"}
          </Text>
          {tender.durationWeeks != null ? (
            <>
              <Text className="text-text-dim text-[11px]">·</Text>
              <Text className="text-text-faint text-[11px]">
                {tender.durationWeeks} wks
              </Text>
            </>
          ) : null}
          {tender.submittedAt ? (
            <>
              <Text className="text-text-dim text-[11px]">·</Text>
              <Text className="text-text-faint text-[11px]">
                {relativeTime(tender.submittedAt)}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View
        className="px-2 h-6 rounded-full justify-center border"
        style={{ backgroundColor: tone.bg, borderColor: tone.ring }}
      >
        <Text
          className="text-[9.5px] tracking-[0.16em] uppercase font-ui font-semibold"
          style={{ color: tone.text }}
        >
          {STATUS_LABEL[tender.status] ?? tender.status}
        </Text>
      </View>
    </Pressable>
  );
}

export function MyTenderRow({ tender }: { tender: BuilderTenderSnapshot }) {
  const tone = STATUS_TONE[tender.status] ?? STATUS_TONE.draft!;
  return (
    <View
      className="rounded-lg border border-border-subtle bg-surface-1/30 px-4 py-3"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="text-text-faint text-[10px] tracking-[0.18em] uppercase font-ui font-medium">
            Your tender
          </Text>
          <View className="flex-row items-baseline gap-2 mt-1">
            <Text className="text-text font-display text-[24px] tracking-[-0.005em]">
              {tender.totalPriceAud != null ? formatAud(tender.totalPriceAud) : "—"}
            </Text>
            {tender.durationWeeks != null ? (
              <Text className="text-text-muted text-[12.5px]">
                · {tender.durationWeeks} wks
              </Text>
            ) : null}
          </View>
        </View>
        <View
          className="px-2.5 h-7 rounded-full justify-center border"
          style={{ backgroundColor: tone.bg, borderColor: tone.ring }}
        >
          <Text
            className="text-[9.5px] tracking-[0.18em] uppercase font-ui font-semibold"
            style={{ color: tone.text }}
          >
            {STATUS_LABEL[tender.status] ?? tender.status}
          </Text>
        </View>
      </View>
      {tender.submittedAt ? (
        <Text className="text-text-faint text-[11px] mt-2">
          Submitted {relativeTime(tender.submittedAt)}
        </Text>
      ) : null}
    </View>
  );
}

export function ConversationRow({ conv }: { conv: ProjectConversationRow }) {
  const unread = conv.unreadCount > 0;
  return (
    <Pressable
      onPress={() => void haptics.tap()}
      className="flex-row items-start gap-3 py-2.5 rounded-md active:bg-surface-1/40"
    >
      <View
        className="size-9 rounded-full items-center justify-center border"
        style={{
          backgroundColor: unread
            ? "rgba(0, 212, 200, 0.10)"
            : "rgba(100, 180, 255, 0.05)",
          borderColor: unread
            ? "rgba(0, 212, 200, 0.30)"
            : "rgba(100, 180, 255, 0.10)",
        }}
      >
        <FileText
          size={14}
          color={unread ? "#7ef5ed" : "#98b8d0"}
          strokeWidth={1.6}
        />
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-text text-[13px] font-ui"
          numberOfLines={1}
          style={{ fontWeight: unread ? "600" : "500" }}
        >
          {conv.builderName}
        </Text>
        {conv.lastMessagePreview ? (
          <Text
            className="text-text-faint text-[11.5px] mt-0.5"
            numberOfLines={1}
          >
            {conv.lastMessagePreview}
          </Text>
        ) : null}
      </View>
      {unread ? (
        <View className="px-1.5 h-5 min-w-[20px] rounded-full bg-accent items-center justify-center">
          <Text className="text-accent-contrast text-[10px] font-ui font-semibold tabular-nums">
            {conv.unreadCount}
          </Text>
        </View>
      ) : (
        <ChevronRight size={14} color="#567080" strokeWidth={1.7} />
      )}
    </Pressable>
  );
}
