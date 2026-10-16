"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { siApple, siAndroid } from "simple-icons";
import { BottomSheet } from "@/components/bottom-sheet";
import { CommunityCredit } from "@/components/community-credit";
import { PageHeader } from "@/components/ui";
import { WALLET_EVIDENCE } from "@/lib/wallet-finder/evidence";
import {
  capabilityReason, DEFAULT_REQUIREMENTS, matchWallets, parseWalletRequirements,
  PLATFORM_LABELS, walletRequirementsQuery,
} from "@/lib/wallet-finder/matching";
import type { CapabilityEvidence, MatchReason, WalletMatch, WalletPlatform, WalletRequirements } from "@/lib/wallet-finder/types";
import { EDITORIAL_HIGHLIGHTS, HARDWARE, SOFTWARE } from "../catalog-data";
import styles from "./finder.module.css";

const CATALOG = new Map([...SOFTWARE, ...HARDWARE].map(wallet => [wallet.name, wallet]));
const HARDWARE_NAMES = new Set(HARDWARE.map(wallet => wallet.name));
const CATALOG_ORDER = new Map([...CATALOG.keys()].map((name, index) => [name, index]));
const PLATFORM_EMOJI: Record<WalletPlatform, string> = { ios: "", android: "", desktop: "🖥️", browser: "🧩", web: "🌐", hardware: "🔑" };
const STATE_LABELS = { supported: "Supported", unsupported: "Not supported", unknown: "Unknown" } as const;

function PlatformIcon({ platform }: { platform: WalletPlatform }) {
  const brand = platform === "ios" ? siApple : platform === "android" ? siAndroid : null;
  const label = PLATFORM_LABELS[platform];
  return brand
    ? <svg role="img" aria-label={label} data-platform={platform} viewBox="0 0 24 24" fill="currentColor"><title>{`${brand.title} · ${label}`}</title><path d={brand.path} /></svg>
    : <span role="img" aria-label={label} title={label}>{PLATFORM_EMOJI[platform]}</span>;
}

function readParams(params: Pick<URLSearchParams, "forEach" | "getAll">): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  params.forEach((_value, key) => {
    const all = params.getAll(key);
    values[key] = all.length === 1 ? all[0] : all;
  });
  return values;
}

