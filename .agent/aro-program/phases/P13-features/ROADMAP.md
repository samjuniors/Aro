# ROADMAP P13: Features (v1 scope, then vertical slices)
Branch: `aro/P13-features` (one sub-branch per slice) | Gates: 13.1, then 13.S1, 13.S2, ... | Needs: P11, P12
Goal: the smallest feature set that makes Aro worth installing, each shipped as a complete vertical slice.
Rule: at most 5 features in v1, one slice active at a time.

## Interview batch 1
1. Your own feature ideas, in your words (free text; the agent turns them into candidates).
2. For each candidate in the shortlist: v1 / later / cut (options with the agent's one-line reasoning).
3. Telemetry for measuring success: **A. none, qualitative beta feedback only** / B. opt-in anonymous counts / C. opt-out.
4. Who is the first user (role, task, tool they use today)? Options proposed from `docs/research/01-competitive-analysis.md`.

## Steps
- [x] 0. Recon and context pack.
- [x] 1. Long list: `port/FEATURE_MAP.md` ("Prototype-only features" and "Unknowns"), `docs/research/01` to `03`, founder ideas. Each item: user problem, who, how they solve it today.
- [x] 2. Score with a lightweight rubric (reach, impact, confidence, effort, risk) and propose the shortlist of at most 5. Show the table.
- [ ] 🛑 **GATE 13.1** v1 feature scope approved. Slices are appended below as `13.S<n>` from the shortlist (an allowed roadmap addition at this gate).
- [ ] Slice template (copy per feature): **a.** spec (problem, flow, all states, copy, accessibility, success measure, acceptance tests) / **b.** design from the kit with a gallery fixture / **c.** build behind a flag / **d.** verify on the 10 default journeys plus the new one / **e.** docs, registry, flag removal plan. 🛑 **GATE 13.S<n>**.

## Exit criteria
Every v1 feature passes its acceptance tests, ships without a flag, and is documented; cut items are in the backlog with reasons.

## Founder change requests (substeps go in the step above; never renumber)
_none yet_

## NEEDS-BEHAVIOR (asked as options; not implemented without a decision)
_none yet_

## Backlog (proposed ADRs, not scope)
_none yet_
