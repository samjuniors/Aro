# Hermes UI Port — AREA PLAN (Phase 4 work breakdown)

**Authority**: this is the authoritative Phase 4 work breakdown (skill Phase 4: "Port by area", per `references/fleet-plan.md`). It was produced **before** any Phase 4 implementation, from the contract documents only.

**Sources (read before writing this plan)**: `.agent/hermes-ui-port/SKILL.md`, `port/FEATURE_MAP.md` (101 features: wired 60 · partial 5 · local 10 · hermes-only 22 · dropped 4), `port/INVENTORY.md` (§1 layout, §3 Hermes screens/stores, §4 prototype components, §9 resume-state overlay), `port/WIRE_BASELINE.md` (§A–F merge-base baseline + §G fork extension = the parity allow-list), `port/DECISIONS.md` (D-0001…D-0025), `port/GLOSSARY.md`, `port/SETTINGS_MERGE.md`, `.agent/hermes-ui-port/references/fleet-plan.md`.

**Derived file surface**: the fork-changed file list `git diff --name-status 1cb25c3e335a..HEAD -- apps/desktop/` (130 files) is the port's own surface; every one of those files is assigned to exactly one area below. Host (merge-base) files are listed as *custodian* surfaces — read + verify + restyle, edits lead-gated.

**Status discipline**: every feature keeps its FEATURE_MAP status and every FEATURE_MAP "Unknowns" item stays open. This plan assigns work; it does **not** mark anything complete. Statuses only change when an area's work is live-verified (skill resume rule; D-0012/D-0014).

---

## 1. Ordering model

Waves follow fleet-plan.md ("Shell/navigation first … Settings last among parallel areas"):

| Wave | Order | Areas | Mode |
|---|---|---|---|
| 0 | 1st | **A0 Foundations & app identity** | serial (lead) |
| 1 | 2nd | **A1 Shell & navigation** | serial (lead) |
| 2 | 3rd–11th | **A2 Chat & transcript · A3 Composer & model controls · A4 Workspace panel · A5 Projects & git · A6 Capabilities & system views · A7 Hermes-only host screens · A8 Aro pages & bridge · A9 Voice · A10 Local surfaces** | parallel (disjoint file ownership) |
| 3 | last | **A11 Settings & preferences** | serial (lead) |

Rationale: A0 batches all shared-component/token changes before parallel work (fleet-plan "Hygiene"); A1 provides the surfaces every other area mounts inside; A11 runs last because other areas add settings surfaces it must fold in.

## 2. Global rules for every area (no exceptions)

1. **Wire discipline.** The ported UI may only call what `WIRE_BASELINE.md` §A–F records, plus §G fork extensions. No new IPC channels, RPC methods, REST routes, config keys, or storage namespaces without a DECISIONS entry and a baseline update (lead-only). `src/api/*` and `src/sdk/*` stay byte-identical to merge-base (D-0022).
2. **Frozen files (no area edits)**: `apps/desktop/electron/preload.ts`, `apps/desktop/src/api/**`, `apps/desktop/src/sdk/**`, all Python backend dirs (`agent/ gateway/ tui_gateway/ tools/ aro_bridge/ …` — fleet-plan hygiene: backend changes are recorded as backend-change requests with a local fallback), `prototype/**` (read-only source of truth), `apps/web`, `website/`, `ui-tui/`.
3. **Contract files**: `port/DECISIONS.md`, `port/GLOSSARY.md`, `port/WIRE_BASELINE.md`, `port/SETTINGS_MERGE.md`, `port/INVENTORY.md` are lead-only; propose changes in the area report. Area agents **may update their own rows** in `port/FEATURE_MAP.md` (fleet-plan role rule) — status changes must cite live evidence.
4. **Adapters**: `src/adapters/**` is the Phase 3 boundary module (registry + local implementations). Areas consume its interfaces; they do not own it. A missing method is added in a small separate lead-approved commit implementing both sides (fleet-plan conflict rule).
5. **Never delete Hermes UI** until the Phase 5 parity gate passes (skill rule 4; removal is a separate commit afterwards).
6. **Frozen wire names to respect in UI work**: `pane.reveal` pane ids and `layout.apply` preset ids (D-0004, Python `focus_pane_tool.py` + renderer `PANE_REVEALERS`/`LAYOUTS_AREA` must stay in sync), `hermes:desktop:zoomLevel` (D-0005), the 13 server→client request methods incl. `vault.*` and `tour` (D-0006), `approvals.mode`/`reasoning`/`display.*` config keys, storage namespaces `conductor.*` vs `hermes.desktop.*` (D-0011).
7. **Definition of done (fleet-plan, per area)**: UI matches the prototype (or the host screen renders correctly under the Aro skin), local features go through `src/adapters` only, FEATURE_MAP rows updated with evidence, typecheck (`renderer`/`electron`/`e2e`) + eslint + the area's targeted vitest suites pass, the area is exercised in the live harness (D-0013: `hermes serve` + vite renderer + Electron under Xvfb with CDP; re-establish if down), one commit per area, never force-push.
8. **Known harness blockers** (apply wherever cited): no provider API key (FEATURE_MAP Unknown 1), no mic/speakers under Xvfb (D-0019), native dialogs not drivable headless (Unknown 3). Blocked checks are recorded as blocked with their precondition — never claimed.

## 3. Areas

### A0 — Foundations, theming & app identity (Wave 0, order 1st, lead)

**Features (4)**: `themes`, `i18n`, `design-profiles`, `prototype-state-bus`

| id | Status (FEATURE_MAP) | Origin section |
|---|---|---|
| `themes` | wired | Capabilities / system views |
| `i18n` | hermes-only | Capabilities / system views |
| `design-profiles` | local | Prototype-only |
| `prototype-state-bus` | local | Prototype-only |

*Cross-section moves*: `themes`, `i18n` (from Capabilities section) and `design-profiles`, `prototype-state-bus` (from Prototype-only section) are assigned here because their implementation surface is the shared token/type layer, not any feature screen (rule: single file ownership; see §5 shared-file registry).

