import { Suspense } from "react";

import { TimelineStep } from "./timeline-step";

export const metadata = { title: "When are you starting? — BuilderHQ" };

export default function StartQTimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelineStep />
    </Suspense>
  );
}
