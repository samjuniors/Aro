# Hermes UI Port: Runbook (GLM + Gemini Flash)

Human-facing guide for running the `hermes-ui-port` skill with two agents. The skill holds the rules; this file holds the order of work, the prompts to paste, and when to stop.

**Unverified assumptions.** Model names and capabilities (GLM 5.3, Gemini 3.8 Flash), and which instruction file each tool reads, were not checked. Confirm them in your tools before relying on them. The skill itself has not been run on your repo, so treat run 1 as a dry run.

---

## 0. Roles

| Agent | Owns | Never does |
|---|---|---|
| **GLM 5.3** ("Lead") | Phases 0, 1, 5. All files in `port/` (INVENTORY, WIRE_BASELINE, GLOSSARY, FEATURE_MAP, SETTINGS_MERGE, DECISIONS, PARITY_REPORT) | Bulk UI porting |
| **Gemini 3.8 Flash** ("Builder") | Phases 2, 3, 4: runtime shell, adapters, area-by-area porting | Edits GLOSSARY or DECISIONS. Marks a feature `wired` without a real backend call |
| **You** | Contract review, final build/launch/wire check, tie-break on disputed decisions | |

One agent works at a time. Never run both on the same working tree. Finish and commit a phase before switching agents.

If Flash drifts (wrong names, unverified `wired`, ignores the contract), send that area back to GLM. If GLM's contract looks thin on review, fix it before any code is written.

---

## 1. One-time setup

1. Create a branch. Your partial port is already on disk, so do not stash or reset without checking what is in it.
   ```
   git checkout -b ui-port/2026-10-09
   git add -A && git commit -m "snapshot before skill run"
   ```
