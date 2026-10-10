# Hermes UI Port — INVENTORY (Phase 0)

Phase 0 deliverable of the `hermes-ui-port` skill. Read-only discovery; no code was changed.
Produced on branch **`ui-port/2026-10-09`** @ `6a5b698aad` (= tip of `aro-ui/fix-workspace-activation`; will merge later into `aro-ui/hermes-prototype-redesign`).

**Sources of truth**
- Fork: `samjuniors/Aro` @ `ui-port/2026-10-09` (clone `/home/z/SamAgent`), 106 commits ahead of merge-base.
- Merge-base with upstream `NousResearch/hermes-agent`: **`1cb25c3e335a1f9752d9008282f3f0e6ef825ec9`** (2026-10-03). Upstream `main` is 3125 commits ahead of merge-base — the fork's backend = merge-base + fork commits, NOT upstream HEAD. The original Hermes UI is therefore read from **git history at the merge-base** (per skill §3b), not upstream HEAD and not the half-ported working tree.
- Prototype: `prototype/` (fork-only; never existed upstream — verified via `git log upstream/main -- prototype/` = empty).

**Resume mode: CONFIRMED** (skill "Mode detection"): `apps/desktop` already contains a large Aro port layer (101 files changed, +16,183/−587 vs merge-base), the port has never run a clean `port/` contract until now (no `port/` dir existed). Existing working code is adopted, never rewritten. Feature status claims below that require a live backend are marked UNKNOWN (Python toolchain not installed in this sandbox).

---

## 1. Repo layout

```
Aro/                                  # fork of NousResearch/hermes-agent
├── agent/ gateway/ tui_gateway/      # Python backend (agent runtime, FastAPI REST + WS JSON-RPC server)
├── hermes* cli.py run_agent.py …     # Python CLI/runtime entry points
├── tools/                            # Python agent tools (incl. desktop_ui bridge tools)
├── aro_bridge/                       # FORK-ADDED: stdlib-only Python daemon (aro.jsonl/1 JSONL over stdio)
├── apps/
│   ├── desktop/                      # Electron app (production Hermes UI + in-progress Aro port)
│   ├── shared/                       # shared TS: JSON-RPC client, generated gateway contract (251 methods)
│   └── bootstrap-installer/
├── prototype/                        # FORK-ADDED: Aro prototype (Next.js) — UI/UX source of truth
├── web/ website/ ui-tui/             # other upstream UIs (dashboard web, website, TUI) — out of scope
├── .agent/hermes-ui-port/             # this skill + references
├── AGENTS.md                         # fork's mapping contract (Aro ↔ Hermes semantics)
└── port/                             # NEW this phase: contract files (this document)
```

## 2. Backend (what the desktop app talks to)

- **Process**: Electron main resolves the Hermes runtime via a backend ladder — source checkout's **own venv interpreter** (`.venv/bin/python` under repo root, `HERMES_DESKTOP_PYTHON` override; `electron/source-python.ts`) or managed install launcher — and spawns **`hermes --profile <profile> serve --host 127.0.0.1 --port 0`** (headless gateway; `electron/backend-command.ts`). Ephemeral port announced on stdout + `spawn-ledger.json` under the machine root; auth token scraped from `GET /` (`window.__HERMES_SESSION_TOKEN__`).
- **Transport**: JSON-RPC 2.0 text frames over WebSocket `ws://127.0.0.1:<port>/api/ws?token=<token>` (OAuth remotes: single-use ticket via `POST /api/auth/ws-ticket`). REST `/api/*` (FastAPI) proxied renderer→main→backend over IPC channel `hermes:api`. Heartbeat `gateway.ping` 15 s; lossless replay via `session.events.since` + per-session `seq` watermark.
- **Contract**: 251 RPC methods in `apps/shared/src/gateway-contract.openrpc.json` (generated from `tui_gateway/contracts` Python single source). Renderer invokes ~128; 13 server→client request methods the renderer must answer; 74 backend event types + 5 client-local synthetics. Full extraction with file:line evidence: **`port/WIRE_BASELINE.md`**.
- **Preload**: single contextBridge global `window.hermesDesktop` (155 top-level props + ~110 nested members) over ~170 invoke channels + 45 send channels + 42 main→renderer push channels (`electron/preload.ts` @ merge-base).
- **Dev commands**: `npm run dev` (apps/desktop) = vite renderer (127.0.0.1:5174) + esbuild-bundled electron main; `npm run start` = packaged flow. Mock lanes: `HERMES_DESKTOP_BOOT_FAKE=1`, `tests-js` mock server, `npm run dev:mock`.
- **Fork addition**: `electron/aro-ipc.ts` owns a second Python child `python -m aro_bridge.daemon --engine demo|openai` (JSONL stdio; tools delegated to host) exposed as `window.hermesDesktop.aroBridge` (see WIRE_BASELINE §G).

