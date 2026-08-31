/**
 * BuilderApprovedEmail — the builder's welcome, sent the moment their
 * account is approved and never before.
 *
 * WHY IT WAITS FOR APPROVAL. Everything this email promises depends on
 * being approved: the project alerts, the ability to take a spot, the
 * private invitations. Sent at signup it would describe a product the
 * reader cannot use yet, and the second email would have to explain
 * that the first one was premature.
 *
 * WHAT IT HAS TO DO, in order of difficulty. Welcome them. Say what
 * will now arrive in their inbox and what to do about it. And make the
 * case for pricing here rather than on a phone call, WITHOUT making the
 * platform sound like homework and without implying their competitors
 * are dishonest. Two sentences carry that: the tender assembles itself
 * as they answer, and everyone prices the same scope so a number is
 * read next to what it covers. Both are stated as facts about how the
 * platform works, not as accusations about anyone.
 *
 * The language is deliberately plain. Builders read this on a phone,
 * often on site, and a long sentence is a closed email.
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

interface BuilderApprovedEmailProps {
  firstName: string | null;
  companyName: string | null;
  dashboardUrl: string;
  demoUrl: string;
  /** The public Preferred Builder register. */
  networkUrl: string;
  /**
   * The join form. It is a modal on the landing page opened by a
   * sentinel hash, so this link only works because the form now honours
   * that hash on load as well as on click.
   */
  networkFormUrl: string;
}

export function BuilderApprovedEmail({
  firstName,
  companyName,
  dashboardUrl,
  demoUrl,
  networkUrl,
  networkFormUrl,
}: BuilderApprovedEmailProps) {
  return (
    <EmailShell
      preview="Your BuilderHQ account is approved"
      kicker="Account approved"
      heading="Welcome to BuilderHQ"
      subheading="Australia's residential construction tendering platform."
      whyReceiving="You're receiving this because your builder account on BuilderHQ has been approved."
    >
      {/* One interpolated string per paragraph, not text spliced around
          an expression: React emits `<!-- -->` separators between the
          two, which render fine but litter the source a recipient can
          view, and make the copy hard to assert on. */}
      <BodyText>{`Hi ${firstName ?? "there"},`}</BodyText>

      <BodyText>
        {`Your ABN and licences have been checked and your account is approved. ${
          companyName ? `${companyName} is` : "You are"
        } now on the register.`}
      </BodyText>

      <BodyText>
        Our job is to put you in front of the right projects, so you can build
        your pipeline on your own terms.
      </BodyText>

      <Divider />

      <MiniLabel>What happens now</MiniLabel>

      <BodyText>
        <Strong>Projects that suit you come to you.</Strong> When a homeowner or
        architect publishes a project that matches what you build and where you
        work, we will email you.
      </BodyText>

      <BodyText>
        <Strong>Three builders per project.</Strong> Most projects are capped at
        three. Spots are taken in the order builders claim them, so it is worth
        a look when the email lands.
      </BodyText>

      <BodyText>
        <Strong>Architects can bring you in directly.</Strong> A practice you
        already work with can invite you onto BuilderHQ to run a private tender
        with you alone.
      </BodyText>

      <Divider />

      <MiniLabel>Why builders price here</MiniLabel>

      <BodyText>
        The tender is already built for you. You answer straightforward
        questions about your price and what you have allowed for, and your
        submission comes together as you go. You can attach your own documents
        alongside it whenever you want to. There is no document to format and
        nothing to chase.
      </BodyText>

      <BodyText>
        Every builder on a project prices the same scope of works. Your number
        is read next to what it actually covers, so a lower price that leaves
        work out does not look cheaper here. Quoting properly stops costing you
        the job.
      </BodyText>

      <div style={{ margin: "30px 0 6px" }}>
        <PrimaryButton href={dashboardUrl}>Open your dashboard</PrimaryButton>
      </div>
      <div style={{ margin: "0 0 8px" }}>
        <SecondaryButton href={demoUrl}>Watch the builder demo</SecondaryButton>
      </div>

      <BodyText>
        The demo is the fastest way to see how pricing a job here works, start
        to finish.
      </BodyText>

      <Divider />

      <MiniLabel>One more thing</MiniLabel>

      <BodyText>
        Our{" "}
        <InlineLink href={networkUrl}>Preferred Builder network</InlineLink> is
        now open. It is a short register of builders we put forward when a
        homeowner or an architect asks us to recommend someone. If you would
        like to be considered,{" "}
        <InlineLink href={networkFormUrl}>tell us about your business</InlineLink>{" "}
        and we will be in touch.
      </BodyText>

      <BodyText>
        Have a look around. If anything is unclear, reply to this email and one
        of our team members will get back to you.
      </BodyText>

      <BodyText>
        Welcome aboard,
        <br />
        The BuilderHQ Team
      </BodyText>
    </EmailShell>
  );
}

export default BuilderApprovedEmail;
