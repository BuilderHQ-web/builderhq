import { Suspense } from "react";

import { PlansStep } from "./plans-step";

export const metadata = { title: "Architectural plans — BuilderHQ" };

export default function StartQPlansPage() {
  return (
    <Suspense fallback={null}>
      <PlansStep />
    </Suspense>
  );
}
