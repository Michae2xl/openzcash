# X thread: Participate is now native to OpenZcash

Eleven posts, each under 270 characters. The art for each post is in `arts/`. Post the thread from the OpenZcash account; the last post carries the link.

---

**Post 1** · art `arts/01-cover.png`

Participate is now native to OpenZcash. The ZCG participation pilot moved out of its iframe and into the portal itself: same navigation, same search, same theme. What changed and how it works, in this thread.

**Post 2** · art `arts/02-what-changed.png`

What changed today: no iframe, the workspace is rendered by the portal with the data already in hand. The committee module and discussion moderation are native screens. Dark mode follows the portal's black and gold palette.

**Post 3** · art `arts/03-board-light.png`

The board lists the ZCG applications that are open on GitHub and ready for committee review, next to recent published decisions with the committee's recorded positions. Anyone can read. Sign in with an email code: no password, no wallet.

**Post 4** · art `arts/04-board-dark.png`

Dark mode. The workspace keeps its own design tokens and maps them to the portal palette, so it reads as one system with the shell.

**Post 5** · art `arts/05-read-and-verify.png`

Every eligible application is preserved as a package with a SHA-256 manifest. Open Read & verify to see the transaction id, block, memo and a public viewing key, then download the package and the verifier to check it on your own machine.

**Post 6** · art `arts/06-anchoring.png`

The anchor is a shielded Sapling transaction on Zcash mainnet. Its memo commits to a Merkle root over the manifest hashes. 25 proposals in one transaction, block 3,512,569, signed by a Zallet wallet next to a Zebra node on a separate machine.

**Post 7** · art `arts/07-committee-preview.png`

The committee module is native too: Owner, Coordinators, Reviewers and Moderators. Invitations go to a verified email; reviewers also need a passkey. In production it runs as a read-only preview today: the member system is live, review operations are not switched on.

**Post 8** · art `arts/08-committee-flow.png`

How a decision is born: invite, verify email, passkey, a coordinator opens a review, five seats sign one choice and a public reason. The result is computed only after all five verdicts. 3 of 5 approvals pass. Every decision is timestamped and recorded with a hash.

**Post 9** · art `arts/09-stack.png`

Built with Next.js 16, React 19, TypeScript, CSS modules on a tokenized theme, zod, Prisma on PostgreSQL 16, passkeys (WebAuthn), Resend email codes, signed JWT cookies, systemd timers, the GitHub API, Zallet and Zebra. Zarvis runs on Claude Opus 5.5.

**Post 10** · art `arts/10-dao-subdaos.png`

Under the hood the service models communities and subcommunities: a DAO with sub-DAOs, each with its own leaders (owner and coordinators) and its own sustainability treasury. Built and ready to enable, not live yet.

**Post 11** · no art

Try the open demo: openzcash.org/zcg/participate

An independent OpenZcash pilot. Official ZCG submissions and committee decisions follow the existing ZCG process.
