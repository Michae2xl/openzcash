import Link from "next/link";
import { getGrantApplications } from "@/lib/zcg/github-applications";
import { OfficeCanvas } from "./office-canvas";
import type { OfficeMember } from "./scene";

export const dynamic = "force-dynamic";
// Hidden from search + not linked anywhere — reachable only by direct URL.
export const metadata = {
  title: "ZCG Office · OpenZcash",
  robots: { index: false, follow: false },
};

const MEMBERS: OfficeMember[] = [
  {
    name: "GGuy",
    img: "/committee/gguy.png",
    tags: ["Process Governance", "Fiscal Gatekeeper", "Ecosystem Steward"],
  },
  {
    name: "Paul Brigner",
    img: "/committee/paulbrigner.png",
    tags: ["Policy & Advocacy", "New seat · 2026"],
  },
  {
    name: "hanh",
    img: "/committee/hanh.png",
    tags: ["Protocol Authority", "Quality Screener", "Core-Team Liaison"],
  },
  {
    name: "Zerodartz",
    img: "/committee/zerodartz.png",
    tags: ["Community Growth", "Adoption Diligence", "Budget Right-Sizing"],
  },
  {
    name: "Artkor",
    img: "/committee/artkor.png",
    tags: ["Data-Driven Diligence", "Hands-On QA", "ZecHub Connector"],
  },
];

export default async function OfficePage() {
  const apps = await getGrantApplications(40);
  const proposals = apps
    .filter((a) => a.status === "review")
    .map((a) => ({
      title: a.title,
      amount: a.amountUsd,
      applicant: a.applicant,
    }));

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            ZCG Office
          </h1>
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-500/25">
            preview · hidden
          </span>
        </div>
        <Link
          href="/zcg"
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          ‹ ZCG
        </Link>
      </div>

      <div className="relative h-[78vh] w-full overflow-hidden rounded-2xl border border-stone-200 bg-[#dce3ec] shadow-xl shadow-stone-300/40">
        <OfficeCanvas members={MEMBERS} proposals={proposals} />
      </div>
      {/* Attribution kept in source (page is unlisted): low-poly furniture by
          Kenney (CC0) via the open-source Claw3D project (MIT); animated zebra is
          a third-party model — confirm its licence before making this public. */}
    </>
  );
}
