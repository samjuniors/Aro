# Research 11: Backend Wiring Specifications (v1 Items)

Date: 2026-10-19
Author: Aro Program (Phase 12, Step 2)
Status: Complete — Baseline specification for Slice A and Slice B

---

## 1. Item: External Editors (`editors`) — Slice A

### User Outcome
The user can click "Open in [Editor]" from any workspace or file card to launch their installed code editor (VS Code, Cursor, Windsurf, Sublime Text, IntelliJ, or system default) opened directly to the current workspace directory and target file line.

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/editors.ts`
- **Method:** `openInEditor(editorId: string, targetPath: string, line?: number): Promise<boolean>`
- **Detection & Launching:**
  - Protocol URI handlers:
    - VS Code: `vscode://file/${encodeURI(targetPath)}:${line || 1}`
    - Cursor: `cursor://file/${encodeURI(targetPath)}:${line || 1}`
    - Windsurf: `windsurf://file/${encodeURI(targetPath)}:${line || 1}`
    - Sublime: `subl://open?url=file://${encodeURI(targetPath)}&line=${line || 1}`
  - Preload bridge: Routes through `window.hermesDesktop.openExternalUrl(uri)` or Electron shell `openPath`.
- **Error States & Recovery:**
  - If target editor is not installed: protocol handler fails gracefully; desktop displays toast notice and falls back to system file explorer / default editor.
  - If path contains spaces or non-ASCII characters: URI encoding ensures safe shell execution without injection.
- **Tests:** `editors.test.ts` verifying URI formatting, error catching, and protocol dispatch.

---

## 2. Item: Workspace Code Search (`code-search`) — Slice A

### User Outcome
The user can open the Search panel in the right sidebar, type a regex or string query, and instantly view ranked matching files, line numbers, and code snippet previews across the workspace, clicking any hit to open the editor directly at that line.

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/code-search.ts`
- **Method:** `searchWorkspace(query: SearchQuery): Promise<SearchResult[]>`
- **Bridge Endpoint:**
  - Invokes `window.hermesDesktop.searchFiles` or ripgrep/Node stream over workspace `cwd`.
  - Honors `.gitignore` and ignores `node_modules`, `.git`, `.venv`, and binary files.
- **Error States & Recovery:**
  - Empty workspace / no folder open: returns honest prompt "Open a workspace folder to search code".
  - Invalid regex: catches syntax error and displays inline warning without crashing the panel.
  - Query timeout (> 5000ms on huge repos): aborts gracefully with partial results.
- **Tests:** `code-search.test.ts` verifying debounce, result aggregation, regex handling, and empty state.

---

## 3. Item: Live Web Preview (`browser-preview`) — Slice A

### User Outcome
The user can preview local web applications (e.g. `http://localhost:3000`, `http://127.0.0.1:5173`) directly inside Aro's right sidebar while chatting with the agent, with responsive viewport toggles (mobile/tablet/desktop) and refresh controls.

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/browser-preview.ts`
- **Component:** `apps/desktop/src/app/right-sidebar/browser-section.tsx`
- **Security & Sandboxing:**
  - Embedded `<iframe>` or Electron `<webview>` locked with `sandbox="allow-scripts allow-forms allow-same-origin"`.
  - Disallows navigation to arbitrary external origins unless confirmed by user; optimized for local development dev servers (`localhost`, `127.0.0.1`).
- **Error States & Recovery:**
  - Connection refused / server not running: displays friendly "Dev server not reachable" screen with a "Retry" button.
  - Mixed content / insecure loading: trapped and surfaced cleanly in tab header.
- **Tests:** `browser-preview.test.ts` verifying tab state, URL sanitization, and navigation controls.

---

## 4. Item: Project Instructions & Rules (`rules`) — Slice B

### User Outcome
The user can define, toggle, edit, and organize project-specific instructions and behavioral rules in the Rules view (`/aro-rules`), ensuring the AI agent adheres to them during turn execution.

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/rules.ts`
- **Persistence:** Local project file `.aro/rules/*.md` and global user profile rules `~/.aro/rules/`.
- **Sync:** Syncs with agent system prompt builder via profile instructions.
- **Error States & Recovery:**
  - Read-only project directory: alerts user and offers local storage fallback.
  - Malformed markdown: renders in raw text editor with warning.
- **Tests:** `RulesView.test.tsx` and `rules.test.ts` verifying CRUD operations, toggling, and file persistence.

---

## 5. Item: Custom Agent Profiles (`agents`) — Slice B

### User Outcome
The user can view, configure, and create specialized custom agent personas (e.g., Code Reviewer, Technical Writer, Security Auditor) with custom system prompts, tools, and temperature settings in the Agents view (`/aro-agents`).

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/agents.ts`
- **Persistence:** Stores agent manifests in `~/.aro/agents/*.json`.
- **Sync:** Merges built-in seed catalog (`orchestrator`, `coder`, `reviewer`) with user-created agents.
- **Error States & Recovery:**
  - Duplicate agent slug: prompts user for distinct name.
  - Invalid agent schema: validation prevents corruption, restores previous valid state.
- **Tests:** `AgentsView.test.tsx` and `agents.test.ts` verifying creation, editing, deletion, and schema validation.

---

## 6. Item: Workspace Tasks (`tasks`) — Slice B

### User Outcome
The user can manage a persistent checklist of workspace goals, user tasks, and agent-generated action items, checking off progress as development proceeds.

### Contract & Architecture
- **Adapter:** `apps/desktop/src/adapters/tasks.ts`
- **Persistence:** Project `.aro/tasks.json` merged with live Hermes turn todos from `$todosBySession`.
- **Error States & Recovery:**
  - Concurrent modification: atomic file write with JSON schema check.
- **Tests:** `tasks.test.ts` verifying addition, completion toggling, deletion, and Hermes turn synchronization.
