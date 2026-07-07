/**
 * PartnerInterestConfirmationEmail — holding receipt sent to an architect
 * or finance broker after they register interest in a Preferred Partner
 * network via the landing "Join the network" CTA.
 *
 * Tone is deliberately restrained and institutional (see the brand-voice
 * mandate): confirm receipt, set the "we'll be in touch" expectation, and
 * stop. The substantive follow-up (directory listing, introductions) is
 * handled by the team by hand, not by this email.
 */

import { BodyText, EmailShell, InlineLink, Strong } from "./_shell";

export type PartnerNetwork = "architect" | "finance";

const NETWORK_LABEL: Record<PartnerNetwork, string> = {
  architect: "Preferred Architect Network",
  finance: "Preferred Finance Partner network",
};

interface PartnerInterestConfirmationEmailProps {
  firstName: string;
  firmName: string;
  network: PartnerNetwork;
}

export function PartnerInterestConfirmationEmail({
  firstName,
  firmName,
  network,
}: PartnerInterestConfirmationEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const label = NETWORK_LABEL[network];

  return (
    <EmailShell
      preview={`Received — your interest in the BuilderHQ ${label}.`}
      kicker="Received"
      heading="Thank you for registering."
      whyReceiving={`You're receiving this because you registered your interest in the BuilderHQ ${label} at builderhq.com.au. If this wasn't you, please ignore this email. No further action is taken without your reply.`}
    >
      <BodyText>{greeting}</BodyText>

      <BodyText>
        Thank you for registering <Strong>{firmName}</Strong> for the{" "}
        <Strong>{label}</Strong>. We have your details, and a member of our
        team will review them and be in touch shortly to talk through the next
        steps.
      </BodyText>

      <BodyText>
        There is nothing further you need to do for now. If you have any
        questions in the meantime, simply reply to this email and it will reach
        us directly.
      </BodyText>

      <BodyText>
        — The BuilderHQ team
        <br />
        <InlineLink href="mailto:info@builderhq.com.au">
          info@builderhq.com.au
        </InlineLink>
      </BodyText>
    </EmailShell>
  );
}

export default PartnerInterestConfirmationEmail;
