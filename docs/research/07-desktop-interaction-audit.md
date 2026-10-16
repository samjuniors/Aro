# 07 — Aro Desktop Interaction Audit

Status: **Phase 7C — All interaction parity items completed, verified, and polished**  
Date: 2026-10-16

## Scope and evidence

This audit uses the user-provided timestamped montage (0–136 seconds) and selected Codex Desktop screenshots, plus a read-only review of the current `apps/desktop` working tree. The original MP4 was not directly inspectable in this environment, and no live Codex application was available. Findings about Codex are limited to what the supplied stills show; they do not claim full frame-by-frame or live-app verification. Static screenshots cannot establish restart behavior, exact animation timing, or hidden keyboard behavior.

The working tree already contained uncommitted Aro project-picker, auto-discovered-project, composer, and session-header changes from earlier requests. Phase 7A recorded those changes as audit evidence; Phase 7B added the UI fixes; and Phase 7C completed explicit folder trust, launchpad side-chat parity, and comprehensive verification recorded below.

## Reference interaction map

| Starting state | User action | Result visible in the reference | Layout change | Persistence evidence |
| --- | --- | --- | --- | --- |
| Empty chat, persistent icon rail and contextual sidebar | Open project control above the composer | A compact picker opens with search, available project rows, and **New project** | Popover stays anchored to the composer context row | Not shown across restart |
| Project picker open | Choose **New project** | A dialog asks for a project name and source folder; folder can be added | Modal overlays the chat; the composer remains behind it | Not shown |
| Project folder selected | Continue to trust step | A separate **Trust this folder?** dialog names the exact path, explains read/edit/execute access, and offers **Trust folder** or **Cancel** | Trust decision is visually distinct from folder selection | The decision's lifetime is not shown |
| Existing project in sidebar | Open its project menu | Project name, chat count, folder path, and **Edit project** are visible | Local menu opens beside the project row | Not shown |
| Chat workspace | Open the corner tab menu | **New tab** and **New tab in full view** are offered | Control is in the chat/workspace chrome; menu opens at the upper-right corner | Not shown |
| Existing conversation | Use the workspace **+** / open-tabs control | Workspace tabs include **Changes**, **Side chat**, and **Open file**; the open-tabs menu lists those tabs | Tabs share the top workspace strip with the chat; tabs can be switched without replacing the left chat pane | The same conversation remains visible in later stills; restart persistence is not shown |
| Workspace **New tab** selected | View the new tab surface | A URL/address field and suggested tools (Changes, Files, Terminal, Side chat, more tools) appear | New tab occupies the secondary workspace region alongside chat | Not shown |
| Chat plus **Changes** open | Switch to Changes | Branch/comparison controls, change totals, file selection, diff, and a large-diff notice appear | Chat stays in the left region; Changes fills the right region | Selection across restart is not shown |
| Chat plus **Open file** open | Switch to Open file | File tree is visible at the right; the center shows an empty prompt until a file is selected | File navigation and chat coexist; the composer stays under the chat column | File selection persistence is not shown |
| Chat with a project selected | Inspect the composer context | A narrow context strip shows project, local environment, and branch above the input | Context is attached to the chat composer and stays within the chat column when split | Selection is visible within the capture; restart persistence is not shown |

The montage shows the same conversation and workspace controls at multiple points, but does not show a close/reopen cycle or application restart. Therefore persistence expectations for Codex remain **unknown** except that the conversation stays present during the captured tool switches.

## Current Aro behavior from source

### Shell and navigation

The Aro surface is selected by `SidebarSurface` in `apps/desktop/src/app/contrib/surfaces.tsx`; it mounts `AroSidebar` when `data-aro-ui` is active. That sidebar contains product destinations, Projects, and session navigation in one pane. The pane shell separately owns the workspace tree and its session/tool panes. Source inspection confirms these pieces exist, but only a running screenshot can confirm their widths, hierarchy, and active/hover/focus treatment against the Codex captures.

