# ROADMAP P12: Backend wiring and behavior
Branch: `aro/P12-backend` | Gates: 12.1, 12.2, 12.3 | Needs: P10 (P11 may run in parallel)
Goal: every `BACKEND-TODO` and `NB-` item is either truly implemented behind the existing adapters or
consciously cut; every failure state a user can hit has a designed screen and a test.
Frozen: Hermes core Python (`agent/`, `gateway/`, `tools/`, `hermes_*.py`) changes only through an ADR; prefer
`aro_bridge/` and `apps/desktop/src/adapters/`.

## Interview batch 1
1. For each area found in step 1 (the code currently has `browser-preview`, `code-search`, `rules`, `agents`, `tasks`, `onboarding-doctor`, `editors`): implement for v1 / defer / cut. Recommended defaults are proposed by the agent after step 1 with the user value of each.
2. Persistence location for UI-owned data (`conductor.workspace.v3.*` today): keep local / **move behind the backend API where one exists** / hybrid.
3. Voice: v1 scope. A. full / **B. push-to-talk only; wake word later** / C. none. (Audio hardware was BLOCKED in the audit.)

## Steps
- [x] 0. Recon and context pack.
- [x] 1. Inventory: `grep -rn "BACKEND-TODO" apps/desktop/src` with file:line, kind, user-visible effect. Reconcile against `port/RELEASE_AUDIT_REPORT.md` section 6 (which lists 4 kinds; the code had 26 markers in 7 kinds on `81d86f11`). Write `docs/research/10-backend-todo-inventory.md`, supersede the audit table.
- [x] 2. One-page spec per implement-for-v1 item: user outcome, API or bridge contract (`aro_bridge/protocol.md`, `port/WIRE_BASELINE.md`), error states, tests.
- [x] 🛑 **GATE 12.1** inventory, specs, decisions (Q1 to Q3).
- [x] 3. Slice A (max 3 items): implement, contract tests against the wire baseline, UI states, docs.
- [x] 4. Slice B (max 3 items): same.
- [x] 5. `NB-001`: batch theme attribute mutations with `requestAnimationFrame`; prove with a trace that rapid skin switching no longer re-styles twice.
- [ ] 🛑 **GATE 12.2** every v1 item works end to end (BLOCKED items listed with what is needed).
- [ ] 6. Audio capture: replace `ScriptProcessorNode` (audit finding 2; locate the file first, the path in the report may have moved).
- [ ] 7. Failure matrix: gateway down, no model or credentials, rate limit, tool error, network loss, huge output, session restore after crash. Each: designed state, copy, test.
- [ ] 🛑 **GATE 12.3** failure matrix evidence; no `BACKEND-TODO` left without an ADR or a backlog entry.

## Exit criteria
`grep BACKEND-TODO` returns only items with a linked decision; contract tests green; failure matrix complete.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