## 3. Hermes UI (original, at merge-base `1cb25c3e335a`)

- **Stack**: React 19.2.7 + react-router 8.3 (HashRouter) + Vite 8.2; Tailwind CSS 4.3 CSS-first over `--dt-*`/`--ui-*` tokens (`styles.css`, `src/themes/`); nanostores (179 store modules in `src/store/`) + TanStack Query 5; `@assistant-ui/react 0.14` chat runtime (custom incremental external store runtime), streamdown + shiki 4 + KaTeX + mermaid markdown pipeline; xterm 6 + node-pty terminals; CodeMirror 6; d3-force starmap; hand-rolled i18n (9 locales); contribution registry (`src/contrib/`) for panes/routes/keybinds/palette commands.
- **Screens** (route classification `app/routes.ts` — 12 reserved `APP_ROUTES`, `/:sessionId` = chat, registry = extension): chat workspace (`/`, `/:sessionId` — transcript, composer, sidebar, session tiles/windows, browser popouts, right rail); settings overlay (config schema-driven + 9 hand-built pages); command-center (sessions/system/usage/maintenance); capabilities (skills/toolsets/connectors/plugins); messaging; webhooks; artifacts; cron; agents (subagents); profiles (SOULs); starmap; session-import; contributed pages (kanban). Utility windows: HUD (`?win=hud`), pet overlay, quick-entry, wake-indicator, preview guests.
- **State**: `src/store/` (session, session-states, composer + queue, gateway WS lifecycle, connections, profile, approval-mode, todos, subagents, review, cron, artifacts, projects, prompts, goals, background-delegation, compaction, reactions, thread-timeline, model-presets/favorites/custom/visibility/pricing, voice-live/voice-prefs, wake-word, hud, pet*, updates, onboarding, keybinds, layout, interface-mode, …). Data flow: `HermesGateway` (WS JSON-RPC) → `store/gateway` scope stamping → `wiring.tsx` event dispatch → `useMessageStream` HANDLERS → `$sessionStates` → assistant-ui runtime → Thread.
- **Settings**: schema-driven config pages (Model/Chat/Appearance/Workspace/Safety/Browser/Memory/Voice/Advanced) via `config.get`/`config.set` + `/api/config/schema`; hand-built pages (notifications, billing, providers, gateway, keybinds, keys, sessions, vault, connections, about); renderer-local prefs via localStorage-backed persisted stores; main-side prefs via dedicated `hermes:*` channels.
- **Features** (one line each, merge-base): sessions CRUD/pin/archive/branch/export/tiles/windows/search; streaming chat with reasoning disclosure, interim, status narration; stop/cancel/steer; edit-resend with truncation + survivor rebind; retry; checkpoint restore; compaction; queue; BTW/background prompts; subagents; goals; reactions; model/provider management (catalog, presets, favorites, custom endpoints, local model downloads, free tier); reasoning-effort control; approvals (cards + modes + sudo/secret/vault/clarify prompts); attachments (files/folders/images/URLs, paste, drag-drop); voice (dictation, TTS auto-speak, VAD conversation, GPT-Live, wake word); slash/@ commands + palette + keybinds; context/usage analytics; terminal (PTY, persistent shell); git review (diff/stage/commit/revert/push/PR); file browser; projects grouping; HUD; cron; artifacts; capabilities (skills hub/toolsets/MCP/plugins); agents; profiles/SOULs; messaging + pairing; webhooks; starmap; session import; connections (local pool/remote/SSH/cloud); themes (VSCode import, user, accent, backend sync); translucency/zoom/text-scale/RTL; i18n; onboarding/tours/tips; updates; tray; notifications; diagnostics (doctor, debug-share, log tail); petdex; deep links; external IDE open.