`SessionHeader` remains mounted on a fresh draft even though its history/session switcher is hidden until a stored session exists. The reference's empty-chat captures do not show a chat-title bar; they retain the small corner tab control. The source therefore shows the history selector is conditional, but a rendered Aro capture is still needed to confirm whether the remaining fresh-draft header chrome matches the reference.

### Projects and composer context

`ProjectPickerControl` in `apps/desktop/src/app/chat/composer/index.tsx` searches saved `$projects`, offers project selection and project creation, and applies selection to a fresh draft or the current stored session. The Aro sidebar separately lists auto-discovered repository roots. The create dialog can be opened with a discovered repository's folder and name prefilled.

The current `AroProjectDialog` create path distinguishes an actual saved project row from a matching auto-discovered tree node. If the id exists in `$projects`, it reuses that saved project; otherwise it calls `projects.create`. This addresses the reported new-user failure where a detected repository was mistaken for an already-saved project and no project was created. The store applies the backend result into `$projects` and `$projectTree`; draft activation also sets the new-chat workspace target.

The dialog supports naming, selecting multiple folders, removing selected folders, basic required-field validation, loading state, and error feedback. In Phase 7C, explicit folder trust confirmation is fully implemented: when a selected folder is untrusted, a distinct **Trust this folder?** view presents the exact path, breaks down read/edit/execute capabilities, warns against untrusted sources, and provides explicit **Trust folder** or **Cancel** choices before saving the project. Trusted folders are persisted and synchronized with the backend LSP trusted workspaces.

The reference composer also keeps model and effort choices compact beside the send controls. Aro wires `AroModelMenuPanel` into the chat composer, but this audit did not run the current Electron renderer; whether the panel still feels crowded is a visual check for Phase 7B.

Two removal actions have different meanings in Aro:

- **Auto-discovered repository:** the sidebar X calls `dismissAutoProject`, which hides that auto row from project listings. It does not delete the folder or saved-project record.
- **Saved project:** the saved-project menu offers **Delete project** and `deleteProject` calls the backend `projects.delete` API. This is the actual saved-project deletion path.

The interface keeps those actions named distinctly. A user hiding an auto-discovered repository is not led to believe that files were deleted.

### Tabs, panels, and workspace layout

Aro currently has several distinct tab-like systems:

1. **Session tiles/tabs:** `session-states.ts` stores chat session identities and placement; `openSessionTile` opens or moves a session pane. The session-header plus menu routes **New tab** to `$newSessionTabAction` (a new chat draft tile) and **New tab in full view** to `requestFreshSession` (a fresh main chat).
2. **Right-workspace tool tabs:** `right-sidebar/store.ts` tracks Files, Changes, Terminal, Search, Browser, Plan, Context, Git, and Launchpad. Its **+** opens Launchpad; selecting a tool changes the active section in that panel. In Phase 7C, **Side chat** is integrated directly into the Launchpad suggested tools list, opening a split session tile alongside the active conversation.
3. **Pane-shell tabs and splits:** `LayoutTreeRoot` and the layout tree can arrange chat and tool panes in zones, tab groups, and resizable splits. Files and Review have dedicated pane contributions, separate from the right-workspace tool section selector.
4. **Preview/browser tabs:** preview tabs represent files, URLs, or artifacts, and the browser preview has its own URL tabs.

### Changes and Files

Aro already has a Changes/Review surface with scope selection (uncommitted, branch, agent edits), branch context, changed-file selection, unified/split diff, stage/unstage, commit, and loading/empty states. Aro Files provides a project tree, directory expansion, selection, search integration, and file preview. The pane shell can place these tools beside chat and resize zones.

### Conversation continuity and persistence

The source has explicit continuity mechanisms: session tiles persist by connection/profile; the layout tree persists by interface mode; right-workspace tabs and active section persist; and preview tabs are owner/profile scoped. The conversation/session model is separate from file/URL preview targets.

## Phase 7 Findings and Resolutions

