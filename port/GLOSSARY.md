# Hermes UI Port — GLOSSARY (Phase 1)

Prototype term → Hermes term, with evidence (file and symbol) and confidence.
UI code uses the **Prototype column**. Only adapters use the **Hermes column** (skill naming layers; see DECISIONS D-0011, D-0020).

Sources: `prototype/src/**` (prototype), `apps/desktop/src/**` @ `ui-port/2026-10-09` (port), `apps/desktop` @ merge-base `1cb25c3e335a` (original Hermes UI).
Live verification = feature exercised against the real Python backend in this sandbox on 2026-10-10 (see DECISIONS D-0013/D-0014 for the harness).

Kind legend: screen / entity / field / action / setting / event / storage / component.

## Entities

| Prototype term | Hermes term | Kind | Evidence | Confidence |
|---|---|---|---|---|
| Session (workspace) | `session` (RPC `session.create`, store `$sessions`) | entity | proto `src/workbench/components/Workbench.tsx` `Session` type; hermes `apps/desktop/src/store/session.ts`; **live**: session `20261010_075711_e591cc` created through the ported composer, `session.list` shows `message_count:1, source:"desktop"` | high |
| Step (transcript step, 8 types) | `ThreadMessage` parts / `message.*` + `tool.*` events | entity | proto `src/workbench/data/catalog.ts` `Step`; hermes `use-message-stream/gateway-event/*` HANDLERS → `$sessionStates` → assistant-ui runtime; **live**: attributed user row + error card rendered from real events | high |
| Project (WorkspaceProvider) | project (fork store `src/store/projects.ts`, RPC `session.workspace.move`) | entity | proto `src/workbench/lib/workspace.tsx` `projects` CRUD; fork `AroProjectDialog.tsx` `createProject`; **live**: project dialog renders, hierarchy shows real counts (Cron 0 / Gateways 0 / Remote Connections 1) | high |
| Task (user task per project) | — **no counterpart** (Hermes todos are the agent's plan) | entity | proto `src/workbench/components/TasksBoard.tsx`; see DECISIONS D-0009 — kept SEPARATE | low (do not merge) |
| Agent / Agent adapter (AgentsView) | — (Hermes has `subagents` + `profiles`, different concepts) | entity | proto `src/workbench/components/views.tsx` `AgentsView`; hermes `store/subagents`, `api/profiles` — separate rows in FEATURE_MAP | low (do not merge) |
| Rule (global instruction) | — (closest: SOUL.md / profile system; different semantics) | entity | proto `src/workbench/components/Settings.tsx` `Rules()`; hermes `api/profiles` — separate rows | medium (do not merge) |
| Provider (model provider seed) | provider (`/api/providers/*`, `model.options`) | entity | proto `src/workbench/data/providers.ts`; hermes `api/models.ts`; **live**: model control shows `z-ai/glm-5.2` from `model.options` | high |
| Skill | skill (`/api/skills`, capabilities page) | entity | proto `src/workbench/components/views3.tsx` `SkillsView`; hermes `api/skills.ts`; **live**: capabilities shows 53 skills / 25 tools from backend | high |
| Connector (MCP config) | MCP connector (`/api/mcp/*`, `mcp.*` RPC) | entity | proto `src/workbench/components/views3.tsx` `ConnectorsView`; hermes `api/mcp.ts` | high |
| Bot (Bots product mode) | bot relay (`plugins/hermes-bots`, `$openBotChat`) | entity | proto `src/workbench/App.tsx` `conductor:product`; fork `AroTitlebar.tsx` product switcher; **live**: Bots mode lists Hermes bot with real last-session preview | high (fork) |

## Screens / surfaces

| Prototype term | Hermes term | Kind | Evidence | Confidence |
|---|---|---|---|---|
| Workbench (session screen) | Chat workspace route `/:sessionId` | screen | proto `src/workbench/components/Workbench.tsx`; hermes `app/routes.ts` + `app/chat/*`; **live**: `#/20261010_075711_e591cc` renders transcript + composer | high |
| Sidebar | ChatSidebar (swapped by AroSidebar) | component | fork `app/contrib/surfaces.tsx` swap; proto `src/workbench/components/Sidebar.tsx` | high |
| Titlebar | TitlebarControls (swapped by AroTitlebar) | component | fork `controller.tsx` mount; proto `src/workbench/components/Titlebar.tsx` | high |
| Settings sheet (17 sections) | Settings overlay (schema-driven + hand-built pages) | screen | proto `src/workbench/components/Settings.tsx` GROUPS; hermes `app/settings/*`; **live**: overlay renders full Hermes tree (Model…Keyboard Shortcuts) under Aro skin | high |
| Command palette (⌘K) | cmdk palette + pages contribution | screen | proto `src/workbench/components/CommandPalette.tsx`; hermes `components/command-palette*`; **live**: opens, real commands, navigates to capabilities | high |
| ShortcutHelp | Keybinds settings + registry | screen | proto `src/workbench/components/ShortcutHelp.tsx`; hermes `store/keybinds` | high |
| WorkspacePanel (docked right, tool tabs) | Right sidebar (restructured as tabbed panel) | screen | proto `src/workbench/components/WorkspacePanel.tsx` 10 tabs → fork 6 tabs (Files/Changes/Terminal/Plan/Context/Git); **live**: all 6 verified | high |
| Transcript timeline page | Thread (`/aro-transcript` contributed route) | screen | fork `aro/register.tsx` + `ToolTimeline.tsx` | high (fork) |
| Tasks board page | — (user tasks; no Hermes screen) | screen | fork `aro/TasksBoard.tsx` at `/aro-tasks`; **live**: renders, "demo data" tag, live `todo_list` hook text | separate (D-0009) |
| Review page (hunk diff) | Git review (`hermes:git:review:*`, review store) | screen | proto `src/workbench/components/DiffView`/`ReviewHunks.tsx`; hermes `store/review`; **live**: page renders demo content + Restore checkpoint; real review wire present | high |
| Design system view | — (Aro design reference only) | screen | proto `src/workbench/components/DesignSystemView.tsx`; fork `DesignSystemAro.tsx` at `/aro-design` | local |
| Skills view / Connectors view (sidebar nav targets) | Capabilities page tabs (Skills/Tools/Connectors/Plugins) | screen | proto `src/workbench/components/views3.tsx`; hermes `app/capabilities/*`; **live**: sidebar nav buttons are highlight-only stubs; capabilities page is the real surface (`#/capabilities` verified) | high (surface), nav = stub |
| Onboarding (provider wizard) | Hermes onboarding / provider setup | screen | proto `src/workbench/components/Onboarding.tsx`; hermes onboarding stores; **live**: Hermes provider wizard rendered at first launch under Aro skin | high |

## Composer / chat controls

| Prototype term | Hermes term | Kind | Evidence | Confidence |
|---|---|---|---|---|
| Composer textarea | ChatBar rich editor (contentEditable + sr-only textarea shim) | component | proto `src/workbench/components/Workbench.tsx` composer; hermes `app/chat/composer/index.tsx`; **live**: trusted-Enter send works through the contentEditable | high |
| Mode / permission (`modeDefs`: agent/readonly/plan/full) | `approvals.mode` (smart/manual/off/yolo) | setting | proto `src/workbench/components/Workbench.tsx` `modeDefs`; fork `composer/approval-mode-pill.tsx` APPROVAL_MODES; **live**: pill → `config.set {key:"approvals.mode"}` round-trip verified (smart↔manual) | high |
| Effort slider (0–4) + Thinking | reasoning effort (`REASONING_EFFORTS` minimal…ultra, `config.set reasoning`, `session.info.reasoning_effort_wire`) | setting | proto Settings effort 0–4; fork `shell/aro-model-menu-panel.tsx` `EFFORTS` 5 stops + `resolveReasoningEffort`; **live**: slider value 4 → pill `data-level="ultra"`, description swap | high |
| Model menu (`.model-control`) | model picker (`model.options`, session control) | component | proto `src/workbench/components/Workbench.tsx` model menu; fork `composer/aro-model-control.tsx`; **live**: shows `z-ai/glm-5.2 · cloud` | high |
| ApprovalCard (countdown, choices) | `approval` server request + `approval.respond` | component | proto `src/workbench/components/Transcript.tsx` `ApprovalCard`; hermes `server-requests.ts` handler; wire verified at baseline §C (live card not exercisable without provider) | high |
| Attachments (chips, drop, paste) | `file.attach`, `image.attach*`, selectPaths | action | proto `src/workbench/components/Workbench.tsx` attach; hermes composer attachments; **live**: "Add context"/"Attach a project" buttons present | high |
| Dictation (mic bubble) | `useComposerVoice` + `/api/audio/transcribe` | action | proto `src/workbench/lib/dictation.ts`; hermes composer voice; **live**: "Voice dictation" button present; mic audio not exercisable headless (D-0019) | high |
| Voice orb (hands-free) | voice-live store + `wake.*` VAD conversation | component | proto `src/workbench/components/VoiceAgent.tsx`+`Orb`; hermes `store/voice-live`; **live**: orb present "Aro voice · Idle · click to open" | high |
| speak (TTS) | `/api/audio/speak` + auto-speak prefs | action | proto `src/workbench/lib/speak.ts`; hermes audio REST | high |
| External IDE control | external IDE open IPC on `$currentCwd` | component | proto `src/workbench/components/ExternalIdeControl.tsx`; hermes IDE IPC (Task 7) | high |
| Checkpoint marker | rewind / checkpoint restore (`session.history`) | entity | proto `src/workbench/components/Transcript.tsx` `Checkpoint`; hermes `use-prompt-actions/rewind` | high |
| PlanTodoCorner strip | `todo.updated` event + todos store | component | proto `src/workbench/components/PlanTodoCorner.tsx`; hermes `store/todos`; **live**: Plan tab empty-state correct | high |
| Reply backend switch (demo/agent/live) | Hermes gateway (single real path) | setting | proto `src/workbench/lib/live.ts`; collapsed per D-0008 | high (decision) |

## Workspace panel tabs

| Prototype term | Hermes term | Kind | Evidence | Confidence |
|---|---|---|---|---|
| FilesView tree | right-sidebar files tree (`fs` + tree stores) | screen | proto `src/workbench/components/WorkspacePanel.tsx`; **live**: real repo file tree of `/home/z/SamAgent` | high |
| ChangesPanel | git status/review (`hermes:git:repoStatus` family) | screen | proto `src/workbench/components/ChangesPanel`; **live**: "No modified files" matches clean tree | high |
| PanelTerminal (simulated) | PTY terminal (`hermes:terminal:*`, node-pty) | screen | proto `src/workbench/components/PanelTerminal.tsx`; **live**: `echo PORT_OK_7391 && pwd` round-trip on real shell | high |
| Plan tab | todos store (agent plan) | screen | **live**: "No active plan — the agent will create and maintain steps…" | high |
| Context tab | `session.usage` / `session.context_breakdown` + MCP state | screen | **live**: "0% Context window 0 / 200k", "MCP Connectors 0 live", "Agent Memory…" | high |
| Git tab (RepoBar) | `repoStatus` / `branchSwitch` / worktrees | screen | proto `src/workbench/components/RepoDock.tsx`/`AroRepoBar.tsx`; **live**: branch `ui-port/2026-10-09`, ↑0·↓0, "Working tree clean", "Worktrees 1 total", "+ Branch / Worktree" | high |
| CodeSearchView | — (no direct Hermes UI; grep tool lives in terminal/tools) | screen | proto `src/workbench/components/WorkspacePanel.tsx` `CodeSearchView` — separate row | medium (do not merge) |
| BrowserView (iframe tabs) | right-rail in-app browser + `preview.*` | screen | proto `src/workbench/components/BrowserView` — richer Hermes browser kept separate | medium (do not merge) |

## Automations / system views

| Prototype term | Hermes term | Kind | Evidence | Confidence |
|---|---|---|---|---|
| AutomationsView (cron + channels) | cron (`/api/cron/*`) + messaging (`/api/messaging/*`) + pairing | screen | proto `src/workbench/components/views2.tsx`; hermes `api/cron.ts`, `api/messaging.ts`; **live**: sidebar "Cron Tasks 0 scheduled", "Messaging Gateways 0 open" | high |
| MemoryView (graph) | memory providers (`/api/memory`) | screen | proto `src/workbench/components/MemoryView.tsx`; hermes `api/memory.ts`; palette "Memory Graph" command | high |
| ArtifactsView | sessions media gallery (`/api` sessions media) | screen | proto `src/workbench/components/views4.tsx`; hermes sessions media; palette "Artifacts" command | high |
| Onboarding doctor sweep | `/api/ops/doctor` | action | proto `src/workbench/components/Onboarding.tsx` fake doctor; hermes `api/ops` — separate rows (medium pair) | medium (do not merge) |

## Storage / namespaces (kept disjoint — D-0011)

| Prototype namespace | Hermes namespace | Kind | Evidence |
|---|---|---|---|
| `conductor.*` (theme/design/density/motion, `conductor.workspace.v3.{tasks,rules,agents,browser.tabs}` — Phase 3 adapter keys, `adapters/storage.ts:46–53`, `conductor.pref.*`, `conductor.voice.*`, `conductor.agentplan.v1`) | `hermes.desktop.*` / `hermes:desktop:*` / `hermes-desktop-*` (~190 merge-base keys, WIRE_BASELINE §F + 4 fork-added keys, §G.5) | storage | zero collisions verified Phase 0; both kept as-is |
| `aro.backend`, `aro.onboarding.done`, `aro.prototype.config.v2` | — | storage | fork-added prototype keys |
| — (single coupling) | `hermes:desktop:zoomLevel` | storage | main↔renderer mirror (D-0005) — frozen |

## Field-level renames that cross the adapter boundary

| Prototype field | Hermes field | Entity | Notes |
|---|---|---|---|
| `session.title` | `session.title` (may be `""` until auto-titler runs) | Session | **live**: our session has empty title, preview holds the text — session picker filters on title (explains no search hit) |
| `session.tokens` | `session.usage` (event) | Session | usage shown in Context tab, not stored on session row |
| `mode.id` (agent/readonly/plan/full) | `approvals.mode` (smart/manual/off/yolo) | Setting | see FEATURE_MAP `approval-mode`; `readonly`/`plan` have NO Hermes approval-mode value (D-0015) |
| `effort` 0–4 | `reasoning` effort ids (`minimal\|low\|medium\|high\|xhigh\|max\|ultra`) | Setting | 5-stop slider maps xhigh→high, max→ultra presentation; `ultra` clamps to `max` on OpenAI-compatible wires (`reasoning-effort.ts`) |
| `provider.id` (ollama/lm-studio probes) | provider registry + custom endpoints | Provider | probe logic client-side; listing = Hermes |
| `step.kind` (8 prototype kinds) | event types (`message.*`, `tool.*`, `status.update`, …) | Step | translation lives in the ported event handlers, not in components |

## Notes / restructurings

- **One Hermes screen, several prototype surfaces**: Hermes "capabilities" page (skills/toolsets/connectors/plugins tabs) covers prototype SkillsView + ConnectorsView + toolsets. The prototype sidebar nav rows for Skills/Connectors are highlight-only stubs in the current port (FEATURE_MAP `nav-stubs-*`); the capabilities page is the live surface.
- **One prototype surface, several Hermes screens**: the prototype "Settings sheet" (17 sections) is replaced by the Hermes settings overlay tree (verified live) with prototype-styled chrome; prototype sections that map to Hermes keys are listed in SETTINGS_MERGE.md; sections with no Hermes counterpart become local adapters.
- **Aro pages** (`/aro-transcript`, `/aro-review`, `/aro-tasks`, `/aro-design`, `/aro-agent`) are fork-added contributed routes inside the Hermes workspace pane — they are presentation surfaces over either real stores (transcript/review/bridge) or local/demo data (tasks, design).
- **Wire names are frozen**: IPC channels (`hermes:*`), RPC methods, `/api/*` routes, config keys (`approvals.mode`, `reasoning`, `display.*`), event types, and storage namespaces are Hermes's, always (skill rule 3; WIRE_BASELINE is the proof document). `pane.reveal` pane names + `layout.apply` preset ids are backend-addressable (D-0004).
