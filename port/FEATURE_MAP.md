# Hermes UI Port — FEATURE MAP (Phase 1)

One row per feature. Status values: `wired` (prototype UI, backed by Hermes), `partial` (some wired / some local — which, in Notes), `local` (prototype only, local-only state, backend later), `hermes-only` (exists in Hermes, rebuilt/restyled in prototype style, no prototype origin), `dropped`.

**Status determination (resume mode)**: statuses were determined by running the ported UI against the real Python backend on 2026-10-10 (DECISIONS D-0013/D-0014): `hermes serve` on 127.0.0.1:38541 + Electron renderer under Xvfb driven via CDP. "live ✓" in Notes = observed working against the real backend in that run. "not exercised" = surface present but the interaction could not be driven headless (no provider credentials, no mic, native dialogs). Hermes host screens adopted wholesale under the Aro skin are `hermes-only` with their reachability recorded.

Counts (101 features): wired 62 · partial 3 · local 10 · hermes-only 22 · dropped 4. (Row-by-row recount verified 2026-10-10; the earlier "102 / local 11" header was an overcount — corrected, no row invented or removed. UNKNOWNs listed at the bottom.)

## Chat core

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| chat-send-turn | Workbench send | prompt turn (session.create + stream) | wired | hermes | `session.create`, `session.activate`, prompt submit RPC (1800s) | — | live ✓ session `20261010_075711_e597cc` created (`message_count:1, source:"desktop"`); turn failed only on missing provider API key; error streamed back. **A2 re-verified live ✓ 2026-10-12** (fresh session `20261012_094100_49bbcb` created, busy narration, honest error card; restyle kept the path live) |
| transcript-steps | Transcript StepView (8 step types) | Thread + `message.*`/`tool.*` events | wired | hermes | event stream over `/api/ws` | — | live ✓ attributed rows, real timestamps; tool-card grammar verified Task 7 + unit tests. **A2 2026-10-12**: prototype ToolCard grammar ported INTO the live transcript (`thread/aro-tool-card.tsx` renders the Aro header over the unchanged host `ToolFallback` body engine, same disclosure store; run-grouping behavior kept). Live tool events still BLOCKED on provider credentials (D-0034); rendering verified by the 1911-test area suites incl. tool-group/hide-code-diffs through the real Thread runtime |
| message-error-card | error surface in transcript | `error` event / turn failure | wired | hermes | event stream | — | live ✓ "Hermes hit a problem" card with Retry / Open logs / Send diagnostics / Copy error details. **A2 re-verified live ✓ 2026-10-12** (all four actions on a fresh error turn) |
| streaming-status | streamLabel narration | `status.update` events | wired | hermes | event stream | — | live ✓ "Waking…" spinner + Idle status observed. **A2 2026-10-12**: stream tile icon corrected to the prototype's spark (`IconSpark`); live busy narration re-observed during a real send |
| reasoning-disclosure | Thinking component | `thinking.delta` / `reasoning.*` events | wired | hermes | event stream | — | not exercised (needs a completing turn); engine = Hermes. **A2 2026-10-12**: near-pixel port confirmed unchanged (dashed border, brain glyph, mono label, live preview clamp); suites green |
| edit-resend | prototype edit | truncate + resend (`session.branch*`) | wired | hermes | `session.branch`, `session.branch_stored` | — | Hermes engine adopted; not exercised live (BLOCKED on provider credentials, D-0034); A2 kept the path untouched, suites green |
| retry-turn | retry action | re-send prompt | wired | hermes | prompt RPC | — | live ✓ Retry button present on error card. **A2 re-verified live ✓ 2026-10-12** (fresh error card) |
| stop-steer | stop/steer | `session.interrupt` / `session.steer` | wired | hermes | RPC | — | not exercised (BLOCKED on provider credentials — needs a completing turn, D-0034); A2 kept the path untouched, suites green |
| composer-queue | queue panel | composer queue store | wired | hermes | drain on turn end | — | engine = Hermes; not exercised |
| btw-background | — | background prompts | hermes-only | hermes | `btw.complete` events | — | host feature, kept; **A2 2026-10-12**: `btw.complete` → system-line path unchanged, suites green |
| compaction | — | context compaction | hermes-only | hermes | `session.compress` | — | host feature, kept; **A2 2026-10-12**: surfaces reachable (error-card Compress action + `/compress` routing) verified by suites; live compress needs a completing turn |
| checkpoint-restore | Checkpoint marker | rewind / checkpoint restore | wired | hermes | `session.history` | — | live ✓ "Restore checkpoint" control on review page; restore not exercised. **A2 2026-10-12**: BranchPicker restyled to the prototype checkpoint divider (rule lines + undo glyph + N/M ordinal + iris hover); control semantics unchanged |
| session-crud | session rename/pin/archive/delete | sessions store actions | wired | hermes | `session.save/title/close`, RPC | — | live ✓ rename round-trip incl. Enter-submit fix (D-0035a); rename/delete/pin actions present 2026-10-12 |
| session-search | titlebar session picker | `$sessions` filter | wired | hermes | `session.list`/`session.active_list` | — | live ✓ picker renders with count; filters on title (empty title = no hit — matches backend state); re-verified live ✓ 2026-10-12 (picker filter 'hello') |
| session-tiles-windows | — | session tiles/windows/popouts | hermes-only | hermes | window RPC | — | host feature, kept; visual state under `data-aro-ui` still unexercised headless (session drag is pointer-driven; Unknown 7 subset carried) |
| session-import | — | session import screen | hermes-only | hermes | REST | — | kept, reachable |
| sessions-tree | sidebar sessions+projects tree | fork hierarchical sidebar | wired | hermes | `$sessions` + projects store | — | live ✓ real session row with preview + 15m timestamp; project expands to sub-resource counts; re-verified live ✓ 2026-10-12 (real session row, preview, timestamp) |

