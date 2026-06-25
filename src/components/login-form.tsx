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
      className="w-full max-w-sm space-y-4 rounded-xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-6 shadow-sm ring-1 ring-inset ring-stone-900/5"
    >
      <div>
        <div className="flex items-center gap-2.5">
          <img
            src="/zbo-emblem.png"
            alt="Zcash Back Office"
            className="h-8 w-8 object-contain"
          />
          <span className="text-sm font-semibold text-stone-900">
            Zcash Back Office
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-600">
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
        className="w-full rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400 disabled:opacity-50"
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
