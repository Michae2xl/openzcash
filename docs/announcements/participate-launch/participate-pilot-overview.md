# How the Participate pilot works today

Public overview of the OpenZcash Participate pilot as it runs in production on 11 October 2026. The technical log lives in [docs/participate-pilot.md](../../participate-pilot.md); this document describes what a visitor, a member and a verifier can do right now.

## Overview

Participate is the participation workspace for Zcash Community Grants (ZCG) proposals at `openzcash.org/zcg/participate`. It is an independent OpenZcash pilot: it does not replace the ZCG application channel or the committee's own decisions. The workspace has three views:

- **Proposals**: the board of applications open on the ZCG GitHub and ready for committee review, next to recent published decisions with each member's recorded position. Each proposal has likes, a discussion and an inline Read & verify panel.
- **Decision history**: the complete ZCG register maintained by the portal from the official minutes and GitHub sources, 548 recorded verdicts from July 2021 to October 2026, with search, filters, sorting, pagination, CSV export and source links.
- **Committee**: the member module with Reviews, Members, Rules and History. Visible to members and to admins who unlock a read-only preview.

Since 11 October 2026 the workspace is rendered by the portal itself. There is no iframe: the page is server-rendered with the board, drafts, session, profile and committee data read server-to-server from the participation service, and the browser only calls same-origin routes. Light mode keeps the service's parchment palette; dark mode uses the portal's black and gold tokens.

## Who can use what today

| Audience                                 | What is available                                                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anyone                                   | Read the board, the discussions, the preserved records and chain evidence, and the decision history.                                                                                                            |
| Signed-in visitor (email code)           | Free demo Zcred in sandbox mode to like and comment, an editable public profile, drafts and the proposal editor to publish a test proposal in the demo, notifications for replies, optional passkeys.           |
| Committee member (invited)               | The Committee view: the review queue with filters and search, members and invitations, the rules, the activity history with record hashes. Accepting an invitation requires a public reviewer name and consent. |
| Reviewer with verified email and passkey | Everything above, plus the ability to sign a decision once review operations are enabled.                                                                                                                       |
| Admin                                    | Unlocks the read-only committee preview and discussion moderation from the account menu for 15 minutes at a time.                                                                                               |

Status of the committee module in production: **read-only preview**. The member system, invitations, roles and rules are in force. Review operations (opening a round, signing) remain off until the operations flag is switched on; the screen says so under "Preview · Read only".

Participation is free. Demo Zcred are sandbox units; no payment is required and no purchase is open.

## Committee flow

1. **Invitation.** An Owner creates an invitation for an email address and a role (Coordinator, Reviewer or Moderator). Up to 50 invitations can be pending. The invitation link is shared on the site's origin; the service does not send it by email.
2. **Acceptance.** The invited person signs in with the invited email, enters a public reviewer name and agrees to publish that name with their signed decisions and feedback.
3. **Readiness.** A reviewer needs a verified email and at least one passkey (WebAuthn). The Members tab shows each seat as ready, email verification needed or passkey needed. Moderators are discussion-only and never vote.
4. **Opening a review.** A Coordinator (or the Owner) opens a signed review for one revision of a proposal. A committee review requires exactly five voting seats, all ready. Opening freezes the roster, the passkeys and the rules for that round. A newer revision needs a new round.
5. **Verdicts.** Each seat signs one choice (approve, reject or abstain) and a public reason of 10 to 4,000 characters with their passkey. The choice, the reason and the verification key become public; the email stays private; the choice cannot be changed.
6. **Decision.** The round has no deadline. The result is computed only after all five responses are recorded. At least three approvals (60 percent of the committee) pass the proposal; otherwise it is rejected. An abstention counts as a response, not as an approval. Zcred does not affect voting power. Existing reviews keep the rules they were opened with.
7. **Record.** Every access change, rule change, review opening and decision carries a timestamp and becomes a signed entry in the History tab, with a sequence number and a hash. A decision receipt can be downloaded as JSON and checked with the published verifier script against the round fingerprint.

The Reviews tab offers four filters: To review, For me, Decided and Source decisions. Source decisions are mirrored from the official ZCG meeting minutes with each member's published position and a link to the minutes and the original proposal.

Committee labels mirror the ZCG GitHub label set (review state, grant progress, payments, compliance and milestones) and can be edited by reviewers once operations are enabled.

## Moderation

Moderators, Coordinators and the Owner can hide a comment. Hiding requires a reason of up to 500 characters. The hidden comment is replaced by a notice that shows the reason, the moderator's public name and the date, so the discussion keeps a visible record of the action. In the pilot, an admin unlocks moderation from the account menu for 15 minutes at a time.

