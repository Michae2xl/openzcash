import type { ClassifiedRepository, Project } from "@/lib/ecosystem/types";
import { darkWalletLogo } from "@/lib/wallet-logos";

export type Brand = {
  src: string;
  /** Light rendition shown by the dark theme in place of src (wallet marks drawn in ink). */
  darkSrc?: string;
  name: string;
  kind: "project" | "community" | "maintainer" | "namespace";
  sourceUrl: string;
};

// Presentation-only attribution; does not alter the hash-checked source catalog.
// Download URLs and verification notes are in docs/ecosystem-branding.md.
export const ORGANIZATION_BRANDS: Record<string, Brand> = {
  "zcash-core": { src: "/logos/ecosystem/zcash.png", name: "Zcash", kind: "namespace", sourceUrl: "https://github.com/zcash" },
  "zcash-foundation": { src: "/logos/ecosystem/zcash-foundation.png", name: "Zcash Foundation", kind: "maintainer", sourceUrl: "https://github.com/ZcashFoundation" },
  "project-tachyon": { src: "/logos/ecosystem/tachyon.png", name: "Project Tachyon", kind: "maintainer", sourceUrl: "https://github.com/tachyon-zcash" },
  "shielded-labs": { src: "/logos/ecosystem/shielded-labs.png", name: "Shielded Labs", kind: "maintainer", sourceUrl: "https://github.com/ShieldedLabs" },
  zakura: { src: "/logos/ecosystem/zakura.png", name: "Zakura", kind: "maintainer", sourceUrl: "https://zakura.com/" },
  zodl: { src: "/logos/ecosystem/zodl-lab.png", name: "ZODL", kind: "maintainer", sourceUrl: "https://github.com/zodl-inc" },
  zingolabs: { src: "/logos/ecosystem/zingolabs.png", name: "Zingo Labs", kind: "maintainer", sourceUrl: "https://github.com/zingolabs" },
  zechub: { src: "/logos/ecosystem/zechub.jpg", name: "ZecHub", kind: "maintainer", sourceUrl: "https://github.com/ZecHub" },
  "qed-it": { src: "/logos/ecosystem/qedit.jpg", name: "QEDIT", kind: "maintainer", sourceUrl: "https://github.com/QED-it" },
};

export const PROJECT_BRANDS: Record<string, Brand> = {
  zakura: { ...ORGANIZATION_BRANDS.zakura, kind: "project" },
  zechub: { ...ORGANIZATION_BRANDS.zechub, kind: "project" },
  cipherscan: { src: "/logos/ecosystem/cipherscan.png", name: "CipherScan", kind: "project", sourceUrl: "https://cipherscan.app/press" },
  free2z: { src: "/logos/ecosystem/free2z.png", name: "Free2Z", kind: "project", sourceUrl: "https://free2z.cash/" },
  "bison-dcrdex": { src: "/logos/ecosystem/bison-wallet.png", name: "Bison Wallet", kind: "project", sourceUrl: "https://bisonwallet.org/" },
};

export function isLocalBrandAsset(src: string): boolean {
  return /^\/(?:logos|wallet-logos|community-logos)\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:png|jpg|svg|webp)$/.test(src);
}

export function organizationBrand(id: string | null | undefined): Brand | null {
  return id && Object.hasOwn(ORGANIZATION_BRANDS, id) ? ORGANIZATION_BRANDS[id] : null;
}

export function projectBrand(project: Project): Brand | null {
  if (Object.hasOwn(PROJECT_BRANDS, project.id)) return PROJECT_BRANDS[project.id];
  // Keep the project's existing curated logo ahead of a team/namespace mark.
  if (project.logo && isLocalBrandAsset(project.logo)) {
    const darkSrc = darkWalletLogo(project.logo);
    return { src: project.logo, name: project.name, kind: "project", sourceUrl: project.website, ...(darkSrc ? { darkSrc } : {}) };
  }
  return organizationBrand(project.organizationId);
}

export function repositoryBrand(repository: ClassifiedRepository): Brand | null {
  // Multiple project associations do not establish a single product identity.
  if (repository.projects.length === 1) return projectBrand(repository.projects[0]);
  return organizationBrand(repository.organization?.id);
}

export function brandLabel(brand: Brand): string {
  if (brand.kind === "community") return `${brand.name} community logo`;
  return brand.kind === "project" ? `${brand.name} logo` : `${brand.name} · ${brand.kind} mark`;
}
