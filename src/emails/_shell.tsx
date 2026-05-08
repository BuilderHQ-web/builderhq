/**
 * EmailShell — shared chrome for transactional emails.
 *
 * Wraps the header logo + dark surface + footer so every template
 * looks the same. Templates pass `kicker` (eyebrow text), `heading`,
 * `preview` (preheader), and a `children` body.
 *
 * Same email-styling rules as VerificationEmail: inline styles only,
 * conservative subset of CSS, dark canvas + teal accent for CTAs.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const brand = {
  bg: "#03090f",
  surface: "#0a1622",
  border: "#1a2632",
  text: "#eef6ff",
  muted: "#98b8d0",
  dim: "#567080",
  accent: "#00d4c8",
  accentText: "#031118",
  warn: "#ffb547",
  danger: "#ff7a8a",
} as const;

interface EmailShellProps {
  preview: string;
  kicker: string;
  heading: string;
  children: React.ReactNode;
  /** Extra small print under the panel — link to manage prefs, etc. */
  fineprint?: React.ReactNode;
}

export function EmailShell({
  preview,
  kicker,
  heading,
  children,
  fineprint,
}: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.bg,
          color: brand.text,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "0 24px" }}>
          {/* Header logo */}
          <Section style={{ paddingBottom: "24px" }}>
            <Text
              style={{
                fontSize: "13px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: brand.accent,
                margin: 0,
                fontWeight: 600,
              }}
            >
              BUILDER<span style={{ color: brand.text }}>HQ</span>
            </Text>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: brand.surface,
              border: `1px solid ${brand.border}`,
              borderRadius: "8px",
              padding: "36px 32px",
            }}
          >
            <Text
              style={{
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: brand.accent,
                margin: "0 0 12px 0",
                fontWeight: 600,
              }}
            >
              {kicker}
            </Text>

            <Heading
              style={{
                fontFamily: '"Bebas Neue", Impact, sans-serif',
                fontSize: "38px",
                lineHeight: "1.08",
                letterSpacing: "-0.01em",
                color: brand.text,
                margin: "0 0 18px 0",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              {heading}
            </Heading>

            {children}

            {fineprint ? (
              <>
                <Hr
                  style={{
                    border: "none",
                    borderTop: `1px solid ${brand.border}`,
                    margin: "32px 0 18px 0",
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
          <Section style={{ padding: "32px 0 0 0", textAlign: "center" }}>
            <Text
              style={{
                fontSize: "11px",
                lineHeight: "18px",
                letterSpacing: "0.08em",
                color: brand.dim,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              BuilderHQ · Australia&apos;s residential tender platform
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── small shared primitives templates can compose ───────────────────────

export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        backgroundColor: brand.accent,
        color: brand.accentText,
        fontSize: "14px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "14px 28px",
        borderRadius: "3px",
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      {children}
    </a>
  );
}

export function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <Text
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

/**
 * Stat row used in tender emails — "Total price · $1,250,000" style.
 * Displays a small colon-separated key/value pair.
 */
export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        fontSize: "13px",
        lineHeight: "22px",
        color: brand.dim,
        margin: "0 0 6px 0",
      }}
    >
      <span style={{ color: brand.dim }}>{label}</span>
      <span style={{ color: brand.text, marginLeft: "8px", fontWeight: 600 }}>
        {value}
      </span>
    </Text>
  );
}
