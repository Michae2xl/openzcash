import { InvitesAdmin } from "@/components/invites-admin";
import { PageHeader } from "@/components/ui";
import { listInvites } from "@/lib/onboarding/invites";

export const metadata = { title: "Invites · ZEC Back-office" };
export const dynamic = "force-dynamic";

export default async function ConvitesPage() {
  const invites = await listInvites();

  return (
    <>
      <PageHeader
        title="Onboarding invites"
        subtitle="Generate a link so a third party can register their own treasury (viewing key encrypted in the browser, or a transparent address). Each link carries a single-use token with an expiration date."
      />
      <InvitesAdmin invites={invites} />
    </>
  );
}
