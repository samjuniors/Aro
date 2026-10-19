# Tools and skills policy

The agent may use any tool that makes the work cleaner, faster, or better evidenced. It must
prove it used it, and it must not assume a tool exists.

## Order of preference
1. Repo-local scripts and skills: `apps/desktop/scripts/`, `scripts/`, `.agent/**`, repo `skills/`.
2. The agent's built-in tools (file edit, shell, search).
3. Connected tools (MCP servers, browser automation, GitHub, doc lookup) if present in this session.
4. CLI tools via `npx --yes <package>@<exact version>` or already installed. Ask before installing
   anything globally or adding a dependency to `package.json` / `pyproject.toml`.

## Proof of use
In the Gate report, one line per tool: name, version (`--version` or lockfile), command, result.
Missing tool: write BLOCKED or use the manual fallback and say so. Never claim output you did not see.

## New dependencies
Runtime dependency needs: ADR, license check (compatible with MIT and `NOTICE`), install size
impact, maintenance status (last release, open security advisories). Dev-only tools need a one-line justification.

## Candidate tools by need (verify each exists and its current version before use)
| Need | Candidates | Evidence to save in `evidence/` |
| --- | --- | --- |
| Screenshots or video of the Electron app | Playwright's Electron support (the repo already has a Playwright e2e config: `apps/desktop/tsconfig.e2e.json`); Electron `webContents.capturePage` | PNG per state, 3 sizes; short frame strips |
| Accessibility | axe-core (via Playwright), manual keyboard pass, NVDA (Windows) or VoiceOver (macOS) pass | violations list, journey checklist |
| Performance | Chromium trace via Playwright tracing or `--remote-debugging-port`; Electron `contentTracing`; React Profiler | trace file, p95 frame time, startup ms |
| Security | Electron's official security checklist; `npm audit`; OSV-Scanner; gitleaks; Electronegativity | scanner output, checklist with pass/fail per item |
| Studying a feature in another app | Black-box use and public docs first; REA only for class A targets and only with founder approval (`FEATURE-TEARDOWN.md`) | teardown note, our own screenshots and recordings |
| Licenses and SBOM | `npm ls`, a license checker, CycloneDX generators | license table, SBOM file |
| Bundle size | the build's analyzer plugin or `vite build` output sizes | before/after table |
| Docs quality | link checker (lychee or similar), markdown lint | broken-link list |
| Web research | the agent's search/fetch; official docs first | `docs/research/NN-*.md` with URLs and dates |
| Python side | `pytest`, `ruff`, the type checker configured in `pyproject.toml` | exit codes and last lines |
| GitHub | `gh` CLI or a GitHub tool | PR/issue links |

## Two-model setups
`.agent/hermes-ui-port-RUNBOOK.md` describes a planner plus executor split. If you use one: the
planner owns `ROADMAP.md`, gate reports, and interviews; the executor owns steps and evidence.
The executor never edits a roadmap.

## Making a new skill
If the same procedure appears twice, propose `.agent/skills/<name>/SKILL.md` (what it does, inputs,
exact commands, a self-check). Ask before creating it. Skills are code: commit with a reason.
