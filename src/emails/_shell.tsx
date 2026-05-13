/**
 * EmailShell — shared chrome + primitives for every BuilderHQ email.
 *
 * Design principles (the hard-won email rules):
 *
 *   1. Inline styles only. Email clients strip <style> tags from body
 *      and most ignore class attrs. The one place a <style> block
 *      lives is the <Head>, scoped to media queries that the few
 *      modern clients (Apple Mail, modern Gmail) honour.
 *   2. Table-based buttons via @react-email/components <Button> —
 *      this generates VML for Outlook, plain `<a>` for everyone else.
 *      Don't roll your own — Outlook will mangle padding on bare links.
 *   3. Dark mode: this brand IS dark. We pin `color-scheme: dark only`
 *      so Outlook on Windows / Apple Mail don't auto-invert the canvas
 *      and end up with a lavender heading on cream.
 *   4. Mobile-first: 480px and below collapses padding and stretches
 *      the CTA full-width. Everything else uses a 560px container.
 *   5. Legal footer: physical address, support email, and a "Why am
 *      I getting this?" line on transactional emails — the latter
 *      is the single best deliverability signal alongside SPF/DKIM.
 *
 * Templates compose this shell + the small primitives at the bottom
 * (BodyText, PrimaryButton, SecondaryButton, MetaCard, MetaRow, etc.)
 * — no template should reach for raw <Section> / <Text> with inline
 * styles unless absolutely necessary.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// ── Brand tokens ──────────────────────────────────────────────────────

export const brand = {
  bg: "#03090f",
  surface: "#0a1622",
  surfaceLift: "#0e1c2c",
  border: "#1a2632",
  borderStrong: "#243648",
  text: "#eef6ff",
  muted: "#a8c2d8",
  dim: "#6a8294",
  faint: "#4a5e6e",
  accent: "#00d4c8",
  accentText: "#031118",
  accentMuted: "rgba(0,212,200,0.06)",
  accentBorder: "rgba(0,212,200,0.30)",
  warn: "#ffb547",
  danger: "#ff7a8a",
  success: "#86efac",
} as const;

const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
const displayFontStack =
  '"Bebas Neue", "Helvetica Neue", Impact, Helvetica, Arial, sans-serif';

// ── Company ───────────────────────────────────────────────────────────
//
// These appear in every footer. AU Spam Act 2003 requires sender
// identification + a means of contact in commercial messages — these
// constants are the source of truth. Edit here, never per-template.

export const COMPANY = {
  name: "BuilderHQ",
  legalName: "BuilderHQ",
  address: "Melbourne, Victoria, Australia",
  supportEmail: "info@builderhq.com.au",
  websiteUrl: "https://builderhq.com.au",
  tagline: "Australia's residential tender platform",
} as const;

/**
 * Single source of truth for the email-header logo. Must be an absolute
 * URL — email clients have no concept of relative paths. The asset lives
 * at /public/brand/BuilderHQ_email_logo.png; Vercel serves it from the
 * production origin below.
 *
 * Source dimensions: 327×80 px, RGBA transparent. The "b" mark is teal
 * (#5cdce0) so the wordmark reads well on the dark email canvas without
 * a coloured background plate. Don't swap this file without a matched
 * design review — every transactional email links to it.
 */
export const LOGO_URL =
  "https://builderhq.com.au/brand/BuilderHQ_email_logo.png";
export const LOGO_NATIVE_W = 327;
export const LOGO_NATIVE_H = 80;

// ── EmailShell ────────────────────────────────────────────────────────

type Tone = "accent" | "warning" | "danger" | "muted";

const kickerColor = (tone: Tone) =>
  tone === "warning"
    ? brand.warn
    : tone === "danger"
      ? brand.danger
      : tone === "muted"
        ? brand.muted
        : brand.accent;

interface EmailShellProps {
  /** Inbox preview text — also used as a hidden preheader fallback. */
  preview: string;
  /** Tiny eyebrow above the headline. */
  kicker: string;
  /** Big display headline. Bebas Neue. */
  heading: string;
  /** Optional subhead under the H1. Plain copy, muted. */
  subheading?: string;
  /** Tone affects kicker color. Default = accent. */
  tone?: Tone;
  children: React.ReactNode;
  /** Small print rendered above the footer divider, inside the card. */
  fineprint?: React.ReactNode;
  /** "Why am I getting this?" line — shown in the footer. */
  whyReceiving?: React.ReactNode;
}

