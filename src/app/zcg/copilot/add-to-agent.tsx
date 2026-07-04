"use client";

import { useState, type ReactNode } from "react";

/**
 * One-click "add to your agent" buttons. The skill is agent-agnostic — the
 * `skills` CLI installs it into whichever agent you target with `-a <flag>`.
 * Each button copies the exact command (with the right flag) to the clipboard.
 * Marks are simple brand-tinted glyphs, not official vector logos.
 */

type Agent = { name: string; flag: string; bg: string; logo: ReactNode };

const REPO_SKILL = "npx skills add Michae2xl/openzcash --skill zcg-copilot";
const cmdFor = (flag: string) => `${REPO_SKILL} -a ${flag}`;

const Spark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 2.5l1.7 5.6 5.6-1.7-4 4.2 4 4.2-5.6-1.7L12 22.5l-1.7-5.6-5.6 1.7 4-4.2-4-4.2 5.6 1.7z" />
  </svg>
);
const Cube = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z" />
  </svg>
);
const Prompt = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8l4 4-4 4M13 16h5" />
  </svg>
);
const Hex = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path d="M12 3l7.8 4.5v9L12 21 4.2 16.5v-9z" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </svg>
);
const Wind = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
  >
    <path d="M3 9h12a3 3 0 1 0-3-3M3 14h8a2.5 2.5 0 1 1-2.5 2.5" />
  </svg>
);
const Goggles = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path
      d="M12 4.5c-3 0-4 1.8-4 3.8"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    />
    <rect x="3" y="10.5" width="7.5" height="6" rx="3" fill="currentColor" />
    <rect x="13.5" y="10.5" width="7.5" height="6" rx="3" fill="currentColor" />
  </svg>
);

const AGENTS: Agent[] = [
  { name: "Claude Code", flag: "claude-code", bg: "#c2603f", logo: <Spark /> },
  { name: "Cursor", flag: "cursor", bg: "#0b0d10", logo: <Cube /> },
  { name: "OpenCode", flag: "opencode", bg: "#334155", logo: <Prompt /> },
  { name: "Codex", flag: "codex", bg: "#0b0d10", logo: <Hex /> },
  { name: "Windsurf", flag: "windsurf", bg: "#0d9488", logo: <Wind /> },
  {
    name: "Copilot",
    flag: "github-copilot",
    bg: "#1f2430",
    logo: <Goggles />,
  },
];

export function AddToAgent() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (flag: string) => {
    const text = cmdFor(flag);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Fallback for contexts without the async clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(flag);
      setTimeout(() => setCopied((c) => (c === flag ? null : c)), 1600);
    }
  };

  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        Add to your agent
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {AGENTS.map((a) => (
          <button
            key={a.flag}
            type="button"
            onClick={() => copy(a.flag)}
            aria-label={`Copy install command for ${a.name}`}
            className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 text-left shadow-sm shadow-stone-300/25 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: a.bg }}
            >
              {a.logo}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-stone-900">
                {a.name}
              </span>
              <span className="block font-mono text-[10px] text-stone-400">
                {copied === a.flag ? "copied ✓" : "click to copy"}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        …and 40+ more agents the{" "}
        <a
          href="https://github.com/vercel-labs/skills"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
        >
          skills
        </a>{" "}
        CLI supports. Omit <code className="font-mono">-a</code> to auto-detect
        your agent, or add <code className="font-mono">-g</code> to install
        globally.
      </p>
    </div>
  );
}
