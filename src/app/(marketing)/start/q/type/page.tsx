import { Suspense } from "react";

import { TypeStep } from "./type-step";

export const metadata = { title: "What are you building? · BuilderHQ" };

export default function StartQTypePage() {
  return (
    <Suspense fallback={null}>
      <TypeStep />
    </Suspense>
  );
}
