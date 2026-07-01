"use client";

import dynamic from "next/dynamic";
import type { OfficeMember, OfficeProposal } from "./scene";

const OfficeScene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#04050c] text-sm text-sky-300/70">
      Entering the ZCG office…
    </div>
  ),
});

export function OfficeCanvas(props: {
  members: OfficeMember[];
  proposals: OfficeProposal[];
}) {
  return <OfficeScene {...props} />;
}
