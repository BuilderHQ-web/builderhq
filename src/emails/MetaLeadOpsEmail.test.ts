/**
 * The Meta lead notice, rendered.
 *
 * No JSX here on purpose: the component is invoked as a plain function
 * so the test can live as a .ts file, which is what the vitest include
 * glob picks up.
 *
 * What is worth pinning is not the layout but the promises the copy
 * makes: that the contact details are present, that an answer to a
 * question nobody anticipated still appears, and that a missing field
 * is stated rather than silently rendered as a blank row.
 */

import { render } from "@react-email/render";
import { MetaLeadOpsEmail } from "@/emails/MetaLeadOpsEmail";
import { describe, expect, test } from "vitest";

describe("MetaLeadOpsEmail", () => {
  const props = {
    leadId: "lead-uuid",
    fullName: "Sarah Nguyen",
    email: "s@example.com",
    phone: "+61 400 000 000",
    extras: { what_stage_is_your_project_at: "Plans approved", suburb: "Ainslie" },
    campaignName: "Canberra Extensions",
    adName: "Carousel A",
    formLabel: "form-1",
    platform: "ig",
    incomplete: false,
    createdAt: new Date("2026-08-27T02:00:00Z"),
  };

  test("renders the contact details and the extra answers", async () => {
    const html = await render(MetaLeadOpsEmail(props));
    expect(html).toContain("Sarah Nguyen");
    expect(html).toContain("s@example.com");
    expect(html).toContain("Canberra Extensions");
    expect(html).toContain("Plans approved");
    expect(html).toContain("What stage is your project at");
    expect(html).toContain("Instagram");
  });

  test("says so plainly when a field was missing", async () => {
    const html = await render(MetaLeadOpsEmail({ ...props, incomplete: true, email: null }));
    expect(html).toContain("at least one expected field was missing");
  });

  test("renders without a name, a phone or a campaign", async () => {
    const html = await render(
      MetaLeadOpsEmail({
        ...props,
        fullName: "",
        phone: null,
        campaignName: null,
        adName: null,
        platform: null,
      }),
    );
    expect(html).toContain("(no name given)");
    expect(html).toContain("Meta");
  });
});
