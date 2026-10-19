# PROGRAM: rules for every phase

Authority order when instructions conflict: (1) the founder's latest message,
(2) this file, (3) the phase `ROADMAP.md`, (4) the phase `SKILLS.md`, (5) docs marked
ACTIVE in `DOCS-REGISTRY.md`. If two disagree and it matters, stop and ask.

## 1. Branch and tree
- Never touch `main`. Never push, merge, rebase onto upstream, or delete a branch
  unless the founder says so in the current session.
- One work branch per phase: `aro/P<nn>-<slug>`, created from the integration branch
  recorded in `DECISIONS.md` (D-1; until decided, `ui-port/2026-10-09`).
- `git status` must be clean before you start. Commit per step: `P10.3: <what>`.
- After the founder approves a gate: `git tag aro-gate/P<nn>-G<k>` on the last commit.
  Tags are how the next session knows what changed (`tools/context-pack.mjs`).

## 2. Session start and context budget
1. Read, in order: `MASTER-ROADMAP.md` (status block only), the phase `ROADMAP.md`,
   the phase `SKILLS.md`, the last 30 lines of `DECISIONS.md`.
2. Run `node .agent/aro-program/tools/context-pack.mjs` (add `--path <dir>` to scope).
   Read the diffs it ranks first, not whole files: `git diff <tag>..HEAD -- <file>`.
3. Never read: `node_modules/`, `locales/`, `website/`, lockfiles, `*.woff2`, images,
   `docs/archive/`, `.agent/aro-program/evidence/`, and the 1000-line root `AGENTS.md`
   unless a step needs a specific section (grep it, do not open it).
4. If you need more than ~25 files before your first edit, say why in one line.

## 3. Truth rules (no hallucination)
- Label every substantive claim: Verified (you ran or opened it this session, with the
  command or path), Stable knowledge, Inference, or Unknown.
- A step is `[x]` only with an `Evidence:` line: command + exit code + last lines of
  output, or a path under `evidence/`. "Looks fine" is not evidence.
- Check a file exists before citing it. Check `package.json` / lockfile before naming a
  version or API. Do not invent flags, config keys, or endpoints: read the source.
- Web claims: cite URL and the date you read it; prefer official docs, specs, source
  code. One blog is not a source. If sources conflict, say so.
- Cannot verify (no GPU, no Windows, no network, no credentials)? Write `BLOCKED:` with
  what you tried and what is needed. Never simulate a result.

## 4. Roadmap discipline
- Step numbers and gates are immutable. Status: `[ ]` todo, `[~]` in progress,
  `[x]` done, `[!]` blocked.
- Founder change requests become substeps under the step they touch (`7.a`, `7.b`),
  reopening that step to `[~]`. Fix, re-verify, re-report. The main roadmap does not move.
- New ideas go to the phase Backlog (as a proposed ADR). They are not scope.
- Behavior changes found during UI/UX work are logged as `NEEDS-BEHAVIOR` and asked as options.
- Only a founder message saying "amend roadmap" may add, remove, or reorder main steps.
  Log it in `DECISIONS.md` with the reason.

## 5. Gates
At a GATE: stop all work, then send exactly this (max 60 lines):
1. Done: steps closed, one line each, with evidence paths.
2. Verified / Not verified / BLOCKED (three short lists).
3. Attack findings: at least 3 realistic ways this fails in public use, what you tested,
   what you fixed, what remains (see section 8).
4. Risks and decisions I need from you (as options, recommended marked).
5. Check it yourself: 3 to 5 concrete actions, max 5 minutes total.
6. Next: the next steps and the next gate.
Then wait. On "continue": tag, update `MASTER-ROADMAP.md`, move on. On change requests:
substeps, fix, send "Gate <id> rework" in the same format.

## 6. Interview protocol
- Ask only the questions in the phase "Interview batch", or a blocking unknown. Max 6 per
  batch. Selectable options, each with a one-line consequence, recommended default marked.
