/**
 * MetaLeadUnretrievableEmail — the alarm for a lead that reached us and
 * that we were not permitted to read.
 *
 * WHY THIS EXISTS. Meta's Lead Ads guide is flat about it: an app must
 * pass App Review before it may retrieve lead data, and an app still in
 * Development mode can only read leads submitted by someone who holds a
 * role on that app. Until review is granted, a real member of the
 * public filling the form produces a webhook we cannot act on.
 *
 * Without this notice that is a SILENT loss: money is going out on the
 * campaign, the person is waiting for a call, and no screen anywhere
 * shows that anything happened. The answers are not gone, they are in
 * Ads Manager, but nobody would know to go and look.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  MetaCard,
  MetaRow,
  Strong,
} from "./_shell";

interface MetaLeadUnretrievableEmailProps {
  leadgenId: string;
  formId: string | null;
  pageId: string | null;
  reason: string;
  receivedAt: Date;
}

export function MetaLeadUnretrievableEmail({
  leadgenId,
  formId,
  pageId,
  reason,
  receivedAt,
}: MetaLeadUnretrievableEmailProps) {
  const formattedDate = receivedAt.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  });

  return (
    <EmailShell
      preview="A Meta lead arrived that we were not permitted to read"
      kicker="LEAD AD · Action needed"
      heading="A lead came in and we could not read it"
      whyReceiving="You're receiving this because you're the ops contact for BuilderHQ. Sent automatically whenever Meta tells us about a lead that our app is not permitted to retrieve."
    >
      <BodyText>
        Somebody completed one of our Instant Forms. Meta told us the lead
        exists but refused to hand over the answers, so there is nothing to put
        on the record and nobody to call from here.
      </BodyText>

      <BodyText>
        <Strong>Their details are not lost.</Strong> Open Ads Manager, go to the
        form under the campaign, and download the leads. Do it now rather than
        later: this person filled the form expecting to hear from us.
      </BodyText>

      <MetaCard>
        <MetaRow label="Received" value={`${formattedDate} AEST`} />
        <MetaRow
          label="Lead ID"
          value={
            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{leadgenId}</span>
          }
        />
        <MetaRow label="Form" value={formId ?? "—"} />
        <MetaRow label="Page" value={pageId ?? "—"} />
        <MetaRow label="Meta said" value={reason} />
      </MetaCard>

      <Divider />

      <BodyText>
        <Strong>The usual cause</Strong> is that the app has not passed App
        Review for lead retrieval, or is still in Development mode. Meta only
        releases lead data to a reviewed app in Live mode. Until that is
        granted, every lead from a member of the public arrives this way and has
        to be collected by hand.
      </BodyText>

      <InlineLink href="https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving">
        Meta: retrieving lead data
      </InlineLink>

      <Caption>
        This notice is sent once per lead. Meta does not redeliver a lead we
        have acknowledged, so if these stop arriving it means either the
        permission was granted or the campaign stopped, not that the problem
        resolved itself.
      </Caption>
    </EmailShell>
  );
}

export default MetaLeadUnretrievableEmail;
