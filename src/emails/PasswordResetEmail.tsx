/**
 * PasswordResetEmail — sent when a user clicks "forgot password".
 *
 * Same brand/inline-style discipline as VerificationEmail. Different copy
 * + a 1-hour TTL noted in body (we use 1h, not 24h, for password reset).
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
  firstName: string | null;
}

const brand = {
  bg: "#03090f",
  surface: "#0a1622",
  border: "#1a2632",
  text: "#eef6ff",
  muted: "#98b8d0",
  dim: "#567080",
  accent: "#00d4c8",
  accentText: "#031118",
} as const;

export function PasswordResetEmail({ resetUrl, firstName }: PasswordResetEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return (
    <Html>
      <Head />
      <Preview>Reset your BuilderHQ password — link expires in 1 hour.</Preview>
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
          <Section style={{ paddingBottom: "32px" }}>
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

          <Section
            style={{
              backgroundColor: brand.surface,
              border: `1px solid ${brand.border}`,
              borderRadius: "8px",
              padding: "40px 32px",
            }}
          >
            <Heading
              style={{
                fontFamily: '"Bebas Neue", Impact, sans-serif',
                fontSize: "44px",
                lineHeight: "1.05",
                letterSpacing: "-0.01em",
                color: brand.text,
                margin: "0 0 16px 0",
                textTransform: "uppercase",
                fontWeight: 400,
              }}
            >
              Reset your password
            </Heading>

            <Text style={{ fontSize: "15px", lineHeight: "26px", color: brand.muted, margin: "0 0 24px 0" }}>
              {greeting}
            </Text>

            <Text style={{ fontSize: "15px", lineHeight: "26px", color: brand.muted, margin: "0 0 32px 0" }}>
              Click the button below to set a new password for your BuilderHQ
              account. This link will expire in 1 hour.
            </Text>

            <Button
              href={resetUrl}
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
              Reset password
            </Button>

            <Text style={{ fontSize: "13px", lineHeight: "22px", color: brand.dim, margin: "32px 0 0 0" }}>
              Or paste this link into your browser:
              <br />
              <Link href={resetUrl} style={{ color: brand.accent, wordBreak: "break-all" }}>
                {resetUrl}
              </Link>
            </Text>

            <Hr style={{ border: "none", borderTop: `1px solid ${brand.border}`, margin: "32px 0 24px 0" }} />

            <Text style={{ fontSize: "12px", lineHeight: "20px", color: brand.dim, margin: 0 }}>
              If you didn&apos;t request this, ignore this email — your password
              stays the same. For your security, never share this link.
            </Text>
          </Section>

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

export default PasswordResetEmail;
