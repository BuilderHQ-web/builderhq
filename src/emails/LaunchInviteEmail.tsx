/**
 * LaunchInviteEmail — sent once to every Bubble-migrated user during
 * the platform relaunch. Single CTA: claim your account.
 *
 * This is the React Email version (used by sendLaunchInviteEmail in
 * the email service module). The actual blast script
 * (scripts/migrate-bubble/05-blast.mjs) hand-rolls a parallel HTML
 * version because it runs as a vanilla .mjs without a TS loader;
 * keep both in visual sync.
 *
 * Design notes:
 *   - Display headline uses Georgia italic (premium serif, renders
 *     identically on every email client). Bebas Neue can't load in
 *     email clients and falls back to Impact — which is what caused
 *     the squashed look the user flagged.
 *   - Logo image is the wordmark-only crop (327x80, transparent bg)
 *     hosted at builderhq.com.au/brand/BuilderHQ_email_logo.png.
 *   - "What's new" bullets use the same icon + title/sub pattern as
 *     the blast script so both versions feel identical.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { COMPANY, LOGO_URL } from "./_shell";

interface LaunchInviteEmailProps {
  claimUrl: string;
  firstName: string | null;
  /** Days until the claim link expires — drives the urgency line. */
  daysToExpire: number;
}

const COLORS = {
  bg: "#03090f",
  surface: "#0a1622",
  border: "#1a2632",
  text: "#eef6ff",
  muted: "#a8c2d8",
  dim: "#6a8294",
  faint: "#4a5e6e",
  accent: "#00d4c8",
  accentLight: "#7ef5ed",
  accentText: "#031118",
};
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

// LOGO_URL is now imported from _shell.tsx — the single source of truth
// for the email brand asset. APP_HOME kept local because this email also
// uses it for the CTA and footer link, not just the logo wrap.
const APP_HOME = COMPANY.websiteUrl;

const WHATS_NEW: Array<[string, string]> = [
  ["A redesigned dashboard", "with the four numbers that actually matter"],
  ["Side-by-side tender comparison", "decisions in two clicks, not five"],
  ["Live ABN + licence verification", "checked against ABR + state registers"],
  ["Founding Builder Access", "free unlocks while we open the platform"],
  ["Inline messaging", "every project, not buried two screens deep"],
];

