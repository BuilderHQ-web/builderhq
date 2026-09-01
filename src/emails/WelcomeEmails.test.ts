/**
 * The owner and architect welcomes, rendered.
 *
 * These two carry deliberate omissions as much as content, and an
 * omission is the easiest thing for a later edit to undo by accident.
 * So what is pinned is both: the links that must be there, and the
 * phrases that were removed on purpose and must not come back.
 */

import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { OwnerWelcomeEmail } from "@/emails/OwnerWelcomeEmail";
import { ArchitectWelcomeEmail } from "@/emails/ArchitectWelcomeEmail";

const owner = {
  firstName: "Sarah",
  startProjectUrl: "https://builderhq.com.au/owner/projects/new",
  demoUrl: "https://builderhq.com.au/demo",
};

const architect = {
  firstName: "Darshna",
  practiceName: "Rupapara Studio",
  startProjectUrl: "https://builderhq.com.au/architect/projects/new",
  demoUrl: "https://builderhq.com.au/demo/architect",
  networkUrl: "https://builderhq.com.au/partners/architects",
  networkFormUrl: "https://builderhq.com.au/#join-architect",
};

describe("OwnerWelcomeEmail", () => {
  test("greets them and carries both links", async () => {
    const html = await render(OwnerWelcomeEmail(owner));
    expect(html).toContain("Hi Sarah");
    expect(html).toContain(owner.startProjectUrl);
    expect(html).toContain(owner.demoUrl);
  });

  test("says builders are matched, and that they can invite their own", async () => {
    const html = await render(OwnerWelcomeEmail(owner));
    expect(html).toContain("expertise");
    expect(html).toContain("invite your own");
  });

  test("never raises what we charge", async () => {
    // Removed deliberately: naming commission raises the subject rather
    // than closing it. "The contract is between you and your builder"
    // settles the fear on its own.
    const html = (await render(OwnerWelcomeEmail(owner))).toLowerCase();
    expect(html).not.toContain("commission");
    expect(html).not.toContain("free");
    expect(html).toContain("contract is between you and your builder");
  });

  test("never mentions variations", async () => {
    const html = (await render(OwnerWelcomeEmail(owner))).toLowerCase();
    expect(html).not.toContain("variation");
  });

  test("does not say plain English", async () => {
    const html = (await render(OwnerWelcomeEmail(owner))).toLowerCase();
    expect(html).not.toContain("plain english");
  });

  test("renders without a first name", async () => {
    const html = await render(OwnerWelcomeEmail({ ...owner, firstName: null }));
    expect(html).toContain("Hi there");
  });
});

describe("ArchitectWelcomeEmail", () => {
  test("names the practice and carries all four links", async () => {
    const html = await render(ArchitectWelcomeEmail(architect));
    expect(html).toContain("Rupapara Studio");
    for (const url of [
      architect.startProjectUrl,
      architect.demoUrl,
      architect.networkUrl,
      architect.networkFormUrl,
    ]) {
      expect(html).toContain(url);
    }
  });

  test("promises weeks of their time back, not a week", async () => {
    const html = await render(ArchitectWelcomeEmail(architect));
    expect(html).toContain("weeks of your own time");
  });

  test("keeps the client in front of them", async () => {
    const html = await render(ArchitectWelcomeEmail(architect));
    expect(html).toContain("Your name is on the round");
    expect(html).toContain("the decision is still theirs");
  });

  test("does not say plain English, or that one builder is a valid round", async () => {
    const html = (await render(ArchitectWelcomeEmail(architect))).toLowerCase();
    expect(html).not.toContain("plain english");
    expect(html).not.toContain("perfectly valid round");
  });

  test("mentions the Preferred Design Partner network", async () => {
    const html = await render(ArchitectWelcomeEmail(architect));
    expect(html).toContain("Preferred Design Partner network");
  });

  test("renders without a name or a practice", async () => {
    const html = await render(
      ArchitectWelcomeEmail({ ...architect, firstName: null, practiceName: null }),
    );
    expect(html).toContain("Hi there");
    expect(html).toContain("Your practice");
  });

  test("neither carries an em dash", async () => {
    for (const html of [
      await render(OwnerWelcomeEmail(owner)),
      await render(ArchitectWelcomeEmail(architect)),
    ]) {
      expect(html).not.toContain("—");
    }
  });
});
