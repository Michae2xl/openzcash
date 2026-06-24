"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json();
      if (j.ok) {
        router.push(params.get("next") || "/");
        router.refresh();
      } else {
        setError(j.error || "Login failed.");
        setBusy(false);
      }
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-stone-200 bg-white p-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 font-mono text-sm font-bold text-amber-700">
            ⓩ
          </span>
          <span className="text-sm font-semibold text-stone-900">
            ZEC Back-office
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Restricted access: enter the administrator password.
        </p>
      </div>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-500/30 placeholder:text-stone-400 focus:ring-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-amber-500/20 px-3 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/40 transition hover:bg-amber-500/30 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error ? (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-500/20">
          {error}
        </p>
      ) : null}
    </form>
  );
}
