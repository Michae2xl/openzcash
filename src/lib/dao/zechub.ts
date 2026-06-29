import "server-only";

/**
 * ZecHub DAO governance feed.
 *
 * ZecHub runs as an on-chain DAO (cw-dao / DAO DAO) on Juno. We read its
 * proposals from the public DAO DAO indexer (no API key) and cache them ~10 min
 * in-process — same pattern as the other live feeds (live-price, defi, news).
 * Read-only: we never submit or vote.
 */

const DAO = "juno1nktrulhakwm0n3wlyajpwxyg54n39xx4y8hdaqlty7mymf85vweq7m6t0y";
// dao-proposal-single module (prefix "A") — holds every proposal; the DAO's
// multiple-choice module is currently empty.
const SINGLE_MODULE =
  "juno14futcfehnc8fn4nz6gtm25svn05mzz09ju8rtj0jvven2hpxj85s0q8a55";
const PREFIX = "A";
const INDEXER = "https://indexer.daodao.zone/juno-1/contract";
const TTL_MS = 10 * 60_000;

export const ZECHUB_DAO_URL = `https://daodao.zone/dao/${DAO}`;

export type ZechubProposal = {
  /** On-chain proposal id, e.g. 161. */
  id: number;
  /** Display reference, e.g. "A161". */
  ref: string;
  title: string;
  /** DAO DAO status: open | passed | executed | rejected | closed | … */
  status: string;
  createdAt: string; // ISO 8601
  yes: number;
  no: number;
  abstain: number;
  proposer: string;
  url: string;
};

type IndexerItem = {
  id?: number;
  createdAt?: string;
  proposal?: {
    title?: string;
    status?: string;
    proposer?: string;
    votes?: { yes?: string; no?: string; abstain?: string };
  };
};

let cache: { at: number; items: ZechubProposal[] } | null = null;

function num(v: string | undefined): number {
  const n = Number(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

/** Latest ZecHub DAO proposals, newest first. Cached ~10 min in-process. */
export async function getZechubProposals(
  limit = 30,
): Promise<ZechubProposal[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items.slice(0, limit);
  try {
    const res = await fetch(
      `${INDEXER}/${SINGLE_MODULE}/daoProposalSingle/reverseProposals?limit=${Math.min(
        Math.max(limit, 1),
        50,
      )}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return cache?.items.slice(0, limit) ?? [];
    const raw = (await res.json()) as IndexerItem[];
    if (!Array.isArray(raw)) return cache?.items.slice(0, limit) ?? [];
    const items: ZechubProposal[] = raw
      .filter(
        (it): it is IndexerItem & { id: number } =>
          typeof it?.id === "number" && Boolean(it.proposal?.title),
      )
      .map((it) => ({
        id: it.id,
        ref: `${PREFIX}${it.id}`,
        title: it.proposal!.title!,
        status: it.proposal!.status ?? "open",
        createdAt: it.createdAt ?? "",
        yes: num(it.proposal!.votes?.yes),
        no: num(it.proposal!.votes?.no),
        abstain: num(it.proposal!.votes?.abstain),
        proposer: it.proposal!.proposer ?? "",
        url: `${ZECHUB_DAO_URL}/proposals/${PREFIX}${it.id}`,
      }));
    if (items.length === 0) return cache?.items.slice(0, limit) ?? [];
    cache = { at: now, items };
    return items.slice(0, limit);
  } catch {
    return cache?.items.slice(0, limit) ?? [];
  }
}
