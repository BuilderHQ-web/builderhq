/**
 * PartnerIntroConfirmationEmail — holding receipt sent to a homeowner
 * after they request a Preferred Partner introduction via the landing
 * network CTA. Restrained and institutional: confirm receipt, set the
 * expectation, stop. The actual introduction is made by the team.
 */

import { introNeedsSentence } from "@/modules/leads/partner-roles";

import { BodyText, EmailShell, InlineLink, Strong } from "./_shell";
import type { IntroNeeds } from "./PartnerIntroOpsEmail";

interface PartnerIntroConfirmationEmailProps {
  firstName: string;
  needs: IntroNeeds;
}

export function PartnerIntroConfirmationEmail({
  firstName,
  needs,
}: PartnerIntroConfirmationEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <EmailShell
      preview="Received. We are lining up the right introduction for your build."
      kicker="Received"
      heading="We're on it."
      whyReceiving="You're receiving this because you requested a Preferred Partner introduction at builderhq.com.au. If this wasn't you, please ignore this email. Nothing further happens without your reply."
    >
      <BodyText>{greeting}</BodyText>

      <BodyText>
        Thanks for asking us to connect you with{" "}
        <Strong>{introNeedsSentence(needs)}</Strong>. We only introduce partners we know
        and trust, so a member of our team will review your request and come
        back to you shortly with the right fit for your build and area.
      </BodyText>

      <BodyText>
        There is no charge and no obligation. If you have any questions in the
        meantime, simply reply to this email and it will reach us directly.
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

export default PartnerIntroConfirmationEmail;
