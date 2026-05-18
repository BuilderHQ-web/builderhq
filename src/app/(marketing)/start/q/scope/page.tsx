import { Suspense } from "react";

import { ScopeStep } from "./scope-step";

export const metadata = { title: "Tell us about it — BuilderHQ" };

export default function StartQScopePage() {
  return (
    <Suspense fallback={null}>
      <ScopeStep />
    </Suspense>
  );
}
