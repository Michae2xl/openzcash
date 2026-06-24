"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Source = "taddr" | "ufvk";

const TYPES = [
  { v: "grants", l: "Grants" },
  { v: "folha", l: "Payroll" },
  { v: "distribuicao", l: "Distribution" },
  { v: "pessoal", l: "Personal" },
  { v: "outro", l: "Other" },
];

/** Encrypts the UFVK in the browser with the backend public key (sealed-box). */
async function sealUfvk(ufvk: string, pubKeyB64: string): Promise<string> {
  const sodium = (await import("libsodium-wrappers")).default;
  await sodium.ready;
  const v = sodium.base64_variants.ORIGINAL;
  return sodium.to_base64(
    sodium.crypto_box_seal(
      sodium.from_string(ufvk),
      sodium.from_base64(pubKeyB64, v),
    ),
    v,
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-500/30 placeholder:text-stone-400 focus:ring-2";

export function OnboardingForm({
  publicKey,
  token,
}: {
  publicKey: string | null;
  token: string | null;
}) {
  const [source, setSource] = useState<Source>("taddr");
  const [name, setName] = useState("");
  const [treasuryType, setTreasuryType] = useState("outro");
  const [address, setAddress] = useState("");
  const [viewingKey, setViewingKey] = useState("");
  const [birthHeight, setBirthHeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        token,
        source,
        name,
        treasuryType,
        birthHeight: birthHeight ? Number(birthHeight) : 0,
      };
      if (source === "taddr") {
        payload.address = address.trim();
      } else {
        if (!publicKey)
          throw new Error("Onboarding public key unavailable on the server.");
        payload.sealedKey = await sealUfvk(viewingKey.trim(), publicKey);
      }
      const r = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error ?? "Registration failed.");
      setResult({
        ok: true,
        msg: `Treasury "${j.result.name}" created (${j.result.kind}) and now scanning.`,
      });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5 rounded-xl border border-stone-200 bg-white p-6">
      <div className="grid grid-cols-2 gap-2">
        {(["taddr", "ufvk"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition",
              source === s
                ? "bg-amber-500/15 text-amber-700 ring-amber-500/30"
                : "bg-white text-stone-500 ring-stone-200 hover:text-stone-800",
            )}
          >
            {s === "taddr" ? "Transparent address" : "Viewing key (shielded)"}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-stone-500">Treasury name</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Brazil Treasury"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-stone-500">Type</span>
        <select
          className={inputClass}
          value={treasuryType}
          onChange={(e) => setTreasuryType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      </label>

      {source === "taddr" ? (
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">
            Transparent address (t1/t3), public
          </span>
          <input
            className={cn(inputClass, "font-mono")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="t3…"
          />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs text-stone-500">
            Viewing key (uview1…/zxviews1…)
          </span>
          <textarea
            className={cn(inputClass, "h-24 resize-none font-mono")}
            value={viewingKey}
            onChange={(e) => setViewingKey(e.target.value)}
            placeholder="uview1…"
          />
          <span className="mt-1 block text-xs text-amber-700/80">
            🔒 encrypted in your browser (sealed-box) before sending: never
            transmitted in plaintext.
          </span>
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-xs text-stone-500">
          Birthday height (optional, faster scan)
        </span>
        <input
          className={inputClass}
          value={birthHeight}
          onChange={(e) => setBirthHeight(e.target.value.replace(/\D/g, ""))}
          placeholder="ex.: 2867500"
          inputMode="numeric"
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="w-full rounded-lg bg-amber-500/20 px-3 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/40 transition hover:bg-amber-500/30 disabled:opacity-50"
      >
        {busy ? "Sending securely…" : "Register treasury"}
      </button>

      {result ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm ring-1 ring-inset",
            result.ok
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 ring-rose-500/20",
          )}
        >
          {result.ok ? "✓ " : "✗ "}
          {result.msg}
        </p>
      ) : null}
    </div>
  );
}
