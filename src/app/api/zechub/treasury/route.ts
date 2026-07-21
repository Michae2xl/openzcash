import {
  latestTreasurySnapshot,
  treasuryAllocations,
  treasuryPayouts,
} from "@/lib/zechub/treasury-repo";

export const dynamic = "force-dynamic";

const zec = (zat: bigint | null) => (zat == null ? null : Number(zat) / 1e8);
const usd = (cents: bigint | null) =>
  cents == null ? null : Number(cents) / 100;

/**
 * Public read-only mirror of the ZecHub DAO treasury dashboard, refreshed on
 * the 6h cycle. Amounts are plain numbers: ZEC and USD.
 */
export async function GET() {
  const snapshot = await latestTreasurySnapshot();
  if (!snapshot) {
    return Response.json(
      { ok: false, error: "treasury not imported yet" },
      { status: 503 },
    );
  }
  const [allocations, payouts] = await Promise.all([
    treasuryAllocations(snapshot.id),
    treasuryPayouts(),
  ]);

  return Response.json(
    {
      ok: true,
      capturedOn: snapshot.capturedOn,
      zecPriceUsd: usd(snapshot.zecPriceCents),
      treasuries: {
        donations: {
          zec: zec(snapshot.donationsZat),
          usd: usd(snapshot.donationsUsdCents),
        },
        fpf: {
          zec: zec(snapshot.fpfZat),
          usd: usd(snapshot.fpfUsdCents),
          spendableZec: zec(snapshot.fpfUnreservedZat),
          reservedUsd: usd(snapshot.fpfReservedUsdCents),
        },
        zechubInc: {
          zec: zec(snapshot.incZat),
          usd: usd(snapshot.incUsdCents),
        },
      },
      multichain: {
        penumbraUm: snapshot.penumbraUm,
        namadaNam: snapshot.namadaNam,
      },
      totals: {
        zec: zec(
          (snapshot.donationsZat ?? 0n) +
            (snapshot.fpfZat ?? 0n) +
            (snapshot.incZat ?? 0n),
        ),
        paidOutUsd: usd(snapshot.totalPaidOutUsdCents),
        committedUsd: usd(snapshot.toBePaidOutUsdCents),
      },
      allocations: allocations.map((a) => ({
        category: a.category,
        zec: zec(a.zecZat),
        sharePct: a.sharePct,
      })),
      payouts: payouts.map((p) => ({
        title: p.title,
        paidUsd: usd(p.paidUsdCents),
        pendingUsd: usd(p.pendingUsdCents),
        milestones: [p.m1, p.m2, p.m3].filter((m) => m != null),
      })),
      source:
        "https://docs.google.com/spreadsheets/d/19Zy5hp3dMix8pyP8_PxMF32vkl-OyNWU07jrlCTFfso/edit",
    },
    { headers: { "cache-control": "public, max-age=900" } },
  );
}
