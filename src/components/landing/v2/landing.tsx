/**
 * Landing v2 — composition root, shared by `/` and `/for/[audience]`.
 *
 * One continuous canvas (Canvas), whose ambient light shifts per lens.
 * The page never switches surfaces; content floats on top and re-tunes
 * when the visitor picks a role in the selector. The dock flight
 * (FlyingLabel) and the re-light pulse (RoleWash) render above the fold.
 *
 * Narrative: hook (hero) → pick your view (selector) → what is wrong
 * today (problem) → how it works (spine) → the rules (trust) → what it
 * costs (pricing) → the network → the whole picture (ecosystem) → what
 * people say → the publication → questions → close.
 */

import {
  livePartnerLogos,
  partnerNavTypes,
} from "@/app/(marketing)/partners/partners-data";

import { Canvas, RoleWash } from "./canvas";
import { FlyingLabel } from "./flying-label";
import { ScrollProgress } from "./scroll-progress";
import type { Role } from "./content";
import { RoleProvider } from "./role";
import { LandingNav } from "./nav";
import { BuildBriefStrip } from "./build-brief-strip";
import { Hero } from "./hero";
import { PartnerMarquee } from "./partner-marquee";
import { RoleSelector } from "./role-selector";
import { Problem } from "./problem";
import { Spine } from "./spine";
import { Trust } from "./trust";
import { Pricing } from "./pricing";
import { Network } from "./network";
import { Ecosystem } from "./ecosystem";
import { Testimonials } from "./testimonials";
import { FAQ } from "./faq";
import { Close } from "./close";
import { Footer } from "./footer";
import { SectionDivider } from "./section-divider";
import { PartnerForm } from "./partner-form";
import { SectionTracker } from "./section-tracker";

export function Landing({
  initialRole = "homeowner",
  initialDocked = false,
  authedHref,
}: {
  initialRole?: Role;
  initialDocked?: boolean;
  authedHref: string | null;
}) {
  return (
    <RoleProvider initialRole={initialRole} initialDocked={initialDocked}>
      <div className="lp-light">
      <Canvas />

      <LandingNav authedHref={authedHref} partnerNav={partnerNavTypes()} />

      <main className="relative z-10">
        <Hero authedHref={authedHref} />
        <PartnerMarquee logos={livePartnerLogos()} />
        <RoleSelector />
        <SectionDivider n="01" label="The problem" />
        <Problem />
        <SectionDivider n="02" label="How it works" />
        <Spine authedHref={authedHref} />
        <SectionDivider n="03" label="The rules" />
        <Trust />
        <SectionDivider n="04" label="What it costs" />
        <Pricing />
        <SectionDivider n="05" label="Our partners" />
        <Network />
        <SectionDivider n="06" label="Who it’s for" />
        <Ecosystem />
        <SectionDivider n="07" label="What people say" />
        <Testimonials />
        <SectionDivider n="08" label="The publication" />
        <BuildBriefStrip />
        <SectionDivider n="09" label="Questions" />
        <FAQ />
        <Close authedHref={authedHref} />
      </main>

      <Footer />

      {/* Overlays: reading progress, the re-light pulse, the dock flight. */}
      <ScrollProgress />
      <RoleWash />
      <FlyingLabel />

      {/* Partner capture modal — listens for the #join-architect /
          #join-finance / #request-intro sentinel CTAs. */}
      <PartnerForm />

      {/* Scroll-depth analytics: one section_viewed per landmark. */}
      <SectionTracker />
      </div>
    </RoleProvider>
  );
}
