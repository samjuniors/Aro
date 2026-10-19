# ROADMAP P15: Hardening (security, privacy, accessibility, performance, i18n, tests)
Branch: `aro/P15-hardening` | Gates: 15.1, 15.2, 15.3 | Needs: P11 to P14
Goal: the things that quietly end a public release are checked, fixed, and written down.

## Interview batch 1
1. Telemetry and crash reporting. **A. none by default; opt-in crash reports** / B. opt-in analytics too / C. none ever.
2. Launch languages (the repo has many locale files; shipping a locale means owning its quality). **A. English only at launch** / B. English plus the locales that already pass a completeness check / C. all.
3. Accessibility target. **A. WCAG 2.2 AA on the 10 default journeys** / B. AAA on core flows / C. best effort.
4. Reference low-end machine for budgets (specs).

## Steps
- [ ] 0. Recon and context pack.
- [ ] 1. Electron security review against the official checklist: every `BrowserWindow` and `webPreferences` (`contextIsolation`, `sandbox`, `nodeIntegration`, `webSecurity`), navigation and new-window handlers, permission handler, IPC channel validation (who can call what), protocol handlers, remote content, fuses. Note: `apps/desktop/index.html` currently has no Content-Security-Policy (verified on `81d86f11`); add one and prove nothing breaks.
- [ ] 2. Secrets and logs: no keys in repo history or logs, redaction in crash and diagnostics bundles; dependency audit (`npm audit`, OSV), license and SBOM table against `NOTICE`.
- [ ] 3. Privacy map: every network call the app makes (observe with a proxy, do not trust docs), what data goes where, opt-in status. Write the user-facing summary draft.
- [ ] 🛑 **GATE 15.1** checklist pass/fail per item, fixes, accepted risks signed by the founder.
- [ ] 4. Accessibility: automated scan plus keyboard-only plus one screen reader on the 10 journeys; contrast in all themes; focus order and return; reduced motion; 125%/150%/200% scaling.
- [ ] 5. i18n: extract-check hard-coded strings in touched screens; RTL check if an RTL locale ships (Urdu and Arabic locale files exist); date/number formats.
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