## 4. Prototype UI (`prototype/` — Aro Workbench)

- **Stack**: Next.js ^16.1.1 App Router (standalone output) + React 19; Tailwind CSS 4 CSS-first with **two-axis token system** on `<html>`: `data-theme` (6 themes → `--t-*`) × `data-design` (5 structural profiles → `--d-*`) + `data-density`/`data-motion`; custom primitives (`workbench/components/ui.tsx` on radix popover/dialog) + 634-line custom icon set; React Context ×2 + one `useSyncExternalStore` config store + a 23-name window CustomEvent bus (`conductor:*`/`aro:*`); 5 Google fonts via `next/font`.
  - ⚠️ ~40 of ~50 package.json deps are dead template scaffolding (full shadcn set, zustand, framer-motion, prisma+db, next-auth, react-query, etc.) — zero imports. Not ported (DECISIONS D-0007).
- **Screens/navigation**: filesystem routes: `/` (page → `<App/>` mount gate), `/api/chat` (z-ai proxy), `/api/workbench/stt`, `/api/workbench/tts`, `/api` (unused). Internal navigation: `view: ViewId` state in `App.tsx` Shell (16 views: workbench/tasks/skills/connectors/projects/automations/memory/artifacts/runs/agents/bridges/git/browser/review/design/settings) rendered in a `Sheet` overlay (chat stays mounted underneath); WorkspacePanel = docked right panel with 10 tool tabs; input via sidebar/⌘K/voice/`conductor:*` events.
- **Components**: 34 files in `workbench/components/` — shell (Titlebar 589, Sidebar 219, StatusBar, LayoutControl, Sheet, Terminal, ErrorBoundary); transcript (Transcript 445: StepView for 8 step types, Prose, CodeBlock, DiffView, ToolCard, ApprovalCard, Thinking, Checkpoint, UserMessage, StreamingRow, FindBar; Workbench 741: session screen + composer; RepoDock 560); workspace panel (WorkspacePanel 802: 10 tool tabs, PanelTerminal, FilesView, CodeSearchView); settings (Settings 107 with 17 sections, Appearance 28, Provider 123, DesignSystemView 34); views (views.tsx…views5.tsx, MemoryView 234); overlays (CommandPalette 199, ShortcutHelp 76, ProjectDialog 202, Onboarding 115, PrototypeStudio 321, PlanTodoCorner 187, VoiceAgent 272 + Orb 190, ExternalIdeControl 166).
- **State**: `lib/app.tsx` (AppProvider: theme/design/product/todos/toasts/termFeed/providers), `lib/workspace.tsx` (WorkspaceProvider: projects/tasks/skills/connectors/rules/agentPlan CRUD), `lib/storage.ts` (localStorage JSON), `lib/dictation.ts` (3-engine STT), `lib/speak.ts` (TTS + fallback), `lib/inference.ts` (Ollama/OpenAI-compat streaming), `lib/live.ts` (demo/agent/live backend switch), `lib/bridge.ts` (aro-bridge NDJSON client), `lib/shortcuts.ts`. Mock/demo data: `data/` (SofiaUI demo corpus, file tree, memory graph, cron+channels, artifacts, design specs, agent catalog, provider seeds).
- **Persistence** (localStorage only, via `readStored`/`writeStored`): ~30 key families — `conductor.theme/design/density/motion`, `conductor.workspace.v3.*`, `conductor.pref.*`, `conductor.voice.*`, `conductor.sidebar.*`, `conductor.workspace.panel.*`, `conductor.editor`, `conductor.profiles.*`, `conductor.agentplan.v1`, `aro.backend`, `aro.onboarding.done`, `aro.prototype.config.v2`. **No collision with Hermes's `hermes.desktop.*` / `hermes:desktop:*` namespaces.**
- **Settings** (17 sections): theme/design/density/motion; reply backend (demo/agent/live); recognition engine + language; voice orb; effort 0–4 + thinking; permission (agent/readonly/plan/full); ask-destructive/checkpoints/network/merge/sandbox/timeout (preference records, several inert — no runtime consumer); rules; skills; connectors; external editors; git; terminal; messaging gateway; usage; design system.
- **Backend surface used**: `/api/chat`, `/api/workbench/stt`, `/api/workbench/tts` (z-ai proxies); user-configured OpenAI-compatible endpoints (`/models`, `/chat/completions`, `/api/chat` streaming); provider probes (`/api/tags`); aro-bridge daemon (`/health`, `/agent/start` NDJSON via sandbox `?XTransformPort=3004` form). No WebSocket/SSE/GraphQL. Everything else is local simulation.

