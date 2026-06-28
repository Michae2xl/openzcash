"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], label, summary, select";

/**
 * App-wide tactile feedback on tap.
 *  - Android / Chromium PWAs: the Vibration API (`navigator.vibrate`).
 *  - iOS 17.4+ Safari: toggling a hidden `<input switch>` inside the user
 *    gesture plays the system haptic (the Vibration API is unsupported there).
 * The CSS active-press animation carries the feedback everywhere else.
 */
export function TapFeedback() {
  const labelRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // `switch` is a non-standard iOS attribute — set it here to avoid React
    // prop warnings; it's what turns the checkbox toggle into a haptic.
    inputRef.current?.setAttribute("switch", "");

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !e.isPrimary) return;
      const target = e.target as Element | null;
      if (!target?.closest(INTERACTIVE)) return;
      try {
        navigator.vibrate?.(10);
      } catch {
        /* unsupported */
      }
      // iOS haptic: toggle the hidden switch within this user gesture.
      try {
        labelRef.current?.click();
      } catch {
        /* unsupported */
      }
    };
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <label
      ref={labelRef}
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: 0 }}
    >
      <input ref={inputRef} type="checkbox" tabIndex={-1} />
    </label>
  );
}
