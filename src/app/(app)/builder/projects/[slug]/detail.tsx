"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Building,
  Wrench,
  Layers,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Bookmark,
  BookmarkCheck,
  Lock,
  Unlock,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Download,
  Sparkles,
  Check,
  Mail,
  Phone,
  Briefcase,
  MessageSquare,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import {
  unlockProjectAction,
  startUnlockCheckoutAction,
  amIUnlockedAction,
  saveProjectAction,
  unsaveProjectAction,
  getBuilderDownloadUrlAction,
} from "@/app/(app)/_actions/marketplace";
import type { MarketplacePreview, Project } from "@/modules/projects";
import type { Document, DocumentCategory } from "@/modules/documents";
import type { OwnerContact } from "@/modules/profiles";
import type { FbaStatus } from "@/modules/credits";
import type { ConversationListItem } from "@/modules/messaging";
// Direct constants import — keeps the server-only unlocks service
// out of this client bundle. See modules/users/index.ts for the
// equivalent pattern.
import { UNLOCK_CAP } from "@/modules/unlocks/constants";
import {
  ProjectMessagingPanel,
  totalUnread,
} from "@/components/app/messaging/project-thread";
import { cn, truncate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Reveal } from "@/components/app/reveal";

// ── lookup labels ────────────────────────────────────────────────────────

const TYPE_META: Record<MarketplacePreview["type"], { label: string; icon: React.ReactNode }> = {
  single_dwelling: { label: "Single dwelling", icon: <Home className="size-4" /> },
  multi_dwelling: { label: "Multi-dwelling", icon: <Building className="size-4" /> },
  renovation: { label: "Renovation", icon: <Wrench className="size-4" /> },
  extension: { label: "Extension", icon: <Layers className="size-4" /> },
};

const BUDGET_LABEL: Record<NonNullable<MarketplacePreview["budgetBand"]>, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k – $1M",
  "1m_1_5m": "$1M – $1.5M",
  "1_5m_2m": "$1.5M – $2M",
  "2m_3m": "$2M – $3M",
  "3m_5m": "$3M – $5M",
  over_5m: "Over $5M",
};

const LAND_LBL: Record<NonNullable<MarketplacePreview["landSizeBand"]>, string> = {
  under_200: "Under 200 m²",
  "200_400": "200 – 400 m²",
  "400_600": "400 – 600 m²",
  "600_800": "600 – 800 m²",
  "800_1000": "800 – 1000 m²",
  over_1000: "1000 m²+",
};

const BUILD_LBL: Record<NonNullable<MarketplacePreview["buildSizeBand"]>, string> = {
  under_100: "Under 100 m²",
  "100_150": "100 – 150 m²",
  "150_200": "150 – 200 m²",
  "200_250": "200 – 250 m²",
  "250_300": "250 – 300 m²",
  "300_400": "300 – 400 m²",
  over_400: "400 m²+",
};

const RENO_LBL: Record<NonNullable<MarketplacePreview["renovationScope"]>, string> = {
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  kitchen_and_bathroom: "Kitchen + bathroom",
  full_internal: "Full internal",
  full_internal_and_external: "Internal + external",
  structural: "Structural",
};

const EXT_TYPE_LBL: Record<NonNullable<MarketplacePreview["extensionType"]>, string> = {
  ground_floor: "Ground floor",
  first_floor: "First floor",
  ground_and_first: "Ground + first",
  rear: "Rear",
  side: "Side",
};

const EXT_SIZE_LBL: Record<NonNullable<MarketplacePreview["extensionSizeBand"]>, string> = {
  under_20: "Under 20 m²",
  "20_40": "20 – 40 m²",
  "40_60": "40 – 60 m²",
  "60_80": "60 – 80 m²",
  "80_100": "80 – 100 m²",
  over_100: "100 m²+",
};

const AGE_LBL: Record<NonNullable<MarketplacePreview["existingAgeBand"]>, string> = {
  under_10: "Under 10 yrs",
  "10_25": "10 – 25 yrs",
  "25_50": "25 – 50 yrs",
  "50_75": "50 – 75 yrs",
  over_75: "Over 75 yrs",
};

const DOC_CAT_LABEL: Record<DocumentCategory, string> = {
  architectural: "Architectural plans",
  structural_engineering: "Structural engineering",
  civil_engineering: "Civil engineering",
  specifications: "Project specifications",
  land_report: "Land report",
  soil_report: "Soil report",
  energy_rating: "Energy efficiency",
  town_planning: "Town planning",
  other: "Other",
};

// ── component ────────────────────────────────────────────────────────────

