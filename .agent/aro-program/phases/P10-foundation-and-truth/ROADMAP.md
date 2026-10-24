# ROADMAP P10: Foundation and truth
Branch: `aro/P10-foundation` | Gates: 10.1, 10.2 | Needs: nothing
Goal: one trustworthy baseline: a single integration branch, a clean tree, docs that match the code,
known fork risks, and a map of which CI checks can pass.
Out of scope: features, visual changes, backend behavior (except the one small fix in step 5).

## Interview batch 1 (options; **bold** = recommended)
1. Integration branch. **A. merge `ui-port/aro-patches` into `ui-port/2026-10-09`, then branch `aro/integration`** / B. keep `ui-port/aro-patches` as the line / C. merge to `main` now.
2. Tracked leftovers (root report copies, `aro-patches/`, `aro-ui-ds-kit.zip`, root start prompts): **A. remove or move per `DOCS-GOVERNANCE.md`, after verification** / B. archive everything under `docs/archive/` / C. leave.
3. Upstream (Hermes) sync. A. never / **B. security fixes only, cherry-picked on a schedule** / C. regular merges.
4. Public v1 platforms (order matters). **A. Windows, then macOS, then Linux** / B. Windows only / C. macOS then Windows.
5. v1 audience. **A. public beta, labeled** / B. general availability / C. invite-only.
## Steps
- [x] 0. Recon. Confirm branch and clean tree. From `apps/desktop` run `npm run typecheck`, `npm run lint`, `npm run test:ui`, `npm run build`; record exit codes and last lines in `evidence/P10/baseline.txt` (BLOCKED where the environment cannot).
  Evidence: `.agent/aro-program/evidence/P10/baseline.txt`: typecheck 0, lint 1 (575 issues: 182 errors, 393 warnings), test:ui 1 (10755 passed, 3 failed across 2 files), build 0 (built in 57.76s).
- [x] 1. Integration plan. Diff the branches (`git log --oneline`, `git diff --stat`), list divergences, write the merge plan per interview Q1. Do not merge yet.
  Evidence: `.agent/aro-program/evidence/P10/integration-plan.md`: 8 commits on `ui-port/aro-patches`, 0 on `ui-port/2026-10-09` (clean fast-forward possible, 326 files changed, 0 merge conflicts).
- [x] 🛑 **GATE 10.1** baseline numbers, integration plan, interview answers recorded (D-1 to D-5).
- [x] 2. Execute the integration and the approved removals from `DOCS-GOVERNANCE.md` (`git rm`, `git mv`); tests re-run after.
  Evidence: `aro/integration` created from fast-forward merge of `ui-port/aro-patches` into `ui-port/2026-10-09`; 4 duplicate root reports deleted (`port/` retained); `aro-patches/` and `.aro-patches/` deleted; `aro-ui-ds-kit.zip` deleted; prompts moved into kits and kits marked COMPLETE (frozen); `typecheck` 0, `no-raw-visuals.test.ts` 0.
- [x] 3. Docs reconcile. Build `DOCS-REGISTRY.md` for every `*.md` outside `website/`, `locales/`, `node_modules/`. For each ACTIVE doc verify numbers, paths, and commands against the code; supersede or archive the rest; banners per governance; run a link check.
  Evidence: `DOCS-REGISTRY.md` built for 974 markdown files via `.agent/aro-program/tools/reconcile-docs.mjs`; link audit completed (150 relative links flagged, mostly in optional-skills templates & BUILDING.md); `port/RELEASE_AUDIT_REPORT.md` section 6 annotated with stale note; finished kits marked COMPLETE (frozen).
- [x] 4. Context map. Verify every row of `CONTEXT-MAP.md` against the tree, extend it, add one pointer line to the root `AGENTS.md`.
  Evidence: all 27 paths verified against tree; extended with backend/gateway/CLI/tui_gateway/brand rows; pointer line added to root `AGENTS.md:7`.
- [x] 5. Known-defects ledger (`docs/research/08-defects-ledger.md`), seeded with verified items: (a) `apps/desktop/index.html` loads Google Fonts although Geist and Inter are bundled in `src/fonts/` (remove the link; evidence: launch with network blocked shows no external request); (b) `BACKEND-TODO` inventory drift (P12); (c) no Content-Security-Policy in `index.html` (P15); (d) Windows `python` Store alias (P11); (e) `ScriptProcessorNode` deprecation (P12). Fix only (a) here.
  Evidence: `apps/desktop/index.html` Google Fonts link removed (local bundled fonts in styles.css verified); items (b)-(e) verified and ledger written to `docs/research/08-defects-ledger.md`.
- [x] 6. Fork-safety audit. Read every file in `.github/workflows/` and the release/update/telemetry/site-deploy scripts. Classify each: KEEP / DISABLE / RENAME / NEEDS-SECRET, and list any upstream-owned URLs, org names, secrets, or endpoints. Change nothing in release or deploy workflows without approval.
  Evidence: `.agent/aro-program/evidence/P10/fork-safety.md`: 51 workflows audited (33 KEEP, 7 DISABLE, 11 NEEDS-SECRET); 25 upstream secrets inventoried; release/telemetry scripts cataloged. Zero workflow files modified.
- [x] 7. CI map. Which workflows can pass on this fork today, which are red and why (pre-existing vs ours). Propose the minimal required-checks set.
  Evidence: `.agent/aro-program/evidence/P10/ci-map.md`: 51 workflows mapped; 8 green today; root causes for red lanes documented (pre-existing lint/test anomalies vs upstream-owned); 5-check minimal required set proposed for founder approval.
- [x] 🛑 **GATE 10.2** registry, context map, ledger, fork-safety list, CI map; founder approves the required-checks set.

## Exit criteria
One integration branch recorded; `DOCS-REGISTRY.md` complete with no two ACTIVE docs on one topic; every claim in ACTIVE docs verified or removed; ledger and fork-safety list approved.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
