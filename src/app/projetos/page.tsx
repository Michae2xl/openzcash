import { ProjectsAdmin } from "@/components/projects-admin";
import { PageHeader } from "@/components/ui";
import { getOnboardingPublicKey } from "@/lib/onboarding/seal";
import { listProjects } from "@/lib/projects/project-repo";

export const metadata = { title: "Projects · ZBO" };
export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const projects = await listProjects();
  const publicKey = getOnboardingPublicKey();

  return (
    <>
      <PageHeader
        title="Recipient projects"
        subtitle="Each project submits a viewing key ONCE; the system derives a new address every month (all auditable from the same key). Pay each month's grant or bounty to that month's address: the project never resubmits an address."
      />
      <ProjectsAdmin projects={projects} publicKey={publicKey} />
    </>
  );
}
