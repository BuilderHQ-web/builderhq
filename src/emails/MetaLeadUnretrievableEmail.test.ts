/**
 * The unretrievable-lead alarm, rendered.
 *
 * This notice is the only thing standing between a live campaign and a
 * lead that vanishes without trace, so what it must say is pinned: that
 * a lead exists, where to go and get it by hand, and why it happened.
 */

import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { MetaLeadUnretrievableEmail } from "@/emails/MetaLeadUnretrievableEmail";

const props = {
  leadgenId: "1234567890",
  formId: "form-1",
  pageId: "page-1",
  reason: "Graph returned 403: (#200) Requires leads_retrieval permission",
  receivedAt: new Date("2026-08-27T02:00:00Z"),
};

describe("MetaLeadUnretrievableEmail", () => {
  test("says a lead exists and where to fetch it by hand", async () => {
    const html = await render(MetaLeadUnretrievableEmail(props));
    expect(html).toContain("Ads Manager");
    expect(html).toContain("1234567890");
    expect(html).toContain("not lost");
  });

  test("names the usual cause, so it is actionable rather than alarming", async () => {
    const html = await render(MetaLeadUnretrievableEmail(props));
    expect(html).toContain("App Review");
    expect(html).toContain("Development mode");
  });

  test("carries what Meta actually said", async () => {
    const html = await render(MetaLeadUnretrievableEmail(props));
    expect(html).toContain("leads_retrieval");
  });

  test("renders with no form or page id", async () => {
    const html = await render(
      MetaLeadUnretrievableEmail({ ...props, formId: null, pageId: null }),
    );
    expect(html).toContain("1234567890");
  });
});
