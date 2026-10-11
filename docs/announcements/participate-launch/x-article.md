# Participate is now native to OpenZcash

## The ZCG participation pilot moved into the portal itself, with a native committee module, discussion moderation and a dark mode. Here is what runs today, how a decision is formed, what the Zcash anchoring means, and where this is going.

### What Participate is today

Participate is the participation workspace of OpenZcash for Zcash Community Grants (ZCG) proposals. It lives at openzcash.org/zcg/participate, inside the portal, with the same navigation, search and theme as every other OpenZcash page. Until this week it ran inside an iframe served by a separate service. Now the portal renders it directly: the proposal board, the inline Read & verify panel, the discussion threads, the account menu, the proposal editor, the decision history and the committee module are native screens. The service that stores the data still exists, but the browser only talks to OpenZcash.

Anyone can open the board. Signing in takes an email code; there is no password and no wallet. Signed-in visitors receive free demo Zcred to like and comment in sandbox mode, can draft and publish test proposals in the editor, and can read the complete ZCG decision register, which the portal maintains from the official minutes and GitHub sources going back to 2021. The board lists the applications that are open on the ZCG GitHub and ready for committee review, next to recent published decisions with each committee member's recorded position.

### From the open demo to the committee

The demo is for everyone. The committee module is for members. Both run on the same workspace, so a member sees the same board a visitor sees, plus a Committee entry in the header.

The member system is already in force. A committee has an Owner, who manages access; Coordinators, who open reviews; Reviewers, who vote; and Moderators, who manage discussions. Membership starts with an invitation addressed to a verified email. The invited person accepts with a public reviewer name and an explicit consent to publish that name with their signed decisions. A reviewer also needs a passkey, because votes are signed with it. Owners can revoke invitations, change roles and remove members with a recorded reason; past signatures stay as they were.

In production the committee module runs as a read-only preview: members, invitations, roles and rules are live, but review operations stay off until they are switched on. We are announcing the screen, not a vote.

### How a decision is born

1. An Owner invites a verified email. The invitee accepts with a public name and consent.
2. The new member verifies their email and enrolls a passkey (WebAuthn). Until both are done, the seat shows as not ready.
3. A Coordinator opens a review for a specific revision of a proposal. Opening freezes the roster, the passkeys and the rules for that round.
4. Each of the five seats signs one choice (approve, reject or abstain) and a public reason with their passkey. The choice, the reason and the verification key become public; the email stays private; the choice cannot be changed.
5. Nothing is computed early. The result is published only after all five verdicts are recorded. At least three approvals, 60 percent of the committee, pass the proposal; otherwise it is rejected. An abstention counts as a response, not as an approval. Zcred has no effect on voting power.
6. Every decision carries a timestamp and becomes a signed record in the committee history, with a sequence number and a hash. Receipts can be downloaded and checked with a verifier script, and the round fingerprint is public.

The Reviews tab also lists Source decisions: decisions mirrored from the official ZCG minutes, with each member's published position, so the pilot's register sits beside the real one and never replaces it.

### The anchoring on Zcash

Every eligible application is preserved as a package: the proposal Markdown, its source metadata and a manifest that lists each file with a SHA-256 digest. The manifest hash identifies the revision. A worker on a server discovers applications on GitHub every five minutes (open issues labelled Grant Application and Ready For ZCG Review, with no decision label), builds the packages, batches the manifest hashes into a Merkle tree and requests an anchor.

The anchor is a shielded Sapling transaction on Zcash mainnet whose memo reads PARTICIPATE|ARCHIVE|v1|mainnet|count:N|sha256:root. The transaction is assembled as a PCZT and signed by a Zallet wallet beside a Zebra full node on a separate machine. The worker reaches that machine only through an SSH tunnel with a restricted command channel: a closed list of read and anchor actions, and no balance reads. After ten confirmations the worker verifies inclusion with a view-only reader and stores the evidence.

Today 25 proposals are anchored in one transaction, included at block 3,512,569. Open any proposal's Read & verify panel and you will find the transaction id, the manifest hash, the block height and time, the confirmations, the memo and a public viewing key. Download the package, run the verifier offline, and, with your own node and a view-only reader, check the memo on chain yourself. You do not need to trust the portal for that.

### The technologies used so far

The portal is a Next.js 16 App Router application in React 19 and TypeScript, deployed on Railway, with CSS modules over a tokenized theme. The Participate screens are the service's own components and stylesheets, copied into the portal and scoped so they share the shell without touching its cascade. Validation uses zod on both sides. Sessions live in signed JWT cookies. Email codes go out through Resend. Passkeys use WebAuthn through the SimpleWebAuthn browser library.

The participation service runs on Prisma over PostgreSQL 16. The archive worker runs under systemd timers on a virtual private server: a one minute cycle, GitHub discovery every five minutes, a monitor every two minutes with email alerts, and daily encrypted backups. Anchoring uses Zallet 0.1.0-beta.3 and a Zebra full node, with PCZT for transaction assembly and a dedicated public viewing key for verification.

Around the workspace, the portal's guide Zarvis runs on Claude Opus 5.5, and the ZCG Copilot agent skill (version 1.1.0) is published for any agent to discover under the portal's well-known agent-skills path.

### A parallel system: a DAO with sub-DAOs

The service behind Participate was not built for a single committee. It models communities and subcommunities: a DAO with sub-DAOs, where each sub-DAO has its own decentralized leaders (an owner and coordinators) and its own sustainability treasury, a scoped pool of credits. Roles, invitations, signed decisions, moderation and credit scopes already work per community. This capability is built and ready to enable. It is not live today, and nothing here changes how ZCG decides.

### What comes next

Three things, in order. First, switching the committee module from preview to operation once the reviewers have verified emails and passkeys on their own devices. Second, anchoring the signed committee receipts the same way the proposal archives are anchored, so a decision's timestamp also has a chain reference. Third, enabling the first sub-DAO on the parallel system, with its own leaders and its own sustainability treasury, so a community can run its own decisions on the same verifiable record.

Participate is an independent OpenZcash pilot. Official ZCG submissions and committee decisions follow the existing ZCG process. Try the open demo at openzcash.org/zcg/participate.