export function EmailShell({
  preview,
  kicker,
  heading,
  subheading,
  tone = "accent",
  children,
  fineprint,
  whyReceiving,
}: EmailShellProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Mobile + Outlook-on-Windows tweaks. Most clients ignore
            <style> in head; the modern ones (Apple Mail, Gmail iOS,
            iOS Mail) honour it and produce a much better mobile pass. */}
        <style>{`
          @media only screen and (max-width: 480px) {
            .bhq-container { padding-left: 16px !important; padding-right: 16px !important; }
            .bhq-card { padding: 28px 22px !important; }
            .bhq-heading { font-size: 32px !important; }
            .bhq-cta { width: 100% !important; box-sizing: border-box; padding-left: 14px !important; padding-right: 14px !important; }
            .bhq-cta-row td { display: block !important; padding-bottom: 10px !important; }
            /* Logo gets a modest 14% trim on phones so the header doesn't
               feel oversized against the narrower card chrome. */
            .bhq-logo { width: 120px !important; height: 29px !important; }
          }
          /* Outlook.com / Outlook for Windows dark mode hint */
          [data-ogsc] .bhq-body { background-color: ${brand.bg} !important; }
          [data-ogsc] .bhq-card { background-color: ${brand.surface} !important; }
          [data-ogsc] .bhq-text { color: ${brand.text} !important; }
          /* Strip iOS auto-link of phone numbers / addresses */
          a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      {/* Hidden preheader fallback for clients that don't read <Preview>.
          Repeats the preview text inside an offscreen, zero-height div
          so most inboxes show meaningful copy instead of the email's
          first visible line. (mso-hide:all is set via the inline-style
          string for Outlook — TS doesn't model that property, so we
          set it via the dangerouslySetInnerHTML escape hatch in the
          adjacent comment block — no, simpler: rely on display:none +
          zero geometry + 1px font + bg-coloured text. Outlook collapses
          this just fine without mso-hide.) */}
      <div
        style={{
          display: "none",
          maxHeight: 0,
          overflow: "hidden",
          opacity: 0,
          fontSize: "1px",
          color: brand.bg,
          lineHeight: "1px",
        }}
      >
        {preview}
      </div>

      <Body
        className="bhq-body"
        style={{
          backgroundColor: brand.bg,
          color: brand.text,
          fontFamily: fontStack,
          margin: 0,
          padding: "32px 0 48px 0",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <Container
          className="bhq-container"
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          {/* Brand logo.
              ─────────────────────────────────────────────────────────
              Renders the BuilderHQ wordmark + teal mark from the hosted
              brand asset. Sizing notes:
                · Source PNG is 327×80 (4.0875:1).
                · Display width: 140px → derived height 34px. That's the
                  sweet spot for transactional email headers — readable
                  at distance, restrained enough not to crowd the kicker
                  / heading directly below it.
                · The .bhq-logo mobile media query (in <Head>) drops the
                  width to 120px on screens <= 480px so the mark doesn't
                  overpower a phone header.
                · `display: block` + `border: 0` are the two attributes
                  every email client respects for inline images — without
                  them Outlook adds a 4px baseline gap and Yahoo draws a
                  link border ring.
                · `outline: none` is belt-and-braces for clients that
                  treat focusable images as link-targets.
              Wrapping in a <Link> to the marketing site is the standard
              "click logo → go home" affordance recipients expect. */}
          <Section style={{ padding: "0 0 24px 0" }}>
            <Link
              href={COMPANY.websiteUrl}
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              <Img
                src={LOGO_URL}
                alt={COMPANY.name}
                className="bhq-logo"
                width="140"
                height="34"
                style={{
                  display: "block",
                  width: "140px",
                  height: "34px",
                  border: 0,
                  outline: "none",
                  textDecoration: "none",
                }}
              />
            </Link>
          </Section>

          {/* Card */}
          <Section
            className="bhq-card"
            style={{
              backgroundColor: brand.surface,
              border: `1px solid ${brand.border}`,
              borderRadius: "10px",
              padding: "40px 36px",
              // A subtle accent halo at the top so the card feels designed,
              // not just boxed.
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 48px -28px rgba(0,212,200,0.12)",
            }}
          >
            <Text
              style={{
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: kickerColor(tone),
                margin: "0 0 14px 0",
                fontWeight: 700,
              }}
            >
              {kicker}
            </Text>

            <Heading
              className="bhq-heading"
              as="h1"
              style={{
                fontFamily: displayFontStack,
                fontSize: "38px",
                lineHeight: "1.06",
                letterSpacing: "-0.005em",
                color: brand.text,
                margin: "0 0 16px 0",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              {heading}
            </Heading>

            {subheading ? (
              <Text
                style={{
                  fontSize: "15px",
                  lineHeight: "24px",
                  color: brand.muted,
                  margin: "0 0 20px 0",
                }}
              >
                {subheading}
              </Text>
            ) : null}

            {children}

            {fineprint ? (
              <>
                <Hr
                  style={{
                    border: "none",
                    borderTop: `1px solid ${brand.border}`,
                    margin: "30px 0 18px 0",
                  }}
                />
                <Text
                  style={{
                    fontSize: "12px",
                    lineHeight: "20px",
                    color: brand.dim,
                    margin: 0,
                  }}
                >
                  {fineprint}
                </Text>
              </>
            ) : null}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 4px 0 4px" }}>
            <Text
              style={{
                fontSize: "11px",
                lineHeight: "18px",
                letterSpacing: "0.10em",
                color: brand.dim,
                margin: "0 0 6px 0",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {COMPANY.name} · {COMPANY.tagline}
            </Text>
            <Text
              style={{
                fontSize: "11.5px",
                lineHeight: "18px",
                color: brand.dim,
                margin: "0 0 6px 0",
              }}
            >
              {COMPANY.address}
              {" · "}
              <Link
                href={`mailto:${COMPANY.supportEmail}`}
                style={{ color: brand.muted, textDecoration: "underline" }}
              >
                {COMPANY.supportEmail}
              </Link>
            </Text>
            {whyReceiving ? (
              <Text
                style={{
                  fontSize: "11px",
                  lineHeight: "17px",
                  color: brand.faint,
                  margin: "10px 0 0 0",
                }}
              >
                {whyReceiving}
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Composable primitives ─────────────────────────────────────────────

/** Standard body paragraph. Use this for prose, not raw <Text>. */
export function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="bhq-text"
      style={{
        fontSize: "15px",
        lineHeight: "26px",
        color: brand.muted,
        margin: "0 0 18px 0",
      }}
    >
      {children}
    </Text>
  );
}

/** Inline emphasis (bold, brand text colour). Use for entity names. */
export function Strong({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: brand.text, fontWeight: 600 }}>{children}</strong>
  );
}

/**
 * Primary CTA. Uses React Email's <Button> which generates the proper
 * VML / table fallback for Outlook. Add `bhq-cta` so mobile media
 * queries can stretch it to full-width.
 */
export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      href={href}
      className="bhq-cta"
      style={{
        backgroundColor: brand.accent,
        color: brand.accentText,
        fontSize: "14px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "14px 28px",
        borderRadius: "4px",
        textDecoration: "none",
        textAlign: "center",
        display: "inline-block",
        boxShadow: "0 4px 16px -6px rgba(0,212,200,0.45)",
      }}
    >
      {children}
    </Button>
  );
}

/** Secondary CTA — bordered, no fill. Pair with PrimaryButton when needed. */
export function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      href={href}
      className="bhq-cta"
      style={{
        backgroundColor: "transparent",
        color: brand.text,
        fontSize: "14px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "12px 22px",
        borderRadius: "4px",
        textDecoration: "none",
        textAlign: "center",
        display: "inline-block",
        border: `1px solid ${brand.borderStrong}`,
      }}
    >
      {children}
    </Button>
  );
}

/**
 * MetaCard — the accent-tinted panel used by every "here are the
 * details" surface (tender numbers, owner contact, project context).
 * Holds <MetaRow> children.
 */
export function MetaCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Section
      style={{
        backgroundColor: brand.accentMuted,
        border: `1px solid ${brand.border}`,
        borderRadius: "8px",
        padding: "18px 20px",
        margin: "4px 0 24px 0",
      }}
    >
      {title ? (
        <Text
          style={{
            fontSize: "10.5px",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: brand.accent,
            margin: "0 0 10px 0",
            fontWeight: 700,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </Section>
  );
}

/**
 * MetaRow — one label/value pair inside a MetaCard. Two columns laid
 * out via display:flex so they render reasonably even in clients that
 * strip flex (a graceful inline-block fallback). Outlook collapses
 * into a left-aligned label-then-value flow which still reads fine.
 */
export function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | number | React.ReactNode;
}) {
  return (
    <Text
      style={{
        fontSize: "13px",
        lineHeight: "22px",
        color: brand.dim,
        margin: "0 0 4px 0",
      }}
    >
      <span
        style={{
          color: brand.faint,
          letterSpacing: "0.04em",
          marginRight: "8px",
        }}
      >
        {label}
      </span>
      <span style={{ color: brand.text, fontWeight: 600 }}>{value}</span>
    </Text>
  );
}

/**
 * Legacy alias — older templates import StatRow. Kept as a thin
 * re-export so the rename doesn't churn every consumer.
 */
export const StatRow = MetaRow;

/** Section divider. Slightly stronger than an ordinary <Hr>. */
export function Divider({ space = "26px" }: { space?: string }) {
  return (
    <Hr
      style={{
        border: "none",
        borderTop: `1px solid ${brand.border}`,
        margin: `${space} 0`,
      }}
    />
  );
}

/** Eyebrow used to label a sub-section inside a card. */
export function MiniLabel({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <Text
      style={{
        fontSize: "10.5px",
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color: kickerColor(tone),
        margin: "0 0 8px 0",
        fontWeight: 700,
      }}
    >
      {children}
    </Text>
  );
}

/** Small caption / helper text under a CTA or section. */
export function Caption({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "12px",
        lineHeight: "20px",
        color: brand.dim,
        margin: "20px 0 0 0",
      }}
    >
      {children}
    </Text>
  );
}

/** Inline link with the right contrast for the dark canvas. */
export function InlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        color: brand.accent,
        textDecoration: "underline",
        textUnderlineOffset: "2px",
        wordBreak: "break-all",
      }}
    >
      {children}
    </Link>
  );
}
