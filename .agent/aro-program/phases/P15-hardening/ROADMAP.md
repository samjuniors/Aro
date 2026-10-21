# ROADMAP P15: Hardening (security, privacy, accessibility, performance, i18n, tests)
Branch: `aro/P15-hardening` | Gates: 15.1, 15.2, 15.3 | Needs: P11 to P14
Goal: the things that quietly end a public release are checked, fixed, and written down.

## Interview batch 1 (Decisions recorded 2026-10-21)
1. Telemetry and crash reporting: **A. None by default; opt-in crash reports** (ADR 0012, Decision D-12)
2. Launch languages: **A. English only at launch** (ADR 0014, Decision D-14)
3. Accessibility target: **A. WCAG 2.2 AA on the 10 default journeys** (ADR 0015, Decision D-15)
4. Reference low-end machine for budgets: **A. 4-core CPU, 8 GB RAM, integrated GPU (Intel UHD 620 baseline)** (ADR 0016, Decision D-16)

## Steps
- [x] 0. Recon and context pack.
- [x] 1. Electron security review against official checklist: `webPreferences` (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`), `will-attach-webview` prevention, IPC frame sender validation in `aro-ipc.ts`, electronFuses, and CSP meta tag added to `apps/desktop/index.html` (`apps/desktop/electron/aro-security.test.ts`).
- [x] 2. Secrets and logs: no secrets committed, redactions expanded in `ssh-connection.ts` with Aro tokens & LLM API key regexes, `npm audit` dependency scan, and license audit against `NOTICE`.
- [x] 3. Privacy map: documented all network calls, data flows, and authored user-facing privacy statement draft in `docs/research/21-privacy-network-map.md`.
- [ ] 🛑 **GATE 15.1** checklist pass/fail per item, fixes, accepted risks signed by the founder.
- [x] 4. Accessibility: automated scan plus keyboard-only plus one screen reader on the 10 journeys; contrast in all 6 themes; focus visible rings; reduced motion; 125%/150%/200% scaling (`apps/desktop/src/aro/accessibility-journeys.test.tsx`).
- [x] 5. i18n: verified catalog extract sync via `scripts/i18n-keys.mjs --check` against committed `locales/_keys.desktop.json`; verified standard `Intl` date/number formatters; English-only launch confirmed per ADR 0014 (Decision D-14).
- [ ] 🛑 **GATE 15.2** accessibility and i18n evidence.
- [ ] 6. Performance budgets (agreed numbers): cold start to interactive, memory idle and after 1 hour, 5,000-message transcript scroll, 3 panes streaming. Profile, fix the top 3, re-measure.
- [ ] 7. Test pyramid: which flows are covered by unit, integration, e2e; add e2e for the 10 journeys; flake policy; required checks from P10 wired.
- [ ] 🛑 **GATE 15.3** budgets met or consciously waived in writing; e2e green in CI.

## Exit criteria
Security checklist complete; privacy map matches code; AA on journeys; budgets met; e2e in CI.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
