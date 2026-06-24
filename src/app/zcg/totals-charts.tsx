import { Card } from "@/components/ui";
import { BarList, type BarItem } from "@/components/bar-list";
import { DonutChart } from "@/components/donut-chart";

/**
 * Shared totals charts (used by /zcg/totais and /zcg/coinholder): a donut for
 * the classification split and a bar list of the top recipients. Empty ($0)
 * series are dropped so the layout stays balanced.
 */
export function TotalsCharts({
  recipients,
  classifications,
}: {
  recipients: BarItem[];
  classifications: BarItem[];
}) {
  const recip = recipients.filter((r) => r.value > 0).slice(0, 8);
  const cls = classifications.filter((c) => c.value > 0);
  if (recip.length === 0 && cls.length === 0) return null;

  return (
    <section className="mb-8 grid items-start gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Share by classification
        </h2>
        <Card>
          <DonutChart items={cls} />
        </Card>
      </div>
      <div className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Top recipients · USD paid out to date
        </h2>
        <Card>
          <BarList items={recip} />
        </Card>
      </div>
    </section>
  );
}
