"use client";

import Image from "next/image";
import { useState } from "react";
import { brandLabel, type Brand } from "./branding";
import { categoryStyle, categoryTheme } from "./presentation";
import styles from "./explorer.module.css";

export function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={categoryTheme(category).icon} />
  </svg>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className={styles.categoryBadge} style={categoryStyle(category)} data-category={category}>
    <CategoryIcon category={category} />{category}
  </span>;
}

export function BrandMark({ brand, category, compact = false }: {
  brand: Brand | null; category: string; compact?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const visibleBrand = brand && brand.src !== failedSource ? brand : null;
  const label = visibleBrand ? brandLabel(visibleBrand) : `${category} icon · no logo displayed`;
  return <span className={[styles.mark, compact ? styles.compactMark : "", !visibleBrand ? styles.fallbackMark : ""].join(" ")}
    style={categoryStyle(category)} title={label} data-brand-kind={visibleBrand?.kind || "category"}>
    {visibleBrand ? <>
      <Image key={visibleBrand.src} src={visibleBrand.src} width={compact ? 24 : 36} height={compact ? 24 : 36}
        alt={label} unoptimized data-theme-logo={visibleBrand.darkSrc ? "light" : undefined} onError={() => setFailedSource(visibleBrand.src)} />
      {visibleBrand.darkSrc && <Image src={visibleBrand.darkSrc} width={compact ? 24 : 36} height={compact ? 24 : 36}
        alt={label} unoptimized data-theme-logo="dark" />}
    </>
      : <span role="img" aria-label={label}><CategoryIcon category={category} size={compact ? 17 : 23} /></span>}
  </span>;
}
