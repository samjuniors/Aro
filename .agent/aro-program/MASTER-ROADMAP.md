# MASTER ROADMAP: Aro to public release

```
Active phase: P12-backend-wiring-behavior
Active step: 4
Last gate tag: aro-gate/P12-G12.1
Integration branch: aro/integration (per D-1)
```

## Where we start (read from the repo on branch `ui-port/aro-patches` @ `81d86f11`, 2026-10-18)
- Phases 0-7 (UI port to parity): done. `port/PARITY_REPORT.md` status PASSED; `port/RELEASE_AUDIT_REPORT.md`
  says CONDITIONAL ACCEPTANCE (ready for packaging/staging).
- Phase 8 (design system) and Phase 9 (UX assembly): every step and gate marked `[x]` in
  `.agent/aro-design-system/ROADMAP.md` and `.agent/aro-ux-assembly/ROADMAP.md`.
- Known open items carried in: `port/RELEASE_AUDIT_REPORT.md` findings 1-2 and plan P1-P3,
  26 `BACKEND-TODO` markers in 7 areas, `NB-001` in the UX roadmap.

## Phases

| Phase | Outcome | Gates | Needs |
| --- | --- | --- | --- |
| P10 foundation-and-truth | One clean integration branch, docs that match code, fork risks listed, CI map | 10.1, 10.2 | none |
| P11 runtime-install-packaging | Installs and first-runs on a clean machine; signed-ready packages; safe upgrade/uninstall | 11.1, 11.2, 11.3 | P10 |
| P12 backend-wiring-behavior | Every `BACKEND-TODO` and `NB-` item implemented or cut; failure states handled | 12.1, 12.2, 12.3 | P10 |
| P13 features | The v1 feature set (max 5) specified, built, verified in slices | 13.1, then one per slice | P11, P12 |
| P14 motion-and-interaction | A motion language and the hero moments, inside a performance budget | 14.1, 14.2, 14.3 | P12 |
| P15 hardening | Security, privacy, accessibility, performance, i18n, test pyramid signed off | 15.1, 15.2, 15.3 | P11-P14 |
| P16 release-and-launch | Signing, update path, brand/legal clear, beta run, go/no-go | 16.1, 16.2, 16.3 | P15 |
| P17 operate-and-evolve | Release train, triage, upstream-sync cadence, roadmap intake | 17.1 | P16 |

P11 and P12 may run in either order; P14 may start once P12.1 is approved. Order is
fixed otherwise. Frontend/UI work lives in P13-P14 (and finished P8-P9); backend in P11-P12.

## Finish line: "public-ready" (all must be true; each is checked at P16.3)
1. Clean-machine install and first run succeed on every supported OS in under 10 minutes,
   including a run with no network.
2. No open P0/P1 defects; typecheck, lint, unit, e2e green in CI on the release commit.
3. Security checklist (P15.1) signed off; no secrets in repo or logs.
4. Nothing leaves the device without opt-in; privacy policy matches what the code does.
5. Accessibility: WCAG 2.2 AA on the 10 default journeys, keyboard-only and one screen reader.
6. Performance budgets (P15.3) met on the reference low-end machine.
7. Signed, notarized (where applicable) installers; update path and rollback tested.
8. Brand, trademark, attribution, and font/asset licenses cleared (founder decision).
9. Docs, support channel, and known-issues page exist and are true.
10. Beta feedback loop closed: top issues fixed or consciously deferred in writing.
11. Upstream-sync and security-patch policy decided and written (ADR).

## Phase history log (append one line per approved gate)
- P10-G10.1: 2026-10-19 — baseline recon, integration plan, decisions D-1..D-5 recorded (tag aro-gate/P10-G10.1)
- P10-G10.2: 2026-10-19 — registry, context map, ledger, fork-safety audit, CI map (tag aro-gate/P10-G10.2)
- P11-G11.1: 2026-10-19 — packaging recon, clean-machine smoke matrix, runtime spike ADR (tag aro-gate/P11-G11.1)
- P11-G11.2: 2026-10-19 — installers built, install smoke green on host, clean-machine pass (tag aro-gate/P11-G11.2)
- P11-G11.3: 2026-10-19 — failure matrix, uninstall/upgrade tests, updater ADR D-9 (tag aro-gate/P11-G11.3)
- P12-G12.1: 2026-10-19 — inventory, specs, decisions D-10..D-11 recorded (tag aro-gate/P12-G12.1)
