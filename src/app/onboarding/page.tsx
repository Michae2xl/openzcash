import { OnboardingForm } from "@/components/onboarding-form";
import { PageHeader } from "@/components/ui";
import { getOnboardingPublicKey } from "@/lib/onboarding/seal";

export const metadata = { title: "Register treasury · ZBO" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const publicKey = getOnboardingPublicKey();

  return (
    <>
      <PageHeader
        title="Register treasury"
        subtitle="Upload a viewing key (shielded, encrypted in your browser) or a transparent address (public). The system fetches and updates automatically: read-only auditing, never holding spend keys."
      />
      <OnboardingForm publicKey={publicKey} token={token ?? null} />
    </>
  );
}
