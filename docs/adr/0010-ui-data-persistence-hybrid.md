# ADR 0010: UI-Owned Data Persistence Architecture (Hybrid Model)
Status: accepted
Date / Author: 2026-10-19 / Aro Program (Step P12.2, Founder Decision D-10)

## Context
Aro Desktop manages workspace-specific and application-level user state (custom rules, custom agent configurations, workspace tasks, and active turn todos). Formerly, prototype code stored everything in renderer `localStorage` under `conductor.workspace.v3.*`, leaving it vulnerable to browser cache eviction and invisible to CLI / headless tools.

## Decision
Adopt a **Hybrid Persistence Model**:
1. **Workspace & User Assets:** Persisted on disk under the `.aro` hierarchy:
   - Workspace rules: `<workspace>/.aro/rules/*.md` and global user rules `~/.aro/rules/`.
   - Custom agents: `~/.aro/agents/*.json`.
   - Workspace tasks: `<workspace>/.aro/tasks.json`.
2. **Live Session State:** Live agent turn execution, tool progress, and turn todos remain stream-backed and synchronized via Hermes JSON-RPC (`$todosBySession`).
3. **Renderer Cache:** `localStorage` acts solely as a fast optimistic read cache, write-through synchronized with the on-disk `.aro/` files via the desktop bridge.

## Alternatives Considered
- **Pure LocalStorage:** Rejected because data cannot be shared with CLI, git worktrees, or surviving browser cache clears.
- **Pure Server Database for Everything:** Rejected because workspace instructions and tasks should be easily inspectable, version-controlled in git, and editable in plain text.

## Impact & Acceptance
- Adapters (`rules.ts`, `agents.ts`, `tasks.ts`) read and write through the file bridge.
- Tests verify on-disk file persistence, reload resilience, and non-blocking fallbacks.
