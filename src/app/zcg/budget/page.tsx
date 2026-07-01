import { PageHeader } from "@/components/ui";
import { BudgetCards } from "../budget-cards";
import { Synced } from "@/components/synced";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discretionary budget · OpenZcash" };

export default function ZcgBudgetPage() {
  return (
    <>
      <PageHeader
        title="Discretionary budget"
        subtitle="ZCG's annual discretionary budget — fixed in ZEC and drawn down over the year. Read two ways (USD and ZEC), which is why the two figures diverge as the price moves."
      />

      <BudgetCards />

      <Synced className="mt-6" />
    </>
  );
}
