# Participate pilot

In production at `openzcash.org/zcg/participate` since 10 October 2026 · Native workspace since 11 October 2026 · Public overview: [docs/announcements/participate-launch/participate-pilot-overview.md](announcements/participate-launch/participate-pilot-overview.md)

`/zcg/participate` replaces the standalone Decisions navigation entry. Both `/decisions` and `/zcg/decisions` redirect permanently to `/zcg/participate?view=history`. The history retains the existing ZCG data, publication policy, filters, CSV export and source links. Failed history retrieval is unavailable, not zero decisions.

## Public experience

First entry presents an accessible introductory dialog with an original illustration. Entering is remembered for the browser session; closing is always possible, and **About the pilot** reopens it. History can be read without signing in. With the service configured, it uses the same workspace as Proposals and Committee.

The pitch describes an independent experiment starting with ZCG and a future standalone platform for Coinholders, DAOs and sub-DAOs. It makes no claim of ZCG endorsement, exclusive invention or completed mainnet anchoring. Prepared archives remain distinct from confirmed chain proofs.

The shared desktop/mobile ZCG menu places Proposals and Participate immediately after Overview, followed by Grants and Recipients. Payment schedule sits beside Disbursements; financial views stay together, followed by Committee, Meetings and ZCG Office. Reconciliation and Sources & API close the menu together.

The participation service supplies the existing real proposal examples, under-review snapshots, source verification, inline comments, moderation, likes, editable account settings and private, free demo Zcred balances. DAO administration stays in the separate module. The portal does not duplicate its database or authenticate on its behalf.

## Service boundary

Participate uses the same public origin as OpenZcash. Set the server-only `PARTICIPATE_UPSTREAM_URL` to the internal backend origin, without a path, credentials, query or fragment. Loopback and Railway internal hosts allow HTTP; other upstreams require HTTPS. The OpenZcash public hosts are rejected to prevent a proxy loop. An unset or invalid URL shows the introduction and public history. The browser receives only the relative `/participate` workspace path.

The service sets `PARTICIPATE_COMMUNITY_ID` to the public archive host and both `APP_BASE_URL` and `PARTICIPATE_PARENT_ORIGIN` to the portal origin. Local preview uses only `http://localhost:4421` in the browser, with a server-to-server upstream on port 4411. The existing archive host and committee credit scope are preserved.

Deploy the backend privately behind the OpenZcash proxy. Keep `APP_BASE_URL`, `PASSKEY_ORIGIN` and the WebAuthn RP ID aligned with the public OpenZcash origin. Existing passkeys stay bound to their original RP; a production origin needs real-device enrollment/sign-in verification. The first account access method is an email code; support@openzcash.org delivery has local acceptance evidence, while final-origin acceptance remains pending. Password access is retired. Passkeys are optional after signing into a verified personal account; shared demo profiles cannot enroll credentials. The demo stays inside Participate, including connection retries. It does not expose a separate-window entry or passkey setup/signing escape link. The frame does not delegate passkey capabilities; device enrollment and signed decisions remain unavailable inside this embedded pilot until an embedded authentication flow is implemented and verified.

Only `/zcg/participate` expands the portal's `frame-src`, and only with the same-origin workspace. A fixed proxy allowlist forwards pilot APIs and downloads; the portal retains its history API and JavaScript assets. The backend uses a separate `/_participate-assets/_next/` asset namespace. The service's `/participate` and `/participate/committee` allow the configured parent. Other routes retain their framing restrictions. The message bridge checks exact origin, source window, message type and version; it carries readiness, appearance and fixed view requests (proposals, decision history, committee and the pilot introduction). Navigation requests cannot supply a URL; committee access remains authorized by the service. The bridge never carries account identities, balances, wallet keys or authenticated actions.

## Economics and activation

The agreed price is **US$0.25 per Zcred**, with **20 Zcred / US$5** for a future native proposal submission. Existing preview balances are demo units. Real purchase activation and the native paid publication workflow are not part of this migration.

The receiving account is the pilot operator's Zallet account, not an official ZCG address. Its verified public receiver and account reference are prepared in server-only local configuration. No address, QR or payment URI is offered before a valid invoice. The account's full wallet balance and keys are never sent to the portal.

