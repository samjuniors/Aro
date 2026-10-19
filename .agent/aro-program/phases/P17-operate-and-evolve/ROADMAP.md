# ROADMAP P17: Operate and evolve
Branch: `aro/P17-operate` | Gate: 17.1 | Needs: P16
Goal: Aro keeps improving without chaos: a release train, a triage routine, a safe way to take upstream
security fixes, and a way for new ideas to enter the roadmap.

## Interview batch 1
1. Release cadence. A. weekly / **B. every two weeks beta, monthly stable** / C. when ready.
2. Triage SLA by severity (P0 to P3) you can actually keep.
3. Upstream sync routine (from D-3): who, how often, what is reviewed.

## Steps
- [ ] 0. Recon.
- [ ] 1. Operating handbook (`docs/operations.md`): release train, hotfix path, triage board and labels, SLA, deprecation policy, doc review cadence, how to run this program again for a new phase.
- [ ] 2. Automation: required checks, release workflow runbook, dependency update policy, stale-doc check (registry `verified` older than 90 days).
- [ ] 3. Roadmap intake: Backlog (ADRs) to a new phase `P18+` using this same kit (template in `PROGRAM.md`).
- [ ] 🛑 **GATE 17.1** handbook accepted; the program for the next release starts from a fresh `MASTER-ROADMAP.md` block.

## Exit criteria
A new contributor or a fresh agent can ship a patch release from the handbook alone.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
