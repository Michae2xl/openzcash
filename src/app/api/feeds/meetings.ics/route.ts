import { getMeetings } from "@/lib/zcg/governance-repo";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");

/**
 * iCalendar feed of recorded ZCG meetings (all-day events linking each set of
 * minutes). Subscribable: calendar apps refresh it as new minutes land. Only
 * meetings we can prove (published minutes) are listed — no speculative
 * recurrences.
 */
export async function GET() {
  const meetings = await getMeetings().catch(() => []);

  const events = meetings
    .filter((m) => m.meetingDate)
    .map((m) => {
      const d = String(m.meetingDate).replaceAll("-", "");
      return [
        "BEGIN:VEVENT",
        `UID:${m.id}@openzcash.org`,
        `DTSTAMP:${d}T000000Z`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${esc(m.title)}`,
        `URL:${m.url}`,
        `DESCRIPTION:${esc(`Minutes: ${m.url}`)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenZcash//ZCG Meetings//EN",
    "X-WR-CALNAME:ZCG Meetings (OpenZcash)",
    events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