## Composer

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| composer-editor | composer textarea | ChatBar rich editor | wired | hermes | — (renderer) | — | live ✓ trusted-Enter sends; contentEditable + sr-only shim; drafts/queue engine |
| attachments | attach chips/drop/paste | `file.attach` etc. | wired | hermes | `file.attach`, `image.attach*`, selectPaths | — | live ✓ "Add context"/"Attach a project" buttons; file attach not exercised |
| slash-commands | slash popover | `complete.slash` | wired | hermes | RPC | — | engine = Hermes; not exercised |
| at-path-mentions | @ popover | `complete.path` | wired | hermes | RPC | — | engine = Hermes; not exercised |
| model-menu | `.model-control` | model picker | wired | hermes | `model.options`, session control | — | live ✓ shows `z-ai/glm-5.2 · cloud`; "Configure providers" link |
| reasoning-effort | effort slider 0–4 | reasoning effort | wired | hermes | `config.set {key:"reasoning"}` + `session.control` | — | live ✓ slider value 4 → Ultra pill (`data-level="ultra"`), description swap; wire clamp `ultra→max` on OpenAI-compat |
| thinking-toggle | Thinking pref | reasoning disclosure | wired | hermes | effort ≠ `none` | — | present in model menu; not exercised |
| approval-mode | permission modes (4) | `approvals.mode` | wired | hermes | `config.set {key:"approvals.mode", value}` | — | live ✓ round-trip smart↔manual verified on backend config; pill updates |
| approval-yolo | — | `approvals.mode=yolo` | partial | hermes | `config.set` | — | reachable via palette "Toggle yolo" ONLY; missing from Aro pill menu (D-0015). Prototype `readonly`/`plan` modes have no Hermes approval-mode value |
| voice-dictation | mic bubble | `useComposerVoice` | wired | hermes | `/api/audio/transcribe` | — | button present; mic not exercisable headless (D-0019) |
| voice-orb | hands-free orb | voice-live VAD | wired | hermes | voice PCM WS `/api/audio/speak-stream` | — | live ✓ orb present "Aro voice · Idle"; conversation not exercisable |
| tts-speak | speak.ts | auto-speak + `/api/audio/speak` | wired | hermes | REST | — | engine adopted (Task 7); not exercised |
| external-ide | ExternalIdeControl | IDE open IPC | wired | hermes | open-IDE IPC on `$currentCwd` | — | adopted Task 7; present |
| quick-actions | starter cards | — | local | local | — | static suggestions on chat home | presentation-only prompt starters; live ✓ rendered. **A2 live ✓ 2026-10-12**: chips render with restored surfaces (undefined-token CSS bug fixed — D-0038) + prototype `aro-rise` stagger (120+i·70ms); chip → composer prefill verified live |

