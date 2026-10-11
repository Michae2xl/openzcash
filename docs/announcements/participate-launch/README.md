# Participate launch: announcement package

Content package for the announcement of the native Participate workspace on OpenZcash. Everything public is in English. Nothing here is published automatically; the X account posts it.

| Piece                  | File                                                           | Use                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Video prompt           | [video-prompt.md](video-prompt.md)                             | One-shot 30 second video for an AI generator: six beats, art direction, a short prompt under 1000 characters and a caption.                   |
| Long article           | [x-article.md](x-article.md)                                   | X article, about 1200 words: what Participate is, demo and committee, how a decision is born, anchoring, stack, DAO and sub-DAOs, next steps. |
| Thread                 | [x-thread.md](x-thread.md)                                     | Eleven posts under 270 characters each, with the art for each post and the link in the last one.                                              |
| Public overview        | [participate-pilot-overview.md](participate-pilot-overview.md) | "How the Participate pilot works today": who can use what, committee flow, moderation, anchoring, technologies, known limits, roadmap.        |
| Anchoring architecture | [anchoring-architecture.md](anchoring-architecture.md)         | Conceptual architecture of the Zcash anchoring with a Mermaid diagram. No hosts, ports or key locations.                                      |
| Arts                   | [arts/](arts/)                                                 | 1600 by 900 PNGs for the thread, numbered in posting order.                                                                                   |

## Arts

| File                            | Content                                                                         | Origin                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `arts/01-cover.png`             | Participate is now native to OpenZcash                                          | Illustrated                                                                                           |
| `arts/02-what-changed.png`      | No iframe, native committee, moderation, dark mode                              | Illustrated                                                                                           |
| `arts/03-board-light.png`       | The proposal board in production, light                                         | Real capture of `openzcash.org/zcg/participate`                                                       |
| `arts/04-board-dark.png`        | The proposal board in production, dark                                          | Real capture, `oz-theme` set to `dark`                                                                |
| `arts/05-read-and-verify.png`   | The Read & verify panel of a proposal with the on-chain evidence                | Real capture of a production record                                                                   |
| `arts/06-anchoring.png`         | Anchoring flow, memo, block and policy                                          | Illustrated                                                                                           |
| `arts/07-committee-preview.png` | The committee workspace (Reviews tab, Decision panel)                           | Rendered from `CommitteeWorkspacePanel` in a local harness with sample seats, read-only preview state |
| `arts/08-committee-flow.png`    | Invite, verify email, passkey, review opened, verdicts, decision with timestamp | Illustrated                                                                                           |
| `arts/09-stack.png`             | Technologies used so far                                                        | Illustrated                                                                                           |
| `arts/10-dao-subdaos.png`       | A DAO with sub-DAOs, leaders and sustainability treasuries                      | Illustrated                                                                                           |

`arts/captures/` keeps the raw production and harness captures (board, Read & verify in both themes, committee tabs in both themes). `arts/src/` holds the HTML sources of the illustrated arts and `render.mjs`, which renders them with Playwright Chromium at 1600 by 900. The illustrated arts use the theme tokens of `src/app/theme.css`, the self-hosted Inter and Geist Mono files and the Zcash mark from `public/`.

The committee capture uses sample seat names ("Seat 1 · Owner" and so on), not real people, and shows the module exactly as it runs in production: a read-only preview with the member system in force.

## Rules followed

- English for everything public; no em dashes; no judgement of proposal amounts; no server names, hostnames, ports or key paths.
- Arts: flat blocks in the portal style, black and gold, no gradients, glow or particles, no dates inside the images.
- Numbers come from the live portal API and the repository: 25 anchored proposals, block 3,512,569, 10 confirmations, quorum 5, approval 60 percent, 548 recorded ZCG verdicts.