function checkedDate(date: CapabilityEvidence["checkedAt"]): string {
  if (!date) return "Not yet verified";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "Verification date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

function Evidence({ reason }: { reason: MatchReason }) {
  const evidence = reason.evidence;
  return <li className={styles.evidenceItem}>
    <div className={styles.evidenceHeading}>
      <h4>{reason.requirement}{reason.platform ? ` · ${PLATFORM_LABELS[reason.platform]}` : ""}</h4>
      <span className={styles.evidenceState} data-state={reason.state}>{STATE_LABELS[reason.state]}</span>
    </div>
    <dl className={styles.evidenceFacts}>
      <div><dt>Source checked</dt><dd>{evidence.checkedAt ? <time dateTime={evidence.checkedAt}>{checkedDate(evidence.checkedAt)}</time> : checkedDate(null)}</dd></div>
      <div><dt>Scope</dt><dd>{evidence.scope}</dd></div>
      <div><dt>Limits &amp; context</dt><dd>{evidence.note}</dd></div>
    </dl>
    {evidence.sources.length ? <ul className={styles.sources} aria-label={`Sources for ${reason.requirement}`}>
      {evidence.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true"> ↗</span></a></li>)}
    </ul> : <p className={styles.noSource}>No primary source recorded for this capability.</p>}
  </li>;
}

function WalletResult({ result, query }: { result: WalletMatch; query: string }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const wallet = CATALOG.get(result.walletName);
  const profile = WALLET_EVIDENCE.find(item => item.walletName === result.walletName);
  const supported = (platform: WalletPlatform, key: "shieldedSend" | "shieldedReceive") => {
    const record = profile?.platforms[platform]?.[key];
    return record && capabilityReason(key, record, platform).state === "supported";
  };
  const privateSend = result.status === "match" && result.platforms.every(platform => supported(platform, "shieldedSend"));
  const privateReceive = result.status === "match" && result.platforms.every(platform => supported(platform, "shieldedReceive"));
  const transparentOnly = result.status === "match" && result.platforms.every(platform => {
    const facts = profile?.platforms[platform];
    return facts && [facts.shieldedSend, facts.shieldedReceive].every(record => capabilityReason("Privacy", record, platform).state === "unsupported");
  });
  const privacy = result.status !== "match"
    ? { icon: result.status === "unknown" ? "?" : "−", label: result.status === "unknown" ? "Needs verification" : "Does not match" }
    : privateSend && privateReceive ? { icon: "🔒", label: "Shielded" }
    : privateSend ? { icon: "↗", label: "Private send" }
    : privateReceive ? { icon: "↙", label: "Private receive" }
    : transparentOnly ? { icon: "🔓", label: "Transparent" }
    : { icon: "?", label: "Privacy unverified" };
  const auditedPlatform = result.status === "match" ? result.platforms.find(platform => {
    const record = profile?.platforms[platform]?.securityAudit;
    return record && capabilityReason("Public security audit", record, platform).state === "supported";
  }) : undefined;
  const auditEvidence = auditedPlatform ? profile?.platforms[auditedPlatform]?.securityAudit : undefined;
  const auditReport = auditEvidence?.sources[0];
  const shownReasons = result.status === "match"
    ? result.platformReasons.flatMap((group, index) => index === 0 ? group.reasons : group.reasons.filter(reason => reason.platform))
    : result.reasons;
  const representativePlatform = result.reasons.find(reason => reason.platform)?.platform;
  const recordQuery = new URLSearchParams(query);
  recordQuery.set("view", "evidence");
  recordQuery.set("wallet", result.walletName);
  const id = `wallet-${result.walletName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <>
    <article className={styles.wallet} aria-labelledby={id} data-highlighted={EDITORIAL_HIGHLIGHTS.has(result.walletName) || undefined}>
      <div className={styles.walletHeading}>
        {wallet?.logo ? <img src={wallet.logo} alt="" width={44} height={44} data-theme-logo={wallet.logoDark ? "light" : undefined} /> : null}
        {wallet?.logoDark ? <img src={wallet.logoDark} alt="" width={44} height={44} data-theme-logo="dark" /> : null}
        <div className={styles.walletName}><h3 id={id}>{result.walletName}</h3>{EDITORIAL_HIGHLIGHTS.has(result.walletName) && <span className={styles.editorialStar} role="img" aria-label="Editorial highlight" title="OpenZcash editorial pick">⭐</span>}</div>
        {auditReport && auditedPlatform && auditEvidence && <a className={styles.auditBadge} href={auditReport.url} target="_blank" rel="noopener noreferrer" aria-label={`Audit report for ${result.walletName} on ${PLATFORM_LABELS[auditedPlatform]}`} title={`Past audit: ${auditEvidence.scope}. Historical report, not a current safety rating.`}><span aria-hidden="true">🛡️</span></a>}
      </div>
      <p className={styles.walletDescription}>{wallet?.summary}</p>
      <div className={styles.walletMeta}>
        <span className={styles.privacyBadge} data-private={privateSend && privateReceive || undefined}><span aria-hidden="true">{privacy.icon}</span>{privacy.label}</span>
        {result.platforms.length > 0 && <div className={styles.platformIcons} aria-label="Matching platforms">
          {result.platforms.map(platform => <PlatformIcon key={platform} platform={platform} />)}
        </div>}
      </div>
      <div className={styles.walletActions}>
        {wallet ? <a className={styles.officialLink} href={wallet.url} target="_blank" rel="noopener noreferrer" aria-label={`${result.walletName} website`}>Website<span aria-hidden="true"> ↗</span></a> : <span />}
        <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`Details for ${result.walletName}`} aria-haspopup="dialog">Details <span aria-hidden="true">＋</span></button>
      </div>
    </article>
    {detailsOpen && <BottomSheet open={detailsOpen} onOpenChange={setDetailsOpen} title={`${result.walletName} details`}>
      <div className={styles.walletDetails}>
        {wallet && <><p className={styles.maker}>{wallet.maker}</p><p>{wallet.note}</p></>}
        {result.status === "match" ? <p className={styles.matchPlatform}>Matches on {result.platforms.map(platform => PLATFORM_LABELS[platform]).join(", ")}.</p> : <p>These reasons assess {representativePlatform ? PLATFORM_LABELS[representativePlatform] : "one available record"}. Other platforms may differ.</p>}
        {result.status === "match" && <dl className={styles.reviewedScope}>{result.platformReasons.map(group => <div key={group.platform}><dt>{PLATFORM_LABELS[group.platform]} reviewed scope</dt><dd>{group.reasons.find(reason => reason.requirement === "Platform available")?.evidence.scope}</dd></div>)}</dl>}
        {auditReport && auditEvidence && <div className={styles.auditBlock}><a href={auditReport.url} target="_blank" rel="noopener noreferrer" className={styles.officialLink}>🛡️ Audit report ↗</a><p className={styles.auditContext}>Scope: {auditEvidence.scope} · Source checked {checkedDate(auditEvidence.checkedAt)}. Past reports do not guarantee current safety.</p></div>}
        <Link href={`/wallets/find?${recordQuery.toString()}`} className={styles.catalogLink}>All capability records <span aria-hidden="true">↗</span></Link>
        <h3>Sources, dates &amp; limits</h3>
        <p className={styles.evidenceIntro}>Evidence for the selected filters. Open all capability records for privacy, hardware and audit details on every platform.</p>
        <ul className={styles.recordFacts}>{shownReasons.map((reason, index) => <Evidence key={`${reason.requirement}-${reason.platform ?? "all"}-${index}`} reason={reason} />)}</ul>
      </div>
    </BottomSheet>}
  </>;
}

function WalletGroups({ results, query, idPrefix }: { results: WalletMatch[]; query: string; idPrefix: string }) {
  const groups = [
    { id: "software", label: "Software wallets", wallets: results.filter(result => !HARDWARE_NAMES.has(result.walletName)) },
    { id: "hardware", label: "Hardware wallets", wallets: results.filter(result => HARDWARE_NAMES.has(result.walletName)) },
  ];
  return groups.filter(group => group.wallets.length > 0).map(group => <section key={group.id} className={styles.walletGroup} aria-labelledby={`${idPrefix}-${group.id}`}>
    <div className={styles.groupHeading}><h2 id={`${idPrefix}-${group.id}`}>{group.label}</h2><span aria-hidden="true">{group.wallets.length}</span></div>
    <div className={styles.walletList}>{group.wallets.map(result => <WalletResult key={result.walletName} result={result} query={query} />)}</div>
  </section>);
}

const CAPABILITY_LABELS = {
  availability: "Platform available",
  shieldedSend: "Send shielded ZEC",
  shieldedReceive: "Receive shielded ZEC",
  hardwareSigning: "Sign with a hardware device",
  multichain: "Manage native assets on multiple blockchains",
  securityAudit: "Public independent security audit",
} as const;

function CapabilityRecords({ selectedName, onSelect, onFind }: { selectedName: string | null; onSelect: (name: string) => void; onFind: () => void }) {
  const profiles = [...WALLET_EVIDENCE].sort((a, b) => a.walletName.localeCompare(b.walletName, "en"));
  const profile = selectedName ? profiles.find(item => item.walletName === selectedName) : profiles[0];
  const wallet = profile ? CATALOG.get(profile.walletName) : undefined;
  return <section aria-label="Wallet capability records">
    <div className={styles.recordHeader}>
      <label>Wallet evidence<select value={profile?.walletName ?? ""} onChange={event => onSelect(event.target.value)}>{!profile && <option value="">Choose a wallet</option>}{profiles.map(item => <option key={item.walletName} value={item.walletName}>{item.walletName}</option>)}</select></label>
      <a className={styles.catalogLink} href="/api/wallets/capabilities" download="wallet-capabilities.json">Download evidence data <span aria-hidden="true">↓</span></a>
      <button type="button" className={styles.secondaryButton} onClick={onFind}>Find a wallet for my needs</button>
    </div>
    {profile ? <article className={styles.record} aria-labelledby="wallet-record-title">
      <h2 id="wallet-record-title">{profile.walletName}</h2>
      <p>All recorded capabilities, including unknowns. Each platform has its own evidence; a feature confirmed on one platform does not establish support on another.</p>
      {wallet && <a className={styles.officialLink} href={wallet.url} target="_blank" rel="noopener noreferrer">Official website<span aria-hidden="true"> ↗</span></a>}
      <ul className={styles.recordFacts}><Evidence reason={capabilityReason("Available to use", profile.availability)} /></ul>
      {Object.entries(profile.platforms).map(([platform, facts], index) => <details key={`${profile.walletName}-${platform}`} className={styles.recordPlatform} open={index === 0}>
        <summary>{PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS]}</summary>
        <ul className={styles.recordFacts}>{(Object.keys(CAPABILITY_LABELS) as (keyof typeof CAPABILITY_LABELS)[]).map(key => <Evidence key={key} reason={capabilityReason(CAPABILITY_LABELS[key], facts[key], platform as keyof typeof PLATFORM_LABELS)} />)}</ul>
      </details>)}
    </article> : <div className={styles.empty}><h2>Wallet record not found</h2><p>Choose a wallet above to inspect its available evidence.</p></div>}
  </section>;
}

export function WalletFinder() {
  const params = useSearchParams();
  const requirements = parseWalletRequirements(readParams(params));
  const viewingEvidence = params.get("view") === "evidence";
  const [shareMessage, setShareMessage] = useState("");
  // Keep the familiar catalog sequence as filters narrow each result group.
  const results = matchWallets(WALLET_EVIDENCE, requirements).sort((a, b) =>
    (CATALOG_ORDER.get(a.walletName) ?? Infinity) - (CATALOG_ORDER.get(b.walletName) ?? Infinity)
    || a.walletName.localeCompare(b.walletName, "en"),
  );
  const matches = results.filter(result => result.status === "match");
  const unknown = results.filter(result => result.status === "unknown");
  const excluded = results.filter(result => result.status === "excluded");
  const sendingPrivately = requirements.shielded === "send" || requirements.shielded === "both";
  const receivingPrivately = requirements.shielded === "receive" || requirements.shielded === "both";
  const hasFilters = !!walletRequirementsQuery(requirements);

  function updateRequirements(next: WalletRequirements) {
    const query = walletRequirementsQuery(next);
    window.history.pushState(null, "", `/wallets/find${query ? `?${query}` : ""}`);
    setShareMessage("");
  }

  function togglePrivacy(direction: "send" | "receive", checked: boolean) {
    const send = direction === "send" ? checked : sendingPrivately;
    const receive = direction === "receive" ? checked : receivingPrivately;
    const shielded = send && receive ? "both" : send ? "send" : receive ? "receive" : "any";
    updateRequirements({ ...requirements, shielded });
  }

  function selectRecord(name: string) {
    const query = new URLSearchParams(walletRequirementsQuery(requirements));
    query.set("view", "evidence");
    query.set("wallet", name);
    window.history.pushState(null, "", `/wallets/find?${query.toString()}`);
  }

  async function share() {
    try {
      const query = walletRequirementsQuery(requirements);
      const link = new URL(`/wallets/find${query ? `?${query}` : ""}`, window.location.origin);
      await navigator.clipboard.writeText(link.href);
      setShareMessage("Link copied.");
    } catch {
      setShareMessage("Copy the address from your browser to share these filters.");
    }
  }

  return <div className={styles.finder}>
    <PageHeader
      title={viewingEvidence ? "Wallet capability evidence" : "Wallet Finder"}
      subtitle={viewingEvidence ? "Sources, dates and limits, by wallet and platform." : undefined}
    />
    {viewingEvidence ? <CapabilityRecords selectedName={params.get("wallet")} onSelect={selectRecord} onFind={() => updateRequirements(requirements)} /> : <>
      <section className={styles.filterPanel} aria-labelledby="wallet-filters">
        <div className={styles.filterHeading}>
          <h2 id="wallet-filters">Filters</h2>
          <button type="button" className={styles.textButton} onClick={() => updateRequirements(DEFAULT_REQUIREMENTS)} disabled={!hasFilters}>Clear filters</button>
        </div>
        <div className={styles.filterGrid}>
          <label className={styles.platformField}>
            <span>Platform</span>
            <select value={requirements.platform} onChange={event => updateRequirements({ ...requirements, platform: event.target.value as WalletRequirements["platform"] })}>
              <option value="any">Any platform</option>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => <option key={value} value={value}>{PLATFORM_EMOJI[value as WalletPlatform]} {label}</option>)}
            </select>
          </label>
          <fieldset className={styles.filterGroup}>
            <legend>Capabilities</legend>
            <div className={styles.filterOptions}>
              <label className={styles.filterOption}><input type="checkbox" aria-label="Send ZEC privately" checked={sendingPrivately} onChange={event => togglePrivacy("send", event.target.checked)} /><span><span aria-hidden="true">🔒</span> Private send</span></label>
              <label className={styles.filterOption}><input type="checkbox" aria-label="Receive ZEC privately" checked={receivingPrivately} onChange={event => togglePrivacy("receive", event.target.checked)} /><span><span aria-hidden="true">🔒</span> Private receive</span></label>
              <label className={styles.filterOption}><input type="checkbox" aria-label="Hardware signer" checked={requirements.hardware === "required"} onChange={event => updateRequirements({ ...requirements, hardware: event.target.checked ? "required" : "any" })} /><span><span aria-hidden="true">🔑</span> Hardware</span></label>
              <label className={styles.filterOption}><input type="checkbox" aria-label="Other blockchains" checked={requirements.multichain === "required"} onChange={event => updateRequirements({ ...requirements, multichain: event.target.checked ? "required" : "any" })} /><span><span aria-hidden="true">🪙</span> Multichain</span></label>
              <label className={styles.filterOption}><input type="checkbox" aria-label="Public audit report" checked={requirements.audit === "required"} onChange={event => updateRequirements({ ...requirements, audit: event.target.checked ? "required" : "any" })} /><span><span aria-hidden="true">🛡️</span> Audit report</span></label>
            </div>
          </fieldset>
        </div>
      </section>
      <section className={styles.results} aria-labelledby="matching-wallets">
        <div className={styles.resultHeading}>
          <p id="matching-wallets" className={styles.resultCount} aria-live="polite" aria-atomic="true">{matches.length} {matches.length === 1 ? "wallet" : "wallets"}</p>
          <div className={styles.resultTools}><div className={styles.resultLegend}><span>⭐ Editorial picks</span><span>🛡️ Past audit</span></div><button type="button" className={styles.textButton} aria-label="Copy result link" onClick={share}>Copy link <span aria-hidden="true">↗</span></button></div>
        </div>
        <p role="status" className={styles.shareMessage}>{shareMessage}</p>
        {matches.length ? <WalletGroups results={matches} query={walletRequirementsQuery(requirements)} idPrefix="matches" /> : <div className={styles.empty}>
          <h3>No confirmed matches for this combination</h3>
          <p>Change a filter above to widen the results. Unknown support never counts as a match.</p>
        </div>}
      </section>
      {(unknown.length > 0 || excluded.length > 0) && <div className={styles.otherResults}>
        {unknown.length > 0 && <details><summary>Needs verification · {unknown.length}<span aria-hidden="true"> +</span></summary><p>At least one selected requirement is unconfirmed.</p><WalletGroups results={unknown} query={walletRequirementsQuery(requirements)} idPrefix="unknown" /></details>}
        {excluded.length > 0 && <details><summary>Not matched · {excluded.length}<span aria-hidden="true"> +</span></summary><p>A selected requirement is not supported. Details include the evidence.</p><WalletGroups results={excluded} query={walletRequirementsQuery(requirements)} idPrefix="excluded" /></details>}
      </div>}
    </>}
    <aside className={styles.method}><details><summary>How matching works</summary><p>Results keep the catalog order. Only documented capabilities count: availability, platform and selected capabilities are checked against the linked sources. Unknown or incomplete evidence stays unknown. Capabilities from different platforms are never combined into one match. Other blockchains means managing native assets, not swaps.</p><p>A public audit report covers its stated product and release; it is not a safety guarantee. The ⭐ is an editorial highlight. Read source dates and limits before choosing. <Link href="/wallets/find?view=evidence">Browse all capability records</Link>.</p><p>No account or wallet connection is needed. Your filters stay in this page’s address so you can revisit or share them.</p></details></aside>
    <CommunityCredit screen="wallet-finder" />
  </div>;
}
