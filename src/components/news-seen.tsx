"use client";

import { useEffect } from "react";

const SEEN_KEY = "openzcash-news-seen";

/**
 * Records the newest news timestamp as "seen" in localStorage when the /news
 * page mounts, so the launcher's red unread badge clears after a visit.
 */
export function NewsSeen({ latest }: { latest: string }) {
  useEffect(() => {
    if (!latest) return;
    try {
      window.localStorage.setItem(SEEN_KEY, latest);
    } catch {
      /* ignore (private mode / storage disabled) */
    }
  }, [latest]);
  return null;
}
