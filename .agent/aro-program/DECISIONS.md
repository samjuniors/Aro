# Decisions index (full records: `docs/adr/NNNN-*.md`, template `docs/adr/0000-template.md`)

| ID | Decision | Status | Where |
| --- | --- | --- | --- |
| D-1 | Integration branch for all later work: merge `ui-port/aro-patches` into `ui-port/2026-10-09`, branch `aro/integration` | ACCEPTED | `docs/adr/0001-integration-branch-strategy.md` |
| D-2 | Files to remove from the tracked tree: remove/move per governance after verification | ACCEPTED | `DOCS-GOVERNANCE.md`, `docs/adr/0002-tracked-leftovers-cleanup.md` |
| D-3 | Upstream (Hermes) sync policy: security fixes only, cherry-picked on a schedule | ACCEPTED | `docs/adr/0003-upstream-sync-policy.md` |
| D-4 | Supported OS list and order for public v1: Windows, then macOS, then Linux | ACCEPTED | `docs/adr/0004-v1-platform-order.md` |
| D-5 | v1 audience posture: public beta, labeled | ACCEPTED | `docs/adr/0005-v1-audience-posture.md` |

Facts carried in from the repo (not decisions): the desktop app is `apps/desktop` (Electron);
design rules are in `apps/desktop/DESIGN.md`; the UI port, design system, and UX assembly
programs are complete (see `MASTER-ROADMAP.md`).