**Owns (fork-touched)**:
- `apps/desktop/src/aro/tokens.css` — additive `--aro-*` token layer (INVENTORY §9 layer 1)
- `apps/desktop/src/aro/host-theme.css` — `:root[data-aro-ui]` remap + `[data-aro-*]` attribute restyle of unchanged host JSX (INVENTORY §9 layer 2)
- `apps/desktop/src/aro/ui.tsx`, `apps/desktop/src/aro/Icons.tsx` — Aro primitives + icon set consumed by every area
- `apps/desktop/src/styles.css`, `apps/desktop/src/themes/context.tsx`, `apps/desktop/src/themes/presets.ts` — theme pipeline (`hermes-desktop-theme-v2` storage rides on the Hermes theme system, GLOSSARY "Storage")
- `apps/desktop/src/i18n/{ar_assistant.ts, de.ts, en.ts, es.ts, fr.ts, ja.ts, ru.ts, types.ts, zh-hant_assistant.ts, zh.ts}` — host i18n strings incl. Aro additions
- `apps/desktop/src/main.tsx` — app entry: `data-aro-ui`/`data-theme` opt-in for the primary window, `import './aro/register'`
- `apps/desktop/src/global.d.ts`, `apps/desktop/src/types/hermes.ts` — fork wire typing (§G: `aroBridge`, `cloneRepository`, `branchSwitch` create param)
- `apps/desktop/index.html`, `apps/desktop/product-identity.cjs`, `apps/desktop/electron-builder.config.cjs`, `apps/desktop/package.json` — Aro app identity/packaging
- `apps/desktop/electron/{quit-finalization.ts, quit-finalization.test.ts}` — shutdown robustness from the base branch; **no Phase 4 work expected, guarded**

**Must not modify**: everything in §2 rule 2; all files owned by A1–A11. Host component files (`src/components/**` except area-owned) are restyled only through `host-theme.css` selectors.

**Dependencies / expected interfaces**: none (first). Every other area consumes: token classes (`--aro-*`, `--t-*`, `--d-*`), `ui.tsx` primitives, `Icons.tsx`, and requests new `host-theme.css` selectors through the lead (fleet-plan: shared component changes are batched here).

**Acceptance criteria & verification**:
- Theme round-trip on the Hermes theme store (persisted key `hermes-desktop-theme-v2`) with the Aro token layer reacting (status today: settings tree live ✓).
- `data-design` (5 `--d-*` profiles), `data-density`, `data-motion` axes switch without regressions; `design-profiles` stays presentation-only (FEATURE_MAP row).
- i18n smoke in all 9 locales (status: hermes-only, kept — Aro chrome is English-first, host strings translated).
- `conductor:*` / `aro:*` CustomEvent names remain stable (renderer-internal, excluded from WIRE_BASELINE by design; FEATURE_MAP `prototype-state-bus`).
- Tests: existing suites touching theming/i18n stay green; typecheck + eslint clean.

**Blockers / open questions**: none specific. Note: upstream main is 3,125 commits ahead of merge-base (INVENTORY §10.9) — standing divergence risk for token/host-theme selector drift, tracked not solved here.

### A1 — Shell & navigation (Wave 1, order 2nd, lead)

**Features (14)**: `sidebar-shell`, `titlebar`, `product-mode`, `command-palette`, `shortcut-help`, `nav-stubs-skills`, `nav-stubs-connectors`, `session-list-options`, `sessions-tree`, `session-search`, `session-crud`, `telemetry-banner`, `onboarding`, `status-bar`

*Assignment note*: `settings-entry` (same FEATURE_MAP section) is assigned to A11 — settings runs last by design (fleet-plan). The three Chat core rows moved here are rendered by A1-owned files (`AroSidebar.tsx` tree + list menu; `AroTitlebar.tsx` session picker).

| id | Status | Origin section |
|---|---|---|
| `sidebar-shell` | wired | Sidebar / navigation / shell |
| `titlebar` | wired | Sidebar / navigation / shell |
| `product-mode` | wired | Sidebar / navigation / shell |
| `command-palette` | wired | Sidebar / navigation / shell |
| `shortcut-help` | wired | Sidebar / navigation / shell |
| `nav-stubs-skills` | partial | Sidebar / navigation / shell |
| `nav-stubs-connectors` | partial | Sidebar / navigation / shell |
| `session-list-options` | wired | Sidebar / navigation / shell |
| `telemetry-banner` | wired | Sidebar / navigation / shell |
| `onboarding` | wired | Sidebar / navigation / shell |
| `status-bar` | wired | Sidebar / navigation / shell |
| `sessions-tree` | wired | Chat core (moved: rendered by `AroSidebar.tsx`) |
| `session-search` | wired | Chat core (moved: titlebar session picker) |
| `session-crud` | wired | Chat core (moved: rename/delete actions live in `AroSidebar.tsx`) |

**Owns (fork-touched)**:
- `apps/desktop/src/aro/AroSidebar.tsx` (1,535 lines; sessions+projects tree, nav rows, archive toggle) + `apps/desktop/src/aro/sidebar.css`
- `apps/desktop/src/aro/AroTitlebar.tsx` + `apps/desktop/src/aro/titlebar.css` (product switch, session picker trigger, Code/Bots/Open folder/Search⌘K)
- `apps/desktop/src/aro/mode.ts` — product-mode store (`code`/`bots`, `aro:product-mode-changed` event)
- `apps/desktop/src/app/contrib/surfaces.tsx` — `AroSidebar`↔`ChatSidebar` swap seam, plus its test files `apps/desktop/src/app/contrib/{surfaces.app-routes.test.tsx, surfaces.late-routes.test.tsx, surfaces.test.tsx}`
- `apps/desktop/src/app/contrib/controller.tsx` — `AroTitlebar` mount + session drag wiring
- `apps/desktop/src/app/shell/titlebar-controls.tsx`, `apps/desktop/src/app/shell/hooks/use-statusbar-items.tsx`
- `apps/desktop/src/app/chat/sidebar/index.tsx`, `apps/desktop/src/app/chat/sidebar/profile-dropdown-switcher.tsx` (host ChatSidebar fallback, Aro-skinned)

**Custodian (host, read-only unless lead-gated)**: `src/app/command-palette/**`, `src/app/session-picker-overlay.tsx`, `src/app/chat/session-drag.ts`, keybinds store + `src/app/settings` keybinds page (shortcut-help listing), onboarding stores/first-launch wizard, telemetry opt-in surface, `src/app/shell/statusbar-controls.tsx`, `system-resources-statusbar.tsx`, `statusbar-context-menu.tsx` (+tests).

**Must not modify**: `AroProjectDialog.tsx`, `src/app/chat/sidebar/projects/**`, `src/store/projects.ts` (A5-owned — AroSidebar *consumes* them; props are the frozen interface); `src/aro/register.tsx` (A8); A2–A11 owned files; §2 frozen files.

**Dependencies / expected interfaces**: A0 (tokens, `ui.tsx`, `Icons.tsx`, new `host-theme.css` selectors on request). Provides to others: the mount surface every area renders inside; the `mode.ts` product-mode contract consumed by titlebar+sidebar.

