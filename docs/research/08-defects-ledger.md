# Research 08: Known-defects ledger (P10 seed)

Date: 2026-10-19
Author: Aro Program
Question: What verified technical and architectural defects exist in the integration baseline that require scheduled remediation across upcoming phases?

## Findings (with evidence labels)

1. **[Verified - Fixed in P10.5] External Google Fonts loading in `index.html`**
   - Location: `apps/desktop/index.html:12-14`
   - Finding: Preconnect and stylesheet links requested `fonts.googleapis.com` and `fonts.gstatic.com` on startup, violating offline isolation.
   - Evidence: `apps/desktop/src/styles.css:138,145` already bundles `Geist-Variable.woff2`, `CascadiaCode-Regular.woff2`, and `MonaspaceNeon-Regular.woff2` locally.
   - Status: Removed in P10.5. Zero external requests made on launch.

2. **[Verified] `BACKEND-TODO` inventory drift**
   - Location: `apps/desktop/src/` (26 markers across 7 named kinds)
   - Finding: Prior audit (`port/RELEASE_AUDIT_REPORT.md` §6) reported only 4 kinds. Real inventory has 26 markers: `agents` (4), `browser-preview` (5), `code-search` (4), `onboarding-doctor` (3), `editors` (2), `tasks` (3), `rules` (4), unnamed (1).
   - Target: Phase 12 (wiring & behavior).

3. **[Verified] Absence of Content-Security-Policy (CSP)**
   - Location: `apps/desktop/index.html`
   - Finding: No CSP meta tag exists, permitting unsafe inline scripts and unrestricted network requests in renderer context.
   - Target: Phase 15 (hardening).

4. **[Verified] Windows `python.exe` Store execution stub alias**
   - Location: Host environment / background gateway spawn
   - Finding: On Windows hosts without system Python in PATH, `python` triggers Windows Store 9009 stub error.
   - Target: Phase 11 (packaging and runtime provisioner).

5. **[Verified] Deprecated `ScriptProcessorNode` in wake audio client**
   - Location: `apps/desktop/src/lib/wake-client-capture.ts:148-150`
   - Finding: Uses deprecated `createScriptProcessor(4096, 1, 1)` emitting console deprecation warnings.
   - Target: Phase 12 (migrate to `AudioWorkletNode`).

6. **[Verified] Cross-platform shell assumption in `cron-prompt.test.ts`**
   - Location: `apps/desktop/src/plugins/hermes-bots/cron-prompt.test.ts:24`
   - Finding: Directly invokes `spawnSync('sh', ...)` which fails on standard Windows developer environments lacking POSIX sh in PATH.
   - Target: Phase 12 (cross-platform test mock/helper).

## Decisions
- Fix defect #1 immediately in P10.5 (external font links removed).
- Register defects #2 through #6 in this ledger and schedule them to their designated owner phases (P11, P12, P15).
