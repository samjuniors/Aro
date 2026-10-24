# Feature teardown: learn from another app, build Aro's own (better) version on the Aro backend

Trigger: the founder says "study <feature> in <app>" (for example "the sidebar in Codex") or
"compare <feature> with ours". This is a side task, not a roadmap step: it ends at its own gate, and
its result enters the roadmap only through the Backlog and P13 (PROGRAM.md sections 4 and 17).

## 0. Authorization class (decide first; write it at the top of the note)
| Class | Software | Allowed |
| --- | --- | --- |
| A | Yours, open source, or whose license/terms explicitly allow analysis | Read source. REA is allowed (see below). |
| B | Closed software, or terms unknown | Black box only: use the app normally, public docs, release notes, your own screenshots and recordings of your own use. No decompiling, no extracting assets or strings, no intercepting someone else's service. REA is not used. |
| C | Anything that circumvents DRM, license checks, anti-cheat, or authentication; copies protected code, assets, UI copy, or trademarks; or shares provider accounts | Never. Stop and tell the founder. |

If unsure, treat it as B and ask. Moving a target from B to A is the founder's written decision (an ADR)
after the founder has read that app's license or terms. The agent does not interpret terms or give legal advice.

## 1. Intake (ask as options if missing)
Feature, app and version, the user problem it solves for Aro users, and what "better" means for Aro
(faster, clearer, more private, more capable because of the Aro backend, more keyboard-friendly).

## 2. Observe
Record, with our own evidence under `evidence/teardown/<slug>/`: states (empty, loading, populated, error,
overflow), interactions (mouse, keyboard, drag, context menu), shortcuts, persistence, speed, accessibility.
For a list or sidebar also: 500 items, long names, rapid switching, collapse and resize.

### REA (class A only, optional)
REA is an MCP server and CLI that inspects binaries, JavaScript and Electron apps, .NET assemblies, and websites
and returns findings with evidence (read from its README on 2026-10-18; `rea-agents` v6.5.0, MIT, Node 22.19+, 24.11+, or 26+).
Rules for using it:
1. The founder approves before anything is installed. REA is never added to Aro's `package.json`.
2. Prefer one-off use over setup: `npx -y rea-agents@<pinned version> analyze-javascript-application <absolute path> --json`.
   `npx rea-agents setup` edits your agent's MCP configuration (it makes backups); run it only with approval.
3. Verify the version and `--help` before use; REA changes quickly, so pin and record the version. Native analysis needs
   Hopper, Ghidra, or IDA; JavaScript and .NET inspection do not.
4. Analysis is local, but your agent's model provider receives the tool results. Do not run it on confidential material.
5. Use findings as evidence about behavior (modules, boundaries, flows). Do not paste decompiled code or recovered strings
   into the Aro repo or into docs.

## 3. Clean-room spec
Describe what the feature does in our own words: problem, flows, states, rules, edge cases, acceptance tests.
No code, no asset names, no copied UI text. If class A source or REA output was used, the implementer must be a
separate session that receives only the spec file. (Clean-room practice lowers copying risk; it is not a legal guarantee.)

## 4. Compare with Aro (read the code, do not guess)
| Capability | Other app (evidence) | Aro today (file:line) | Aro backend support | Gap |
| --- | --- | --- | --- | --- |
Backend column: what data the feature needs (sessions, projects, tasks, rules, skills, memory) and whether
`aro_bridge/protocol.md`, `port/WIRE_BASELINE.md`, or the adapters already provide it. Mark each cell Verified or Unknown.

## 5. Better version
Where Aro should beat it, using strengths verified in step 4 and the roles and motion rules in `apps/desktop/DESIGN.md`;
where Aro should match convention so users do not relearn; what to skip.

## 6. Decision
adopt / adapt / cut / later. For adopt or adapt write an ADR (`docs/adr/`), score it for P13, and add it to the Backlog.

## Teardown gate: stop and send
Authorization class and why; what was observed (evidence paths); the spec; the comparison table; the recommendation;
decisions needed as options. Output file: `docs/research/NN-teardown-<feature>.md` (next free number, max 60 lines).

## Example intake: sidebar comparison (questions only; no claims about any app until observed)
"Compare the sidebar of Codex desktop with Aro Workbench's sidebar, driven by the Aro backend."
Observe: structure (projects, threads, tasks), grouping and sorting, status indicators, search and filter, pinning,
keyboard navigation, collapse and resize, behavior with 500 items, drag and reorder, context menus, empty and error states,
what persists after restart. Aro side: find the sidebar files by grep; do not assume paths. Backend side: find what session
listing, search, and metadata the backend really exposes before promising any behavior.

## Known classifications (update when the founder decides; verify before relying)
| Target | Class | Basis |
| --- | --- | --- |
| `openai/codex` (Codex CLI, agent core, `app-server` and `mcp-server` commands) | A | Its repository README states Apache-2.0 (read 2026-10-18). Keep the license and notice conditions; this is not legal advice. |
| Codex Desktop application binary | B | Distributed as a binary; community repackagers say upstream binaries stay under OpenAI's terms (read 2026-10-18). The terms themselves were not read. Black box only, no REA. |
| Claude desktop and Claude Code, Cursor | B | Terms not read. Black box only until the founder decides otherwise. |
| Open-source editors and agents (check each repo's license first) | A after license check | Record the license and date in the note. |

A Codex-like Aro means a similar workflow and feel built on Aro's own UI and backend. It never means reproducing another
product's code, assets, text, or branding.

