# Phase 0: Discovery procedure

Read-only. Do not edit code. Output: `port/INVENTORY.md`.

## 1. Locate things
- Repo root: find the Hermes desktop app (look for `electron`, `main`, `preload`, `electron-builder`, `forge` in package.json files and config).
- Prototype: the locally created project folder inside the repo (often Next.js: `next.config.*`, `app/` or `pages/`). Confirm it is not tracked as part of upstream Hermes by checking `git log` / `git status` for it. Note the upstream remote and whether upstream has newer commits (`git fetch upstream` if configured; skip if not).
- Backend: find what the desktop app talks to (local process, Python server, HTTP, WebSocket, IPC). Record start command and how Electron launches or connects to it.

## 2. Inventory each side (same headings for both)
- Stack: framework, language, bundler, styling system, state management, component library.
- Screens/routes and navigation structure.
- Components: shared vs screen-specific.
- State and data flow: where data is fetched, cached, persisted.
- Backend surface the UI uses: every IPC channel, HTTP route, WebSocket message, with request/response shape (read types, schemas, or call sites).
- Settings: every setting, its key, type, default, where stored, which UI control edits it.
- Feature list: user-visible capabilities, one line each.

Useful commands: `rg -n "ipcRenderer|ipcMain|contextBridge|fetch\(|axios|WebSocket"`, `rg -n "settings|preferences|config"`, route listing from the router directory, `tree -L 3 -I node_modules`.

## 3. Prototype-specific checks
- Does the prototype use server-only Next.js features (route handlers, server components, server actions, middleware, `next/image` optimization, ISR)? List each use; they drive the runtime decision.
- Does it call any backend itself, or is all data mock? List mock data sources: these become `local` adapters.
- Fonts, assets, design tokens, global CSS: list where they live.
- **Classify every piece of prototype logic** (state machines, stores, hooks, services, server code):
  - L1 presentation logic (UI state, animation, view-model shaping): stays in the renderer.
  - L2 domain logic with no Hermes counterpart: becomes a `local` adapter now; its interface is the future backend contract.
  - L3 logic that duplicates something the Hermes backend already does: Hermes is the source of truth. Route the UI through the Hermes adapter. Keep the prototype version only as a flagged fallback, or remove it. Log which.
  - L4 server-side code in the prototype (API routes, server actions, server components): must be relocated to the Hermes backend (log a backend-change request and keep a local fallback), the Electron main process, or a local adapter. Leave it as a Next server only under runtime Option C.

## 3b. Wire baseline
From the original Hermes UI (use git history or upstream, not the half-ported tree), extract every wire-level name: IPC channels and their payload types, HTTP routes and bodies, WebSocket message types, config keys, persisted storage keys. Write them to `port/WIRE_BASELINE.md` with file and line evidence. This list is fixed; the port may only call things on it.

## 4. Matching candidates (feed into Phase 1)
Produce a candidate table pairing prototype items with Hermes items using these signals, strongest first:
1. Identical or near-identical backend call (same route/channel/payload fields).
2. Same data shape under different names.
3. Same user-visible purpose and position in the UI.
4. Similar naming (weakest; never sufficient alone).
Record the signal used and a confidence: high (1-2 signals incl. a strong one), medium, low. Low-confidence pairs are not merged; they are listed as separate features and noted in DECISIONS.md.

## 5. Output
`port/INVENTORY.md` with sections: Repo layout, Backend, Hermes UI, Prototype UI, Server-only usage in prototype, Candidate matches. Mark anything not verified as `UNKNOWN`.