export function ProjectDetail({
  preview,
  full,
  unlocked: unlockedInitial,
  saved: savedInitial,
  documents,
  ownerContact,
  fbaStatus,
  priceAud,
  myTenderStatus,
  viewerMode,
  myUserId,
  initialConversations,
}: {
  preview: MarketplacePreview;
  full: Project | null;
  unlocked: boolean;
  saved: boolean;
  documents: Document[];
  ownerContact: OwnerContact | null;
  fbaStatus: FbaStatus;
  priceAud: number;
  myUserId: string;
  initialConversations: ConversationListItem[];
  myTenderStatus:
    | "draft"
    | "submitted"
    | "withdrawn"
    | "shortlisted"
    | "awarded"
    | "rejected"
    | null;
  /** Builder isn't approved yet — render the verify-to-unlock panel
   *  instead of the FBA-aware unlock bar. null when approved. */
  viewerMode: {
    abnVerified: boolean;
    anyLicenceVerified: boolean;
  } | null;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(unlockedInitial);
  const [saved, setSaved] = useState(savedInitial);
  const [confirming, setConfirming] = useState(false);
  const [unlocking, startUnlock] = useTransition();
  const [savingPending, startSave] = useTransition();
  const meta = TYPE_META[preview.type];

  // Returning from Stripe Checkout: ?unlock=success (poll until the
  // webhook has granted the unlock) or ?unlock=cancelled (no charge made).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("unlock");
    if (!status) return;
    // Strip the query so a manual refresh doesn't re-trigger this.
    window.history.replaceState({}, "", window.location.pathname);

    if (status === "cancelled") {
      toast.error("Checkout cancelled", "No charge was made — you can unlock any time.");
      return;
    }
    if (status === "success" && !unlockedInitial) {
      // Deferred so it isn't a synchronous setState in the effect body.
      queueMicrotask(() => setConfirming(true));
      let tries = 0;
      const tick = async () => {
        tries += 1;
        const r = await amIUnlockedAction(preview.id);
        if (r.ok && r.value.unlocked) {
          setUnlocked(true);
          setConfirming(false);
          toast.success(
            "Project unlocked",
            "Payment received — message the owner and submit your tender.",
          );
          router.refresh();
          return;
        }
        if (tries >= 10) {
          setConfirming(false);
          toast.success(
            "Payment received",
            "We're finalising your unlock — refresh in a moment if it's not showing.",
          );
          return;
        }
        window.setTimeout(tick, 1500);
      };
      window.setTimeout(tick, 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onToggleSave = () => {
    startSave(async () => {
      if (saved) {
        const r = await unsaveProjectAction(preview.id);
        if (r.ok) setSaved(false);
      } else {
        const r = await saveProjectAction(preview.id);
        if (r.ok) setSaved(true);
      }
    });
  };

  const onUnlock = () => {
    startUnlock(async () => {
      const r = await unlockProjectAction(preview.id);
      if (!r.ok) {
        // Defence-in-depth: if the server returns viewer_mode here
        // (server state moved between page-load and click), nudge
        // the user to the profile rather than showing a generic toast.
        const reason = (r.error.details as { reason?: string } | undefined)
          ?.reason;
        if (reason === "viewer_mode") {
          toast.error(
            "Verify your business to unlock",
            "We need to confirm your ABN + licence first. Opening your profile.",
          );
          router.push("/builder/profile");
          return;
        }
        if (reason === "project_full") {
          toast.error(
            "Project is full",
            "Another builder unlocked the last spot — try a similar project.",
          );
          router.refresh();
          return;
        }
        toast.error("Couldn't unlock", r.error.message);
        return;
      }
      setUnlocked(true);
      toast.success("Project unlocked", "You can now message the owner and submit a tender.");
      router.refresh();
    });
  };

  // Paid unlock → hosted Stripe Checkout. The unlock itself is granted
  // server-side by the webhook on payment capture; we hand off to the
  // secure checkout URL and the useEffect above handles the return.
  const onPaidUnlock = () => {
    startUnlock(async () => {
      const r = await startUnlockCheckoutAction(preview.slug);
      if (!r.ok) {
        const reason = (r.error.details as { reason?: string } | undefined)?.reason;
        if (reason === "viewer_mode") {
          toast.error(
            "Verify your business to unlock",
            "We need to confirm your ABN + licence first. Opening your profile.",
          );
          router.push("/builder/profile");
          return;
        }
        if (reason === "project_full") {
          toast.error(
            "Project is full",
            "Another builder unlocked the last spot — try a similar project.",
          );
          router.refresh();
          return;
        }
        toast.error("Couldn't start checkout", r.error.message);
        return;
      }
      if (r.value.alreadyUnlocked) {
        setUnlocked(true);
        toast.success("Already unlocked", "You already have access to this project.");
        router.refresh();
        return;
      }
      if (r.value.url) {
        // Full-page redirect to Stripe's hosted checkout page.
        window.location.href = r.value.url;
      }
    });
  };

  // Group docs by category for display.
  const docsByCategory = documents.reduce<Record<string, Document[]>>(
    (acc, d) => {
      (acc[d.category] ??= []).push(d);
      return acc;
    },
    {},
  );

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="border-b border-border-subtle bg-bg-deep/30">
        <div className="px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8 mx-auto max-w-[1200px]">
          <Link
            href="/builder/browse"
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4 sm:mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to browse
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium flex-wrap">
                {meta.icon}
                {meta.label}
                <span className="text-text-dim/60 mx-1">·</span>
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 text-accent-light">
                    <Unlock className="size-3" />
                    Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-text-dim">
                    <Lock className="size-3" />
                    Preview
                  </span>
                )}
              </span>
              <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[28px] sm:text-[44px] leading-[0.95] text-text break-words">
                {preview.title}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-text-muted">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {preview.suburb && preview.state ? (
                    <>
                      {preview.suburb}, {preview.state}
                      {preview.postcode ? ` ${preview.postcode}` : ""}
                    </>
                  ) : (
                    "Location pending"
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSave}
                disabled={savingPending}
                className={cn(
                  "inline-flex items-center gap-1.5 h-11 px-4 rounded-full border text-[12px] tracking-[0.04em] transition-colors",
                  saved
                    ? "border-border-accent bg-accent-muted/40 text-accent-light"
                    : "border-border-strong text-text hover:bg-surface-1",
                )}
              >
                {savingPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : saved ? (
                  <BookmarkCheck className="size-3.5" />
                ) : (
                  <Bookmark className="size-3.5" />
                )}
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 sm:gap-5">
          {/* Left — public details (staggered entrance) */}
          <div className="space-y-5">
            <Reveal immediate delay={0.04}>
            <Card title="The build" icon={meta.icon}>
              <KvGrid>
                {preview.type === "multi_dwelling" ? (
                  <Kv label="Dwellings" value={preview.dwellingCount} />
                ) : null}
                <Kv label="Bedrooms" value={preview.bedrooms} />
                <Kv label="Bathrooms" value={preview.bathrooms} />
                {preview.type !== "multi_dwelling" ? (
                  <Kv label="Storeys" value={preview.floors} />
                ) : null}
                <Kv
                  label="Land size"
                  value={preview.landSizeBand ? LAND_LBL[preview.landSizeBand] : null}
                />
                <Kv
                  label="Build size"
                  value={preview.buildSizeBand ? BUILD_LBL[preview.buildSizeBand] : null}
                />
                {preview.type === "renovation" ? (
                  <>
                    <Kv
                      label="Scope"
                      value={
                        preview.renovationScope
                          ? RENO_LBL[preview.renovationScope]
                          : null
                      }
                    />
                    <Kv
                      label="Existing age"
                      value={
                        preview.existingAgeBand
                          ? AGE_LBL[preview.existingAgeBand]
                          : null
                      }
                    />
                  </>
                ) : null}
                {preview.type === "extension" ? (
                  <>
                    <Kv
                      label="Type"
                      value={
                        preview.extensionType
                          ? EXT_TYPE_LBL[preview.extensionType]
                          : null
                      }
                    />
                    <Kv
                      label="Size"
                      value={
                        preview.extensionSizeBand
                          ? EXT_SIZE_LBL[preview.extensionSizeBand]
                          : null
                      }
                    />
                  </>
                ) : null}
              </KvGrid>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.10}>
            <Card title="Budget & timeline" icon={<DollarSign className="size-4" />}>
              <KvGrid>
                <Kv
                  label="Budget"
                  value={preview.budgetBand ? BUDGET_LABEL[preview.budgetBand] : null}
                />
                <Kv label="Target start" value={preview.targetStartMonth} />
                <Kv label="Target completion" value={preview.targetCompletionMonth} />
              </KvGrid>
            </Card>
            </Reveal>

            {preview.description ? (
              <Reveal immediate delay={0.16}>
                <Card title="Brief" icon={<FileText className="size-4" />}>
                  <p className="text-[13.5px] leading-[1.7] text-text-muted whitespace-pre-line">
                    {unlocked
                      ? preview.description
                      : truncate(preview.description, 20)}
                  </p>
                  {!unlocked ? (
                    <p className="mt-2 text-[12px] text-text-dim">
                      Unlock the project to read the full brief.
                    </p>
                  ) : null}
                </Card>
              </Reveal>
            ) : null}

            {/* Documents — blurred + locked overlay if not unlocked */}
            <Reveal immediate delay={0.22}>
            <Card
              title={`Documents · ${documents.length}`}
              icon={<FileText className="size-4" />}
            >
              <div className="relative">
                <div
                  className={cn(
                    "transition-[filter] duration-[300ms]",
                    unlocked ? "" : "blur-md select-none pointer-events-none",
                  )}
                >
                  {documents.length === 0 ? (
                    <p className="text-[12.5px] text-text-dim">
                      No documents attached.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {Object.entries(docsByCategory).map(([cat, docs]) => (
                        <li key={cat}>
                          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1.5">
                            {DOC_CAT_LABEL[cat as DocumentCategory]}
                          </div>
                          <ul className="space-y-1.5">
                            {docs.map((d) => (
                              <DocRow key={d.id} doc={d} unlocked={unlocked} />
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {!unlocked ? (
                  <BlurOverlay
                    icon={<FileText className="size-4" />}
                    title="Unlock to download documents"
                    sub={`${documents.length} file${documents.length === 1 ? "" : "s"} attached across ${Object.keys(docsByCategory).length} categor${Object.keys(docsByCategory).length === 1 ? "y" : "ies"}.`}
                  />
                ) : null}
              </div>
            </Card>
            </Reveal>
          </div>

          {/* Right — sticky summary + private fields (staggered with the
              left column so the page paints in synchronised waves) */}
          <div className="space-y-5">
            <Reveal immediate delay={0.06}>
            <Card title="Address" icon={<MapPin className="size-4" />}>
              <div className="relative">
                <div
                  className={cn(
                    "transition-[filter] duration-[300ms]",
                    unlocked ? "" : "blur-md select-none pointer-events-none",
                  )}
                >
                  <p className="text-[14px] leading-[1.6] text-text">
                    {unlocked ? full?.addressLine1 ?? "—" : "14 Example Street"}
                    <br />
                    <span className="text-text-muted">
                      {preview.suburb} {preview.state} {preview.postcode}
                    </span>
                  </p>
                </div>
                {!unlocked ? (
                  <BlurOverlay
                    icon={<Lock className="size-3.5" />}
                    title="Exact street address"
                    sub={`Suburb · ${preview.suburb ?? "—"}`}
                    compact
                  />
                ) : null}
              </div>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.12}>
            <Card title="Project owner" icon={<Sparkles className="size-4" />}>
              <div className="relative">
                <div
                  className={cn(
                    "transition-[filter] duration-[300ms]",
                    unlocked ? "" : "blur-md select-none pointer-events-none",
                  )}
                >
                  {unlocked && ownerContact ? (
                    <OwnerContactBlock contact={ownerContact} />
                  ) : (
                    <PlaceholderContactBlock />
                  )}
                </div>
                {!unlocked ? (
                  <BlurOverlay
                    icon={<Lock className="size-3.5" />}
                    title="Owner contact + thread"
                    compact
                  />
                ) : null}
              </div>
            </Card>
            </Reveal>

            <Reveal immediate delay={0.18}>
            <Card title="Lifecycle" icon={<Calendar className="size-4" />}>
              <KvGrid>
                <Kv
                  label="Published"
                  value={
                    preview.publishedAt
                      ? new Date(preview.publishedAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
                <Kv
                  label="Documents"
                  value={`${documents.length} file${documents.length === 1 ? "" : "s"}`}
                />
              </KvGrid>
            </Card>
            </Reveal>

            {!unlocked ? (
              <Reveal immediate delay={0.24}>
                <UnlockBenefitsCard priceAud={priceAud} documents={documents.length} />
              </Reveal>
            ) : null}
          </div>
        </div>

        {/* Inline project messaging — only when the builder has
              unlocked. The conversation already exists (auto-created
              on unlock) so the panel mounts populated. Anchor target
              for the in-card "Open conversation" link in OwnerContactBlock. */}
        {unlocked ? (
          <section id="messaging" className="mx-auto max-w-[1200px] px-0 sm:px-6 lg:px-10 pb-8 lg:pb-10 scroll-mt-24 mt-6 sm:mt-8">
            <Reveal immediate delay={0.06}>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
                    <MessageSquare className="size-3" />
                    Project messaging
                    {totalUnread(initialConversations) > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-semibold tabular-nums">
                        {totalUnread(initialConversations)}
                      </span>
                    ) : null}
                  </span>
                  <h2 className="mt-1.5 font-ui font-semibold text-[16px] tracking-[-0.005em] text-text">
                    Talk to the owner about this project
                  </h2>
                </div>
              </div>
              <ProjectMessagingPanel
                projectId={preview.id}
                scope="builder"
                meId={myUserId}
                initialConversations={initialConversations}
                inboxHref="/builder/messages"
              />
            </Reveal>
          </section>
        ) : null}
      </div>

      {/* Sticky bar — five states:
          - locked + viewer-mode → "Verify to unlock" panel
          - locked            → unlock paywall (FBA-aware)
          - unlocked + no tender → primary "Submit a tender"
          - unlocked + draft  → "Continue tender draft"
          - unlocked + submitted/etc → "View / edit tender" */}
      {unlocked ? (
        <TenderCtaBar
          slug={preview.slug}
          tenderStatus={myTenderStatus}
        />
      ) : confirming ? (
        <ConfirmingBar />
      ) : preview.unlockedCount >= UNLOCK_CAP ? (
        <ProjectFullBar />
      ) : viewerMode ? (
        <ViewerModeBar
          abnVerified={viewerMode.abnVerified}
          anyLicenceVerified={viewerMode.anyLicenceVerified}
        />
      ) : (
        <UnlockBar
          priceAud={priceAud}
          documents={documents.length}
          fbaStatus={fbaStatus}
          unlockedCount={preview.unlockedCount}
          unlocking={unlocking}
          onUnlock={onUnlock}
          onPaidUnlock={onPaidUnlock}
        />
      )}
    </div>
  );
}

function TenderCtaBar({
  slug,
  tenderStatus,
}: {
  slug: string;
  tenderStatus:
    | "draft"
    | "submitted"
    | "withdrawn"
    | "shortlisted"
    | "awarded"
    | "rejected"
    | null;
}) {
  const variant: "none" | "draft" | "submitted" | "decided" =
    tenderStatus === null || tenderStatus === "withdrawn"
      ? "none"
      : tenderStatus === "draft"
      ? "draft"
      : tenderStatus === "submitted" || tenderStatus === "shortlisted"
      ? "submitted"
      : "decided";

  const headline =
    variant === "none"
      ? "Ready to tender on this project?"
      : variant === "draft"
      ? "Tender draft in progress"
      : variant === "submitted"
      ? "Tender submitted"
      : tenderStatus === "awarded"
      ? "You've been awarded this project"
      : "Tender decided";

  const sub =
    variant === "none"
      ? "Submit your price + scope. Owner sees it side-by-side with other tenders."
      : variant === "draft"
      ? "Pick up where you left off — autosaves as you fill it in."
      : variant === "submitted"
      ? "Owner is reviewing. You can withdraw to start over."
      : tenderStatus === "awarded"
      ? "The owner picked your tender — celebrate. Open the conversation to confirm scope, timing, and contract."
      : "Owner has decided on this tender.";

  const ctaLabel =
    variant === "none"
      ? "Submit a tender"
      : variant === "draft"
      ? "Continue draft"
      : "View tender";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-accent/40 bg-[rgba(0,212,200,0.04)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <span className="size-9 rounded-md bg-accent-muted/40 border border-border-accent flex items-center justify-center text-accent-light shrink-0">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-text">{headline}</div>
            <div className="text-[11.5px] text-text-dim mt-0.5 line-clamp-2 sm:truncate">
              {sub}
            </div>
          </div>
        </div>
        <Link
          href={`/builder/projects/${slug}/tender`}
          className={cn(
            "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] shrink-0",
            "bg-accent text-accent-contrast hover:bg-accent-hover",
            "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
          )}
        >
          {ctaLabel}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function UnlockBar({
  priceAud,
  documents,
  fbaStatus,
  unlockedCount,
  unlocking,
  onUnlock,
  onPaidUnlock,
}: {
  priceAud: number;
  documents: number;
  fbaStatus: FbaStatus;
  unlockedCount: number;
  unlocking: boolean;
  onUnlock: () => void;
  onPaidUnlock: () => void;
}) {
  const fbaActive = fbaStatus.active;
  const hasCredits = fbaActive && fbaStatus.remainingThisCycle > 0;
  // Spots-left framing — reinforces scarcity right at the unlock CTA.
  // When count is 0, no "spots" copy (avoids implying the project is
  // unpopular). When ≥1, surface the urgency.
  const spotsLeft = Math.max(0, UNLOCK_CAP - unlockedCount);
  const showScarcity = unlockedCount > 0;
  const scarcity = showScarcity ? (
    <span className={cn("ml-1.5", spotsLeft === 1 ? "text-warning font-semibold" : "")}>
      · {spotsLeft === 1 ? "1 spot left" : `${spotsLeft} of ${UNLOCK_CAP} spots open`}
    </span>
  ) : null;

  // Shared CTA styling for both the FBA and paid buttons.
  const ctaClass = cn(
    "shrink-0 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] w-full sm:w-auto",
    "bg-accent text-accent-contrast hover:bg-accent-hover",
    "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
    unlocking && "opacity-70 cursor-not-allowed",
  );

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)]",
        hasCredits
          ? "border-border-accent/40 bg-[rgba(0,212,200,0.05)]"
          : "border-border-subtle bg-bg-deep/98",
      )}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {hasCredits ? (
          <>
            {/* Left — FBA free unlock */}
            <div className="min-w-0 flex items-start gap-3">
              <span className="size-10 rounded-md border bg-accent-muted/60 border-border-accent text-accent-light flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-accent-light">
                    Unlock free with Founding Access
                  </span>
                  <span className="inline-flex items-baseline gap-1.5 text-[12px] text-text-muted">
                    <span className="line-through decoration-[rgba(255,255,255,0.35)] decoration-1">
                      ${priceAud}
                    </span>
                    <span className="text-accent-light font-display text-[16px] leading-none">
                      $0
                    </span>
                  </span>
                </div>
                <div className="text-[11.5px] text-text-dim mt-0.5">
                  {fbaStatus.remainingThisCycle} of {fbaStatus.monthlyQuota} free
                  unlocks left this cycle · address · owner contact ·{" "}
                  {documents} document{documents === 1 ? "" : "s"}
                  {scarcity}
                </div>
              </div>
            </div>
            {/* Right — FBA CTA */}
            <button type="button" onClick={onUnlock} disabled={unlocking} className={ctaClass}>
              {unlocking ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />}
              {unlocking ? "Unlocking…" : "Unlock with Founding Access"}
            </button>
          </>
        ) : (
          <>
            {/* Left — paid unlock */}
            <div className="min-w-0 flex items-start gap-3">
              <span className="size-10 rounded-md border bg-accent-muted/50 border-border-accent text-accent-light flex items-center justify-center shrink-0">
                <Lock className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-text">
                    Unlock this project
                  </span>
                  <span className="font-display text-accent-light text-[20px] leading-none">
                    ${priceAud}
                  </span>
                  <span className="text-[11px] text-text-dim">one-off</span>
                  {scarcity}
                </div>
                <div className="text-[11.5px] text-text-dim mt-0.5">
                  Exact address · owner contact · {documents} document
                  {documents === 1 ? "" : "s"} · message the owner
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] text-text-dim">
                  <ShieldCheck className="size-3 text-accent-light/80" />
                  Secure checkout by Stripe · card, Apple&nbsp;Pay &amp; Google&nbsp;Pay
                </div>
              </div>
            </div>
            {/* Right — paid CTA */}
            <button type="button" onClick={onPaidUnlock} disabled={unlocking} className={ctaClass}>
              {unlocking ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              {unlocking ? "Redirecting…" : `Unlock for $${priceAud}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * ConfirmingBar — shown after returning from Stripe with ?unlock=success
 * while we poll for the webhook to grant the unlock (usually a second or
 * two). Keeps the moment feeling instant + intentional rather than blank.
 */
function ConfirmingBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-accent/40 bg-[rgba(0,212,200,0.06)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center gap-3">
        <span className="size-10 rounded-md border border-border-accent bg-accent-muted/50 text-accent-light flex items-center justify-center shrink-0">
          <Loader2 className="size-4 animate-spin" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-text">Confirming your payment…</div>
          <div className="text-[11.5px] text-text-dim mt-0.5">
            Unlocking your project — this only takes a moment.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ProjectFullBar — sticky bottom CTA shown when 3 builders have
 * already unlocked this project. Replaces the unlock CTA + the
 * viewer-mode bar entirely; once full, no path leads to an unlock
 * attempt that would fail at the server.
 *
 * Tone: not apologetic, not buggy — "this is by design, here's what
 * else is around." Routes the builder back to browse so the moment
 * doesn't dead-end.
 */
function ProjectFullBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-danger/30 bg-danger/[0.05] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <span className="size-10 rounded-md border border-danger/40 bg-danger/10 flex items-center justify-center shrink-0 text-danger">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-text">
                This project is full
              </span>
              <span className="text-[10px] tracking-[0.18em] uppercase text-danger font-ui font-medium">
                {UNLOCK_CAP} / {UNLOCK_CAP} unlocked
              </span>
            </div>
            <div className="text-[11.5px] text-text-dim mt-0.5 truncate">
              {UNLOCK_CAP} builders are already in the running. Try a similar
              project in your service area before the next one fills up.
            </div>
          </div>
        </div>
        <Link
          href="/builder/browse"
          className={cn(
            "shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] w-full sm:w-auto",
            "border border-border-strong bg-transparent text-text hover:bg-surface-1",
          )}
        >
          Browse projects
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * ViewerModeBar — sticky bottom CTA for builders who can browse but
 * can't unlock yet (i.e. profile is not `approved`). Spells out which
 * checks are still missing and routes them to the profile to fix.
 *
 * This is the *graceful* version of the unlock denial: instead of
 * letting the user click an FBA unlock and then fail, we show them
 * up-front what's gating it. The runtime fallback in `onUnlock`
 * still handles the edge case where state moves between page-load
 * and click.
 */
function ViewerModeBar({
  abnVerified,
  anyLicenceVerified,
}: {
  abnVerified: boolean;
  anyLicenceVerified: boolean;
}) {
  const remaining =
    (abnVerified ? 0 : 1) + (anyLicenceVerified ? 0 : 1);
  const headline =
    remaining === 2
      ? "Verify your business to unlock"
      : "One more check to unlock";
  const sub =
    remaining === 2
      ? "Confirm your ABN and a builder licence — both verify live, no waiting."
      : !abnVerified
      ? "Verify your ABN against the ABR — takes a few seconds."
      : "Verify a builder licence — VIC verifies live; other states get a manual review.";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-warning/30 bg-[rgba(255,181,71,0.04)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <span className="size-10 rounded-md border border-warning/40 bg-[rgba(255,181,71,0.10)] flex items-center justify-center shrink-0 text-warning">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-text">
                {headline}
              </span>
              <span className="text-[10px] tracking-[0.18em] uppercase text-warning font-ui font-medium">
                Viewer mode
              </span>
            </div>
            <div className="text-[11.5px] text-text-dim mt-0.5">{sub}</div>
            <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-text-dim">
              <span className="inline-flex items-center gap-1">
                {abnVerified ? (
                  <Check className="size-3 text-accent-light" />
                ) : (
                  <span className="size-1.5 rounded-full bg-warning/70" />
                )}
                ABN
              </span>
              <span className="inline-flex items-center gap-1">
                {anyLicenceVerified ? (
                  <Check className="size-3 text-accent-light" />
                ) : (
                  <span className="size-1.5 rounded-full bg-warning/70" />
                )}
                Builder licence
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/builder/profile"
          className={cn(
            "shrink-0 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-[13px] font-semibold tracking-[0.04em] transition-colors duration-[160ms] w-full sm:w-auto",
            "bg-accent text-accent-contrast hover:bg-accent-hover",
            "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
          )}
        >
          {remaining === 2 ? "Open profile to verify" : "Finish verification"}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * UnlockBenefitsCard — a clear, scannable panel (right column, under
 * Lifecycle) spelling out exactly what unlocking buys. Only shown while
 * locked; once unlocked it's redundant.
 */
function UnlockBenefitsCard({
  priceAud,
  documents,
}: {
  priceAud: number;
  documents: number;
}) {
  const items = [
    "Exact street address",
    ...(documents > 0
      ? [`${documents} project document${documents === 1 ? "" : "s"} to download`]
      : []),
    "Owner's name & contact details",
    "Direct messaging with the owner",
    "Submit a tender on the project",
  ];
  return (
    <Card title="What you'll unlock" icon={<Unlock className="size-4" />}>
      <ul className="space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-[13px] text-text-muted">
            <span className="mt-[1px] size-4 rounded-full bg-accent-muted/60 border border-border-accent flex items-center justify-center shrink-0">
              <Check className="size-2.5 text-accent-light" />
            </span>
            <span className="leading-[1.5]">{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-dim">
          <ShieldCheck className="size-3 text-accent-light/80" />
          Secure one-off payment
        </span>
        <span className="font-display text-accent-light text-[18px] leading-none">
          ${priceAud}
        </span>
      </div>
    </Card>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]">
      <header className="px-5 py-3.5 border-b border-border-subtle/60 flex items-center gap-2.5">
        <span className="size-7 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center">
          {icon}
        </span>
        <h3 className="font-ui font-semibold text-[13px] text-text">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function KvGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-3">{children}</dl>;
}

function Kv({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] uppercase text-accent/85 mb-1">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[14.5px] font-medium tabular-nums",
          isEmpty ? "text-text-dim/60" : "text-text",
        )}
      >
        {isEmpty ? "—" : value}
      </dd>
    </div>
  );
}

const ENTITY_LABEL: Record<NonNullable<OwnerContact["entityType"]>, string> = {
  homeowner: "Homeowner",
  owner_builder: "Owner-builder",
  developer: "Developer",
  investor: "Investor",
  architect: "Architect",
  drafter: "Drafter",
  project_manager: "Project manager",
  other: "Other",
};

function OwnerContactBlock({ contact }: { contact: OwnerContact }) {
  const initials = (contact.name ?? "??")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="size-10 rounded-full flex items-center justify-center text-[12px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-text truncate">
            {contact.name ?? "Unnamed"}
          </div>
          <div className="text-[11.5px] text-text-muted truncate">
            {contact.entityType ? ENTITY_LABEL[contact.entityType] : "Project owner"}
            {contact.companyName ? ` · ${contact.companyName}` : ""}
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 pt-2 border-t border-border-subtle/60">
        <ContactRow
          icon={<Mail className="size-3.5" />}
          label="Email"
          value={contact.email}
          href={`mailto:${contact.email}`}
          highlighted={contact.contactPref === "email" || contact.contactPref === "both"}
        />
        {contact.phone ? (
          <ContactRow
            icon={<Phone className="size-3.5" />}
            label="Phone"
            value={contact.phone}
            href={`tel:${contact.phone}`}
            highlighted={contact.contactPref === "phone" || contact.contactPref === "both"}
          />
        ) : null}
        <ContactRow
          icon={<Briefcase className="size-3.5" />}
          label="Preferred contact"
          value={
            contact.contactPref === "both"
              ? "Email or phone"
              : contact.contactPref === "phone"
              ? "Phone"
              : "Email"
          }
        />
      </ul>

      <a
        href="#messaging"
        className="mt-2 inline-flex items-center gap-2 text-[11.5px] text-accent-light hover:text-accent transition-colors"
      >
        <MessageSquare className="size-3.5" />
        Open conversation with owner
        <ArrowUpRight className="size-3 opacity-70" />
      </a>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  highlighted?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-sm border transition-colors",
        highlighted
          ? "border-border-accent/50 bg-[rgba(0,212,200,0.05)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)]",
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "size-6 rounded-sm flex items-center justify-center shrink-0",
            highlighted
              ? "bg-accent-muted text-accent-light"
              : "bg-[rgba(255,255,255,0.022)] text-text-muted",
          )}
        >
          {icon}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
            {label}
          </span>
          <span
            className={cn(
              "text-[12.5px] truncate",
              highlighted ? "text-accent-light" : "text-text",
            )}
          >
            {value}
          </span>
        </span>
      </span>
      {href ? (
        <ArrowUpRight className="size-3 text-text-faint shrink-0" />
      ) : null}
    </span>
  );

  return (
    <li>
      {href ? (
        <a href={href} className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}

function PlaceholderContactBlock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="size-10 rounded-full bg-[rgba(255,255,255,0.04)] border border-border-subtle" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-32 rounded bg-[rgba(255,255,255,0.06)]" />
          <div className="h-2 w-24 rounded bg-[rgba(255,255,255,0.04)]" />
        </div>
      </div>
      <div className="space-y-1.5 pt-2 border-t border-border-subtle/60">
        <div className="h-9 rounded-sm bg-[rgba(255,255,255,0.022)]" />
        <div className="h-9 rounded-sm bg-[rgba(255,255,255,0.022)]" />
      </div>
    </div>
  );
}

function BlurOverlay({
  icon,
  title,
  sub,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center text-center",
        "bg-bg-deep/40 backdrop-blur-[2px] rounded-md",
      )}
    >
      <div
        className={cn(
          "rounded-md border border-border-accent/40 bg-bg-deep/85 backdrop-blur-md",
          compact ? "px-3 py-2" : "px-5 py-4",
          "flex items-center gap-2.5",
        )}
      >
        <span className="size-7 rounded-md bg-accent-muted/40 border border-border-accent flex items-center justify-center text-accent-light shrink-0">
          {icon}
        </span>
        <div className="text-left min-w-0">
          <div className={cn("font-semibold text-text", compact ? "text-[12px]" : "text-[13px]")}>
            {title}
          </div>
          {sub ? (
            <div className="text-[11px] text-text-dim mt-0.5 truncate">{sub}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocRow({
  doc,
  unlocked,
}: {
  doc: Document;
  unlocked: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)]">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-text truncate">{doc.filename}</div>
        <div className="text-[10px] text-text-dim">{prettyBytes(doc.sizeBytes)}</div>
      </div>
      <button
        type="button"
        disabled={!unlocked || busy}
        onClick={async () => {
          setBusy(true);
          const r = await getBuilderDownloadUrlAction(doc.id);
          setBusy(false);
          if (!r.ok) {
            toast.error("Download failed", r.error.message);
            return;
          }
          window.open(r.value.url, "_blank", "noopener");
        }}
        className={cn(
          "inline-flex items-center justify-center size-8 rounded-sm border border-border-subtle text-text-muted transition-colors",
          unlocked
            ? "hover:text-accent-light hover:border-border-accent"
            : "opacity-40 cursor-not-allowed",
        )}
        title="Download"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      </button>
    </li>
  );
}

function prettyBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
