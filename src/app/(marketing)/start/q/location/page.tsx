import { Suspense } from "react";

import { LocationStep } from "./location-step";

export const metadata = { title: "Where's it being built? — BuilderHQ" };

export default function StartQLocationPage() {
  return (
    <Suspense fallback={null}>
      <LocationStep />
    </Suspense>
  );
}
