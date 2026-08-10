/**
 * Landing v2 — the composition root for the marketing home page.
 *
 * One page, one voice, one surface. The role lens is gone: the three
 * audiences are argued in full on their own pages under /for, and the
 * home page tells the story once, in a professional register, with the
 * homeowner as the default reader.
 *
 * The order is the argument:
 *   hero → who we work with → 01 the problem → 02 how a round runs →
 *   03 the standards → 04 who it's for → 05 proof → the Build Brief →
 *   06 questions → close.
 *
 * Section ids are the analytics landmarks; SectionTracker holds the
 * list, and the two chapters whose components carry no id of their own
 * get one from the wrappers below.
 */

import {
  livePartnerLogos,
  partnerNavTypes,
} from "@/app/(marketing)/partners/partners-data";

import { Canvas } from "./canvas";
import { MarketingMotion } from "./role";
import { ScrollProgress } from "./scroll-progress";
import { LandingNav } from "./nav";
import { Hero } from "./hero";
import { PartnerMarquee } from "./partner-marquee";
import { Problem } from "./problem";
import { Spine } from "./spine";
/* The standards and the audiences chapters still live in the files they
   were born in. Aliased so the composition reads as the page does. */
import { Trust as Standards } from "./trust";
import { Ecosystem as Audiences } from "./ecosystem";
import { Proof } from "./proof";
import { Testimonials } from "./testimonials";
import { BuildBriefStrip } from "./build-brief-strip";
import { FAQ } from "./faq";
import { Close } from "./close";
import { Footer } from "./footer";
import { SectionDivider } from "./section-divider";
import { PartnerForm } from "./partner-form";
import { SectionTracker } from "./section-tracker";

export function Landing({ authedHref }: { authedHref: string | null }) {
  return (
    <MarketingMotion>
      <div className="lp-light">
        <Canvas />

        <LandingNav authedHref={authedHref} partnerNav={partnerNavTypes()} />

        <main className="relative z-10">
          <Hero authedHref={authedHref} />
          <PartnerMarquee logos={livePartnerLogos()} />

          <SectionDivider n="01" label="The problem" />
          <Problem />

          <SectionDivider n="02" label="How it works" />
          <Spine authedHref={authedHref} />

          <SectionDivider n="03" label="The standards" />
          <Standards />

          <SectionDivider n="04" label="Who it’s for" />
          <Audiences />

          <SectionDivider n="05" label="Proof" />
          <div id="proof">
            <Proof />
            <Testimonials />
          </div>
          <BuildBriefStrip />

          <SectionDivider n="06" label="Questions" />
          <FAQ />

          <div id="close">
            <Close authedHref={authedHref} />
          </div>
        </main>

        <Footer />

        {/* Reading progress, above the nav. */}
        <ScrollProgress />

        {/* Partner capture modal — listens for the #join-network /
            #join-architect / #request-intro sentinel CTAs. */}
        <PartnerForm />

        {/* Scroll-depth analytics: one section_viewed per landmark. */}
        <SectionTracker />
      </div>
    </MarketingMotion>
  );
}