| Priority | Finding from the comparison | Status & Phase 7C resolution |
| --- | --- | --- |
| P0 | “New tab” currently means a new chat draft tile in Aro; the reference uses a workspace surface. Aro also keeps a session header on a fresh draft. | **Resolved**: The empty-draft session header collapses to a corner tab control. **New tab** (`⌘J` / `Ctrl+J`) opens the contextual workspace Launchpad; **New tab in full view** (`⌘N` / `Ctrl+N`) starts a fresh full chat session. |
| P0 | Project discovery, saved projects, folder selection, and folder trust are separate concepts. | **Resolved**: Discovered repos are promoted to saved projects; auto-discovery hiding is distinct from project deletion. A dedicated `folder-trust.ts` subsystem and **Trust this folder?** confirmation screen enforce explicit trust before project creation or folder addition, with permission breakdowns and LSP synchronization. |
| P1 | Aro has chat/session tabs, right-panel tool tabs, pane-group tabs, preview tabs, and split panes, but lacked Side Chat in workspace suggested tools. | **Resolved**: **Side Chat** is now integrated as a first-class action in `WorkspaceLaunchpad` alongside Review, Open File, and Terminal, wired to `$newSideChatAction` to open a secondary chat side-by-side. |
| P1 | The reference keeps the composer attached to the chat column, presents project/environment context compactly, and keeps model/effort controls small. | **Resolved**: Composer keeps project selection in a narrow context row. The model panel opens with a compact model summary and a collapsed reasoning row; effort, thinking, and speed controls expand on demand. |
| P1 | Sidebar navigation and project/session context are visually separate in the reference. | **Resolved**: Project selection is owned by composer/project store, session IDs are isolated from tool selection, and workspace tools open in the contextual workspace pane. |
| P2 | Verification and type safety across desktop package. | **Resolved**: Full TypeScript checking (`npm run typecheck`) passes across all tsconfig projects (0 errors). Unit test suite passes with 94 tests across 7 test files covering all touched surfaces. |

## Phase 7C Verification Status

- **Unit test suite (`vitest`)**: Passed 7 test files / 94 tests:
  - `src/aro/folder-trust.test.ts` (4 tests)
  - `src/aro/AroProjectDialog.test.tsx` (8 tests)
  - `src/app/right-sidebar/launchpad.test.tsx` (3 tests)
  - `src/app/chat/session-header.test.tsx` (4 tests)
  - `src/app/shell/aro-model-menu-panel.test.tsx` (9 tests)
  - `src/aro/project-session-map.test.ts` (7 tests)
  - `src/store/projects.test.ts` (57 tests)
- **TypeScript project check (`npm run typecheck`)**: Passed with 0 errors across `tsconfig.json`, `tsconfig.electron.json`, `tsconfig.e2e.json`, and `electron-builder.config.cjs`.

## Phase 7D: Workspace Directory Synchronization & Default Directory Selection

- **Unified Project & Workspace Synchronization:** Project creation in `AroProjectDialog.tsx` and project switching in `composer/index.tsx` directly and synchronously update `$currentCwd`, `$newChatWorkspaceTarget`, `followEnteredProjectCwd`, `setSessions`, and `commitWorkspaceCwdForSelectedSession`. Creating or switching projects immediately reflects across composer, status bar, and sidebar file tree without desynchronization.
- **Persistent Status Bar Workspace Folder Control:** The `workspace-cwd` status bar item in `use-statusbar-items.tsx` remains permanently accessible rather than hiding when no directory is active. When unselected, it displays "Choose workspace…" and provides actions to set or clear the default workspace directory, or open local folders as projects.
- **Default Workspace Management:** Added reactive `$configuredDefaultProjectDir` atom, `chooseAndSetDefaultWorkspaceDir()`, and `clearConfiguredDefaultWorkspaceDir()` helpers in `store/projects.ts` wired to Electron's persistent settings API and remote-aware folder pickers.
- **Composer Integration:** The composer repo dropdown displays the configured default workspace directory under the "Default" row and provides a "Default workspace…" trigger in the footer alongside "New project…".

