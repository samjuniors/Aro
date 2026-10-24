# Decisions index (full records: `docs/adr/NNNN-*.md`, template `docs/adr/0000-template.md`)

| ID | Decision | Status | Where |
| --- | --- | --- | --- |
| D-1 | Integration branch for all later work: merge `ui-port/aro-patches` into `ui-port/2026-10-09`, branch `aro/integration` | ACCEPTED | `docs/adr/0001-integration-branch-strategy.md` |
| D-2 | Files to remove from the tracked tree: remove/move per governance after verification | ACCEPTED | `DOCS-GOVERNANCE.md`, `docs/adr/0002-tracked-leftovers-cleanup.md` |
| D-3 | Upstream (Hermes) sync policy: security fixes only, cherry-picked on a schedule | ACCEPTED | `docs/adr/0003-upstream-sync-policy.md` |
| D-4 | Supported OS list and order for public v1: Windows, then macOS, then Linux | ACCEPTED | `docs/adr/0004-v1-platform-order.md` |
| D-5 | v1 audience posture: public beta, labeled | ACCEPTED | `docs/adr/0005-v1-audience-posture.md` |
| D-6 | Data directory: new `.aro` directory with one-time copy migration from `.hermes` | ACCEPTED | `docs/adr/0006-data-directory-migration.md` |
| D-7 | Update model at v1: auto-update on stable channel with opt-out | ACCEPTED | `docs/adr/0007-v1-auto-update-model.md` |
| D-8 | Backend runtime model: tiered bundled/managed runtime with Windows Store alias defense | ACCEPTED | `docs/adr/0008-backend-runtime-model.md` |
| D-9 | Desktop updater design: channels, cryptographic signatures, atomic staging, and rollback | ACCEPTED | `docs/adr/0009-updater-design-channels-signatures-rollback.md` |
| D-10 | Persistence location for UI-owned data: hybrid model (on-disk `.aro/` + live JSON-RPC session stream + optimistic localStorage cache) | ACCEPTED | `docs/adr/0010-ui-data-persistence-hybrid.md` |
| D-11 | Voice assistant v1 scope: push-to-talk (PTT) only; wake word deferred post-v1; replace ScriptProcessorNode with Web Audio API | ACCEPTED | `docs/adr/0011-voice-v1-scope-push-to-talk.md` |
| D-12 | Telemetry posture at v1: none; qualitative beta feedback only | ACCEPTED | `docs/adr/0012-telemetry-posture-none.md` |
| D-13 | v1 feature scope: 5 vertical slices (Diff Review, Cost HUD, Tasks Board, Browser Preview, IDE Deep Link) | ACCEPTED | `docs/adr/0013-v1-features-shortlist.md` |
| D-14 | Launch languages scope at v1: English (en-US) only; other locales deferred post-v1 | ACCEPTED | `docs/adr/0014-v1-launch-languages-en-only.md` |
| D-15 | Accessibility target: WCAG 2.2 AA across the 10 default user journeys | ACCEPTED | `docs/adr/0015-accessibility-target-wcag-22-aa.md` |
| D-16 | Reference low-end machine baseline: 4-core CPU, 8 GB RAM, integrated GPU (Intel UHD 620 baseline) | ACCEPTED | `docs/adr/0016-reference-hardware-baseline.md` |
| D-17 | Brand and naming: "Aro" (Aro Desktop / Aro Agent by samjuniors) with MIT attribution to Nous Research in NOTICE | ACCEPTED | `NOTICE`, `docs/brand/BRAND.md` |
| D-18 | Code signing strategy: developer/test certs for dry-runs; production ATS & Apple Developer ID keys via CI secrets | ACCEPTED | `docs/adr/0017-release-channels-and-signing.md` |
| D-19 | Release update channels: 3 channels (canary, beta, stable) with atomic staging and rollback | ACCEPTED | `docs/adr/0017-release-channels-and-signing.md` |
| D-20 | Distribution and support: GitHub Releases feed for assets, GitHub Issues & Discussions for support | ACCEPTED | `docs/adr/0018-beta-program-and-support.md` |
| D-21 | Closed beta cohort: 25-50 users, 2-week closed testing; success = 0 fatal crashers & >=80% journey completion | ACCEPTED | `docs/adr/0018-beta-program-and-support.md` |
| D-22 | Release train cadence: bi-weekly beta releases, monthly stable releases | ACCEPTED | `docs/adr/0019-release-cadence-and-channels.md` |
| D-23 | Operational triage SLAs by severity: P0 < 12h, P1 < 24h, P2 < 48h, P3 within 1 release cycle | ACCEPTED | `docs/adr/0020-triage-sla-and-severity.md` |
| D-24 | Upstream (Hermes) security sync routine: automated pre-screening bi-weekly, founder review & cherry-pick | ACCEPTED | `docs/adr/0021-upstream-security-sync-routine.md` |

Facts carried in from the repo (not decisions): the desktop app is `apps/desktop` (Electron);
design rules are in `apps/desktop/DESIGN.md`; the UI port, design system, and UX assembly
programs are complete (see `MASTER-ROADMAP.md`).
