/**
 * OwnerWelcomeEmail — the homeowner's welcome, sent when they finish
 * onboarding.
 *
 * Owners arrive knowing they need builders and not much else. Most have
 * never run a tender and do not know what one should look like, so the
 * email's job is not to sell: it is to tell them what happens next, in
 * the order it happens, so the first email from a builder is not a
 * surprise.
 *
 * The last line answers the fear an owner has before they name it: that
 * a platform will sit between them and their builder. "The contract is
 * between you and your builder" settles it and stops there. Going on to
 * discuss what we do or do not charge raises the subject rather than
 * closing it.
 *
 * No approval gate here, unlike the builder: an owner is useful to us
 * and to themselves the moment they arrive.
 */

import {
  BodyText,
  Divider,
  EmailShell,
  MiniLabel,
  PrimaryButton,
  SecondaryButton,
  Strong,
} from "./_shell";

interface OwnerWelcomeEmailProps {
  firstName: string | null;
  startProjectUrl: string;
  demoUrl: string;
}

export function OwnerWelcomeEmail({
  firstName,
  startProjectUrl,
  demoUrl,
}: OwnerWelcomeEmailProps) {
  return (
    <EmailShell
      preview="Welcome to BuilderHQ"
      kicker="Welcome"
      heading="Welcome to BuilderHQ"
      subheading="Australia's residential construction tendering platform."
      whyReceiving="You're receiving this because you created a BuilderHQ account."
    >
      <BodyText>{`Hi ${firstName ?? "there"},`}</BodyText>

      <BodyText>
        Your account is ready. BuilderHQ puts your project in front of vetted
        builders and shows you what sits behind every price.
      </BodyText>

      <BodyText>
        Getting three prices is easy. Knowing what each one covers is the hard
        part. That is the part we handle.
      </BodyText>

      <Divider />

      <MiniLabel>How it works</MiniLabel>

      <BodyText>
        <Strong>Upload your plans.</Strong> Add your drawings and any reports
        you have. We read every page.
      </BodyText>

      <BodyText>
        <Strong>We write your scope of works.</Strong> Every item of work your
        job needs, each one pointing back to the page it came from. Where the
        drawings leave something out, we tell you.
      </BodyText>

      <BodyText>
        <Strong>Builders price it.</Strong> Vetted builders whose expertise
        matches your project get access to it, and you can invite your own
        builders as well. Spots are limited, so you get a few real prices rather
        than a pile.
      </BodyText>

      <BodyText>
        <Strong>You compare them side by side.</Strong> Every builder prices the
        same scope and answers the same questions, so you are comparing like
        with like.
      </BodyText>

      <BodyText>
        <Strong>You choose.</Strong> The contract is between you and your
        builder.
      </BodyText>

      <div style={{ margin: "30px 0 6px" }}>
        <PrimaryButton href={startProjectUrl}>Start your project</PrimaryButton>
      </div>
      <div style={{ margin: "0 0 8px" }}>
        <SecondaryButton href={demoUrl}>Watch the demo</SecondaryButton>
      </div>

      <BodyText>
        You do not need every document to start. Upload what you have and add
        the rest later.
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

export default OwnerWelcomeEmail;
