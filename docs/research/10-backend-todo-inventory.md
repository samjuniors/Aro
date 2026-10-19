# Research 10: Backend-TODO Inventory & Reconciliation

Date: 2026-10-19
Author: Aro Program (Phase 12, Step 1)
Status: Complete — Supersedes `port/RELEASE_AUDIT_REPORT.md` §6

## 1. Executive Summary

During the initial port audit, `port/RELEASE_AUDIT_REPORT.md` §6 listed 4 limitation categories (`rules`, `agents`, `onboarding-doctor`, `tasks`). An exhaustive grep across `apps/desktop/src/` on branch `aro/P12-backend` confirms **26 active `BACKEND-TODO` markers** across **7 distinct functional kinds**:

1. `browser-preview` (5 markers)
2. `code-search` (4 markers)
3. `rules` (4 markers)
4. `agents` (4 markers)
5. `tasks` (3 markers)
6. `onboarding-doctor` (3 markers)
7. `editors` (2 markers)
Plus 1 architectural summary reference in `adapters/index.ts:33`.

All 26 markers are cleanly encapsulated behind the adapter pattern (`apps/desktop/src/adapters/`). The UI functions smoothly in a local-first capacity, storing client-side state in `localStorage` under `conductor.workspace.v3.*` or querying renderer-accessible properties.

---

## 2. Complete Inventory Ledger (26 Markers)

| # | File:Line | Kind | Current Behavior | User-Visible Effect | Proposed v1 Disposition |
|---|---|---|---|---|---|
| 1 | `adapters/agents.ts:153` | `agents` | Local storage `conductor.workspace.v3.agents` | Custom agents saved locally in browser | **Implement** behind bridge |
| 2 | `adapters/agents.ts:190` | `agents` | Seed catalog merged with local registrations | Agent roster shows presets + local agents | **Implement** behind bridge |
| 3 | `adapters/index.ts:50` | `agents` | Interface contract docstring | Developer clarity | Documented |
| 4 | `aro/AgentsView.tsx:50` | `agents` | UI calls `adapters.agents` | Agent card management interface | **Implement** |
| 5 | `adapters/browser-preview.ts:99` | `browser-preview` | Local URL tab strip & viewport state | User can open and view local web links | **Implement** / Refine |
| 6 | `adapters/browser-preview.ts:154` | `browser-preview` | Mock viewport reload/navigate | Browser iframe operates locally | **Implement** / Refine |
| 7 | `adapters/index.ts:56` | `browser-preview` | Interface contract docstring | Developer clarity | Documented |
| 8 | `app/right-sidebar/browser-section.tsx:70` | `browser-preview` | Right sidebar browser panel | Tabbed web preview in sidebar | **Implement** |
| 9 | `app/right-sidebar/browser-section.tsx:343` | `browser-preview` | Browser navigation bar | URL navigation and viewport controls | **Implement** |
| 10 | `adapters/code-search.ts:109` | `code-search` | In-memory search over loaded files | File search limited to known client paths | **Implement** via bridge/ripgrep |
| 11 | `adapters/index.ts:54` | `code-search` | Interface contract docstring | Developer clarity | Documented |
| 12 | `app/right-sidebar/search-section.tsx:20` | `code-search` | Right sidebar search container | Search panel renders | **Implement** |
| 13 | `app/right-sidebar/search-section.tsx:30` | `code-search` | Local walk search execution | Displays search hits | **Implement** |
| 14 | `adapters/doctor.ts:37` | `onboarding-doctor` | Evaluates window/host facts | Readiness strip checks local facts | **Implement** (Keep + deep check) |
| 15 | `adapters/index.ts:58` | `onboarding-doctor` | Interface contract docstring | Developer clarity | Documented |
| 16 | `aro/OnboardingDoctorView.tsx:227` | `onboarding-doctor` | UI runs doctor sweep | Shows diagnostic table and checkmarks | **Implement** (Verified in P10/P11) |
| 17 | `adapters/editors.ts:76` | `editors` | Known editor list with OS protocol launch | User can launch VS Code / Cursor / etc. | **Implement** (Protocol launch) |
| 18 | `adapters/index.ts:52` | `editors` | Interface contract docstring | Developer clarity | Documented |
| 19 | `adapters/tasks.ts:92` | `tasks` | Local persistence in `conductor.workspace.v3.tasks` | User task checklist stored locally | **Implement** |
| 20 | `adapters/tasks.ts:158` | `tasks` | Local task store sync | Session tasks stream from Hermes `$todosBySession` | **Implement** (Hybrid) |
| 21 | `adapters/index.ts:46` | `tasks` | Interface contract docstring | Developer clarity | Documented |
| 22 | `adapters/rules.ts:41` | `rules` | Local persistence in `conductor.workspace.v3.rules` | Project rules saved locally | **Implement** |
| 23 | `adapters/rules.ts:79` | `rules` | Local rules store sync | Profile rules list | **Implement** |
| 24 | `adapters/index.ts:48` | `rules` | Interface contract docstring | Developer clarity | Documented |
| 25 | `aro/RulesView.tsx:55` | `rules` | UI calls `adapters.rules` | Rules editor and toggle interface | **Implement** |
| 26 | `adapters/index.ts:33` | `general` | Namespace contract reference | Explains adapter boundary | Architecture reference |

