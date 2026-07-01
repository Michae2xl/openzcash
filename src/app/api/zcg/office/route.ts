/**
 * Public read path for the 3D office (/zcg/office). Returns the live "under
 * review" grant proposals — the ones rendered as walking zebras. The client
 * polls this so an open tab drops a zebra as soon as its proposal leaves the
 * review stage (approved, paid, or the GitHub issue closed).
 *
 * Not gated by the admin middleware (see ADMIN_APIS). Backed by the same 15-min
 * in-process cache as the page, so polling never hammers GitHub.
 */
import { getUnderReviewProposals } from "@/lib/zcg/github-applications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const proposals = await getUnderReviewProposals(40);
    return Response.json(
      { proposals },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ proposals: [] }, { status: 200 });
  }
}
