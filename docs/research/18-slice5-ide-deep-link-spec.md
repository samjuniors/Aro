# Slice 5 (13.S5) Specification: One-Click IDE Deep Link & Editor Handoff

**Feature Flag**: `editorDeepLink` (`$aroFeatures.editorDeepLink`)  
**Target Surface**: `apps/desktop/src/aro/EditorDeepLink.tsx`  
**Integration Points**: `apps/desktop/src/aro/ReviewHunks.tsx`, `apps/desktop/src/app/shell/external-ide-control.tsx`  
**Gallery Showcase**: `apps/desktop/src/aro/DesignSystemAro.tsx` (`#ide-deep-link`)  
**Status**: In Progress (Phase 13, Slice 5)

---

## 1. Problem & Context

When an agent proposes changes across several files, reviewing them in Aro gives great visual diffs, hunk verdicts, and checkpoint rollback. However, developers frequently need to jump to their favorite editor (Cursor, VS Code, Zed, Windsurf, JetBrains) to:
1. Examine broader file context beyond the hunk window.
2. Run language-server diagnostics, tests, or interactive debuggers.
3. Apply manual follow-up edits directly in their custom workflow.

Previously, clicking "Open in editor" in the review panel merely triggered a placeholder toast (`'R3 opens this hunk set in the host editor pane'`), while the statusbar IDE button only opened the root project directory without file or line coordinates.

---

## 2. Architecture & Design Principles

### 2.1 Feature Flag Gating
- Controlled by `$aroFeatures.editorDeepLink` in `apps/desktop/src/aro/flags.ts`.
- When disabled, IDE handoff buttons and deep-link shortcuts are hidden or render an informative disabled state without disrupting the review flow.
- Supports `forceEnabled` for headless test harnesses and design system galleries.

### 2.2 Deep-Link URL Construction
Supported schemes:
- **Cursor**: `cursor://file/<normalizedPath>:<line>`
- **VS Code**: `vscode://file/<normalizedPath>:<line>`
- **Windsurf**: `windsurf://file/<normalizedPath>:<line>`
- **Zed**: `zed://file/<normalizedPath>:<line>`
- **JetBrains**: `idea://open?file=<normalizedPath>&line=<line>`

Path and Coordinate Normalization:
- Backslashes (`\`) converted to forward slashes (`/`).
- Hunk headers (`@@ -a,b +c,d @@`) automatically parsed to extract the added hunk's target starting line (`c`).
- Relative repository paths joined against current session cwd (`$currentCwd`) when available.

### 2.3 Preferred IDE Persistence & Dispatch
- Reuses existing preference store `hermes.desktop.external-ide.preferred` via `$preferredIde` atom (`adapters.editors`).
- Dispatch strategy:
  1. If running inside Electron desktop shell (`window.hermesDesktop.openExternal`), uses OS shell open.
  2. Falls back to browser `window.open(deepLink, '_self')`.
  3. Provides fallback "Copy Deep Link" action with clipboard feedback.

### 2.4 UI Components (`EditorDeepLink.tsx`)
- `buildIdeDeepLink(path, line?, ide?)`: Pure URL generator for supported editors.
- `parseHunkLine(hunkHeader)`: Extracts 1-based target line number from diff header.
- `AroIdeHandoffButton`: Compact, styled action button featuring editor mark, label, and one-click jump.
- `AroIdeSelector`: Dropdown/segmented control to change active editor preference.
- `AroIdeHandoffPanel`: Comprehensive showcase and configuration card for Design System and settings.

---

## 3. Verification & Acceptance Criteria

1. **URL Construction**: Unit tests verify exact deep-link URLs across all 5 supported editors with and without line numbers.
2. **Hunk Line Parsing**: Correctly parses unified diff hunk headers (e.g. `@@ -10,3 +14,8 @@` -> `14`).
3. **Gating**: When `editorDeepLink: false`, handoff buttons are not rendered unless `forceEnabled=true`.
4. **Execution**: Clicking the handoff button triggers `openExternal` / `window.open` and posts toast notification.
5. **Persistence**: Switching editor in `AroIdeSelector` updates `$preferredIde` and persists across reloads.
6. **Zero Host Risk**: Passes TypeScript typecheck (`npm run typecheck`), zero ESLint errors, and 100% Vitest pass rate.
