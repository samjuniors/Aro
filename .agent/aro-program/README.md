# aro-program

The operating system for taking Aro from "UI done" to a public, production-quality
release, one phase and one gate at a time, with an agent that stops, reports evidence,
and waits for you.

## Install (2 minutes)

1. On the integration branch: `git status` clean. Create a work branch:
   `git switch -c aro/P10-foundation`.
2. Unzip this kit at the repo root (adds `.agent/aro-program/`).
3. `git add .agent/aro-program && git commit -m "aro-program: add kit"`.
4. Paste `START.md` into your coding agent. That is the only prompt you ever need.

## Daily use

- Agent works until a GATE, then stops and sends the Gate report.
- You check the app (the report says exactly what to click, 5 minutes max).
- Reply `continue`, or list changes. Changes become substeps; the main roadmap never changes.
- `MASTER-ROADMAP.md` says where you are. Resume = paste `START.md` again.

## Files

| File | Purpose |
| --- | --- |
| `START.md` | The one prompt. Resumes at the active phase and step. |
| `PROGRAM.md` | Rules every phase obeys: truth, gates, interview, research, attack, stop conditions. |
| `MASTER-ROADMAP.md` | Phases P10-P17, gates, finish line ("public-ready"), active pointer. |
| `phases/<phase>/ROADMAP.md` | Steps, interview batch, gates for that phase. |
| `phases/<phase>/SKILLS.md` | Research questions, tools and skills to prefer, read map for that phase. |
| `phases/<phase>/START-PROMPT.md` | Same as START.md but pinned to the phase (use to jump explicitly). |
| `DOCS-GOVERNANCE.md` | One source of truth per topic; supersede / archive / reconcile rules; first proposals. |
| `TOOLS-AND-SKILLS.md` | Which tools and skills the agent may use, and how it must prove it used them. |
| `FEATURE-TEARDOWN.md` | Study a feature in another app (for example a Codex-style sidebar) and design Aro's own version on the Aro backend; optional REA use with guardrails. |
| `CONTEXT-MAP.md` | Seed map: task to files, so sessions read less. |
| `DECISIONS.md` | Index of decisions (full records are ADRs in `docs/adr/`). |
| `inbox/` | Drop `.patch` files here; the agent applies them (see PROGRAM.md section 13). |
| `tools/context-pack.mjs` | Prints only the changed and connected files since the last gate. |
| `evidence/` | Screenshots, traces, command output per gate (created by the agent). |
