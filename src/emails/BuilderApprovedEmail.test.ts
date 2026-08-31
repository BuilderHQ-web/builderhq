/**
 * The builder welcome, rendered.
 *
 * What is pinned is what the email has to do: welcome them, carry all
 * four links to real destinations, and make its case without reading as
 * an accusation about other builders. The last one cannot be tested
 * directly, so what is tested instead is that the words which would
 * make it an accusation are absent.
 */

import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { BuilderApprovedEmail } from "@/emails/BuilderApprovedEmail";

const props = {
  firstName: "Adrian",
  companyName: "AYG Projects",
  dashboardUrl: "https://builderhq.com.au/builder",
  demoUrl: "https://builderhq.com.au/demo/builder",
  networkUrl: "https://builderhq.com.au/partners/builders",
  networkFormUrl: "https://builderhq.com.au/#join-builder",
};

describe("BuilderApprovedEmail", () => {
  test("greets them and names the business", async () => {
    const html = await render(BuilderApprovedEmail(props));
    expect(html).toContain("Hi Adrian");
    expect(html).toContain("AYG Projects");
  });

  test("carries all four links", async () => {
    const html = await render(BuilderApprovedEmail(props));
    for (const url of [
      props.dashboardUrl,
      props.demoUrl,
      props.networkUrl,
      props.networkFormUrl,
    ]) {
      expect(html).toContain(url);
    }
  });

  test("says their own documents are still welcome", async () => {
    // Builders carry their own trade breakdowns and inclusions sheets.
    // An email that implies the platform replaces those loses them.
    const html = await render(BuilderApprovedEmail(props));
    expect(html).toContain("attach your own documents");
  });

  test("mentions the Preferred Builder network by name", async () => {
    const html = await render(BuilderApprovedEmail(props));
    expect(html).toContain("Preferred Builder network");
  });

  test("offers a person, not a system, for questions", async () => {
    const html = await render(BuilderApprovedEmail(props));
    expect(html).toContain("one of our team members will get back to you");
  });

  test("makes its case without accusing anyone", async () => {
    // The scope argument has to land as a fact about the platform, not
    // as a claim that competitors are dishonest.
    const html = await render(BuilderApprovedEmail(props)).then((h) =>
      h.toLowerCase(),
    );
    for (const word of ["dishonest", "cowboy", "dodgy", "cheat", "rip you off"]) {
      expect(html).not.toContain(word);
    }
    expect(html).toContain("prices the same scope of works");
  });

  test("renders without a first name or a company", async () => {
    const html = await render(
      BuilderApprovedEmail({ ...props, firstName: null, companyName: null }),
    );
    expect(html).toContain("Hi there");
    expect(html).toContain("You are");
  });

  test("carries no em dash, which our copy rules forbid", async () => {
    const html = await render(BuilderApprovedEmail(props));
    expect(html).not.toContain("—");
  });
});
