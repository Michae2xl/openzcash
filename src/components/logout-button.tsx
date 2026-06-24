"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="w-full rounded-md border border-stone-200 px-2 py-1.5 text-xs text-stone-500 transition hover:bg-white hover:text-stone-800"
    >
      Sign out
    </button>
  );
}