export function LaunchInviteEmail({
  claimUrl,
  firstName,
  daysToExpire,
}: LaunchInviteEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @media only screen and (max-width: 480px) {
            .bhq-container { width: 100% !important; padding: 0 16px !important; }
            .bhq-card      { padding: 28px 22px !important; border-radius: 12px !important; }
            .bhq-heading   { font-size: 36px !important; line-height: 1.05 !important; }
            .bhq-subhead   { font-size: 16px !important; }
            .bhq-body      { font-size: 15px !important; line-height: 1.6 !important; }
            .bhq-cta       { display: block !important; width: 100% !important; box-sizing: border-box; padding: 16px 22px !important; }
            .bhq-logo      { width: 130px !important; }
          }
          [data-ogsc] .bhq-page  { background: ${COLORS.bg} !important; }
          [data-ogsc] .bhq-card  { background: ${COLORS.surface} !important; }
          a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
        `}</style>
      </Head>
      <Preview>{`BuilderHQ has rebuilt. Claim your account in one click — link expires in ${daysToExpire} days.`}</Preview>
      <Body
        className="bhq-page"
        style={{
          margin: 0,
          padding: "40px 0 56px 0",
          background: COLORS.bg,
          color: COLORS.text,
          fontFamily: SANS,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <Container
          className="bhq-container"
          style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px" }}
        >
          {/* Logo row */}
          <Section style={{ textAlign: "center", padding: "0 0 36px 0" }}>
            <Link href={APP_HOME} style={{ textDecoration: "none" }}>
              <Img
                src={LOGO_URL}
                alt="BuilderHQ"
                className="bhq-logo"
                width="160"
                style={{
                  display: "inline-block",
                  width: "160px",
                  height: "auto",
                  maxWidth: "160px",
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
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "14px",
              padding: "44px 44px",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -28px rgba(0,212,200,0.18)",
            }}
          >
            {/* Kicker */}
            <Text
              style={{
                margin: "0 0 18px 0",
                fontFamily: SANS,
                fontSize: "11px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: COLORS.accent,
                fontWeight: 700,
              }}
            >
              BuilderHQ 2.0
            </Text>

            {/* Display headline */}
            <Text
              className="bhq-heading"
              style={{
                margin: "0 0 18px 0",
                fontFamily: SERIF,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "48px",
                lineHeight: "1.04",
                letterSpacing: "-0.015em",
                color: "#ffffff",
              }}
            >
              We&rsquo;ve rebuilt
              <br />
              <span style={{ color: COLORS.accentLight }}>everything.</span>
            </Text>

            <Text
              className="bhq-subhead"
              style={{
                margin: "0 0 28px 0",
                fontFamily: SANS,
                fontSize: "17px",
                lineHeight: 1.55,
                color: COLORS.text,
              }}
            >
              {greeting} Your account is waiting on the new platform.
            </Text>

            <Text
              className="bhq-body"
              style={{
                margin: "0 0 18px 0",
                fontFamily: SANS,
                fontSize: "15px",
                lineHeight: 1.7,
                color: COLORS.muted,
              }}
            >
              BuilderHQ has been rebuilt from the ground up. Same mission —
              connecting Australian project owners with the right builder —
              sharper everything else. Your projects and tender history are
              already there.
            </Text>

            <Text
              className="bhq-body"
              style={{
                margin: "0 0 32px 0",
                fontFamily: SANS,
                fontSize: "15px",
                lineHeight: 1.7,
                color: COLORS.muted,
              }}
            >
              To pick up where you left off, set a new password. Old passwords
              can&rsquo;t be carried over (we&rsquo;ve upgraded from bcrypt to
              argon2id) — one-time step, then you&rsquo;re straight in.
            </Text>

            {/* CTA */}
            <Section style={{ margin: "0 0 22px 0" }}>
              <Button
                href={claimUrl}
                className="bhq-cta"
                style={{
                  background: COLORS.accent,
                  color: COLORS.accentText,
                  fontFamily: SANS,
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: "999px",
                  padding: "16px 36px",
                  display: "inline-block",
                  boxShadow:
                    "0 0 0 1px rgba(0,212,200,0.45), 0 14px 36px -10px rgba(0,212,200,0.55)",
                }}
              >
                Claim my account &rarr;
              </Button>
            </Section>

            {/* Expiry + paste URL */}
            <Text
              style={{
                margin: "0 0 6px 0",
                fontFamily: SANS,
                fontSize: "12.5px",
                lineHeight: 1.55,
                color: COLORS.dim,
              }}
            >
              Link expires in{" "}
              <strong style={{ color: COLORS.text, fontWeight: 600 }}>
                {daysToExpire} days
              </strong>
              . If the button doesn&rsquo;t work, paste this into your
              browser:
            </Text>
            <Text
              style={{
                margin: 0,
                fontFamily: "'SF Mono','Menlo','Consolas',monospace",
                fontSize: "11.5px",
                lineHeight: 1.5,
                wordBreak: "break-all",
              }}
            >
              <Link
                href={claimUrl}
                style={{
                  color: COLORS.accentLight,
                  textDecoration: "underline",
                }}
              >
                {claimUrl}
              </Link>
            </Text>

            <Hr
              style={{
                border: "none",
                borderTop: `1px solid ${COLORS.border}`,
                margin: "36px 0",
              }}
            />

            {/* What's new */}
            <Text
              style={{
                margin: "0 0 18px 0",
                fontFamily: SANS,
                fontSize: "11px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: COLORS.accent,
                fontWeight: 700,
              }}
            >
              What&rsquo;s new
            </Text>

            {WHATS_NEW.map(([title, sub]) => (
              <Section
                key={title}
                style={{ margin: "0 0 14px 0", paddingLeft: 0 }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontFamily: SANS,
                    fontSize: "14.5px",
                    lineHeight: 1.5,
                    color: COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: COLORS.accent,
                      boxShadow: "0 0 8px rgba(0,212,200,0.55)",
                      margin: "0 12px 2px 0",
                      verticalAlign: "middle",
                    }}
                  />
                  {title}
                </Text>
                <Text
                  style={{
                    margin: "2px 0 0 18px",
                    fontFamily: SANS,
                    fontSize: "13.5px",
                    lineHeight: 1.55,
                    color: COLORS.muted,
                  }}
                >
                  {sub}
                </Text>
              </Section>
            ))}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 32px 0 32px" }}>
            <Text
              style={{
                margin: "0 0 6px 0",
                fontFamily: SANS,
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLORS.dim,
                fontWeight: 600,
              }}
            >
              BuilderHQ · Australia&rsquo;s residential tender platform
            </Text>
            <Text
              style={{
                margin: "0 0 14px 0",
                fontFamily: SANS,
                fontSize: "12px",
                lineHeight: 1.5,
                color: COLORS.dim,
              }}
            >
              Melbourne, Victoria, Australia ·{" "}
              <Link
                href="mailto:info@builderhq.com.au"
                style={{
                  color: COLORS.muted,
                  textDecoration: "underline",
                }}
              >
                info@builderhq.com.au
              </Link>{" "}
              ·{" "}
              <Link
                href={APP_HOME}
                style={{
                  color: COLORS.muted,
                  textDecoration: "underline",
                }}
              >
                builderhq.com.au
              </Link>
            </Text>
            <Text
              style={{
                margin: 0,
                fontFamily: SANS,
                fontSize: "11px",
                lineHeight: 1.55,
                color: COLORS.faint,
              }}
            >
              You&rsquo;re receiving this because you have an existing
              BuilderHQ account from the platform we ran on Bubble.
              We&rsquo;ve rebuilt and imported your account into the new
              version. If this wasn&rsquo;t expected, you can safely ignore —
              no action is taken until you click the claim link.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default LaunchInviteEmail;
