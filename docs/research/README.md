# Research — Aro / SamAgent

Research folder for the Aro rebrand and desktop redesign — lives in-repo at `docs/research/`. Subject: **SamAgent**, a fork of Nous Research's Hermes Agent rebranded by samjuniors as the **Aro family**. The runnable prototype lives at [`prototype/`](../../prototype/).

## Index

| Doc | What it is |
|---|---|
| [01-competitive-analysis.md](01-competitive-analysis.md) | The agent-tool landscape (Codex app, Cursor, Zed, Claude Code + 8 more) — strengths, weaknesses, and UX lessons to steal for Aro Desktop. |
| [02-gap-analysis.md](02-gap-analysis.md) | Capability matrix: Aro vs Codex App vs Cursor vs Zed vs Claude Code across 13 axes; Aro's moats, gaps, and where it can win. |
| [03-redesign-plan.md](03-redesign-plan.md) | The 8-phase (P0–P7) Aro Desktop redesign plan, plus the 3 implementation options (restyle / new frontend / ACP) with a recommendation. |
| [04-rebrand-log.md](04-rebrand-log.md) | What the surface-rebrand commit `2ed2492` changed, and the remaining deep-rebrand TODO list (`~/.aro`, `aro://`, module renames, signing, update feed). |
| [05-prototype-spec.md](05-prototype-spec.md) | Spec for the first Aro Desktop prototype (Next.js 16 single route): shell, chat canvas with tool timeline, tasks board, context inspector, ⌘K palette, live AI backend. |
| [06-prototype-vs-hermes-integration.md](06-prototype-vs-hermes-integration.md) | **Current.** The attached design system (now the Aro Workbench prototype) vs. the Hermes/SamAgent codebase: capability matrix, what to port into `apps/desktop` (phases R1–R7), what to add to the prototype next (P-A…P-F). Round 2: all §5 decisions resolved and executed — Option A confirmed with **R1 shipped** (additive design-system port at `apps/desktop/src/aro/`), and **P-A…P-F shipped** in the prototype (automations, memory graph, hunk review, live-backend toggle, onboarding, artifacts). |
| [07-desktop-interaction-audit.md](07-desktop-interaction-audit.md) | **Phase 7A audit.** Compares the supplied Codex Desktop screenshots with the current Aro Desktop source and records the interaction map, persistence evidence, gaps, and proposed Phase 7B decisions. |
| [08-defects-ledger.md](08-defects-ledger.md) | Ledger of tracked defects, reproduction steps, and fixes. |
| [09-clean-machine-matrix.md](09-clean-machine-matrix.md) | Clean machine smoke matrix and testing coverage. |
| [10-backend-todo-inventory.md](10-backend-todo-inventory.md) | Backend wiring inventory and TODO resolution ledger. |
| [11-backend-wiring-specs.md](11-backend-wiring-specs.md) | Architectural and wiring specs for backend services. |
| [12-failure-matrix.md](12-failure-matrix.md) | Audio and system failure mode matrix and tests. |
| [13-v1-features-selection.md](13-v1-features-selection.md) | v1 feature scope and 5 vertical slices selection. |
| [14-slice1-diff-review-spec.md](14-slice1-diff-review-spec.md) | Slice 1: Diff-first visual review & checkpoint rollback spec. |
| [15-slice2-cost-hud-spec.md](15-slice2-cost-hud-spec.md) | Slice 2: Ambient cost HUD & proactive quota guard spec. |
| [16-slice3-tasks-board-spec.md](16-slice3-tasks-board-spec.md) | Slice 3: Parallel subagent work-graph & tasks board spec. |
| [17-slice4-browser-preview-spec.md](17-slice4-browser-preview-spec.md) | Slice 4: In-app responsive web & dev-server preview spec. |
| [18-slice5-ide-deep-link-spec.md](18-slice5-ide-deep-link-spec.md) | Slice 5: One-click IDE deep link & editor handoff spec. |
| [19-motion-language.md](19-motion-language.md) | **Phase 14.** Motion language, animation inventory, tokens contract, and frame budget. |

Brand guidelines: [`../brand/BRAND.md`](../brand/BRAND.md).

The screenshots referenced by docs 05–06 are in [`screenshots/`](screenshots/).
