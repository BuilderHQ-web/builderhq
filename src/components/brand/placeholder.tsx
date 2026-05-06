import * as React from "react";
import { Section, Eyebrow } from "@/components/brand/section";
import { Badge } from "@/components/ui/badge";

/**
 * Phase 0 placeholder page. Used for routes that exist in the URL map
 * but won't have real content until later phases. Looks on-brand so
 * navigation feels like the same product.
 */
export function Placeholder({
  eyebrow,
  title,
  description,
  phase,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <Section width="default" spacing="lg">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,5vw+1rem,4.5rem)] leading-none">
        {title}
      </h1>
      <p className="mt-5 max-w-prose text-[15px] leading-[1.85] text-text-muted">{description}</p>
      <div className="mt-8">
        <Badge variant="accent">{phase}</Badge>
      </div>
    </Section>
  );
}