At the latest operational check, Zallet was still scanning recovered history. The current spendable balance was unavailable. Before opening purchases: complete recovery, verify the account and chain observation, implement timestamped USD→ZEC invoice quoting and immutable quote evidence, test payment confirmation/idempotency/reorg handling, and deploy the service with durable private RPC access. The temporary operator SSH connection is not deployment infrastructure.

## Release proof

Local rendering, tests and an accessible preview do not establish production availability. Release requires both repositories, deployed service configuration, real browser/passkey acceptance on the final origins and explicit verification of the live route. No payment or blockchain anchor was broadcast during this migration.

### Local acceptance — 10 October 2026

- Both application production builds completed successfully; targeted tests, TypeScript and lint checks passed.
- The introductory dialog, entry action and session preference were checked in the browser. At a 390-pixel viewport, the page and dialog stay within the viewport and the introduction scrolls.
- The embedded proposal service loaded real records. Credits opened inside the portal; existing comments and moderation history remained available inline. Parent light/dark changes reached the embedded service.
- The former Decisions URL redirected to the retained history: 547 verdicts, including 183 approved, 347 rejected and 17 excluded by the existing publication policy.
- The prepared receiving account matched the original recovered HD account. Zallet still reported 13,427 unscanned blocks at the latest check; a current spendable balance and purchase activation were therefore not verified.

The local receiving metadata is ignored by Git. The preview database connection for OpenZcash is read-only. These checks did not change the production portal or move funds.

The pilot introduction now highlights free demo Zcred and the editable profile. Planned paid-credit pricing remains a later release requirement; no payment is needed to use the local demo.

### Integrated workspace header

The active pilot opens directly into the original application header: proposals, decision history, the authorized committee entry and account access. The large portal heading and duplicate navigation are removed. Participants and committee members use the same email-code sign-in; server-side roles determine committee access. Credits and profile settings stay in the account menu. The first-visit introduction remains available from the help icon. Desktop and mobile layouts keep all navigation inside Participate.

Header acceptance at that stage: 71 targeted tests passed across both applications, with TypeScript and scoped lint checks passing. Browser checks covered the committee view, profile menu, decision-history round trip, pilot introduction, inline guest sign-in and return to the demo. The header and account menu fit at 390 px, and portal light/dark changes still reach the service. Those earlier checks used the shared preview; personal email access was configured subsequently.

### Decision history inside the workspace

`?view=history` now loads the service's native history view instead of replacing the workspace with the legacy portal table. The shared Z logo, navigation, active tab, theme, profile and Credits menu stay in place. The three workspace tabs use fixed host URLs, so links, reloads and browser navigation retain the selected section.

The read-only `/api/participate/history` endpoint serves the same complete committee register as the legacy view. The service reads it server-to-server from its configured parent origin, validates the versioned response and retains search, outcome/year filters, sorting, pagination, CSV export and original source links. No session state is exchanged. A failed source read shows an inline retry inside the workspace; only installations without a configured service retain the legacy public fallback.

Local acceptance for this change: 74 focused tests passed across both projects; TypeScript, scoped lint and whitespace checks passed. The real response contained 547 records, dated 13 July 2021 through 2 October 2026. Browser checks covered all three tabs, profile/Credits menu, search, combined outcome/year filtering, theme retention, and desktop/390 px rendering. CSV content and escaping were tested; the in-app browser did not report the download event, so browser download completion is not claimed. No deployment or account/ballot mutation was performed.

### Same-origin acceptance

The latest preview serves the workspace and its assets/actions/downloads through `localhost:4421`, with the main address remaining `/zcg/participate`. Profile and its existing balance, the inline proposal editor, history round trip, photos, comments, light/dark synchronization and the 390 px layout were checked. The GraphSense revision downloaded through the portal; another preserved revision matched the direct backend response byte for byte. Old chain observations correctly remain `Check required`.

