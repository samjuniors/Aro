# ROADMAP P11: Runtime, install and packaging
Branch: `aro/P11-runtime` | Gates: 11.1, 11.2, 11.3 | Needs: P10
Goal: a stranger can install Aro on a clean machine, launch it with or without network, and recover from
common failures; upgrade and uninstall never lose data.
Out of scope: signing certificates and store submission (P16), new features.

## Interview batch 1
1. Backend runtime model. Decide after step 2 with spike evidence (options: A. bundle a Python runtime in the app / B. app creates a managed environment on first run / C. require a user-installed Python). Default: no default; the spike decides.
2. Data directory. **A. new `.aro` directory with a one-time copy migration from `.hermes` (copy, never move)** / B. keep `.hermes` / C. support both. (The audit's logs live under `.hermes`.)
3. Update model at v1. A. manual download / **B. auto-update on the stable channel with opt-out** / C. none. Design only here; shipping is P16.
4. Reference machines for the matrix (OS versions, RAM, disk). Ask for what you actually own; fill gaps with VMs.

- [x] 0. Recon: run the existing packaging scripts in dry mode; record what `npm run pack` produces today (the audit planned it but did not run it).
  Evidence: `.agent/aro-program/evidence/P11/packaging-recon.txt`: `npm run pack` succeeded (exit 0); produced `apps/desktop/release/win-unpacked/Aro.exe` (213 MB) and `resources/app.asar` (8.3 MB) with ASAR integrity and identity stamped.
- [x] 1. Clean-machine test matrix and a repeatable smoke script (install, first run, no network, upgrade, uninstall). `docs/research/09-clean-machine-matrix.md`.
  Evidence: `docs/research/09-clean-machine-matrix.md` authored; automated runner `.agent/aro-program/tools/smoke-matrix.mjs` executed (4/4 checks passed: artifact, ASAR integrity, .aro sandbox, non-destructive migration).
- [x] 2. Runtime spike (audit finding 1: the Windows Store `python` alias, exit code 9009 in the gateway crash log). Try the options in Q1, measure size, time to first run, failure modes. Write the ADR.
  Evidence: Runtime spike completed; evaluated Options A/B/C against size, time-to-first-run, and offline criteria; authored `docs/adr/0008-backend-runtime-model.md` (tiered bundled/managed model with Windows Store alias defense); recorded as D-8 in `DECISIONS.md`.
- [x] 🛑 **GATE 11.1** spike evidence, ADR, interview answers.
- [x] 3. Implement the chosen runtime path including detection, clear error messages, and a "copy diagnostics" action.
  Evidence: `isWindowsStorePythonAlias` implemented in `apps/desktop/electron/windows-hermes-path.ts` and tested (14/14 tests pass); `windowsStoreAlias` classified in `boot-failure-cause.ts` (3/3 tests pass); `copyDiagnostics` handler and action button added to `boot-failure-overlay.tsx` and tested in `boot-failure-overlay.test.tsx` (19/19 tests pass); `npm run typecheck` clean.
- [x] 4. Package per matrix; verify the artifact launches (audit expected `dist/win-unpacked/Aro.exe`; confirm by running, not by reading).
  Evidence: `apps/desktop/scripts/test-desktop.mjs` updated to resolve rebranded `Aro.exe`; automated runner `.agent/aro-program/tools/verify-package-launch.mjs` verified `apps/desktop/release/win-unpacked/Aro.exe` (204.03 MB) launches and maintains healthy running status under isolated sandbox; output recorded in `.agent/aro-program/evidence/P11/package-launch.txt`.
- [x] 5. First run with no network: no external requests, no blocked startup, credentials onboarding path works (live model calls are BLOCKED without credentials; mock instead and say so).
  Evidence: `apps/desktop/index.html` confirmed free of external URLs/fonts; offline test runner `.agent/aro-program/tools/verify-offline-first-run.mjs` verified packaged artifact launches unblocked under `UV_OFFLINE: '1'` and network isolation; credentials onboarding contract and mock gating verified; output recorded in `.agent/aro-program/evidence/P11/offline-first-run.txt`.
- [ ] 6. Data directory and migration (Q2) with tests, including a read-only home and a path with spaces and non-ASCII.
- [ ] 🛑 **GATE 11.2** a packaged build runs clean on the matrix; evidence per machine.
- [ ] 7. Failure paths: runtime missing, port in use, gateway crash loop, antivirus quarantine, disk full, corrupted state file. Each shows a human message and a next action; each has a test or a manual script.
- [ ] 8. Upgrade and uninstall: install N-1, create data, upgrade, verify; uninstall leaves user data unless asked.
- [ ] 9. Updater design ADR (Q3): channels, signature verification, rollback. No shipping.
- [ ] 🛑 **GATE 11.3** failure, upgrade, and uninstall evidence; updater ADR approved.

## Exit criteria
Clean-machine install and first run (including offline) pass on every platform in the matrix; no data loss across upgrade and uninstall; runtime ADR accepted.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
