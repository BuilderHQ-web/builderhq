import { Suspense } from "react";

import { ContactStep } from "./contact-step";
import { env } from "@/lib/env";

export const metadata = { title: "Almost done — BuilderHQ" };

export default function StartQContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactStep
        turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
      />
    </Suspense>
  );
}
