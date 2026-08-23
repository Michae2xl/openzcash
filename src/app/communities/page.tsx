import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { COMMUNITIES } from "@/lib/communities/data";
import { getCommunityActivity } from "@/lib/communities/forum-activity";
import { CommunitiesView } from "./communities-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Global Communities · OpenZcash",
  description:
    "The global Zcash community groups: who they are, where to find them, which ones ZCG funds (with audited numbers), and what each one has been up to on the forum.",
};

async function LiveDirectory() {
  const activity = await getCommunityActivity(COMMUNITIES);
  return <CommunitiesView communities={COMMUNITIES} activity={activity} />;
}

export default function CommunitiesPage() {
  return (
    <>
      <PageHeader
        title="Global Communities"
        subtitle="The regional groups building Zcash adoption worldwide: who is active now, who ZCG and the ZecHub DAO fund, and where to find them. Activity is live from the community forum and YouTube; X and Instagram profiles are linked."
      />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500 shadow-sm">
            Loading live forum activity…
          </div>
        }
      >
        <LiveDirectory />
      </Suspense>

      <p className="mt-8 text-xs leading-relaxed text-stone-500">
        Funding figures mirror the official ZCG spreadsheet (budgeted USD, not
        paid; see the methodology). Communities with no ledger rows are marked
        accordingly; some are funded through other channels (ZecHub DAO
        ambassador program, direct donations), noted per card. Links seeded from
        ZecHub&apos;s community directory and verified individually.
      </p>
    </>
  );
}
