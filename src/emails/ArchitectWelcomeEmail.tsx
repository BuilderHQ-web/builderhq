/**
 * ArchitectWelcomeEmail — the practice's welcome, sent when they finish
 * onboarding.
 *
 * An architect is not a bigger homeowner. They already know how tenders
 * work, they already have builders they trust, and their worry is the
 * opposite of an owner's: not "will I be looked after" but "will this
 * come between me and my client, or between me and my builders".
 *
 * So the copy answers that first and twice. A round can be private and
 * invitation only. Their own builders are welcome. Their name is on the
 * work and the client still decides. Only once that is settled does it
 * describe what the platform actually does for them, which is the
 * documentation nobody enjoys producing.
 *
 * The Preferred Design Partner register closes it, the way the builder
 * welcome closes on the builder network: a practice that runs a round
 * well is exactly who we want to recommend.
 */

import {
  BodyText,
  Divider,
  EmailShell,
  InlineLink,
  MiniLabel,
  PrimaryButton,
  SecondaryButton,
  Strong,
} from "./_shell";

interface ArchitectWelcomeEmailProps {
  firstName: string | null;
  practiceName: string | null;
  startProjectUrl: string;
  demoUrl: string;
  /** The public Preferred Design Partner register. */
  networkUrl: string;
  /** The join form, opened by its sentinel hash on the landing page. */
  networkFormUrl: string;
}

export function ArchitectWelcomeEmail({
  firstName,
  practiceName,
  startProjectUrl,
  demoUrl,
  networkUrl,
  networkFormUrl,
}: ArchitectWelcomeEmailProps) {
  return (
    <EmailShell
      preview="Welcome to BuilderHQ"
      kicker="Welcome"
      heading="Welcome to BuilderHQ"
      subheading="Australia's residential construction tendering platform."
      whyReceiving="You're receiving this because you created a BuilderHQ account for your practice."
    >
      <BodyText>{`Hi ${firstName ?? "there"},`}</BodyText>

      <BodyText>
        {`${
          practiceName ?? "Your practice"
        } is set up. BuilderHQ is where you run a tender for a client without spending weeks of your own time on it.`}
      </BodyText>

      <BodyText>
        You stay in front of your client throughout. Your name is on the round,
        and the decision is still theirs.
      </BodyText>

      <Divider />

      <MiniLabel>How it works</MiniLabel>

      <BodyText>
        <Strong>Upload the drawings.</Strong> We read every page and write the
        scope of works: every item of work the job needs, each one cited back to
        the sheet it came from. Where the documents leave something open, it is
        marked.
      </BodyText>

      <BodyText>
        <Strong>You choose who prices it.</Strong> Invite the builders you
        already trust, open the round to vetted builders on BuilderHQ, or do
        both. A private round never appears in the marketplace.
      </BodyText>

      <BodyText>
        <Strong>Every tender comes back in one format.</Strong> Same scope, same
        questions, same order. Nobody has to work out what each builder has left
        out.
      </BodyText>

      <BodyText>
        <Strong>You advise, your client decides.</Strong> Read them side by
        side, then hand over a comparison your client can follow.
      </BodyText>

      <div style={{ margin: "30px 0 6px" }}>
        <PrimaryButton href={startProjectUrl}>
          Start a project
        </PrimaryButton>
      </div>
      <div style={{ margin: "0 0 8px" }}>
        <SecondaryButton href={demoUrl}>Watch the demo</SecondaryButton>
      </div>

      <BodyText>
        The demo runs through a full round, from drawings to the comparison your
        client sees.
      </BodyText>

      <Divider />

      <MiniLabel>One more thing</MiniLabel>

      <BodyText>
        Our{" "}
        <InlineLink href={networkUrl}>
          Preferred Design Partner network
        </InlineLink>{" "}
        is open. It is a short register of practices we put forward when a
        homeowner asks us to recommend someone. If you would like to be
        considered,{" "}
        <InlineLink href={networkFormUrl}>tell us about your practice</InlineLink>{" "}
        and we will be in touch.
      </BodyText>

      <BodyText>
        If anything is unclear, reply to this email and one of our team members
        will get back to you.
      </BodyText>

      <BodyText>
        Welcome aboard,
        <br />
        The BuilderHQ Team
      </BodyText>
    </EmailShell>
  );
}

export default ArchitectWelcomeEmail;