2. Unzip `hermes-ui-port.skill` (it is a zip) and put the folder at `.agent/skills/hermes-ui-port/` in the repo.
3. Optional: add a pointer to the instruction file each tool reads (check each tool's docs for the name; commonly `AGENTS.md` or `GEMINI.md` at the repo root). Pointer text:
   > For the Hermes UI port, read and follow `.agent/skills/hermes-ui-port/SKILL.md`. Read `port/` contract files before touching code.
4. If a tool does not read an instruction file, paste the Session Preamble (below) at the start of every session.

### Session Preamble (paste at the start of every session)

> Read `.agent/skills/hermes-ui-port/SKILL.md` and follow it. Load its reference files only when a phase names them. We are in **resume mode**: some features are already ported. Adopt existing working code; do not rewrite it. Do not interview me. Apply the precedence rules, log each decision in `port/DECISIONS.md`, and mark anything you cannot verify as UNKNOWN. Ask me only for the skill's hard stops. Work on the current branch and commit at the end of the phase. Stop when the phase is done.

---

## 2. The run, step by step

### Step A: Discovery (GLM)
Prompt:
> [Session Preamble] Run **Phase 0 only**. Produce `port/INVENTORY.md` and `port/WIRE_BASELINE.md`. Take the wire baseline from the original Hermes UI (upstream or git history), not the half-ported tree. Classify all prototype logic as L1-L4. Check whether the Hermes backend depends on any UI-level names (DOM ids, storage keys named after components, event names). Make no code changes. Stop when done.

**You review (15 min):**
- Every wire name in `WIRE_BASELINE.md` has file and line evidence.
- Server-only usage in the prototype (API routes, server actions) is listed.
- L4 items (prototype server code) each have a proposed destination.
- UNKNOWNs are real unknowns, not laziness.

Commit: `phase 0: inventory and wire baseline`

### Step B: Contract (GLM)
Prompt:
> [Session Preamble] Run **Phase 1 only**. Produce `port/GLOSSARY.md`, `port/FEATURE_MAP.md`, `port/SETTINGS_MERGE.md`, and start `port/DECISIONS.md`. In resume mode, determine each feature's status by running it against the real backend, not from code or commit messages. Merge only high-confidence matches; list low-confidence pairs as separate features and log them. Stop when done.

**You review (the one review you must not skip):**
- No row is `wired` without a listed backend call that was actually exercised.
- Glossary entries have evidence and confidence; nothing low-confidence is merged.
- `dropped` rows: confirm each was an intentional removal on your side.
- Settings: every setting the backend reads is kept.
- `DECISIONS.md`: disagree with anything? Edit it directly, then tell GLM to redo affected rows.

Commit: `phase 1: contract`

### Step C: Runtime + adapters (Gemini Flash)
Prompt:
> [Session Preamble] Read all files in `port/` first. Run **Phases 2 and 3**. Verify the prototype launches inside Electron (skip building it if it already does; follow `references/runtime-decision.md`, log the runtime choice, run the one-screen spike). Create the adapter layer with hermes and local implementations per the contract. Do not edit `port/GLOSSARY.md` or `port/DECISIONS.md`; propose changes in your final report. Stop when done.

**You check:** app launches; one real screen makes one real backend call through an adapter.

Commit: `phase 2-3: runtime and adapters`

### Step D: Port by area (Gemini Flash, one area per session)
Order: shell/navigation first, then areas, settings last. Prompt per area:
> [Session Preamble] Read all files in `port/` first. Port the **<AREA NAME>** area only (feature ids: <list from FEATURE_MAP>). You own only these files: <list>. UI goes through adapters only. Update only the FEATURE_MAP rows for this area. Features with no backend use the local adapter with `BACKEND-TODO(<id>)` markers. Do not edit GLOSSARY or DECISIONS; report proposed changes. Run typecheck and launch the app before reporting. Report: files changed, rows updated, proposed decisions, UNKNOWNs, blockers.

After each area: read the report, spot-check one feature in the running app, commit `port: <area>`.

Hand any proposed GLOSSARY/DECISIONS changes to GLM (Step E) before they take effect.

### Step E: Contract sync (GLM, whenever Flash proposes changes or an area finishes)
> [Session Preamble] Read the Builder's report below. Apply only the proposed glossary and decision changes that the code evidence supports; reject the rest and log why. Update FEATURE_MAP statuses by exercising the features. Do not change code.

### Step F: Verification (GLM, then you)
GLM prompt:
> [Session Preamble] Run **Phase 5**. Typecheck, lint, production build, launch smoke test. Diff every wire call the new UI makes against `port/WIRE_BASELINE.md`. Walk FEATURE_MAP: exercise every `wired` and `hermes-only` row against the real backend, check every `local` row works offline and survives restart. Write `port/PARITY_REPORT.md`. Do not delete the old Hermes renderer.

**You then run yourself:** build, launch, click the main flows, and read the wire diff. Remove the old Hermes renderer only when nothing `wired` or `hermes-only` fails, in a separate commit.

---

## 3. When to stop

Stop the run, do not push the agent to continue, when:

- The agent marks a feature `wired` but cannot name the backend call it exercised.
- A wire call appears that is not in `WIRE_BASELINE.md` and is not logged as a backend change.
- The agent renames anything on the wire or in persisted storage (IPC, routes, config keys, storage keys).
- The agent edits files outside its assigned area, or deletes Hermes UI before the Phase 5 gate.
- It asks you a question that is not a hard stop (it should have decided and logged it).
- A hard stop is hit: destroying uncommitted work, missing credentials, a 50/50 merge that risks data, a license conflict.
- The Builder reports the same area failing twice. Escalate to GLM rather than retrying.
- The same kind of decision is made differently in two areas (contract inconsistency).
- Build or launch breaks and the agent's fix attempts keep changing unrelated files.

On stop: commit what is good, note the problem, and either fix the contract (GLM) or change the area assignment.

---

## 4. When to update the skill

Update the skill when the same problem shows up twice, or once if it was costly. Do not update it for a one-off mistake; fix the contract or repo instead.

| Signal | Update |
|---|---|
| Agents ask you the same non-hard-stop question twice | Add the rule that answers it to precedence rules in `SKILL.md` |
| A kind of prototype logic does not fit L1-L4 | Extend the classification in `references/phase0-discovery.md` |
| The runtime spike fails in a way the options do not cover | Add the case to `references/runtime-decision.md` |
| An agent marks things `wired` falsely | Tighten the Phase 1 and Phase 5 evidence rules in `SKILL.md` |
| Hermes upstream changes its wire surface | Re-run Phase 0 for the baseline; update the skill only if the discovery steps missed it |
| A hard stop turned out to be unnecessary, or a missing one cost you | Edit the hard-stops list |
| A contract template column was never used, or one was missing | Edit `references/contract-templates.md` |
| The port is finished | Remove project-specific assumptions or archive the skill |

**How to update (surgical):**
1. Finish and commit the current phase first. Never edit the skill mid-phase.
2. Make the smallest edit that closes the gap; leave unrelated text alone. Add the new rule next to related rules, not in a new section.
3. Put the reason in a short note at the bottom of `DECISIONS.md` (what failed, what changed).
4. Re-run only the affected phase on one area as a check before trusting the change.
5. Re-package if you share the skill (`python -m scripts.package_skill <skill-folder> <output-dir>` from the skill-creator folder), or just keep the edited folder in the repo.

Bring the failure details (the prompt, the agent's output, which rule was missing) back to me and I will make the edit.

---

## 5. Quick checklist

- [ ] Branch created, snapshot committed
- [ ] Skill folder in `.agent/skills/hermes-ui-port/`
- [ ] Step A (GLM): inventory + wire baseline → reviewed → committed
- [ ] Step B (GLM): contract → reviewed (the key review) → committed
- [ ] Step C (Flash): runtime + adapters → app launches → committed
- [ ] Step D (Flash): each area → report read → spot-check → committed
- [ ] Step E (GLM): contract synced after changes
- [ ] Step F (GLM + you): parity report, wire diff, manual run
- [ ] Old Hermes renderer removed in a separate commit, only after the gate