## Sidebar / navigation / shell

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| sidebar-shell | Sidebar | AroSidebar (swaps ChatSidebar) | wired | hermes | — | — | live ✓ full hierarchy renders; collapse/restore verified 2026-10-12 (toggleLeftSide + Show sidebar) |
| titlebar | Titlebar | AroTitlebar | wired | hermes | — | — | live ✓ Code/Bots/Open folder/Search⌘K all render and act 2026-10-12 |
| product-mode | Code vs Bots switch | bot-state `$openBotChat` | wired | hermes (fork) | bots plugin stores | — | live ✓ Code↔Bots switch round-trip, pane + titlebar + sidebar react, aro.productMode persisted 2026-10-12 |
| command-palette | CommandPalette ⌘K | cmdk palette | wired | hermes | registry commands | — | live ✓ Ctrl/⌘+K palette; real commands (Keyboard shortcuts, Capabilities, …); filters; Escape closes 2026-10-12 |
| shortcut-help | ShortcutHelp | keybinds registry | wired | hermes | keybinds store | — | live ✓ opened via palette 'Keyboard shortcuts' command; keybinds panel rendered 2026-10-12 |
| settings-entry | Settings⌘, | settings overlay | wired | hermes | `config.get/set`, `/api/config/schema` | — | live ✓ full Hermes settings tree renders under Aro skin |
| nav-stubs-skills | sidebar Skills row | capabilities page (skills tab) | wired | — | — | — | row routes to #/capabilities?tab=skills; route-derived active state; live ✓ 2026-10-12 harness (D-0035/D-0031) |
| nav-stubs-connectors | sidebar Connectors row | capabilities page (connectors tab) | wired | — | — | — | row routes to #/capabilities?tab=connectors; route-derived active state; live ✓ 2026-10-12 harness (D-0035/D-0031) |
| session-list-options | list menu | archive toggle etc. | wired | hermes | `session.*` RPC | — | live ✓ row menu: Rename/Pin/Duplicate/Archive/Delete 2026-10-12 |
| telemetry-banner | — | telemetry opt-in | wired | hermes | `/api` config | — | live ✓ banner rendered on fresh home, answered 'Local only' 2026-10-12 |
| onboarding | Onboarding + doctor sweep | Hermes onboarding/provider wizard | wired | hermes | provider setup RPC/REST | — | live ✓ provider wizard rendered at first launch; dismissed via "I'll choose a provider later"; re-verified live ✓ 2026-10-12 fresh-home wizard dismissed via 'choose provider later' |
| status-bar | StatusBar | gateway + platform status | wired | hermes | `getConnection()` | — | live ✓ 'Gateway needs setup' + Smart approvals + IDE + version/git 6f0e14f 2026-10-12 |