## 5. Server-only usage in the prototype (runtime-decision evidence)

| Use | Where | Movable? |
|---|---|---|
| Route handler `/api/chat` | z-ai chat proxy (SOUL.md-flavored system prompt, non-streaming) | Yes — reply source becomes Hermes gateway; prompt text is a porting artifact |
| Route handler `/api/workbench/stt` | z-ai ASR proxy | Yes — Electron main handler, or Hermes `/api/audio/transcribe` |
| Route handler `/api/workbench/tts` | z-ai TTS proxy + ≤1000-char chunking | Yes — chunk logic portable; or Hermes `/api/audio/speak` |
| Route handler `/api` | unused hello | Delete |
| `next/font/google` (5 families) | layout.tsx | Yes — self-host woff2 + `@font-face` (fork already did this inside apps/desktop) |
| Server components / actions / middleware / ISR / next/image | **none** | n/a |

Conclusion: near-zero true server coupling → no blocker for static-export / in-renderer port. **Runtime situation**: the existing fork approach already runs prototype UI **rebuilt inside the Hermes React/Vite renderer** (skill Option B: prototype components + tokens inside the existing renderer; Next-specific routing replaced by the existing router/contrib registry). Evidence it works: app launches, renders, unit tests pass (Task 7 worklog). Final runtime decision = Phase 2; evidence recorded (DECISIONS D-0003).

## 6. L1–L4 classification (all prototype logic)

L1 presentation · L2 domain, no Hermes counterpart (→ `local` adapter; interface = future backend contract) · L3 duplicates Hermes (Hermes is source of truth; prototype version = flagged fallback or removed) · L4 server-side.

