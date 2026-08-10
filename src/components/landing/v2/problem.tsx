/**
 * 01 · The problem. Three quotes, three different jobs.
 *
 * A statement, a lede, three cards and the line that hands over to the
 * next section. No diorama, no debris, no before-and-after: the argument
 * is the copy, and the copy is in content.ts.
 */

import { Reveal } from "../reveal";
import { PROBLEM } from "./content";
import { SectionField } from "./section-field";

export function Problem() {
  return (
    <section
      id="problem"
      className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-28 scroll-mt-24"
    >
      <SectionField variant="warm" />

      <div className="relative mx-auto w-full max-w-[1140px]">
        <Reveal>
          <div className="mx-auto max-w-[62ch] text-center">
            <h2 className="font-ui font-semibold text-text tracking-[-0.03em] leading-[1.1] text-[clamp(2rem,3.2vw+0.5rem,3rem)] text-balance">
              {PROBLEM.h2}
            </h2>
            <p className="mt-6 text-[17px] leading-[1.65] text-text-muted">{PROBLEM.lede}</p>
          </div>
        </Reveal>

        <div className="mt-14 lg:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {PROBLEM.cards.map((card, i) => (
            <Reveal key={card.title} delay={0.06 * i} className="h-full">
              <article className="h-full rounded-2xl border border-border-subtle bg-surface-1 p-6 lg:p-7 card-elev">
                <h3 className="font-ui font-semibold text-[19px] leading-[1.3] text-text text-balance">
                  {card.title}
                </h3>
                <p className="mt-3.5 text-[16px] leading-[1.65] text-text-muted">{card.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-14 lg:mt-16 mx-auto max-w-[46ch] text-center font-ui font-medium text-text leading-[1.35] text-[clamp(1.25rem,1.2vw+0.85rem,1.625rem)] text-balance">
            {PROBLEM.bridge}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
