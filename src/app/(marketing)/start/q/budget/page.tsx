import { Suspense } from "react";

import { BudgetStep } from "./budget-step";

export const metadata = { title: "What's the budget? · BuilderHQ" };

export default function StartQBudgetPage() {
  return (
    <Suspense fallback={null}>
      <BudgetStep />
    </Suspense>
  );
}
