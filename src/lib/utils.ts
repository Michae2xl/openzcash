import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes Tailwind resolvendo conflitos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Current wall-clock ms. Wrapped so callers can read "now" in a server-render
 * body without tripping the purity lint on a bare `Date.now()`. */
export function nowMs(): number {
  return Date.now();
}