Both production builds and scoped checks passed. Final suites: **3,256 portal tests passed / 12 skipped**, **1,506 backend tests passed / 214 skipped**. Additional Node tests and error-page consistency passed. Origin checks reject forged foreign requests, account responses remain private, and public committee access is restricted. Private upstream configuration does not appear in client assets. No production deployment, record mutation, credit charge, email or wallet transaction occurred in this change. The private backend deployment and final-domain acceptance remain required before public launch.

## Native workspace — 11 October 2026

The iframe is retired. `/zcg/participate` renders the participation workspace itself, with the same components and stylesheets as the service: the embedded header with the Z mark, Proposals and Decision history, the quick tour, the proposal board with filters, inline Read & verify and discussion panels, the account menu with profile, Credits and passkeys, the proposal editor (`?compose=`) and the decision history (`?view=history`). Deep links keep the service's query parameters (`?record=`, `?comment=`, `?compose=`). The design is unchanged; only the host changed.

**Source of the UI.** `src/components/participate/workspace/` and `src/lib/participate/workspace/` are copies of the service's client components, domain helpers, static datasets and label catalog, with imports rewritten and `/participate` paths pointed at `/zcg/participate`. They use `zod/v3` so validation stays identical to the service. `workspace.css` is generated by `scripts/participate-workspace-css.mjs` from the service's stylesheets: every rule is scoped to `.oz-participate`, so the service's tokens, fonts, body background and element defaults apply to the workspace only. `native.css` holds the few adjustments for running inside the shell. The self-hosted Inter and Geist Mono files, the Zcash currency mark and the committee portraits travel with the portal under `public/`. `@simplewebauthn/browser` and `qrcode` are pinned to the service's versions.

**Data.** OpenZcash reads the board, drafts, the session and the profile server-to-server from `PARTICIPATE_UPSTREAM_URL`, forwarding only the visitor's own `zcap_session` and `participate_*` cookies; a guest board is memoized for 30 seconds so a service restart no longer blanks the page. Everything the browser does (email codes, comments, likes, drafts, publication, profile, credits, notifications, passkeys, downloads) keeps calling the same-origin API routes that `next.config.ts` forwards. The decision history reads the portal's own register directly. `PARTICIPATE_COMMUNITY_ID` (default `preview_orchard`) names the public archive host used in API paths.

**Removed.** The postMessage bridge, the readiness handshake and the retry loop; the `/participate`, `/participate/committee`, `_participate-assets`, fonts, brand and committee-image rewrites; the `frame-src` exception and the `frame-ancestors 'self'` headers. `/participate` and `/participate/committee` redirect permanently to the native screen. The workspace's own light/dark toggle is gone: appearance follows the OpenZcash shell.

**Committee and moderation.** `?view=committee` renders the service's committee workspace natively: Reviews, Members, Rules and History, read server-to-server from `/api/participate/committee` with the visitor's own cookies, including the `__Host-committee-preview` and `__Host-participate-moderation` unlock cookies. The header's Committee entry follows the access the service grants (member, admin preview or pending invitation); visitors without access see the service's own restricted, signed-out or denied states, and a failed read shows a retry panel. Discussion moderation (hiding a comment with a recorded reason) runs through the same-origin API routes once an admin unlocks it from the account menu. Operations remain governed by the service: with `PARTICIPATE_COMMITTEE_ENABLED=false` the committee stays a read-only preview.

**Appearance.** Light mode keeps the service's parchment palette unchanged. Dark mode maps the service's `--dao-*` tokens to the OpenZcash palette (black canvas, gold accent, the values of `theme.css`) in `native.css`, so the workspace reads as one system with the shell; the service's grid overlay applies to light mode only.

**Why.** The embed waited eight seconds per attempt for a readiness message while the service restarted after each deployment, then reported that the workspace did not open. The native screen is server-rendered with the data already in hand.

**Production.** The native workspace, the committee preview and discussion moderation are live at `openzcash.org/zcg/participate`. The archive worker has anchored 25 proposals in one Sapling transaction (`1bb7383043cab4d72b7129b5e5bdc7441ac7c073af59679bb91403216b795bf1`, block 3,512,569) and no application is pending. The public description of the pilot, the anchoring architecture and the launch announcement material live in [docs/announcements/participate-launch/](announcements/participate-launch/README.md).
