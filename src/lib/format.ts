/** Date formatting for the UI (en-US). */

const dateFmt = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  if (!iso) return "·";
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  if (!iso) return "·";
  return dateTimeFmt.format(new Date(iso));
}

/** Friendly relative date: "today", "yesterday", "3 days ago", else short date. */
export function formatRelativeDate(iso: string): string {
  if (!iso) return "·";
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

/** Shorten a long identifier (txid, address) in the middle. */
export function shortenMiddle(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
