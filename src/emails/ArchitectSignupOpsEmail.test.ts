/**
 * The architect signup notice, rendered.
 *
 * No JSX: the component is invoked as a plain function so the test can
 * live as a .ts file, which is what the vitest include glob picks up.
 *
 * What is pinned is what the notice must carry. A studio signup is the
 * one this platform can least afford to miss, and the fields that make
 * it actionable are the practice name and a way to reach them. Both
 * optional fields are absent on some real accounts, so the notice has
 * to render without them rather than throw.
 */

import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { ArchitectSignupOpsEmail } from "@/emails/ArchitectSignupOpsEmail";

const props = {
  architectName: "Darshna Rupapara",
  architectEmail: "studio@example.com",
  architectPhone: "+61412345678",
  practiceName: "Banksia Building Design",
  suburb: "Brunswick",
  state: "VIC",
  signedUpAt: new Date("2026-08-25T02:00:00Z"),
};

describe("ArchitectSignupOpsEmail", () => {
  test("carries the practice, the person and the contact details", async () => {
    const html = await render(ArchitectSignupOpsEmail(props));
    expect(html).toContain("Banksia Building Design");
    expect(html).toContain("Darshna Rupapara");
    expect(html).toContain("studio@example.com");
    expect(html).toContain("+61412345678");
  });

  test("joins suburb and state into one place line", async () => {
    const html = await render(ArchitectSignupOpsEmail(props));
    expect(html).toContain("Brunswick, VIC");
  });

  test("prints the time in Melbourne, not raw UTC", async () => {
    // 02:00 UTC on 25 Aug is midday in Melbourne. A UTC ISO string
    // reads as the wrong day to anyone glancing at it after 2pm.
    const html = await render(ArchitectSignupOpsEmail(props));
    expect(html).toContain("AEST");
    expect(html).toContain("12:00");
    expect(html).not.toContain("T02:00:00");
  });

  test("carries no em dash, which our copy rules forbid", async () => {
    const html = await render(ArchitectSignupOpsEmail(props));
    expect(html).not.toContain("\u2014");
  });

  test("renders with no phone, no practice name and no location", async () => {
    // All three are nullable on the profile, and a studio that skipped
    // them is still a studio worth hearing about.
    const html = await render(
      ArchitectSignupOpsEmail({
        ...props,
        architectPhone: null,
        practiceName: null,
        suburb: null,
        state: null,
      }),
    );
    expect(html).toContain("studio@example.com");
    expect(html).not.toContain("Brunswick");
  });

  test("falls back to the email when nothing else identifies them", async () => {
    const html = await render(
      ArchitectSignupOpsEmail({
        ...props,
        architectName: null,
        practiceName: null,
      }),
    );
    expect(html).toContain("studio@example.com");
  });
});
