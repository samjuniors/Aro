# Hermes UI Port — Phase 5 Parity Report & Verification Audit

**Branch**: `ui-port/2026-10-09`  
**Base Commit**: `1cb25c3e335a1f9752d9008282f3f0e6ef825ec9` (merge-base)  
**Latest Feature Commit**: `9589477846` (`port(phase4-a11): settings integration`)  
**Date**: 2026-10-14  
**Status**: **PASSED (Parity Gate Reached)**

---

## 1. Executive Summary & Gate Decision

The multi-phase port of the Aro/Hermes Desktop application from the prototype UI into the Hermes Electron application has completed all 12 implementation areas (A0 through A11). 

### Gate Verification Status
| Verification Track | Scope / Command | Result | Details |
|---|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` | **PASS (0 errors)** | 4 tsconfigs checked: `tsconfig.json` (renderer), `tsconfig.electron.json` (main), `tsconfig.e2e.json` (Playwright), and `electron-builder.config.cjs`. |
| **ESLint Static Analysis** | `npx eslint src/aro/ src/adapters/` | **PASS (0 errors, 0 warnings)** | 100% clean across all 17 adapter files and all 28 Aro component/view files. |
| **Aro & Adapters Unit Tests** | `npm run test:ui -- src/aro/ src/adapters/` | **PASS (133/133 tests)** | 20 test files executed across all local surfaces, design axes, bridge, sidebar, and adapters. |
| **Cross-Area Regression Tests** | Targeted test suites (A0–A11) | **PASS (153/153 tests)** | Verification of appearance extra slots, projects, composer, voice orb, titlebar clusters, and route handlers. |
| **Production Build** | `npm run build` (`scripts/build.mjs`) | **PASS (exit code 0)** | Full production bundle generated in 54s: `electron-main.mjs` (2.9MB), `electron-preload.js` (44.4KB), `preview-guest-preload.js` (962B), and Vite client assets. |
| **Live Runtime Smoke Test** | `electron .` dev instance | **PASS** | App boots under `data-aro-ui`, loads tokens, initializes design axes (`aro`, `comfortable`, `system`), mounts sidebar tree and navigation routes, connects to Hermes gateway, and renders without white-screen or unhandled exceptions. |

### Renderer Preservation Rule
In strict compliance with **Operating Rule 4** (`.agent/hermes-ui-port/SKILL.md`), **the original Hermes host renderer UI has NOT been deleted**. Both renderers remain intact and functional; Aro operates as the authoritative presentation layer via `src/aro/register.tsx`, `data-aro-ui`, and extension slots. Deletion of legacy-only surfaces is deferred to a distinct, lead-approved post-port cleanup commit.

---

## 2. Runtime Decision Record

Per `port/INVENTORY.md` §10 and `references/runtime-decision.md`, the port was executed using **In-Tree Vite + Electron Composition (Option 1)**:
- **Renderer Shell**: Shared React 19 + TypeScript + Vite renderer bundle loaded directly by Electron `BrowserWindow`.
- **Preload API**: Single contextBridge namespace `window.hermesDesktop` providing typed IPC access.
- **Styling Architecture**: Additive CSS custom properties (`--aro-*`, `--t-*`, `--d-*`) defined in `src/aro/tokens.css` scoped to `:root[data-aro-ui]`. Unmodified host JSX components are styled non-destructively through attribute selectors in `src/aro/host-theme.css`.
- **Navigation & Routing**: Route registration pattern in `src/aro/register.tsx` contributing Aro-specific views (`/aro-rules`, `/aro-agents`, `/aro-doctor`, `/aro-design`, `/aro-agent`, `/aro-timeline`, `/aro-review`, `/aro-tasks`) alongside core Hermes routes (`/chat`, `/capabilities`, `/settings`, `/cron`, `/messaging`, `/profiles`).

---

## 3. Wire Baseline Conformance Audit

Every wire invocation made by Aro components and adapters was diffed against `port/WIRE_BASELINE.md`:

### 3.1 Preload API & IPC Channels (§A, §B, §G)
- **Baseline Allow-List (§A.1–§B)**: All invoked IPC channels match merge-base signatures exactly:
  - `hermes:connection` (`getConnection`)
  - `hermes:gateway:ws-url` (`getGatewayWsUrl`)
  - `hermes:fs:readDir`, `hermes:fs:gitRoot`
  - `hermes:window:openInstance`, `hermes:window:openSession`
  - `hermes:logs:reveal`, `hermes:logs:recent`
- **Fork Extensions (§G.1–§G.4)**: Verified to match Section G specifications:
  - `hermes:git:cloneRepository` (§G.1): Consumed in `apps/desktop/src/app/chat/composer/index.tsx` for URL cloning with path validation.
  - `hermes:git:branchSwitch` (§G.2): 3-argument signature (`repoPath`, `branch`, `create`) supported in `git-ipc.ts`.
  - `window.hermesDesktop.aroBridge` (§G.3): Bridge daemon lifecycle methods (`start`, `send`, `toolResult`, `interrupt`, `stop`, `onEvent`, `onExit`) consumed strictly via `src/aro/bridge.ts`.
  - `aro.jsonl/1` Daemon Protocol (§G.4): Standardized stdin/stdout JSONL stream with session latching.

### 3.2 JSON-RPC 2.0 & REST Endpoints (§C, §D)
- **JSON-RPC Transport**: Standard WebSocket JSON-RPC 2.0 over `/api/ws`. Zero rogue or ad-hoc RPC methods introduced.
- **REST Proxy**: Handled via `window.hermesDesktop.api`:
  - `/api/ops/doctor` (diagnostics & system sweep)
  - `/api/skills`, `/api/skills/toggle` (skills hub)
  - `/api/cron/*`, `/api/messaging/*`, `/api/profiles`
  - `/api/audio/transcribe`, `/api/audio/speak`

### 3.3 Persisted Storage Namespaces (§F, §G.5)
Strict boundary enforcement between host and fork namespaces:
- **Hermes Host Keys (`hermes.desktop.*`, `hermes-desktop-*`)**: Kept byte-identical for core functionality (e.g., `hermes-desktop-theme-v2`, `hermes.desktop.workspace-cwd`, `hermes.desktop.external-ide.preferred`, `hermes.desktop.voice.orb.*`).
- **Prototype/Aro Keys (`conductor.*`)**: Confined to local state:
  - `conductor.workspace.v3.rules`, `conductor.workspace.v3.rules.disabled`
  - `conductor.workspace.v3.agents`
  - `conductor.workspace.v3.tasks`
  - `conductor.workspace.v3.browserTabs`, `conductor.workspace.v3.browserViewport`
  - `conductor.design`, `conductor.density`, `conductor.motion`
  - `conductor.onboarding.done`
- **Zero Cross-Namespace Collisions**: Verified by automated regex scans across `src/aro/` and `src/adapters/`.

---

## 4. Feature Map Reconciliation (101 Features)

Every feature row from `port/FEATURE_MAP.md` is accounted for:

| Status | Count | Description |
|---|---|---|
| **`wired`** | **64** | Fully ported prototype UI backed by real Hermes IPC/RPC/REST backend operations. |
| **`partial`** | **1** | `aro-tasks`: User tasks persist locally under `conductor.workspace.v3.tasks`; session agent plans stream live from Hermes `$todosBySession`. |
| **`local`** | **10** | Prototype-only features with no current Hermes backend counterpart; backed by `src/adapters/` with persistent storage and honest `// BACKEND-TODO` markings. |
| **`hermes-only`** | **22** | Pre-existing Hermes host screens (e.g., StarMap, PetDex, HUD, Billing, Vault, Webhooks, Connections) preserved and restyled under `data-aro-ui`. |
| **`dropped`** | **4** | Intentionally retired per D-0007/D-0008 (scripted demo engine, server routes, reply backend switch, dead template dependencies). |
| **Total** | **101** | **100% reconciled across all areas.** |

---

## 5. Adapter Architecture & Backend-TODO Inventory

Features running on local adapters are isolated in `src/adapters/` and tagged with exact future endpoint shapes:

| Feature ID | Adapter Interface | Method | Persistence Key | Backend-TODO Marker |
|---|---|---|---|---|
| `rules` | `RulesAdapter` | `list()`, `add()`, `remove()`, `toggle()` | `conductor.workspace.v3.rules` | `// BACKEND-TODO(rules)` |
| `agents-adapters` | `AgentsAdapter` | `list()`, `register()`, `unregister()` | `conductor.workspace.v3.agents` | `// BACKEND-TODO(agents)` |
| `onboarding-doctor` | `DoctorAdapter` | `sweep()`, `recheck()` | `conductor.onboarding.done` | `// BACKEND-TODO(onboarding-doctor)` |
| `aro-tasks` | `TasksAdapter` | `list()`, `create()`, `update()`, `remove()` | `conductor.workspace.v3.tasks` | `// BACKEND-TODO(tasks)` |
| `browser-preview` | `BrowserPreviewAdapter` | `getTabs()`, `saveTabs()`, `getViewport()` | `conductor.workspace.v3.browserTabs` | None (pure local presentation state) |
| `editors` | `EditorsAdapter` | `list()`, `setPreferred()`, `open()` | `hermes.desktop.external-ide.preferred` | None (wired to Hermes launch IPC) |
| `code-search` | `CodeSearchAdapter` | `search()`, `isAvailable()` | Ephemeral | None (wired to Hermes ripgrep backend) |

---

## 6. Documented Unknowns & Headless Caveats

The following items are preserved from contract verification and noted with their preconditions:
1. **Live Model Turn Completion**: Sandbox environment lacks provider API credentials (`OPENAI_API_KEY`, etc.); wire dispatch, stream lifecycle, and error card rendering are verified, but actual model completion requires live credentials.
2. **Audio/Voice Streaming**: Headless environment (Xvfb) lacks physical audio inputs/outputs; voice dictation and orb UI controls are verified via DOM and mock audio streams.
3. **Native OS Dialogs**: Electron native file picker dialogs cannot be automated via CDP DOM interactions; verified via mock preload responses.

---

## 7. Conclusion & Next Steps

The Phase 5 verification and parity gate has **PASSED**. 
- All functional requirements of the port contract are fulfilled.
- Wire integrity against the merge-base baseline is preserved.
- The build is production-ready.
- The repository is clean and ready for user acceptance and subsequent release staging.