- Record answers in `DECISIONS.md` (index) and as an ADR in `docs/adr/` using
  `docs/adr/0000-template.md` when the decision is architectural or hard to reverse.
- Never re-ask a recorded decision. "You decide" means take the marked default and log it.
- Founder questions to you ("am I right?"): answer plainly, with the strongest counter-argument.

## 7. Research protocol
Before designing anything unfamiliar: define the question, find at least 2 independent
sources (official docs, specs, source, benchmarks), write `docs/research/NN-<topic>.md`
(next free number after 07; max 60 lines: question, findings with labels, decision,
rejected options, sources with dates). For UX, study Codex Desktop, Claude Code and
desktop, Cursor, Zed, Linear, Raycast: observe behavior and principles, never copy assets,
copy, or trademarks.

## 8. Attack protocol (before every gate)
1. List the 5 most likely public-use failures for what you changed (clean machine, slow
   disk, no network, huge transcript, keyboard only, screen reader, 125%/150% scaling,
   non-English, low-end GPU, first-run, upgrade from an older build).
2. Test at least 3; fix or log each. 3. Re-read your own diff as a hostile reviewer.
4. If your tooling can start a fresh-context reviewer, give it only the diff, the acceptance
   criteria, and "find what is wrong"; report its findings unedited.

## 9. Definition of done (every step)
`npm run typecheck`, `npm run lint`, `npm run test:ui` pass from `apps/desktop` (or BLOCKED
with reason); the `no-raw-visuals` ratchet did not grow; no new console errors in the
touched flow; keyboard and reduced-motion behavior intact; docs touched are registered in
`DOCS-REGISTRY.md`; evidence saved.

## 10. Documents
Follow `DOCS-GOVERNANCE.md`. One source of truth per topic. Never leave two ACTIVE docs
that answer the same question. Supersede with a banner, archive with `git mv`, never silently delete.

## 11. Skills and tools
Follow `TOOLS-AND-SKILLS.md`. Say which you used and prove it ran (`--version` or output).

## 12. Stop immediately and ask when
Deleting tracked files not on an approved list; force-push; touching secrets, signing
keys, paid services, or production deploys; license, trademark, or brand decisions;
changing Hermes core Python without an ADR; evidence conflicts with a doc; a step needs
more than twice its estimated size.

## 13. Patch inbox
Founder-provided patches go in `.agent/aro-program/inbox/`. At session start: for each
`*.patch` in name order run `git am --3way <file>`; on success `git mv` it to
`inbox/applied/`; on failure run `git am --abort`, stop, and report the file and the
conflict. Never edit a patch. Run the step's verification after applying.

## 14. Resume after interruption
Read `MASTER-ROADMAP.md`, the last Gate report in `evidence/`, `git log -5`, then continue at
the first step not `[x]`. Do not redo closed steps.

## 15. Report hygiene
No pasted file contents. Paths with line ranges. Under 60 lines. No filler, no praise.

## 16. Phase template (for P18 and later; the founder must say "amend roadmap" to add a phase)
Create `phases/P<nn>-<slug>/` with three files. `ROADMAP.md`: header (branch, gates, needs, goal, out of scope),
Interview batch, Steps (numbered; every group of steps ends in a `🛑 GATE`), Exit criteria, and the four tail
sections (Founder change requests, NEEDS-BEHAVIOR, Backlog). `SKILLS.md`: research questions, tools to prefer,
read map, never-read list, evidence, attack focus. `START-PROMPT.md`: copy any existing one and change the slug,
branch, and read list. Then add the phase to the `MASTER-ROADMAP.md` table.

## 17. Side task: feature study
When the founder asks to study or compare a feature in another app, follow `FEATURE-TEARDOWN.md`. It is a side task:
it does not change the roadmap, it ends at its own gate, and its output goes to `docs/research/` and the Backlog.
Stop immediately and ask if: the target's authorization class is unclear; REA or any decompiler or traffic interceptor
would be run on software that is not class A; or a source or tool output would be copied into the repo.
