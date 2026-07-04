import Link from "next/link";
import { getUnderReviewProposals } from "@/lib/zcg/github-applications";
import { OfficeCanvas } from "./office-canvas";
import type { OfficeMember } from "./scene";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZCG Office · OpenZcash",
  description:
    "A living 3D office where every ZCG proposal under review walks the floor as a zebra, in front of the committee.",
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
  // Initial snapshot; the scene then polls /api/zcg/office to stay live.
  const proposals = await getUnderReviewProposals(100);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            ZCG Office
          </h1>
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-500/25">
            3D · beta
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

      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Each zebra is a live grant proposal under review (source: GitHub). Drag
        to orbit, scroll to zoom. Credits: 3D model{" "}
        <a
          href="https://sketchfab.com/3d-models/cartoon-zebra-with-7-animations-c77056f81b564805a1001f3933d5d0fc"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
        >
          “Cartoon Zebra with 7 animations”
        </a>{" "}
        by{" "}
        <a
          href="https://sketchfab.com/jungle_jim"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
        >
          Jungle Jim
        </a>
        , licensed{" "}
        <a
          href="http://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
        >
          CC-BY 4.0
        </a>{" "}
        (modified: compressed, re-scaled, instanced). Low-poly furniture by
        Kenney (CC0) via the open-source Claw3D project (MIT).
      </p>
    </>
  );
}