## Workspace panel (right)

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| workspace-panel | WorkspacePanel tabs | tabbed right panel | wired | hermes | — | — | live ✓ 6 tabs render + switch |
| files-tree | FilesView | fs/tree stores | wired | hermes | `fs` RPC/REST | — | live ✓ real file tree of the repo cwd |
| changes-panel | ChangesPanel | git status | wired | hermes | `hermes:git:repoStatus` | — | live ✓ "No modified files" (tree is clean — correct) |
| terminal-pty | PanelTerminal (sim) | node-pty terminal | wired | hermes | `hermes:terminal:*` | — | live ✓ `echo PORT_OK_7391 && pwd` round-trip |
| plan-tab | PlanTodoCorner | todos store | wired | hermes | `todo.updated` events | — | live ✓ empty state "No active plan — …" |
| context-tab | usage/memory panels | `session.usage` + MCP state | wired | hermes | `session.usage`, `session.context_breakdown` | — | live ✓ "0% 0/200k", "MCP Connectors 0 live", "Agent Memory…" |
| git-tab | RepoDock/AroRepoBar | repoStatus/branchSwitch/worktrees | wired | hermes | `hermes:git:*` (+fork clone/create) | — | live ✓ branch, ↑0·↓0, clean tree, worktrees 1 total, "+ Branch / Worktree" |
| code-search | CodeSearchView | — | local | local | — | grep over workspace via future `search` RPC | prototype-only; medium-confidence pair with Hermes grep tool NOT merged |
| browser-preview | BrowserView iframe | right-rail browser + `preview.*` | local | local | — | tabs/viewports over future `preview.*` | medium-confidence pair NOT merged; Hermes browser kept separately (hermes-only) |

## Projects / workspace management

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| project-dialog | ProjectDialog | AroProjectDialog | wired | hermes (fork) | `createProject` → projects store, `repoStatus`, `session.workspace.move` | — | live ✓ dialog renders (name/color/folder), validation present; create flow needs native folder picker (not drivable headless) |
| project-clone | clone from URL | `hermes:git:cloneRepository` | wired | hermes (fork) | fork IPC channel | — | wire verified in baseline §G; picker not drivable headless |
| open-folder | Open folder button | folder picker + cwd set | wired | hermes | native dialog + `session.cwd.set` | — | live ✓ button present; native dialog not drivable headless |
| project-subresources | project expansion counts | cron/messaging/connections state | wired | hermes | `/api/cron`, `/api/messaging`, connections store | — | live ✓ "Cron Tasks 0 scheduled", "Messaging Gateways 0 open", "Remote Connections 1 registered" |

