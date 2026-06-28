"use client";

import { useEffect } from "react";

const INTERACTIVE = "a, button, [role='button'], label, summary, select";

/**
 * App-wide tactile feedback: a tiny haptic buzz when a tappable element (app
 * tile, button, link) is pressed on a touch device. Uses the Vibration API
 * (Android/Chromium PWAs); iOS Safari ignores it silently, where the CSS
 * active-press animation carries the feedback instead.
 */
export function TapFeedback() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !e.isPrimary) return;
      const target = e.target as Element | null;
      if (!target?.closest(INTERACTIVE)) return;
      try {
        navigator.vibrate?.(10);
      } catch {
        /* unsupported — visual feedback handles it */
      }
    };
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return null;
}