| Prototype logic | Class | Port disposition |
|---|---|---|
| `lib/app.tsx` theme/design/density/motion/toasts/termOpen/settingsSection | L1 | Port as-is (storage → renderer prefs) |
| `lib/app.tsx` todos/termFeed mirrors; `lib/shortcuts.ts`; `config/prototypeConfig.ts`; `App.tsx` Shell orchestration/keymap/`conductor:*` bus; all 34 components' presentation; voice orb state machine; `extractPlanTodos` | L1 | Port; drive from real Hermes events |
| `lib/storage.ts` helpers; `makeId` | L1/L2 | Becomes persistence adapter |
| `lib/workspace.tsx` projects/tasks/skills/connectors/rules CRUD | L2 (partially L3 — see Candidates) | `local` adapter now; per-entity Hermes counterpart wins where it exists (projects → fork's `store/projects` + workspace move; skills → `/api/skills`) |
| `lib/workspace.tsx` agentPlan display | L1 over L3 data | Display ported; source = Hermes `todo.updated` |
| `lib/dictation.ts` (engines, WAV normalize, browser engine) | L2 | STT input adapter; cloud path already replaced by Hermes `/api/audio/transcribe` in Task 7 |
| `lib/speak.ts` TTS + fallback chain | L2 | Same pattern |
| `lib/inference.ts` local-model streaming | L2→L3 | Hermes gateway primary; direct-endpoint streaming = optional local adapter |
| `lib/live.ts` demo/agent/live backend switch | L2 scaffolding | Collapse to single real path in port (keep interface) |
| `lib/bridge.ts` aro-bridge NDJSON client | L3 (duplicates Hermes gateway role) — **already superseded** by preload `aroBridge` IPC in fork | Event grammar = draft of chat-streaming contract |
| `App.tsx` scripted demo engine (`buildCodeResponse`/`buildAgentResponse`, `runScripted`) | L3 | Demo harness fallback only, or drop |
| `App.tsx` session domain (send/edit-resend/retry/checkpoint/CRUD/projects) | L3 (Hermes sessions/rewind/branches) + L2 fallback (localStorage drafts) | Hermes wins per precedence rule 3 |
| `data/catalog.ts` Step/Session/DiffFile types | L1 | Transcript view-model contract for the port |
| `data/catalog.ts` AGENTS/MODES; `data/providers.ts` seeds + probe | L2/L3 split | Registry stays local; model listing → Hermes `model.options` |
| `data/demo.ts` SofiaUI corpus, `data/files.ts`, `data/memory.ts`, `data/cron.ts`, `data/artifacts.ts` | L3 demo fixtures | Demo content only; real surfaces = Hermes git/memory/cron/artifacts |
| `data/design.ts` + theme constants | L1 | Port |
| `data/extra.ts` INSTALLED_IDES / buildAgentResponse | L2 / L3 | IDE prefs → local adapter (extend via `shell.openExternal`); scripted steps → demo |
| `PanelTerminal` command simulation; Onboarding fake doctor; MemoryView stubs | L3 | Real: Hermes PTY terminal, `/api/ops/doctor`, memory REST |
| `BrowserView` iframe preview | L2 (Hermes browser tool = L3 later) | Keep local now; candidate future backend |
| `ExternalIdeControl` | L2 | Desktop-relevant; Electron launcher |
| `/api/chat` route | L4 → L3 | Hermes gateway answers; SYSTEM_PROMPT preserved as agent config artifact |
| `/api/workbench/stt`, `/api/workbench/tts` routes | L4 → L2 | Electron-main local adapters (already: `/api/audio/transcribe` used in Task 7) |
| `conductor:*`/`aro:*` window CustomEvent bus (23 names) | L1 | Renderer-internal names; keep stable |
| Dead template deps (shadcn set, prisma, etc.) | — | Not ported (D-0007) |

## 7. Backend dependency on UI-level names (check requested by user)

Verified by grep across `tui_gateway/`, `gateway/`, `tools/`, `apps/desktop/electron/` (merge-base + current):

1. **DOM ids: none.** Python backend never references the DOM. Electron main touches the DOM only in 2 `executeJavaScript` calls (zoom persistence, main.ts:7071/7116) that read/write one localStorage key.
2. **Storage keys named after components: none.** All Hermes keys are feature-named (`hermes.desktop.*` / `hermes:desktop:*`); prototype keys (`conductor.*`, `aro.*`) are distinct namespaces with zero collisions. The single main↔localStorage coupling is **`hermes:desktop:zoomLevel`** (`electron/zoom.ts:9`; legacy mirror — primary store is main-side `zoom-state.json`). Preserve this key name or keep the JSON-primary path.
3. **Event names: REAL dependencies found — keep these UI-level names stable (or change both sides atomically):**
   - **`pane.reveal`** event payload `{pane}` — Python `tools/focus_pane_tool.py:9` hardcodes `PANES = ("chat","files","terminal","review","sessions")`; renderer resolves them in `src/store/pane-focus.ts` `PANE_REVEALERS`. If the port renames/restructures panes (Aro workspace panel), the Python tool's allowed values and the renderer map MUST stay in sync.
   - **`layout.apply`** payload `{preset}` — renderer resolves against the layouts contribution registry (`pane-focus.ts:57`, `LAYOUTS_AREA`); preset ids ('default','focus','terminal-deck','quad', user-saved) are backend-addressable UI names.
   - **`display.*` config keys** read by Python tools via `desktop_ui.user_enabled` (`tools/desktop_ui.py:43`): `display.message_reactions`, `display.in_app_tips`, `display.in_app_tours` — UI-mirrored config; names are wire.
   - **Server→client request methods (13)** the renderer must answer (`approval`, `sudo`, `secret`, `vault.code|save_login|unlock_prompt`, `clarify`, `terminal.read`, `preview.act|read`, `window.read`, `tour`, `display.install.sudo`) — port must keep answering (unanswered → −32601 decline, feature degrades).
   - **`HERMES_UI_SESSION_ID` routing**: renderer-owned runtime session ids route events to the owning window (opaque ids minted by `session.create` — no name coupling, but the routing mechanism is contract).
   - Renderer-internal names that never cross the bridge (free): `hermes:composer-*` CustomEvents, `hermes:sessions`/`hermes:radio:*` BroadcastChannels, prototype `conductor:*`/`aro:*` events.
4. **Preload global name** `window.hermesDesktop` is wire (typed in global.d.ts; SDK depends on it). Never rename.

## 8. Candidate matches (prototype ↔ Hermes) — feeds Phase 1 FEATURE_MAP

Signals: 1 = same backend call/route; 2 = same data shape; 3 = same purpose/position; 4 = similar naming. Confidence: high (1–2 incl. strong), medium, low (not merged; listed separately).

| Prototype feature | Hermes counterpart | Signal | Conf |
|---|---|---|---|
| Session transcript steps (8 types) | message.*/tool.*/status.update events + ThreadMessage parts | 1+2 | high |
| Composer (auto-resize, IME, prompt history) | ChatBar rich editor (keep Hermes engine — better) | 3 | high |
| Model menu + effort slider + Thinking | `model.options` + reasoning-effort pill + `useModelMenuController` | 1 | high |
| ApprovalCard (countdown, 4 choices) | `approval` server request + `approval.respond` | 1 | high |
| Permission modes (4) | approval-mode store + `approvals.mode` (smart/manual/off/yolo) | 1 | high |
| Slash/@ popovers | `complete.slash`/`complete.path` + trigger popover | 1 | high |
| Attachments (validate, chips, drop) | `file.attach`, `image.attach*`, paste, selectPaths | 1 | high |
| RepoBar / ChangesPanel / DiffView hunk review | `hermes:git:review:*` IPC + review store | 1 | high |
| WorkspacePanel terminal tab | `hermes:terminal:*` + xterm PTY | 1 | high |
| FilesView tree | right-sidebar files tree (`fs` + tree store) | 2+3 | high |
| CodeSearchView | Hermes search (grep tool / terminal) — no direct UI | 3 | medium |
| Dictation (Wispr bubble) | `useComposerVoice` + `/api/audio/transcribe` | 1 | high |
| Voice orb hands-free loop | `voice-live` store, `wake.*`, VAD conversation | 1 | high |
| speak.ts replies | `/api/audio/speak` + auto-speak prefs | 1 | high |
| PlanTodoCorner strip | `todo.updated` + todos store | 1 | high |
| Cron schedules + channels (AutomationsView) | `/api/cron/*` + `/api/messaging/*` + pairing | 1 | high |
| MemoryView graph | `/api/memory` + providers REST | 2+3 | high |
| ArtifactsView | `/api` sessions media gallery | 2+3 | high |
| SkillsView | `/api/skills` + `skills.manage` + hub | 1 | high |
| ConnectorsView (MCP config) | `/api/mcp/*` + `mcp.*` RPC | 1 | high |
| ProviderSettings (local probes, catalogs) | providers settings + `/api/providers/*` + local-models | 1+2 | high |
| Onboarding doctor sweep | `/api/ops/doctor` | 3 | medium |
| CommandPalette ⌘K | cmdk palette + pages | 3 | high |
| ShortcutHelp | keybinds settings + registry | 3 | high |
| ExternalIdeControl | external IDE open IPC | 1 | high |
| ProjectsView + project dialog | fork `store/projects` + `session.workspace.move` + repo scan + clone | 1 (fork) | high |
| AroBridgeView | fork `aro_bridge` daemon + `aroBridge` preload | 1 (fork) | high |
| BrowserView (iframe tabs/viewports) | right-rail in-app browser + `preview.*` (richer) | 3 | medium |
| TasksView (user tasks per project) | Hermes todos are agent-plan — **different feature** | 4 only | LOW — keep separate, do not merge |
| Provider "probe" seeds (ollama/lm-studio) | Hermes local-models + custom endpoints | 2 | medium |
| Starmap, HUD, pet, session import, connections, billing, vault | **Hermes-only** → restyle into nearest Aro home (skill precedence 4) | — | — |

## 9. Resume-state overlay (what the fork already ported — adopt, don't rewrite)

- **Graft strategy (4 layers)**: (1) additive `--aro-*` token layer (`src/aro/tokens.css`, inert until wrapper `data-theme`); (2) `host-theme.css` (2,857 lines): `:root[data-aro-ui='true']` remaps Hermes `--dt-*`/`--ui-*` onto Aro values + ~452 `[data-aro-*]` attribute selectors restyling unchanged Hermes JSX; (3) hard swaps at mount seams: `AroSidebar` (1,535 lines) replaces `ChatSidebar` in `SidebarSurface`; `AroTitlebar` mounts in controller; (4) contributed `/aro-*` routes via the host's own registry (`src/aro/register.tsx`).
- **Chat screen + composer** (Task 7): `data-aro-composer-layout="codex"` glow system, attributed transcript rows with real timestamps, persona avatars, tool/approval/code card grammar, `aro-model-control` + `aro-model-menu-panel` (effort slider over real `REASONING_EFFORTS`), voice orb on real voice engine, external-IDE control on real `$currentCwd`.
- **Workspace activation work** (this branch's base): tabbed right workspace panel (Files/Changes/Terminal/Plan/Context/Git), `AroProjectDialog` + `AroRepoBar` + project picker with live git probe, `cloneRepository` preload, `branchSwitch` + create param, workspace overflow containment fixes.
- **Wire discipline so far**: `src/api/*` and `src/sdk/*` byte-identical to merge-base (verified — WIRE_BASELINE §G). All fork wire additions are additive: `hermes:aro:bridge:*`, `hermes:git:cloneRepository`, `branchSwitch` signature extension.
- **Runtime status**: app launches and renders (Task 7 verified in-browser); **live-backend behaviors UNKNOWN in this sandbox** (no Python venv) — e.g. effort slider against a real session, streaming rows from real turns, attributed rows from real messages were verified by code+types+unit tests only.

## 10. UNKNOWNs (never guessed — recorded for Phase 1+)

1. Live-backend behavior of all ported features (sandbox lacks the Python toolchain; needs dev machine or venv install).
2. `hermes:sync-status`/`getSyncStatus`: handler exists in main at merge-base but preload never wired it (dead wire). UNKNOWN whether upstream re-added it later; left as-is.
3. `hermes:hud:native-drag` sendSync registered but unused by preload at merge-base.
4. Renderer-invoked RPC list (~128) derived from string-literal correlation with the 251-method contract; methods passed as runtime variables (if any) could be missed — the contract JSON is the authoritative superset.
5. Prototype `conductor:product` event is dispatched by VoiceAgent but has no listener (dead); intent UNKNOWN.
6. `whisper-local` STT engine is advertised but unimplemented (falls back to cloud).
7. Several prototype Settings rows are write-only records (network/sandbox/timeout/merge/checkpoints) — no consumer found.
8. Whether every merge-base screen still renders correctly under `data-aro-ui` (static reads only).
9. Upstream `main` is 3,125 commits ahead of the merge-base — whether any upstream fixes touch the wire surface is out of Phase 0 scope (fork does not track them; noted as a standing divergence risk).
