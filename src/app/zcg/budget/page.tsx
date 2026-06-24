import { redirect } from "next/navigation";

/** The ZCG discretionary budget now lives inside the Totals screen. */
export default function ZcgBudgetPage() {
  redirect("/zcg/totais");
}