Discussions are public and immutable: a comment cannot be edited after posting. Each thread accepts up to 500 comments; likes and moderation remain available after that limit.

## Anchoring and verification

Every application that is open on the ZCG GitHub with the labels "Grant Application" and "Ready For ZCG Review" and no decision label is captured as a preserved record: the proposal Markdown, its source metadata and a manifest with a SHA-256 digest per file. The manifest hash identifies the revision. The package is downloadable as one file.

A worker batches the manifest hashes into a Merkle tree and anchors the root in a shielded Sapling transaction on Zcash mainnet. The memo is `PARTICIPATE|ARCHIVE|v1|mainnet|count:N|sha256:<root>`. The transaction is assembled as a PCZT and signed by a Zallet wallet beside a Zebra full node on a separate machine; the worker reaches it only through a restricted command channel with no balance reads. Inclusion is verified after 10 confirmations with a view-only reader and a dedicated public viewing key.

Current state: 25 proposals anchored in transaction `1bb7383043cab4d72b7129b5e5bdc7441ac7c073af59679bb91403216b795bf1`, block 3,512,569, memo `PARTICIPATE|ARCHIVE|v1|mainnet|count:25|sha256:563d2af21845dfc7680ce1d58313c91588cf8b500837f396151104c6c0035bce`. No application is pending.

The Read & verify panel of a proposal shows: the preserved Markdown, the file count, the manifest hash, the capture time, the transaction id, the block height and time, the memo, the public viewing key and the reader version, plus downloads for the revision package, the Markdown, the chain receipt and the verifier script. A visitor can check a downloaded package in the browser (the file never leaves the device) or run the verifier offline with Node.js 22 or later, and can recompute the chain check with their own node and reader. The full design is in [anchoring-architecture.md](anchoring-architecture.md).

What the anchor proves: that the preserved bytes existed at or before the block time. What it does not prove: authorship, committee endorsement or payment. The block time is separate from the application date and from any decision date.

Test proposals published in the demo stay in the demo. Only eligible applications from the official ZCG GitHub source receive anchors.

## Technologies

| Layer                 | Technology                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portal                | Next.js 16 App Router, React 19, TypeScript 5, CSS modules over a tokenized theme (`src/app/theme.css`), deployed on Railway                                                                      |
| Workspace             | The service's components and stylesheets copied into the portal and scoped to the workspace, with `@simplewebauthn/browser` for passkeys and zod for validation                                   |
| Participation service | Prisma on PostgreSQL 16, zod validation, Resend for email codes, signed JWT cookie sessions                                                                                                       |
| Archive worker        | systemd timers on a virtual private server: one minute cycle, GitHub discovery every five minutes, monitor every two minutes with email alerts, daily encrypted backups; GitHub API for discovery |
| Anchoring             | Zallet 0.1.0-beta.3 and a Zebra full node on a separate machine, PCZT transaction assembly, Sapling shielded memo, dedicated public viewing key                                                   |
| Verification          | Browser file check, offline verifier script, chain receipt JSON, Merkle inclusion proof                                                                                                           |
| Around the workspace  | Zarvis on Claude Opus 5.5; ZCG Copilot agent skill 1.1.0 published under `/.well-known/agent-skills/`                                                                                             |

## Known limits

- The committee module is a read-only preview in production. No review round has been opened and no committee vote has been signed in production.
- Signed decision receipts carry their own cryptographic verification but have no Zcash anchor yet.
- The chain evidence shown in Read & verify is the worker's saved observation. A saved check older than 15 minutes is labelled "Check required" until the worker records a fresh one; the stored evidence stays visible.
- Demo Zcred are sandbox units. Paid credits and native paid proposal publication are not open.
- Invitation links are shared by the Owner; the service does not email them.
- Passkeys are bound to the portal's origin; a reviewer enrolls on their own device.
- The pilot is independent. Official ZCG submissions and committee decisions follow the existing ZCG process.

## Roadmap

1. **Committee operations.** Switch the module from preview to operation once the five reviewer seats have verified emails and passkeys.
2. **Anchored receipts.** Anchor signed committee receipts the same way proposal archives are anchored.
3. **DAO and sub-DAOs.** The service already models communities and subcommunities: a DAO with sub-DAOs, each with its own decentralized leaders (an owner and coordinators) and its own sustainability treasury as a scoped pool of credits. Roles, invitations, signed decisions, moderation and credit scopes work per community. This capability is built and ready to enable; it is not live today.
