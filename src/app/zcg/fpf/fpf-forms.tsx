"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Two intake forms for the coinholder program, presented behind a ZBO "skin":
 * the actual CryptPad form is embedded in an iframe (end-to-end encrypted, the
 * FPF's real intake); we wrap it with our own header/cover so it feels native.
 *
 * Both point at the same CryptPad form for now — swap `milestone.url` once the
 * dedicated milestone form exists.
 */
const PROPOSAL_FORM_URL =
  "https://cryptpad.fr/form/#/2/form/view/qmTMynvJfBAdbpoCWHddUCT8LxdSbmsWXXLTwVBvY+Dc/";

const FORMS = {
  proposal: {
    label: "Retroactive proposal",
    title: "Submit a retroactive proposal",
    intro:
      "Open a coinholder-directed retroactive grant proposal. This is the FPF's official intake form; your answers go straight to the program admins.",
    url: PROPOSAL_FORM_URL,
  },
  milestone: {
    label: "Submit milestone",
    title: "Submit a milestone",
    intro:
      "Report a completed milestone for an approved retroactive grant, with deliverables and the amount due.",
    url: PROPOSAL_FORM_URL,
  },
} as const;

type Tab = keyof typeof FORMS;
const TABS = Object.keys(FORMS) as Tab[];

export function FpfForms() {
  const [tab, setTab] = useState<Tab>("proposal");
  const f = FORMS[tab];

  return (
    <div>
      <div className="mb-3 inline-flex rounded-full bg-stone-100 p-1 ring-1 ring-inset ring-stone-200">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === k
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800",
            )}
          >
            {FORMS[k].label}
          </button>
        ))}
      </div>

      {/* Skin / cover on top, CryptPad form behind */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-300/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-br from-amber-500/[0.06] to-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900">{f.title}</p>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-stone-500">
              {f.intro}
            </p>
          </div>
          <a
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-700"
          >
            Open in new tab ↗
          </a>
        </div>
        <div className="bg-[#f7f5ef]">
          <iframe
            key={tab}
            src={f.url}
            title={f.title}
            className="h-[72vh] w-full border-0"
          />
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-400">
        <span className="text-amber-700/70">🔒</span>
        Hosted on CryptPad (end-to-end encrypted). If the form does not load
        inline, use “Open in new tab”.
      </p>
    </div>
  );
}