---

## 3. Reconciliation with `port/RELEASE_AUDIT_REPORT.md` §6

| Item in Audit §6 | Stated Scope | Reconciled Finding in P12 |
|---|---|---|
| `// BACKEND-TODO(rules)` | Global agent instructions | 4 markers found (`adapters/rules.ts:41,79`, `adapters/index.ts:48`, `aro/RulesView.tsx:55`). Reconciled to sync with project `.aro/rules/` and Hermes profile `SOUL.md`. |
| `// BACKEND-TODO(agents)` | Custom agent adapters | 4 markers found (`adapters/agents.ts:153,190`, `adapters/index.ts:50`, `aro/AgentsView.tsx:50`). Reconciled to sync agent definitions with `~/.aro/agents/`. |
| `// BACKEND-TODO(onboarding-doctor)` | System readiness checks | 3 markers found (`adapters/doctor.ts:37`, `adapters/index.ts:58`, `aro/OnboardingDoctorView.tsx:227`). Reconciled with deep diagnostics via `/api/ops/doctor`. |
| `// BACKEND-TODO(tasks)` | User task persistence | 3 markers found (`adapters/tasks.ts:92,158`, `adapters/index.ts:46`). Reconciled with hybrid persistence (`$todosBySession` for active turns, `.aro/tasks.json` for workspace tasks). |
| *Omitted from Audit §6* | `browser-preview` | 5 markers found. Tabbed web preview inside the right sidebar. |
| *Omitted from Audit §6* | `code-search` | 4 markers found. Workspace code search (grep/ripgrep). |
| *Omitted from Audit §6* | `editors` | 2 markers found. Detection and protocol launching of external IDEs. |

---

## 4. Proposals for Interview Batch 1

1. **Q1 — Scope per Area:**
   - **Slice A (P12.3):** `editors` (OS protocol launching), `code-search` (ripgrep workspace search), `browser-preview` (web preview pane).
   - **Slice B (P12.4):** `rules` (project instructions), `agents` (custom agent profiles), `tasks` (workspace task persistence).
   - `onboarding-doctor`: Keep current honest diagnostic architecture (local facts + backend ops/doctor).
2. **Q2 — Persistence Location:**
   - **Recommendation:** Hybrid. Workspaces persist state in `.aro/` (e.g. `.aro/rules/`, `.aro/tasks.json`), while live agent session data continues streaming via Hermes JSON-RPC/SSE.
3. **Q3 — Voice Scope:**
   - **Recommendation:** Option B (Push-to-talk only; wake word deferred). Replace deprecated `ScriptProcessorNode` in `wake-client-capture.ts` with standard Web Audio API / `AudioWorkletNode`.