**Acceptance criteria & verification**:
- Live: sidebar hierarchy, sessions tree with real session rows + project sub-resource counts, titlebar actions, ⌘K palette with real commands, telemetry banner, status bar (`getConnection()`, branch/cwd) — all already live ✓ in the D-0014 run; A1 must keep them live after its changes.
- **`nav-stubs-skills` / `nav-stubs-connectors` closure decision (D-0016 open choice)**: default = re-point both rows at `#/capabilities` (the live-verified surface) and record the DECISIONS entry; building dedicated view routes is the alternative — either way the rows must stop being highlight-only. This is the one Wave-1 design decision logged as unresolved (see §7).
- `session-search`: picker filters on `session.title` (empty-title sessions don't match — known backend behavior, GLOSSARY field note); `session-crud`: rename/delete via `deleteSession`/`renameSession` (`@/api/sessions`), archive toggle via session list menu.
- Tests: `titlebar.test.ts`, `titlebar-controls.test.tsx`, `statusbar-*.test.*`, `surfaces.*.test.tsx` (note: `surfaces.test.tsx` has a **pre-existing failure** unrelated to the port — Phase 3 report; fix is optional lead-gated work, do not silently skip).

**Blockers / open questions**: nav-stubs choice (above); onboarding wizard is already adopted wholesale (live ✓) — no native-dialog flows needed here.

### A2 — Chat core & transcript (Wave 2, order 3rd, parallel)

**Features (13)**: `chat-send-turn`, `transcript-steps`, `message-error-card`, `streaming-status`, `reasoning-disclosure`, `edit-resend`, `retry-turn`, `stop-steer`, `checkpoint-restore`, `btw-background`, `compaction`, `session-tiles-windows`, `quick-actions`

| id | Status | Origin section |
|---|---|---|
| `chat-send-turn` | wired | Chat core |
| `transcript-steps` | wired | Chat core |
| `message-error-card` | wired | Chat core |
| `streaming-status` | wired | Chat core |
| `reasoning-disclosure` | wired | Chat core |
| `edit-resend` | wired | Chat core |
| `retry-turn` | wired | Chat core |
| `stop-steer` | wired | Chat core |
| `checkpoint-restore` | wired | Chat core |
| `btw-background` | hermes-only | Chat core |
| `compaction` | hermes-only | Chat core |
| `session-tiles-windows` | hermes-only | Chat core |
| `quick-actions` | local | Composer (moved: starter cards render in `components/chat/intro.tsx`) |

**Owns (fork-touched)**:
- `apps/desktop/src/app/chat/{index.tsx, session-header.tsx, session-tile.tsx, scroll-to-bottom-button.tsx}` — chat workspace screen + header/tile/scroll (composer/orb mount seam via `aroModelMenuContent` prop)
- `apps/desktop/src/components/assistant-ui/thread/{assistant-message,index,list,message-parts,status,user-message}.tsx` — transcript row grammar (attributed rows, tool/approval/code cards)
- `apps/desktop/src/components/assistant-ui/tool/approval.tsx` — approval card rendering (server→client `approval` request, D-0006)
- `apps/desktop/src/components/chat/{intro.tsx,shiki-highlighter.tsx}` — chat home (quick-actions starter cards) + code highlighting
- `apps/desktop/src/app/contrib/wiring.tsx` — host event dispatch (fork diff: aro-ui gating)
- `apps/desktop/src/lib/app-persona.ts` — persona avatars

**Custodian (host)**: assistant-ui runtime + `src/store/session*`, `$sessionStates`, `useMessageStream` handlers, prompt-actions/rewind, `session.branch*` calls.

**Must not modify**: `src/app/chat/composer/**` (A3 except `voice-activity.tsx`→A9), `orb.tsx`/`voice-agent-orb.tsx` (A9), A1/A4–A11 files, §2 frozen files. The composer mount seam props are a frozen interface — changes require lead coordination with A3.

**Dependencies / expected interfaces**: A0 (styling), A1 (route/shell mounts the chat screen). Expects from A3: composer component with stable props. Expects from A9: orb components mounted from `chat/index.tsx`. `quick-actions` stays presentation-only local (FEATURE_MAP row: static suggestions; live ✓ rendered).

**Acceptance criteria & verification**:
- Live: send → `session.create` → prompt turn → streamed error card with Retry/Open logs/Send diagnostics (live ✓ 2026-10-10, session `20261010_075711_e591cc`); transcript attributed rows + real timestamps; status narration; checkpoint control on review page. A2 must keep this path live after changes.
- `edit-resend`/`stop-steer`/`reasoning-disclosure` live checks require a completing turn — **BLOCKED on provider credentials** (Unknown 1); wire paths (`session.branch`, `session.interrupt`/`steer`, `thinking.delta`) stay verified by code + unit tests until then.
- Approval card rendering (countdown + 4 choices) verified by unit tests only (Unknown 6) — do not claim live.
- `btw-background`/`compaction`: host behaviors, kept; verify surfaces reachable (`btw.complete` events, `session.compress`).
- Tests: tool-card grammar unit tests (Task 7 suite) + thread suites; typecheck + eslint.

**Blockers / open questions**: provider key (above); `session-tiles-windows` visual state under `data-aro-ui` unverified (Unknown 7 subset — coordinate with A7).

### A3 — Composer & model controls (Wave 2, order 4th, parallel)

**Features (12)**: `composer-editor`, `attachments`, `slash-commands`, `at-path-mentions`, `model-menu`, `reasoning-effort`, `thinking-toggle`, `approval-mode`, `approval-yolo`, `composer-queue`, `external-ide`, `external-editors-list`

| id | Status | Origin section |
|---|---|---|
| `composer-editor` | wired | Composer |
| `attachments` | wired | Composer |
| `slash-commands` | wired | Composer |
| `at-path-mentions` | wired | Composer |
| `model-menu` | wired | Composer |
| `reasoning-effort` | wired | Composer |
| `thinking-toggle` | wired | Composer |
| `approval-mode` | wired | Composer |
| `approval-yolo` | partial | Composer |
| `composer-queue` | wired | Chat core (moved here: `composer/queue-panel.tsx`) |
| `external-ide` | wired | Composer |
| `external-editors-list` | local | Prototype-only (moved here: same control as `external-ide`) |

*Assignment note (rows NOT in this area)*: of the Composer section, the three voice IDs (`voice-dictation`, `voice-orb`, `tts-speak`) belong to A9 and `quick-actions` to A2 (file ownership, §5).

**Owns (fork-touched)**:
- `apps/desktop/src/app/chat/composer/index.tsx` — composer shell (mounts `AroRepoBar` for A4, wires attachments/dictation triggers)
- `apps/desktop/src/app/chat/composer/{aro-model-control.tsx, approval-mode-pill.tsx, context-pill.tsx, env-pill.tsx, context-menu.tsx, controls.tsx, model-pill.tsx, reasoning-pill.tsx, types.ts}`
- `apps/desktop/src/app/chat/composer/hooks/{use-composer-drop.ts, use-composer-placeholder.ts}`
- `apps/desktop/src/app/shell/aro-model-menu-panel.tsx` — effort slider (5-stop, `xhigh→High`/`max→Ultra` folding, `ultra→max` wire clamp — D-0023)
- `apps/desktop/src/app/shell/external-ide-control.tsx` — consumes `adapters.editors` (Phase 3 wiring; same catalog, same `hermes.desktop.external-ide.preferred` key)

**Custodian (host)**: `rich-editor.ts`, `queue-panel.tsx`, `trigger-popover.tsx`, completion drawers (`complete.slash`/`complete.path`), `attachments.tsx`, floating layers, `start-voice-button.tsx`/`voice-menu.tsx`/`voice-fan.tsx`/`voice-engine-rows.tsx` (A9 custodian), `app/shell/{model-menu-panel,model-catalog-menu,model-edit-submenu,model-menu-row-decorations,reasoning-menu-panel,use-model-menu-controller,approval-mode-menu}.ts*`.

**Must not modify**: A2's `chat/index.tsx` (request seam changes via lead), A9's voice files inside `composer/`, `adapters/**` (lead; `editors` consumed), §2 frozen files.

**Dependencies / expected interfaces**: A0 (styling), A2 (mount seam `aroModelMenuContent`), A4 (`AroRepoBar` props frozen — A3 mounts it, A4 owns it), lead (`adapters.editors`: `EDITOR_CATALOG`, `$preferredIde`).

**Acceptance criteria & verification**:
- Live: trusted-Enter send, model control `z-ai/glm-5.2`, effort slider 4 → `data-level="ultra"` (live ✓), approval pill `smart↔manual` round-trip via `config.set {key:"approvals.mode"}` (live ✓), "Add context"/"Attach a project" buttons.
- **`approval-yolo` closure (D-0015 parity gap)**: add `yolo` to the Aro pill menu (currently palette-only). UI-side change in `approval-mode-pill.tsx`; if the host `approval-mode-menu.tsx` must change, that is a lead-gated host edit. Verify by live `config.set` round-trip to `yolo` and back.
- `composer-queue`: queue panel renders + drains on turn end (engine = Hermes; live check needs a completing turn → partially BLOCKED, Unknown 1).
- `attachments`/`slash-commands`/`at-path-mentions`: wire surfaces live; file attach + native pickers not drivable headless (Unknown 3).
- `external-ide` + `external-editors-list`: keep Phase 3 behavior live (preferred-IDE round-trip verified then; `BACKEND-TODO(editors)` markers stay).
- Tests: `approval-mode-menu.test.tsx`, `model-menu-panel.test.tsx`, `model-catalog-menu.*.test.tsx`, `model-edit-submenu.test.tsx`, composer suites (`rich-editor`, `enter-submit-dom-race`, `queue-panel`, `trigger-popover`, …).

**Blockers / open questions**: provider key (queue live check); native dialogs (attach pickers).

### A4 — Workspace panel (right rail) (Wave 2, order 5th, parallel)

**Features (10)**: `workspace-panel`, `files-tree`, `changes-panel`, `terminal-pty`, `plan-tab`, `context-tab`, `git-tab`, `code-search`, `browser-preview`, `usage-analytics`

| id | Status | Origin section |
|---|---|---|
| `workspace-panel` | wired | Workspace panel (right) |
| `files-tree` | wired | Workspace panel (right) |
| `changes-panel` | wired | Workspace panel (right) |
| `terminal-pty` | wired | Workspace panel (right) |
| `plan-tab` | wired | Workspace panel (right) |
| `context-tab` | wired | Workspace panel (right) |
| `git-tab` | wired | Workspace panel (right) |
| `code-search` | local | Workspace panel (right) |
| `browser-preview` | local | Workspace panel (right) |
| `usage-analytics` | wired | Capabilities (moved: surface = Context tab `context-section.tsx`) |

**Owns (fork-touched)**:
- `apps/desktop/src/app/right-sidebar/{index.tsx, store.ts}` — tabbed right panel (6 tabs)
- `apps/desktop/src/app/right-sidebar/{changes-section,context-section,git-section,plan-section,terminal-section}.tsx` + `apps/desktop/src/app/right-sidebar/review/index.tsx` + `apps/desktop/src/app/right-sidebar/{index.test.tsx, context-rail.test.tsx}`
- `apps/desktop/src/app/contrib/{panes.tsx, layout-presets.ts}` + `apps/desktop/src/store/{layout.ts, preview.ts, session-focus.ts}` — pane tree/layout presets
- `apps/desktop/src/components/pane-shell/tree/renderer/strip-visibility.ts` — files tree rendering
- `apps/desktop/src/aro/AroRepoBar.tsx` — git tab repo bar (mounted from A3's `composer/index.tsx`; props frozen)

**Custodian (host)**: fs/tree stores, xterm PTY terminal host, todos store (`todo.updated`), `session.usage`/`session.context_breakdown`, `hermes:git:review:*` host review flow.

**Must not modify**: `adapters/**` (lead; `codeSearch` + `browserPreview` consumed — their stores `$previewTabs`/`$previewViewport` are re-exported through the registry), Python `focus_pane_tool.py` (D-0004: renderer `PANE_REVEALERS`/`LAYOUTS_AREA` must keep resolving the backend's pane ids `chat/files/terminal/review/sessions` and preset ids — restructures stay renderer-side), A3/A5 files, §2 frozen files.

**Dependencies / expected interfaces**: A0 (styling), A1 (right-rail mount), A3 (`AroRepoBar` mount point), lead (`adapters.codeSearch`, `adapters.browserPreview`).

**Acceptance criteria & verification**:
- Live: 6 tabs render + switch; real file tree of cwd; "No modified files" on clean tree; `echo` PTY round-trip; Plan tab empty state; Context tab "0/200k + MCP Connectors 0 + Agent Memory"; Git tab branch/↑↓/clean/worktrees (all live ✓ — keep live).
- **`code-search` + `browser-preview` build-out (local)**: surface the existing adapters as real panel tabs — grep-over-workspace tab and iframe preview tab, persisted via the adapter (survives restart), `BACKEND-TODO(code-search)` / `BACKEND-TODO(browser-preview)` markers at the seams, honest local-only labeling, no mock data presented as backend data. Keep the medium-confidence non-merges (grep tool, right-rail browser) as separate rows (D-0017).
- `usage-analytics`: Context-tab analytics stays live ✓.
- Tests: `right-sidebar/index.test.tsx`, `context-rail.test.tsx`, `routes.workspace-reveal.test.ts` (pane reveal), plus new tab tests.

**Blockers / open questions**: none hard; PTY/preview behaviors are live-verifiable in the harness.

### A5 — Projects & git management (Wave 2, order 6th, parallel)

**Features (4)**: `project-dialog`, `project-clone`, `open-folder`, `project-subresources`

| id | Status | Origin section |
|---|---|---|
| `project-dialog` | wired | Projects / workspace management |
| `project-clone` | wired | Projects / workspace management |
| `open-folder` | wired | Projects / workspace management |
| `project-subresources` | wired | Projects / workspace management |

**Owns (fork-touched)**:
- `apps/desktop/src/aro/AroProjectDialog.tsx` — project create dialog (name/color/folder, live git probe)
- `apps/desktop/src/aro/{project-session-map.ts, project-session-map.test.ts}` — project↔session mapping
- `apps/desktop/src/app/chat/sidebar/projects/overview-row.tsx` (fork-touched)
- `apps/desktop/src/store/{projects.ts, projects.test.ts}` — fork projects store (§G wires: `session.workspace.move`)
- `apps/desktop/src/lib/desktop-git.ts`
- `apps/desktop/electron/{git-ipc.ts, git-worktree-ops.ts}` — §G.1 `cloneRepository`, §G.2 `branchSwitch(…, create)` main-side

**Custodian (host)**: `src/app/chat/sidebar/projects/**` (workspace-groups, worktree-dialog, project-menu, base-branch-picker, workspace-header, project-appearance, entered-content, model) — the components `AroSidebar` (A1) consumes; props are the frozen interface between A1 and A5.

**Must not modify**: A1's `AroSidebar.tsx` (change requests via lead), `electron/preload.ts` (§G surface is closed), §2 frozen files.

**Dependencies / expected interfaces**: A0 (styling), A1 (mount + consumption), A4 (git wire family shared: `hermes:git:repoStatus` etc.).

**Acceptance criteria & verification**:
- Live: dialog renders with validation; project expansion counts (Cron/Messaging/Connections) live ✓ — keep live.
- `project-clone` + `open-folder`: wire channels verified in §G.1/§A; the flows need native dialogs → **BLOCKED headless** (Unknown 3); verify by wire presence + unit tests, record as blocked.
- Tests: `project-session-map.test.ts`, `projects.test.ts`, `overview-row.test.tsx`, `workspace-groups.test.ts`, `project-menu.test.tsx`, `base-branch-picker.test.tsx`, `workspace-header.test.tsx`.

**Blockers / open questions**: native folder pickers (headless); none else.

### A6 — Capabilities & system views (Wave 2, order 7th, parallel)

**Features (10)**: `skills-hub`, `toolsets`, `connectors-hub`, `plugins`, `memory-view`, `artifacts-view`, `cron-view`, `messaging-view`, `profiles-souls`, `subagents`

| id | Status | Origin section |
|---|---|---|
| `skills-hub` | wired | Capabilities / system views |
| `toolsets` | wired | Capabilities / system views |
| `connectors-hub` | wired | Capabilities / system views |
| `plugins` | wired | Capabilities / system views |
| `memory-view` | wired | Capabilities / system views |
| `artifacts-view` | wired | Capabilities / system views |
| `cron-view` | wired | Capabilities / system views |
| `messaging-view` | wired | Capabilities / system views |
| `profiles-souls` | wired | Capabilities / system views |
| `subagents` | wired | Capabilities / system views |

**Owns (fork-touched)**: none. This area's surface is host code rendered under the Aro skin.

**Custodian (host, read-only + lead-gated edits)**: `src/app/capabilities/**` (skills/toolsets/connectors/plugins tabs), `src/app/agents/**` (subagents/spawn tree), `src/app/artifacts/**`, `src/app/cron/**`, `src/app/messaging/**`, `src/app/profiles/**`, and the `src/api/{skills,toolsets,mcp,…}.ts` clients (frozen, consumed).

**Must not modify**: §2 frozen files; everything owned by other areas; restyling happens through A0 `host-theme.css` selectors (requests to lead) — direct host-file edits only when unavoidable, lead-gated.

**Dependencies / expected interfaces**: A0 (restyle selectors), A1 (palette commands navigate here; nav-stubs rows may re-point here per the D-0016 default).

**Acceptance criteria & verification**:
- Live: capabilities tabs (53 skills / 25 tools live ✓ today); **open the four "reachable but not opened" pages** and record results: Memory Graph, Artifacts, Profiles (SOULs), Spawn tree (FEATURE_MAP notes: palette command present, page not opened). Cron + Messaging pages reachable via palette; sidebar counts already live ✓.
- Any rendering defect under `data-aro-ui` becomes a host-theme selector request or a logged defect — statuses only move with live evidence.
- Tests: host suites for these routes stay green; no new fork tests needed unless surfaces change.

**Blockers / open questions**: none hard; all REST endpoints exist in the harness backend.

### A7 — Hermes-only host screens & system services (Wave 2, order 8th, parallel)

**Features (15)**: `starmap`, `hud`, `pet`, `session-windows`, `connections`, `billing`, `vault`, `webhooks`, `notifications`, `updates`, `diagnostics`, `deep-links`, `tray`, `tours-tips`, `session-import`

| id | Status | Origin section |
|---|---|---|
| `starmap` | hermes-only | Capabilities / system views |
| `hud` | hermes-only | Capabilities / system views |
| `pet` | hermes-only | Capabilities / system views |
| `session-windows` | hermes-only | Capabilities / system views |
| `connections` | hermes-only | Capabilities / system views |
| `billing` | hermes-only | Capabilities / system views |
| `vault` | hermes-only | Capabilities / system views |
| `webhooks` | hermes-only | Capabilities / system views |
| `notifications` | hermes-only | Capabilities / system views |
| `updates` | hermes-only | Capabilities / system views |
| `diagnostics` | hermes-only | Capabilities / system views |
| `deep-links` | hermes-only | Capabilities / system views |
| `tray` | hermes-only | Capabilities / system views |
| `tours-tips` | hermes-only | Capabilities / system views |
| `session-import` | hermes-only | Chat core (moved: standalone host screen) |

*Assignment note*: `wake-word` and `gpt-live` (same section) stay in A9 (voice family). Every area here is `hermes-only` (kept, restyled into the nearest Aro home — skill precedence rule 4).

**Owns (fork-touched)**: none.

**Custodian (host)**: `src/app/starmap/**`, `src/app/hud/**` + `floating-hud.ts` (`?win=hud`), `src/app/pet-overlay/**` + `pet-generate/**`, `src/app/webhooks/**`, `src/app/session-import/**`, `src/app/updates-overlay.tsx`, `src/app/settings/billing/**`, `src/app/settings/connections-registry.tsx`, gateway billing REST, main-process prefs for notifications/tray/deep-links, `/api/ops/*` diagnostics surfaces, tour/tips infra.

**Must not modify**: `electron/main.ts` beyond lead-gated fixes (tray/notifications/deep-links live main-side); §2 frozen files.

**Dependencies / expected interfaces**: A0 (restyle selectors — this area is the main consumer of Unknown 7 verification); A2 (error card's "Send diagnostics"/"Open logs" buttons already live ✓ — the doctor/log-tail surfaces they open are verified here).

**Acceptance criteria & verification**:
- **Primary Phase 4 work = close FEATURE_MAP Unknown 7** for these screens: open starmap, HUD (`?win=hud`), pet overlay, webhooks, billing, vault, connections, updates under `data-aro-ui` in the live harness; record render quality per screen; restyle via host-theme requests where broken. This converts "reachable per route registry" into observed evidence (or logged defects) — it does **not** auto-flip any status; hermes-only rows stay hermes-only.
- D-0006 invariants: the renderer keeps answering `vault.*`, `tour`, and the other server→client requests — verify vault prompt + tour request paths still resolve.
- `session-import`: import screen reachable; a real import needs a session file — record as blocked if unavailable.
- Tests: host suites for these routes stay green.

**Blockers / open questions**: utility windows (HUD/pet/popouts) need window-creation checks in the harness; billing/vault may need credentials to go past the landing state — record as observed, don't claim deeper.

### A8 — Aro pages & bridge (Wave 2, order 9th, parallel)

**Features (5)**: `aro-bridge`, `aro-transcript`, `aro-review`, `aro-tasks`, `aro-design`

| id | Status | Origin section |
|---|---|---|
| `aro-bridge` | wired | Aro pages |
| `aro-transcript` | wired | Aro pages |
| `aro-review` | partial | Aro pages |
| `aro-tasks` | partial | Aro pages |
| `aro-design` | local | Aro pages |

**Owns (fork-touched)**:
- `apps/desktop/src/aro/{AroBridgeView.tsx, bridge.ts}` — bridge session UI + `useAroBridge` (§G.3/G.4)
- `apps/desktop/src/aro/{ToolTimeline.tsx, ReviewHunks.tsx, TasksBoard.tsx, DesignSystemAro.tsx, DiffCard.tsx}` — the four pattern pages
- `apps/desktop/src/aro/{register.tsx, live.tsx, workbenchData.ts, toasts.tsx}` — route/nav registration, live-store folding, seed shapes, local toasts
- `apps/desktop/electron/{aro-ipc.ts, aro-ipc.test.ts}` — daemon child process IPC (registered from `electron/main.ts`; the main.ts registration block is shared/lead-gated)

**Custodian (host)**: none significant.

**Must not modify**: `electron/main.ts` beyond the existing aro registration block (lead-gated), `adapters/**` (lead; `tasks` consumed by TasksBoard), §2 frozen files.

**Dependencies / expected interfaces**: A0 (`main.tsx` imports `aro/register`; styling), A1 (sidebar renders the contributed nav rows). Provides: `register.tsx` as the route-registration seam — A10's future surfaces get entries here (or in a sibling side-effect module) via lead-approved commits.

**Acceptance criteria & verification**:
- Live: bridge demo round-trip (thinking → web_search → results → reply) ✓ today on `--engine demo`; the `openai` engine needs an endpoint+key → **BLOCKED** (record).
- **`aro-review` closure (partial)**: page renders with "demo data" until a real diff exists — wire the real review source (`hermes:git:review:*` via `live.tsx` folding) and drop the demo tag when a real workspace diff is present in the harness (make a scratch edit to produce one); checkpoint wire stays.
- **`aro-tasks` status reconciliation (partial)**: user-task persistence is live ✓ (Phase 3: create → badge → reload survival → persisted move); the row's partial status is reconciled in FEATURE_MAP with evidence (user tasks = local adapter, live `todo_list` hook remains in-session; D-0009 separation preserved).
- `aro-design` stays local (design reference; live ✓ rendered).
- Tests: `aro-ipc.test.ts`, `adapters/tasks.test.ts` (consumed), page-level vitest; typecheck + eslint.

**Blockers / open questions**: `--engine openai` credentials; real-diff availability for review (harness can create one).

### A9 — Voice (Wave 2, order 10th, parallel)

**Features (5)**: `voice-dictation`, `voice-orb`, `tts-speak`, `wake-word`, `gpt-live`

| id | Status | Origin section |
|---|---|---|
| `voice-dictation` | wired | Composer (moved: voice family) |
| `voice-orb` | wired | Composer (moved) |
| `tts-speak` | wired | Composer (moved) |
| `wake-word` | hermes-only | Capabilities (moved) |
| `gpt-live` | hermes-only | Capabilities (moved) |

**Owns (fork-touched)**:
- `apps/desktop/src/app/chat/orb.tsx`, `apps/desktop/src/app/chat/voice-agent-orb.tsx` — orb UI (mounted from A2's `chat/index.tsx`; seam frozen)
- `apps/desktop/src/app/chat/composer/voice-activity.tsx` — voice activity indicator in the composer row

**Custodian (host)**: `start-voice-button.tsx`, `voice-menu.tsx`, `voice-fan.tsx`, `voice-engine-rows.tsx`, `useComposerVoice` + `/api/audio/transcribe` adoption, voice-live/wake stores, `src/app/wake-indicator/**`.

**Must not modify**: A2's `chat/index.tsx` (orb mount seam), A3's composer files (voice controls sit in the composer row — prop-level coordination via lead), `adapters/**`, §2 frozen files.

**Dependencies / expected interfaces**: A0 (styling), A2 (orb mount), A3 (composer row placement). `voice-orb` visibility pref stays `conductor.voice.orb` (SETTINGS_MERGE proto-only row).

**Acceptance criteria & verification**:
- Live: orb renders "Aro voice · Idle", dictation button present (already ✓).
- Audio round-trips (dictation → transcript chip; orb conversation; auto-speak) are **BLOCKED headless** (D-0019) — verify wiring (Task 7 adoption) and record blocked checks with the mic/speaker precondition. Do not claim round-trips.
- `wake-word`/`gpt-live`: host features kept; reachability + skin checks only (share A7's Unknown 7 sweep).
- Tests: `voice-activity.test.tsx`, voice host suites.

**Blockers / open questions**: D-0019 (no mic/audio in the sandbox) — the area's live verification is inherently partial; `whisper-local` engine stays unimplemented-advertised (INVENTORY §10.6).

### A10 — Local surfaces, prototype-only UI (Wave 2, order 11th, parallel)

**Features (3)**: `rules`, `agents-adapters`, `onboarding-doctor`

| id | Status | Origin section |
|---|---|---|
| `rules` | local | Prototype-only |
| `agents-adapters` | local | Prototype-only |
| `onboarding-doctor` | local | Prototype-only |

**Owns (fork-touched)**: none yet. Creates new renderer surfaces (proposed homes: `src/aro/RulesView.tsx`, `src/aro/AgentsView.tsx`, doctor sweep inside the onboarding surface or a settings section — placement is an open question below) consuming `adapters.{rules,agents,doctor}` (lead-owned).

**Must not modify**: `adapters/**` (lead), `src/aro/register.tsx` + `src/main.tsx` (registration entries via lead-approved small commits), `adapters/storage.ts` persistence choke point, §2 frozen files.

**Dependencies / expected interfaces**: A0 (styling, registration seam), A8 (register.tsx is the route seam), A11 (runs later; folds `rules` into the settings experience if placement decides so), lead (adapter interfaces: `$rules`, `$customAgents`, `localDoctorAdapter`).

**Acceptance criteria & verification**:
- Each surface: full CRUD per its adapter interface, persists under `conductor.*` (D-0011), survives restart, honest "local" labeling, `BACKEND-TODO(<id>)` markers at the seams, never presented as Hermes data (skill local-adapter rules).
- `onboarding-doctor`: sweep UI reads the local doctor adapter (proto fake-doctor semantics); Hermes `/api/ops/doctor` remains a separate feature (`diagnostics`, A7 — D-0017 non-merge).
- Unit tests per new surface; live render + restart-survival check in the harness.
- **Open question (planning)**: `rules` placement — proto had it as a Settings section, but the port's settings tree is the Hermes overlay. Options: (a) contributed settings section, (b) own route/surface. Default (b) with an A11 follow-up link; decide at implementation with a DECISIONS entry (see §7).

**Blockers / open questions**: placement decision (above); none technical.

### A11 — Settings & preferences (Wave 3, order LAST, serial, lead)

**Features (2)**: `settings-entry`, `model-presets`

| id | Status | Origin section |
|---|---|---|
| `settings-entry` | wired | Sidebar / navigation / shell (moved: runs last by design) |
| `model-presets` | hermes-only | Capabilities (moved: surface = settings tree section) |

Scope beyond the two IDs: fold every SETTINGS_MERGE row into a coherent settings experience — proto-only rows surfaced as local controls (`design`, `density`, `motion`, `voice-orb` — axes from A0; `git-merge` inert record), `both` rows verified against their Hermes keys (`theme`, `keyboard`, `voice-engine`, `voice-language`, `permissions`→`approvals.mode`, `effort-thinking`, `model-provider`, `skills`, `connectors`, `editors`), `hermes-only` rows kept reachable and restyled.

**Owns (fork-touched)**: none.

**Custodian (host)**: `src/app/settings/**` (schema-driven config pages + hand-built pages incl. billing/connections/vault/keybinds), `config.get/set` + `/api/config/schema` round-trips.

**Must not modify**: §2 frozen files; other areas' files; `adapters/**` (lead).

**Dependencies / expected interfaces**: runs **after all other areas** — folds their settings surfaces in: A0 (design/density/motion axes + theme), A3 (model/provider/effort/approvals), A9 (voice prefs), A10 (rules entry point), A7 (billing/vault/connections pages are also settings-tree sections — coordinate verification, don't duplicate). Expects stable adapter/axis interfaces from each.

**Acceptance criteria & verification**:
- Live: full Hermes settings tree renders under the Aro skin (live ✓ today) — keep live after folding.
- Every SETTINGS_MERGE `both` row round-trips against the real backend key in the harness (approval-mode pattern already proven, D-0018: `config.set {key, value}`).
- Proto-only local settings persist + survive restart through A0/A10 interfaces; `whisper-local` is not exposed as working (SETTINGS_MERGE voice-engine note).
- Migration rules honored: Hermes stored values win; `conductor.pref.permission` → `approvals.mode` mapping (`agent→smart`, `full→off`) documented, no cross-namespace writes (D-0011).
- Tests: settings host suites stay green; new fold-in tests where surfaces are added.

**Blockers / open questions**: none hard; provider-dependent settings (API keys) render but cannot be exercised without credentials — record as observed.

## 4. Unmatched feature IDs (explicitly not assigned to any area)

| id | Status | Why unmatched |
|---|---|---|
| `reply-backend-switch` | dropped | Architectural collapse per D-0008 — all replies go through the Hermes gateway; surviving control = Aro Bridge engine switch (A8 owns that surface). No Phase 4 work. |
| `scripted-demo-engine` | dropped | Demo corpus not ported as chat data (D-0008); the bridge demo engine (A8) is the only surviving scripted path. No Phase 4 work. |
| `nextjs-server-routes` | dropped | `/api/chat` and the `/api/workbench/stt` + `/api/workbench/tts` route handlers superseded by gateway + `/api/audio/*` (D-0008); hello route deleted. No Phase 4 work. |
| `dead-template-deps` | dropped | ~40 unused prototype deps, not ported (D-0007). No Phase 4 work. |

These four stay in FEATURE_MAP as contract records. They are not forced into areas and not omitted.

## 5. Shared-file registry (single owner + consumption rules)

| File / module | Owner | Consumers (no ownership) | Consumption rule |
|---|---|---|---|
| `src/aro/{tokens.css, host-theme.css, ui.tsx, Icons.tsx}` | A0 | all areas | import/use only; new `host-theme.css` selectors requested via lead (batched in A0) |
| `src/main.tsx`, `src/styles.css`, `src/themes/**`, `src/i18n/**`, `src/global.d.ts`, `src/types/hermes.ts` | A0 | all areas | import only; type additions for area §G wires via lead-approved commits |
| `src/adapters/**` (incl. `storage.ts`, `index.ts`) | lead (Phase 3 module) | A3 `editors`, A4 `codeSearch`/`browserPreview`, A8 `tasks`, A10 `rules`/`agents`/`doctor` | interface consumption; new methods = small lead-approved commit implementing both sides |
| `src/aro/register.tsx` | A8 | A0 (`main.tsx` import), A10 (future entries) | entries via lead-approved commit |
| `src/app/chat/index.tsx` | A2 | A3 (composer mount, `aroModelMenuContent` prop), A9 (orb mount) | mount-seam props frozen; changes coordinated via lead |
| `src/aro/AroSidebar.tsx`, `src/app/contrib/{surfaces,controller}.tsx` | A1 | — (mount seam for everything) | A5's project components render *inside* AroSidebar via frozen props |
| `src/app/chat/sidebar/projects/**`, `src/store/projects.ts` | A5 | A1 (`AroSidebar` consumes), A4 (git wire family) | props are the A1↔A5 contract |
| `src/aro/AroRepoBar.tsx` | A4 | A3 (`composer/index.tsx` mounts it) | props frozen |
| `electron/main.ts` | frozen (wire surface) | A8 (aro-ipc registration block only) | any change is a logged backend-change request (fleet-plan hygiene) |
| `src/api/**`, `src/sdk/**` | frozen (D-0022) | all areas | never edit |

No file appears in more than one area's **Owns** list (validated, §6).

## 6. Coverage reconciliation (validation results)

Validation method: feature IDs and statuses extracted programmatically from `port/FEATURE_MAP.md` (101 rows) and cross-checked against the per-area assignment tables above; owned-file lists cross-checked against `git diff --name-status 1cb25c3e335a..HEAD -- apps/desktop/` (130 fork-touched files) and each other for duplicates.

| Metric | Value |
|---|---|
| Total feature IDs in FEATURE_MAP | **101** |
| Assigned to areas (exactly once each) | **97** |
| Unmatched (explicit, §4 — all `dropped`) | **4** |
| Duplicate assignments | **0** |
| Status totals (preserved, not changed by this plan) | wired 60 · partial 5 · local 10 · hermes-only 22 · dropped 4 |

| Area | Features | by status (w/p/l/h/d) |
|---|---|---|
| A0 Foundations | 4 | 1/0/2/1/0 |
| A1 Shell & navigation | 14 | 12/2/0/0/0 |
| A2 Chat & transcript | 13 | 9/0/1/3/0 |
| A3 Composer & model controls | 12 | 10/1/1/0/0 |
| A4 Workspace panel | 10 | 8/0/2/0/0 |
| A5 Projects & git | 4 | 4/0/0/0/0 |
| A6 Capabilities & system views | 10 | 10/0/0/0/0 |
| A7 Hermes-only host screens | 15 | 0/0/0/15/0 |
| A8 Aro pages & bridge | 5 | 2/2/1/0/0 |
| A9 Voice | 5 | 3/0/0/2/0 |
| A10 Local surfaces | 3 | 0/0/3/0/0 |
| A11 Settings & preferences | 2 | 1/0/0/1/0 |
| Unmatched (dropped) | 4 | 0/0/0/0/4 |
| **Total** | **101** | **60/5/10/22/4** ✓ |

Cross-section moves (feature ID listed in one FEATURE_MAP section, assigned to a different area for single file ownership — all traceable above): `sessions-tree`, `session-search`, `session-crud`, `composer-queue` (Chat core→A1/A3), `quick-actions` (Composer→A2), `voice-dictation`, `voice-orb`, `tts-speak` (Composer→A9), `session-import` (Chat core→A7), `usage-analytics`, `themes`, `i18n`, `wake-word`, `gpt-live`, `model-presets` (Capabilities→A4/A0/A9/A11), `external-editors-list` (Prototype-only→A3).

Fork-touched file ownership: all 130 files assigned exactly once (A0 26 · A1 14 · A2 15 · A3 14 · A4 17 · A5 9 · A6 0 · A7 0 · A8 13 · A9 3 · A10 0 · A11 0 · lead-owned `src/adapters/**` 17 · frozen wire surface 2: `electron/main.ts` + `electron/preload.ts`). Areas with zero fork-touched files (A6, A7, A11) are host-custodian areas by design — their Phase 4 work is verification + restyle requests, which is exactly why they can run parallel without file conflicts.

## 7. Open planning decisions — defaults recorded (DECISIONS D-0031–D-0034, pre-A0 review 2026-10-11); final confirmation happens in the owning area

1. **nav-stubs placement (D-0016)** — re-point sidebar Skills/Connectors rows at `#/capabilities` (default, **D-0031**) vs. build dedicated view routes. A1 finalizes at implementation; affects A6 only as a navigation target.
2. **`rules` surface placement** — own contributed route (default, **D-0032**) vs. settings section (A10 builds it; A11 links it).
3. **`yolo` pill mechanism (D-0015)** — fork `approval-mode-pill.tsx` only (default, **D-0033**) vs. also editing host `approval-mode-menu.tsx` (lead-gated host edit if the fork-only path fails).
4. **Hermes-only screens with degraded verification** (billing/vault/updates without credentials; HUD/pet utility windows) — record as observed-and-blocked with preconditions (default, **D-0034**), never claimed; a dev-machine Phase 5 pass may re-verify.
5. **Carried contract proposals from Phase 3 — LANDED pre-A0 (D-0026 adapter-layer scope, D-0027 user-task persistence semantics, D-0028 editors-adapter key adoption + WIRE_BASELINE §G.5 recording of `hermes.desktop.external-ide.preferred`; GLOSSARY storage-namespace row updated with the Phase 3 `conductor.workspace.v3.*` keys).** Wire inventory re-confirmed against code + Git history at review time; a second §G storage gap (`hermes.desktop.voice.orb.{visible,open,position}`) was found and recorded (§G.5, **D-0030**).

Dependency conflicts surfaced (not hidden) — see §5/§7: A1 consuming A5-owned components across waves (interface freeze, **D-0029a**); A3/A9 sharing the composer directory (per-file split, **D-0029b**); A10's registration seam living in A8's file (**D-0029c**); approval-yolo possibly needing a host-file edit (**D-0033**); frozen host files (**D-0029d**). All have lead-gated resolution paths consistent with fleet-plan.md.
