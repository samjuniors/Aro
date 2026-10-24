# Research 14: Slice 1 Specification — Diff-First Visual Review & Checkpoint Rollback (`aro-review`)

Date: 2026-10-19  
Branch: `aro/P13-S1-review`  
Author: Aro Program  
Scope: Specification, state machine, UX flows, accessibility, and acceptance criteria for Slice 1.

---

## 1. Problem Statement
Autonomous agents make multi-file edits during coding turns. When developers cannot see hunks visually side-by-side before committing or pushing, they experience high anxiety and risk subtle regressions. Codex app established the diff-first review paradigm as the gold standard for agentic coding. Aro must deliver a first-class, hunk-level visual review experience with checkpoint rollbacks.

---

## 2. User Flow & Core Capabilities
1. **Entry Points:**
   - Sidebar "Changes" tab in Right Workspace Rail.
   - Dedicated route: `#/aro-review`.
   - Command palette (⌘K / Ctrl+K) → "Review changes".
2. **File Navigation:**
   - Left sidebar lists modified, added, and deleted files with `+adds` and `-dels` metrics.
   - Git index staging checkbox per file to stage/unstage in the real git repository index.
3. **Diff Display:**
   - Segmented layout switcher: Unified vs Side-by-Side (Split) view.
   - Line numbers, syntax highlighting via language detection, and intra-line diff highlights.
4. **Hunk Decision Matrix:**
   - Each hunk has independent decision controls: `Accept`, `Reject`, `Comment`.
   - Double-clicking a verdict chip resets the hunk decision.
   - Global review counter: `X/Y hunks accepted · Z rejected · W pending`.
5. **Inline Threads & Fix Requests:**
   - Inline comment composer on any hunk (⏎ to send, Esc to dismiss).
   - Comments attach to hunk and offer "Ask agent to fix" dispatch to prompt the agent with the review comments.
6. **Checkpoint Rollback:**
   - Checkpoints drawer displays session history hashes (`rollback.list`).
   - One-click rollback restores working tree to a designated checkpoint via `rollback.restore`.

---

## 3. State Machine & Visual States

| State | Trigger | Rendered UX | Available Actions |
|---|---|---|---|
| **Unavailable** | No git repository or bridge error | Centered warning panel with honest error message. | Refresh, Open logs. |
| **Clean** | Working tree clean (no uncommitted diffs) | Clean empty state with explanation. | Scan working tree, Switch branch. |
| **Loading** | Git bridge diff computation in progress | Subtle pulsing scanner in header and file list. | Cancel. |
| **Review Active** | Modified files detected in working tree | Split/Unified diff stream with file sidebar. | Stage, Accept/Reject hunks, Comment, Restore. |
| **Hunk Commenting** | User clicks "Comment" on hunk | Embedded input field with focus. | Submit comment (Enter), Cancel (Esc). |

---

## 4. Accessibility & Keyboard Navigation
- Standard ARIA labels on all interactive controls: `aria-label="Accept hunk 1"`, `aria-label="Reject hunk 1"`, `aria-label="Stage path/to/file"`.
- Keyboard support: Arrow keys or Enter to select file; Enter to send comment; Escape to close comment composer.
- Full contrast compliance under all Aro design themes (Obsidian, Daylight, Nord, Ember, Paper).

---

## 5. Feature Flag & Rollout Plan
- Governed by flag `aro.features.reviewHunks` in `src/aro/flags.ts` (default: true in development/beta).
- Fallback when disabled: Redirects to standard Git Changes list in workspace rail.
- Flag removal scheduled for Phase 16 (Release).

---

## 6. Acceptance Criteria
1. Clean repository displays genuine empty state without errors.
2. Missing Git repository displays honest unavailable message.
3. Multi-file diffs parse accurately and display unified/split views.
4. Hunk verdicts toggle cleanly and calculate global totals.
5. Staging toggles update git index.
6. Checkpoint restore triggers `rollback.restore` via live gateway RPC.
7. Unit and contract test suite passes with 100% coverage of core paths.
