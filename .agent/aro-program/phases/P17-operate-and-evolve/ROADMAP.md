# ROADMAP P17: Operate and evolve
Branch: `aro/P17-operate` | Gate: 17.1 | Needs: P16
Goal: Aro keeps improving without chaos: a release train, a triage routine, a safe way to take upstream
security fixes, and a way for new ideas to enter the roadmap.

## Interview batch 1 (Decisions recorded 2026-10-21)
1. Release cadence: **B. every two weeks beta, monthly stable** (ADR 0019, Decision D-22).
2. Triage SLA by severity: **P0 < 12h (hotfix), P1 < 24h, P2 < 48h, P3 within 1 release cycle** (ADR 0020, Decision D-23).
3. Upstream sync routine: **Automated agent pre-screens CVEs & security commits bi-weekly; founder reviews and cherry-picks onto hotfix/release branches** (ADR 0021, Decision D-24).

## Steps
- [x] 0. Recon.
- [x] 1. Operating handbook (`docs/operations.md`): release train, hotfix path, triage board and labels, SLA, deprecation policy, doc review cadence, how to run this program again for a new phase.
- [x] 2. Automation: required checks, release workflow runbook, dependency update policy, stale-doc check (registry `verified` older than 90 days).
- [x] 3. Roadmap intake: Backlog (ADRs) to a new phase `P18+` using this same kit (template in `PROGRAM.md`).
- [x] 🛑 **GATE 17.1** handbook accepted; the program for the next release starts from a fresh `MASTER-ROADMAP.md` block.

## Exit criteria
A new contributor or a fresh agent can ship a patch release from the handbook alone.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
