import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import registry from "@/data/ecosystem/registry.json";
import snapshot from "@/data/ecosystem/snapshot.json";
import { CATEGORIES, classifyRepositories, safeExternalUrl } from "@/lib/ecosystem/catalog";
import type { Catalog, Project } from "@/lib/ecosystem/types";
import { brandLabel, isLocalBrandAsset, ORGANIZATION_BRANDS, organizationBrand, PROJECT_BRANDS, projectBrand, repositoryBrand } from "./branding";
import { BrandMark, CategoryBadge } from "./identity";
import { CATEGORY_THEMES, categoryTheme } from "./presentation";

const catalog = { registry, snapshot } as unknown as Catalog;
const projects = catalog.registry.projects;
const byId = (id: string) => projects.find(project => project.id === id)!;
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(part => parseInt(part, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

describe("category identity", () => {
  it("covers the catalog with stable, distinct palettes", () => {
    expect(Object.keys(CATEGORY_THEMES).sort()).toEqual([...CATEGORIES].sort());
    expect(new Set(Object.values(CATEGORY_THEMES).map(theme => theme.ink)).size).toBe(CATEGORIES.length);
    const categories = [...projects, ...classifyRepositories(catalog)].map(item => item.category);
    for (const category of categories) expect(CATEGORIES).toContain(category);
    expect(categoryTheme("Unmapped")).toBe(CATEGORY_THEMES.Other);
    expect(categoryTheme("__proto__")).toBe(CATEGORY_THEMES.Other);
  });

  it.each(CATEGORIES)("keeps %s labels readable with WCAG AA text contrast", category => {
    const { ink, tint } = categoryTheme(category);
    expect((luminance(tint) + .05) / (luminance(ink) + .05)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CATEGORIES)("pairs color with a visible label and category icon for %s", category => {
    const html = renderToStaticMarkup(createElement(CategoryBadge, { category }));
    expect(html).toContain("--category-ink:" + categoryTheme(category).ink);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(category.replaceAll("&", "&amp;"));
  });
});

describe("source-backed brand marks", () => {
  it("prefers dedicated product logos over team marks", () => {
    expect(projectBrand(byId("zebra"))?.src).toBe("/logos/ecosystem/zebra.png");
    expect(projectBrand(byId("zodl-wallet"))?.src).toBe("/wallet-logos/zodl.png");
    expect(projectBrand(byId("zingo-wallet"))?.src).toBe("/wallet-logos/zingo.png");
    expect(projectBrand(byId("zakura"))?.kind).toBe("project");
  });

  it("carries a light rendition only for wallet marks drawn in ink, and renders both for the theme to pick", () => {
    expect(projectBrand(byId("zodl-wallet"))?.darkSrc).toBe("/wallet-logos/dark/zodl.png");
    expect(projectBrand(byId("zingo-wallet"))?.darkSrc).toBeUndefined();
    const zodl = renderToStaticMarkup(createElement(BrandMark, { brand: projectBrand(byId("zodl-wallet")), category: byId("zodl-wallet").category }));
    expect(zodl).toContain('src="/wallet-logos/zodl.png"');
    expect(zodl).toContain('data-theme-logo="light"');
    expect(zodl).toContain('src="/wallet-logos/dark/zodl.png"');
    const zingo = renderToStaticMarkup(createElement(BrandMark, { brand: projectBrand(byId("zingo-wallet")), category: byId("zingo-wallet").category }));
    expect(zingo).not.toContain("data-theme-logo");
  });

  it("distinguishes a maintainer and shared namespace from a product logo", () => {
    const frost = projectBrand(byId("frost"))!;
    expect(frost.kind).toBe("maintainer");
    expect(brandLabel(frost)).toBe("Zcash Foundation · maintainer mark");
    expect(projectBrand(byId("librustzcash"))?.kind).toBe("namespace");
    expect(projectBrand(byId("zaino"))?.name).toBe("Zingo Labs");
  });

  it("does not turn a generic GitHub avatar or an unsafe image URL into a logo", () => {
    expect(projectBrand(byId("zecrocks"))).toBeNull();
    expect(organizationBrand("__proto__")).toBeNull();
    for (const src of ["https://example.com/logo.png", "//example.com/logo.png", "/logos/../secret.png", "data:image/svg+xml,logo", "/logos/a.png?url=elsewhere"]) {
      expect(isLocalBrandAsset(src)).toBe(false);
      expect(projectBrand({ ...byId("zecrocks"), logo: src } as Project)).toBeNull();
    }
  });

  it("serves real local images with provenance, without editing the data registry", () => {
    const brands = [...Object.values(ORGANIZATION_BRANDS), ...Object.values(PROJECT_BRANDS),
      ...projects.map(projectBrand).filter(brand => brand !== null)];
    expect(projects.filter(project => projectBrand(project)).length).toBeGreaterThan(40);
    for (const brand of brands) {
      expect(safeExternalUrl(brand.sourceUrl)).not.toBeNull();
      expect(isLocalBrandAsset(brand.src)).toBe(true);
      const file = join(process.cwd(), "public", brand.src);
      expect(existsSync(file), brand.src).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.length).toBeGreaterThan(100);
      if (brand.src.endsWith(".png")) expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      if (brand.src.endsWith(".jpg")) expect(bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    }
    for (const id of Object.keys(PROJECT_BRANDS)) expect(byId(id)).toBeDefined();
    for (const id of Object.keys(ORGANIZATION_BRANDS)) expect(catalog.registry.organizations.some(org => org.id === id)).toBe(true);
  });

  it("uses organization identity when a repository has multiple project associations", () => {
    const repo = classifyRepositories(catalog).find(item => item.organization?.id === "zcash-core")!;
    expect(repo).toBeDefined();
    const multipleAssociations = { ...repo, projects: [byId("librustzcash"), byId("halo2")] };
    expect(repositoryBrand(multipleAssociations)?.kind).toBe("namespace");
  });

  it("renders a labeled category fallback instead of invented initials", () => {
    const html = renderToStaticMarkup(createElement(BrandMark, { brand: null, category: "Infrastructure" }));
    expect(html).toContain('data-brand-kind="category"');
    expect(html).toContain('aria-label="Infrastructure icon · no logo displayed"');
    expect(html).not.toContain("<img");
  });

  it("labels organization images clearly and keeps their source local", () => {
    const html = renderToStaticMarkup(createElement(BrandMark, { brand: organizationBrand("zcash-foundation"), category: "Cryptography" }));
    expect(html).toContain('data-brand-kind="maintainer"');
    expect(html).toContain('alt="Zcash Foundation · maintainer mark"');
    expect(html).toContain('src="/logos/ecosystem/zcash-foundation.png"');
  });
});