## Capabilities / system views

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| skills-hub | SkillsView | capabilities → Skills tab | wired | hermes | `/api/skills`, `skills.manage` | — | live ✓ 53 skills, toggles, detail card (airtable) |
| toolsets | — | capabilities → Tools tab | wired | hermes | `/api/toolsets` | — | live ✓ 25 tools count |
| connectors-hub | ConnectorsView | capabilities → Connectors tab | wired | hermes | `/api/mcp/*`, `mcp.*` | — | live ✓ tab present in capabilities |
| plugins | — | capabilities → Plugins tab | wired | hermes | `/api/plugins` | — | live ✓ tab present |
| memory-view | MemoryView | memory providers | wired | hermes | `/api/memory` | — | palette command present; REST verified directly on backend; page not opened |
| artifacts-view | ArtifactsView | sessions media gallery | wired | hermes | sessions media REST | — | palette command present; page not opened |
| cron-view | AutomationsView (cron) | cron page | wired | hermes | `/api/cron/*` | — | sidebar count live ✓; page reachable via palette |
| messaging-view | channels | Messaging page | wired | hermes | `/api/messaging/*` + pairing | — | sidebar count live ✓; page reachable via palette |
| profiles-souls | — | Profiles (SOULs) | wired | hermes | `/api/profiles` | — | reachable via palette; not opened |
| subagents | — | agents / spawn tree | wired | hermes | `subagent.*` events | — | reachable via palette ("Spawn tree"); not opened |
| starmap | — | starmap | hermes-only | hermes | d3 graph | — | host screen, kept |
| hud | — | HUD window | hermes-only | hermes | `?win=hud` | — | kept |
| pet | — | petdex overlay | hermes-only | hermes | `pet.*` | — | kept |
| session-windows | — | popout windows | hermes-only | hermes | window RPC | — | kept |
| connections | — | connections (pool/remote/SSH/cloud) | hermes-only | hermes | connections REST/IPC | — | kept; count surfaced in project expansion |
| billing | — | billing page | hermes-only | hermes | billing REST | — | kept (settings tree section live ✓) |
| vault | — | vault settings | hermes-only | hermes | `vault.*` server requests | — | kept; must keep answering `vault.*` (D-0006) |
| webhooks | — | webhooks page | hermes-only | hermes | REST | — | kept |
| notifications | — | desktop alerts/sounds | hermes-only | hermes | main-side prefs | — | kept |
| updates | — | app updates | hermes-only | hermes | updater IPC | — | kept |
| diagnostics | — | doctor / debug-share / log tail | hermes-only | hermes | `/api/ops/*` | — | kept ("Send diagnostics" live ✓ on error card) |
| i18n | — | 9 locales | hermes-only | hermes | `src/i18n` | — | kept (Aro chrome is English-first; host strings translated). **A0 live ✓ 2026-10-11**: all 9 locales cycled through the real LanguageSwitcher (zh 模型 · ja モデル · ar النموذج · ru Модель · fr · de · zh-hant `lang=zh-hant` 設定/檔 · es Modelo) and back to en; no crash; backend-contributed packs (it/ko/pt/tr/uk/…) listed too |
| themes | AppearanceSettings | theme system + accent + VSCode import | wired | hermes | `hermes-desktop-theme-v2` etc. | — | settings tree live ✓; Aro token layer rides on top (GLOSSARY storage). **A0 live ✓ 2026-10-11**: round-trip via settings UI nous→ember→reload(survives)→obsidian→nous; `data-theme` follows the skin, Aro `--aro-*`/`--t-*` tokens react (iris #7c6bff↔#ff8a4c); specificity defect fixed (obsidian block's `:root[data-aro-ui]` froze the token layer — removed, tokens.css) |
| usage-analytics | Usage page | context/usage analytics | wired | hermes | `session.usage` events | — | live ✓ in Context tab |
| model-presets | — | presets/favorites/custom endpoints | hermes-only | hermes | model RPC | — | kept (settings tree live ✓) |
| wake-word | — | wake word | hermes-only | hermes | `wake.*` | — | kept |
| gpt-live | — | GPT-Live voice | hermes-only | hermes | voice-live | — | kept |
| deep-links | — | deep links / external IDE open | hermes-only | hermes | protocol handler | — | kept |
| tray | — | tray / minimize | hermes-only | hermes | main-side | — | kept |
| tours-tips | Onboarding tours | `tour` server request + tips | hermes-only | hermes | `display.*` config keys | — | kept; must keep answering `tour` (D-0006) |

## Aro pages (fork-contributed routes)

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| aro-bridge | AroBridgeView (agent mode) | aro_bridge daemon | wired | hermes (fork §G) | `aroBridge.start/send/toolResult/interrupt/stop` + `aro.jsonl/1` events | — | live ✓ full round-trip: thinking → `web_search` tool → 3 results → reply (demo engine; `--engine openai` for real) |
| aro-transcript | ToolTimeline page | message stream | wired | hermes | `$sessionStates` | — | route live ✓ (rendered); deep interaction not exercised |
| aro-review | ReviewHunks page | git review | partial | hermes | `hermes:git:review:*` | — | live ✓ page renders; content is demo data ("demo data" tag) until a real diff exists; checkpoint wire present |
| aro-tasks | TasksBoard (user tasks) | — (D-0009) | partial | local | `todo_list` hook (in-session live link) | `tasks.list/create/update` per project | live ✓ renders demo corpus + "No todo_list in this session yet" live hook; user-task persistence = local adapter (BACKEND-TODO(tasks)) |
| aro-design | DesignSystemView | — | local | local | — | none (design reference) | live ✓ renders (fork `/aro-design`) |

## Prototype-only features (no Hermes counterpart)

| id | Prototype name | Hermes name | Status | Adapter | Backend call (hermes) | Backend-todo shape (local) | Notes |
|---|---|---|---|---|---|---|---|
| rules | Rules (global instructions) | — (SOULs are a different concept) | local | local | — | `rules.list/add/remove` → future profile/rules endpoint | medium-confidence pair with SOULs NOT merged (D-0017) |
| agents-adapters | AgentsView (agent catalog) | — (subagents are runtime, not adapters) | local | local | — | `agents.list/register` | medium-confidence pair NOT merged |
| external-editors-list | BridgesView (INSTALLED_IDES) | IDE open IPC (open only) | local | local | open via hermes IPC | `editors.list/detect` | IDE list is local; opening delegates to Hermes IPC |
| design-profiles | `data-design` axis (5 profiles) | — | local | local | — | none | Aro structural tokens (`--d-*`); presentation only. **A0 implemented + live ✓ 2026-10-11**: 5 profile blocks + density + motion ported to `tokens.css` (prototype values verbatim), applied at boot by `aro/design-axes.ts` (`conductor.design/density/motion`, D-0011); all 5 profiles verified live (radius 12/8/14/3/8px + display fonts/sizes), compact 28↔34px rows, reduced-motion 0.12s→1e-06s, restart-survival ✓; profile→theme coupling deferred to A11 (recorded in design-axes.ts) |
| reply-backend-switch | demo/agent/live switch | gateway (single path) | dropped | — | — | — | collapsed per D-0008; bridge engine switch remains on the Aro Bridge page |
| scripted-demo-engine | runScripted demo corpus | — (bridge demo engine kept for `/aro-agent`) | dropped | — | — | — | SofiaUI corpus not ported as chat data |
| nextjs-server-routes | `/api/chat`, `/api/workbench/stt`, `/api/workbench/tts`, `/api` | gateway + audio REST | dropped | — | — | — | D-0008: STT already → `/api/audio/transcribe`; TTS → `/api/audio/speak`; hello route deleted |
| dead-template-deps | ~40 package.json deps | — | dropped | — | — | — | D-0007 |
| prototype-state-bus | `conductor:*`/`aro:*` CustomEvents | — | local | local | — | none (renderer-internal) | kept stable; renderer-internal names (WIRE_BASELINE excludes by design). **A0 checked ✓ 2026-10-11**: exactly 2 dispatch sites unchanged (`aro:product-mode-changed` mode.ts, `conductor:voice:orb` AroTitlebar.tsx — the latter matches the prototype's event name); live dispatch propagates, no listeners today (fire-and-forget, as recorded) |
| onboarding-doctor | Onboarding doctor sweep | `/api/ops/doctor` (different feature) | local | local | — | `ops.doctor` summary | medium-confidence pair NOT merged; Hermes doctor kept as diagnostics |

## Unknowns (recorded, not guessed)

1. **Live model turn completion** — no provider credentials in this sandbox (`hermes model` unset; `/api/config` `model:"z-ai/glm-5.2"` but no providers). The full wire path (send → session → turn → stream → error card) is verified; a *successful* streamed reply is UNKNOWN. Needs a provider key or Nous free tier (`/login`).
2. **Voice round-trips** (dictation → transcript chip; orb conversation; auto-speak) — no mic/audio in headless Xvfb. Controls + engine wiring present (D-0019).
3. **Native-dialog flows** (project folder picker, open-folder, clone-from-URL dialog) — Electron native dialogs cannot be driven via CDP DOM. Wire channels verified in baseline §G.
4. **`hermes:sync-status`** — dead wire at merge-base (D-0010), unchanged.
5. **Sidebar Skills/Connectors views** — no rendered view exists behind the nav rows (D-0016); whether Phase 4 should build view routes or re-point the rows at capabilities is an open design choice.
6. **Approval card rendering** (countdown + 4 choices) — the wire is verified (server request registry + D-0006) but no tool call could be triggered without a provider; card UI verified by Task 7 unit tests only.
7. **Hermes-only host screens not opened in this run** (starmap, HUD, pet, webhooks, billing, vault, connections, updates) — reachable per route registry + palette commands; visual verification under `data-aro-ui` still pending (carried from INVENTORY §10.8).
