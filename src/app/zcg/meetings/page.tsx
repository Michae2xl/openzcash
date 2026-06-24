import { Badge, Card, PageHeader } from "@/components/ui";
import { IconList } from "@/components/icons";
import { getIsAdmin } from "@/lib/auth/admin";
import { getLinkRows, getLinks, getMeetings } from "@/lib/zcg/governance-repo";
import {
  LinksAdmin,
  MeetingControls,
  NewMeetingButton,
} from "../governance-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meetings · ZBO" };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][(m ?? 1) - 1];
  return `${month} ${d}, ${y}`;
}

export default async function MeetingsPage() {
  const [isAdmin, meetings, links, linkRows] = await Promise.all([
    getIsAdmin(),
    getMeetings(),
    getLinks(),
    getLinkRows(),
  ]);
  const latest = meetings[0];
  const proposalZcg = links.proposal_zcg ?? "#";
  const forumCategory = links.forum_category ?? "#";

  return (
    <>
      <PageHeader
        title="Governance & meetings"
        subtitle="The latest Zcash Community Grants committee meeting minutes, straight from the community forum. New grant proposals are opened on GitHub."
        actions={
          <div className="flex items-center gap-2">
            {isAdmin ? <NewMeetingButton /> : null}
            <a
              href={proposalZcg}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
            >
              Submit a proposal
            </a>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <a href={forumCategory} target="_blank" rel="noreferrer">
          <Card interactive className="h-full">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              Community forum
            </p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              Community Grants Updates
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Full archive of meeting minutes and announcements.
            </p>
          </Card>
        </a>
        <a href={proposalZcg} target="_blank" rel="noreferrer">
          <Card interactive className="h-full">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
              GitHub
            </p>
            <p className="mt-1 text-sm font-medium text-stone-900">
              ZcashCommunityGrants / proposals
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Where ZCG grant applications are tracked and discussed.
            </p>
          </Card>
        </a>
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
        Latest meeting minutes
        {latest ? (
          <Badge tone="amber">newest {formatDate(latest.meetingDate)}</Badge>
        ) : null}
      </h2>

      <Card className="space-y-1 p-2">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-100"
          >
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                <IconList className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-900">{m.title}</p>
                <p className="truncate text-xs text-stone-500">
                  Zcash Community Grants committee
                </p>
              </div>
              <span className="shrink-0 text-xs text-stone-500 tnum">
                {formatDate(m.meetingDate)}
              </span>
            </a>
            {isAdmin ? (
              <MeetingControls
                id={m.id}
                title={m.title}
                meetingDate={m.meetingDate}
                url={m.url}
              />
            ) : (
              <span className="shrink-0 text-stone-400">›</span>
            )}
          </div>
        ))}
      </Card>

      {isAdmin ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">
            Config links
            <span className="ml-2 text-xs font-normal text-stone-400">
              admin · used across the site
            </span>
          </h2>
          <Card>
            <LinksAdmin links={linkRows} />
          </Card>
        </section>
      ) : null}
    </>
  );
}
