/**
 * Curated icon set — the only icons the v4 mobile app uses.
 *
 * Why a curation file:
 *   · Lucide ships ~1500 icons. Used unchecked, the app drifts toward
 *     visual noise (different stroke weights, paired-but-not-matching
 *     glyphs, etc.). Premium apps pick a tight ~20-30 icon set and
 *     ship it everywhere.
 *   · This file is the curated set. Anything imported from here
 *     renders at stroke width 1.75 by default for visual consistency.
 *   · If a new screen needs an icon not in this list, ADD IT HERE
 *     (with a comment about which screen needed it) rather than
 *     importing from `lucide-react-native` directly elsewhere.
 *
 * Stroke choice:
 *   · 1.75 sits between Lucide's default (2) and the slimmer 1.5 used
 *     by Phosphor. Reads premium without looking weedy on small sizes.
 *   · Hard rule: stroke width does NOT change per icon. If an icon
 *     looks too thin / thick, choose a different icon, don't fight
 *     the stroke.
 *
 * Sizing:
 *   · 18px — inline with body text
 *   · 20px — kicker icons (default `<Icon />`)
 *   · 24px — list rows, primary CTAs
 *   · 28px — section heroes
 *   · 32px+ — only inside <Moment /> celebrations
 */

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  Hammer,
  Home,
  Image as ImageIcon,
  Inbox,
  LayoutGrid,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  User2,
  X,
  type LucideProps,
} from "lucide-react-native";

/** v4 default stroke width — consistent across every icon, every screen. */
const STROKE = 1.75;

/** Default size — 20px sits at the kicker rhythm. Override at the call site. */
const SIZE = 20;

/**
 * Wrap each lucide icon with our defaults baked in. Icons don't need
 * refs (no consumer in the codebase forwards one), so we skip
 * forwardRef and dodge the LucideProps ref-type narrowing entirely.
 */
function curate(C: React.ComponentType<LucideProps>) {
  return function CuratedIcon(props: LucideProps) {
    return <C strokeWidth={STROKE} size={SIZE} {...props} />;
  };
}

/**
 * The complete v4 icon vocabulary. ~25 icons; if a new screen needs
 * something else, add it here so the next screen reuses the same.
 *
 * Grouped by intent so the next person knows where to add.
 */
export const Icon = {
  // Navigation
  Home: curate(Home),
  Browse: curate(Compass),
  Inbox: curate(Inbox),
  Profile: curate(User2),
  Settings: curate(Settings),
  Search: curate(Search),
  Menu: curate(LayoutGrid),

  // Directional
  ArrowRight: curate(ArrowRight),
  ArrowUpRight: curate(ArrowUpRight),
  ChevronRight: curate(ChevronRight),
  ChevronDown: curate(ChevronDown),
  Close: curate(X),
  More: curate(MoreHorizontal),

  // Status / action
  Check: curate(Check),
  CheckCircle: curate(CheckCircle2),
  Bell: curate(Bell),
  Lock: curate(Lock),
  Plus: curate(Plus),
  Share: curate(Share2),
  Verified: curate(ShieldCheck),

  // Domain (construction marketplace)
  Project: curate(Building2),
  Document: curate(FileText),
  Tender: curate(Hammer),
  Location: curate(MapPin),
  Date: curate(Calendar),
  Image: curate(ImageIcon),
  Message: curate(MessageCircle),

  // Moment / celebration
  Trophy: curate(Trophy),
  Spark: curate(Sparkles),
} as const;

export type IconName = keyof typeof Icon;
