# Aro Agent — Phase 7A Frontend Quality Audit & Codex Benchmark

**Audit date:** 2026-10-16<br>
**Mode:** Read-only; no application source or styles were changed<br>
**Result:** Constrained audit with confirmed source-level findings; visual/runtime Codex comparison is blocked
**Scope priority:** Workspace companion panel, model selection and effort control, plus static inventory of the rest of the desktop frontend

## 1. Executive summary

The current checkout contains a broad desktop product: 21 explicitly registered fixed routes, one dynamic session route, a 19-category settings surface, multiple plugin-contributed screens, and a large pane-based shell. The workspace companion panel and Aro model controls are implemented on top of the existing React/Nanostores/Electron architecture rather than as a separate application.

The requested actual Codex desktop reference was unavailable to inspect. Electron was running, but its renderer had no reachable Chrome DevTools Protocol endpoint. A browser opened against the Vite renderer had no Electron preload bridge and stopped at the app's bridge-recovery screen. No Codex app, browser tab, reference screenshot, or reliable desktop renderer was exposed to the audit. Therefore no Codex visual or interaction grade is claimed, and no viewport is reported as visually verified.

Static inspection and targeted UI checks found six actionable items: one P1 workspace Files hook-order defect, three P2 interaction/consistency defects, one P2 test-contract drift, and one P3 naming inconsistency. The targeted UI run passed 49 of 51 tests; the two failures are in model-menu assertions that disagree with the current capability-clamped slider and button semantics. TypeScript typecheck passed. Targeted ESLint reported 19 errors and 25 warnings, including the hook-order finding.

This is a useful Phase 7B remediation specification, but it is **not evidence that the complete UI has passed an exhaustive live audit**. No source fixes were made. The checkout was already dirty before the audit, so the requested clean-tree check and audit commit could not be produced without disturbing pre-existing work.

## 2. Environment, baseline, and evidence limits

### Repository baseline

| Item | Observed |
|---|---|
| Repository | `E:/Projects/SamjuniorsProducts/Aro` |
| Branch | `ui-port/2026-10-09` |
| HEAD | `12bf4c82d617dbe12245a21b14ea9aa6d3763139` |
| RC1 | `e0bd719591` exists in history |
| Commits after RC1 | 10 |
| HEAD message | `feat(desktop): align Antigravity workspace tabs, launchpad, overview auto-open, and theme stability` |
| Initial working-tree status | 9 modified files before report creation |
| Audit source changes | None |
| Audit commit | None |

The initial modified files were `apps/desktop/DESIGN.md`, `src/app/chat/composer/aro-model-control.tsx`, `src/app/right-sidebar/index.tsx`, `src/app/shell/aro-model-menu-panel.tsx`, `src/app/shell/external-ide-control.tsx`, `src/app/shell/model-catalog-menu.tsx`, `src/aro/host-theme.css`, `src/aro/tokens.css`, and `src/aro/ui.tsx`. The observed findings apply to the working tree as it stood at audit start. Some relevant model and workspace changes are uncommitted; preserve them during Phase 7B and review their diffs separately from committed history.

The reports are the only new files created for this audit. The working tree is expected to remain dirty with the nine pre-existing files plus these two reports. It was not cleaned and no commit was made, because doing so would overwrite or absorb user work.

### Runtime and reference

- Host: Windows 11 Pro, build 26300; one 1920×1080 display was available. The actual Aro app-window dimensions were not captured.
- Aro Electron main process, renderer, Vite development server, and Hermes server were observed running. The renderer's advertised debugging port did not accept a connection and no CDP listener was found on the checked ports.
- Directly opening the Vite renderer in a browser produced “Desktop IPC bridge is unavailable.” That browser has no Electron preload, so this is an inspection limitation, not a confirmed Aro runtime defect.
- The Codex desktop surface inventory returned no apps or tabs. Product version/build, window size, workspace modes, settings, interactions, and screenshots are all **BLOCKED**.
- No reference screenshot or Aro Electron screenshot was captured. Do not treat the browser recovery page as a product screenshot.

### Sources inspected

Required port documents and desktop guidance were read: `.agent/hermes-ui-port/SKILL.md`, `port/AREA_PLAN.md`, `port/FEATURE_MAP.md`, `port/INVENTORY.md`, `port/WIRE_BASELINE.md`, `port/DECISIONS.md`, `port/PARITY_REPORT.md`, root and port `PHASE_6B_REPORT.md`, `apps/desktop/AGENTS.md`, and `apps/desktop/src/AGENTS.md`. Prior reports predate the current HEAD and are context only, not proof of current runtime behavior.

Current source was inventoried in `apps/desktop/src/app`, route/contribution registration, settings metadata, workspace panel, model selector, and Aro theme/token files. The component-level source review focused on eight named components: `RightSidebarPane`, `FilesystemTab`, `WorkspaceLaunchpad`, `ContextSection`, `AroModelMenuPanel`, `EffortSliderRow`, `ModelCatalogMenu`, and `AroModelControl`. A full manual source review and live interaction of every component was not possible in this constrained environment.

## 3. Frontend architecture and ownership

- Electron owns the desktop window and narrow preload/IPC bridge; the renderer is a Vite/React desktop application.
- The renderer uses React, Nanostores for shared state, a contribution registry for routes and navigation, Tailwind/CSS, a host theme layer, and Aro-owned tokens/primitives. Existing Hermes screens and wire contracts remain within the host app.
- `src/app/routes.ts` owns core route classification and contributed route handling. Aro routes register through `src/aro/register.tsx`; the Kanban plugin registers its own route and navigation contribution.
- The workspace panel is rendered by `src/app/right-sidebar/index.tsx`, with state in `right-sidebar/store.ts` and domain-specific tabs in separate components. It is a secondary workspace pane, distinct from the primary sessions/sidebar navigation.
- Model selection is composed from the chat composer control, shell model menu, model catalog, model-options/capability resolution, and session state. The effort UI has five discrete buttons and an HTML range input.
- Settings are assembled from hand-built views plus config-driven sections and contributed appearance areas. Persistence and form behavior are spread across the settings controllers and existing gateway/config adapters.
- `src/aro/tokens.css`, `src/aro/host-theme.css`, `src/aro/ui.tsx`, and `apps/desktop/DESIGN.md` define and apply Aro's visual layer. Theme/design/density/motion compatibility exists in source and prior project documents; it was not exercised live during this audit.

## 4. Route inventory

The registry contains **21 fixed destinations** (12 core, 8 Aro-contributed, 1 bundled plugin) plus the dynamic session route. Runtime-loaded plugins can add more routes.

| Route | Source owner / view | Audit status |
|---|---|---|
| `/` | Core new session/chat | Registry inventoried; renderer blocked |
| `/:sessionId` | Core stored session/chat | Dynamic route inventoried; renderer blocked |
| `/session-import` | Core import overlay | Registry inventoried; renderer blocked |
| `/settings` | Core settings overlay | 19 categories inventoried; renderer blocked |
| `/command-center` | Core command center | Registry inventoried; renderer blocked |
| `/capabilities` | Core capabilities | Registry inventoried; renderer blocked |
| `/messaging` | Core messaging | Registry inventoried; renderer blocked |
| `/webhooks` | Core webhooks overlay | Registry inventoried; renderer blocked |
| `/artifacts` | Core artifacts | Registry inventoried; renderer blocked |
| `/cron` | Core scheduled jobs overlay | Registry inventoried; renderer blocked |
| `/profiles` | Core profiles overlay | Registry inventoried; renderer blocked |
| `/agents` | Core agents overlay | Registry inventoried; renderer blocked |
| `/starmap` | Core Starmap overlay | Registry inventoried; renderer blocked |
| `/aro-design` | Aro design-system reference | Contribution inventoried; renderer blocked |
| `/aro-transcript` | Aro tool timeline | Contribution inventoried; renderer blocked |
| `/aro-review` | Aro hunk review | Contribution inventoried; renderer blocked |
| `/aro-tasks` | Aro task board | Contribution inventoried; renderer blocked |
| `/aro-agent` | Aro Bridge event stream | Contribution inventoried; renderer blocked |
| `/aro-rules` | Aro Rules | Contribution inventoried; renderer blocked |
| `/aro-agents` | Aro Agents | Contribution inventoried; renderer blocked |
| `/aro-doctor` | Aro Doctor | Contribution inventoried; renderer blocked |
| `/kanban` | Bundled Kanban plugin | Contribution inventoried; renderer blocked |

This is a source route inventory, not a claim that 22 views were opened and visually reviewed.

## 5. Component and screen inventory

There are **580 `.tsx` files** under `apps/desktop/src/app`, **461 test files** under that app tree, 16 CSS files under `src`, and 2,801 `.ts`/`.tsx`/`.css` source files across `apps/desktop/src`. These are file counts, not unique visual-component counts. The following directories cover the current application surface:

| Area | TSX files | Included surface |
|---|---:|---|
| Chat | 205 | Composer, transcript, message/tool cards, voice, chat controls |
| Settings | 99 | Settings shell, categories, fields, providers, credentials, appearance |
| Session | 61 | Session state and session-facing views |
| Capabilities | 39 | Plugins, tools, skills, connectors and related pages |
| Right sidebar | 33 | Files, review, terminal, search, browser, plan, context, Git, launchpad |
| Shell | 32 | Titlebar, status bar, model/gateway controls and shell menus |
| Contributions | 20 | Route, pane, toolbar, and extension wiring |
| Other app areas | 91 | Agents, artifacts, overlays, profiles, cron, messaging, webhooks, Starmap, etc. |

The 21 fixed routes and the dynamic session route are enumerated above. All workspace panel tabs are identified in the interaction audit below. Remaining route trees and component files were counted and grouped from the filesystem but were not individually rendered or reviewed line by line. This limitation must remain visible in any Phase 7B planning that depends on claiming a full production sign-off.

## 6. Codex comparison matrix

The actual Codex application was unavailable, so the reference is not guessed from memory, web screenshots, or this product's own design documents. **Completed Codex comparisons: 0.** “Not verified” means neither side was compared live.

| Comparable surface | Aro visual | Aro behavior | Codex reference / comparison |
|---|---|---|---|
| Shell, titlebar, window controls | Not verified | Not verified | Blocked |
| Primary navigation and session list | Not verified | Not verified | Blocked |
| Main conversation and transcript | Not verified | Not verified | Blocked |
| Composer, attachments, voice, send/stop | Not verified | Not verified | Blocked |
| Model/provider menu and effort selector | Not verified | Automated subset only | Blocked |
| Secondary workspace panel and positioning | Not verified | Automated subset only | Blocked |
| Files and project tree | Not verified | Not verified live | Blocked |
| Review and diffs | Not verified | Not verified live | Blocked |
| Terminal | Not verified | Existing focused tests ran only indirectly | Blocked |
| Search, browser, plan, context, Git tabs | Not verified | Not verified live | Blocked |
| Projects, creation, clone/open-folder flows | Not verified | Not verified live | Blocked |
| Dialogs, popovers, command palette, overlays | Not verified | Not verified live | Blocked |
| Capabilities, plugins, skills, connectors | Not verified | Not verified live | Blocked |
| Settings, all categories and persistence | Not verified | Metadata only | Blocked |
| Aro Bridge, Review, Tasks, Design, Rules, Agents, Doctor | Not verified | Metadata only | Not comparable in parts; benchmark blocked |
| Loading, empty, error, success, disabled states | Not verified | Some source/test states only | Blocked |
| Responsive and reduced-motion behavior | Not verified | CSS inspection only | Blocked |

No “better than Codex,” “at Codex level,” or “below Codex” grade is supported by evidence in this environment. Product coherence therefore remains unscored.

## 7. Settings audit

Static metadata identifies **19 top-level categories**: Model, Chat, Appearance, Workspace, Safety, Browser, Memory & Context, Voice, Advanced, About, Billing, Connections, Gateway, Keybinds, Keys, Notifications, Providers, Sessions, and Vault.

The source defines 45 named subpage entries across the 9 config sections and 6 secondary settings views: Appearance 6; Model 4; Chat 2; Workspace 3; Safety 3; Browser 2; Memory 2; Voice 3; Advanced 6; Gateway 3; Keybinds 3; Notifications 2; Sessions 2; Vault 2; About 2. Billing has its own capability-gated overview/plans flow. Settings search and deep-link mapping are also present in source.

This is an inventory, not a behavioral validation. No settings category was opened in the real Electron renderer. Theme changes, design profiles, density/motion, provider save/clear/reveal flows, unsaved edits, reset, dialog confirmation, persistence after restart, search/deep links, and cross-setting interactions are **untested live**. The current source and older reports expose no basis to claim those transitions pass or fail today.

## 8. Design-system audit

Source evidence shows a tokenized Aro layer with semantic color and surface variables, typography/font use, control/panel/overlay radii and shadows, focus-ring variables, motion timing/easing, and dark/light host integration. `host-theme.css` includes shared control and focus styling, scroll styling, composer/shell/panel styles, reduced-motion rules, and workspace-rail container queries. The workspace rail adapts at 440px and 340px container width; a <=760px media rule compacts titlebar search and transcript padding.

The audit did not measure rendered contrast, token coverage, computed styles, layout geometry, dark/light parity, design-profile parity, or repeated component appearance across routes. It therefore cannot declare the design system mature or consistent end to end. CSS contains both shared tokenized rules and substantial surface-specific rules; a full duplicate/hard-coded-value inventory remains unverified. No broad “replace the design system” proposal is justified by this evidence.

## 9. Interaction and state audit

### Secondary workspace panel

The panel exposes eight tool tabs: Files, Review/Changes, Terminal (or `powershell.exe` on Windows), Search, Browser, Plan, Context, and Git; its plus button opens Launchpad. It reads the active project/session context, workspace file tree, review state, git status, todos, task/subagent status, and browser/terminal adapters. Selected section and open tabs persist separately under `conductor.workspace.panel.section` and `conductor.workspace.panel.openTabs`. The panel has close, refresh, external-IDE, and fullscreen controls; fullscreen is panel-scoped and Escape exits.

Static source indicates horizontal tab overflow, scrolling, and container-query compaction rather than a fixed viewport breakpoint for the panel itself. The panel's real open/closed, flip, resize, fullscreen, tab switching, persistence-after-reload, and empty/loading/error states were not manually exercised because Electron's renderer could not be inspected. Existing tests include panel, file tree, review, and persistent terminal behavior, but the targeted panel test does not cover the default tab/focus path or the Files workspace transition.

### Model selector

The composer control opens an Aro model menu and catalogue; selection is routed through a controller and live model/provider/session state. The effort control has Minimal, Low, Medium, High, and Ultra quick-pick buttons, clamps to detected model/gateway support, and exposes a range slider plus Thinking switch. `AroModelControl` bounds the menu width against the viewport in the current dirty working tree. Provider/model selection and error/dismiss behavior were not exercised in Electron.

### Lifecycle test coverage and gaps

The targeted test run covered 51 cases in the workspace panel and three model-menu files; 49 passed and 2 failed. It was not a comprehensive interaction count for the app. Manual interactions performed against the real Aro Electron renderer: **0**. The following requested lifecycles remain unverified live: open/close/reopen/resize; route switch while panel stays mounted; focus restoration; viewport collision for menus; Escape/outside-click behavior; stacked overlays; project/session switching; empty/loading/error/success feedback; and persistence after application restart.

## 10. Animation and motion audit

Source contains short state transitions for the effort thumb, controls, active navigation rows, composer/menu surfaces, and a `prefers-reduced-motion` rule. Motion duration/easing values exist as Aro variables. No real transition was captured, interrupted, repeated, or measured. Route transitions, panel resizing/expansion, tool streaming, toast timing, animation layout shift, and reduced-motion behavior remain **not verified**. No decorative animation change is recommended without seeing the actual states.

## 11. Responsive and visual audit

The only measured display environment was 1920×1080; this is the monitor resolution, not the app-window size. None of the requested sizes—1920×1080, 1600×900, 1440×900, 1280×800, 1024×768, 768×1024, or 390×844—was exercised in the actual renderer. Consequently no overlap, clipping, horizontal overflow, tooltip collision, or dialog-fit claim can be confirmed or ruled out.

Positive source signals: workspace tabs use a scrollable strip; the rail has 440px/340px container adaptations; external IDE text controls hide at narrow rail width; titlebar search and transcript padding adapt under a 760px media query; model dropdown width is capped against viewport width. These source rules need a real window-resize pass, especially at 1024px and below and with the secondary pane at its minimum/maximum widths. A 390px browser rendering without the preload is not a valid substitute for a desktop window.

## 12. Accessibility and interaction quality

Static inspection shows accessible labels and pressed state on model and workspace controls, focus-visible styles, Escape handling for fullscreen, and a keyboard handler intended to navigate the workspace rail with arrows/Home/End. Two workspace-specific problems are in the issue register: the default active Files section can lack a rendered tab, and the tab rail's `role=group` has no tab stop when every child has `tabIndex=-1`. In that state its keyboard handler cannot receive focus-driven arrow events and the body region's `aria-labelledby` references a missing element.

The model effort choices are a labeled button group using `aria-pressed`, rather than radios; that is a valid pattern if keyboard focus remains operable. The test querying them as radios is out of sync. Range focus appearance and screen-reader value text exist in source, but focus-ring visibility, contrast, scaling, pointer targets, actual tab order, focus restoration, screen-reader output, and dialog focus trapping were not audited live.

## 13. Functional integration audit

Static traces show the right panel reading Nanostores and calling the existing workspace tree, terminal, review, Git, project, preview, and session adapters. The model UI reads capability and session state and delegates model selection to the existing controller. No backend behavior or wire contract was modified.

These are source traces, not end-to-end proof. Real persistence, network/IPC requests, errors, event-listener cleanup, cross-session/project isolation, and resulting UI state were not driven through Electron. The Vite fallback overlay is an **environment limitation**. No fake functionality or backend limitation is asserted without a reachable runtime.

## 14. Console, runtime, and automated checks

| Check | Result |
|---|---|
| `npm run typecheck` in `apps/desktop` | Passed, exit 0 |
| Targeted Vitest: right sidebar + Aro model menu + model catalog | 3 files; 49 passed, 2 failed; exit 1 |
| Targeted ESLint on right sidebar/model-menu/model-catalog source | 44 findings: 19 errors, 25 warnings; includes `react-hooks/rules-of-hooks` at `right-sidebar/index.tsx:506,508` |
| `git diff --check` | Passed on the audited diff |
| Electron renderer console/network/React error inspection | Blocked; no CDP connection |
| Cross-route full UI suite/build | Not run; audit used focused existing checks and did not run a build command that may clean or regenerate renderer output |

The two UI test failures are in `aro-model-menu-panel.test.tsx`: line 118 expects range `max="4"` for the default Claude fixture, while current capability resolution renders `max="3"` (High); line 147 queries role `radio`, while the current control renders labeled buttons with `aria-pressed` in a group. These appear to be test-contract drift from the current implementation, but the intended model contract should be confirmed before tests are changed. They do not by themselves prove a broken model selection flow.

ESLint formatting/style findings beyond the hook-order violation are not individually elevated to user-facing defects here. No automated accessibility scanner was run.

## 15. Screenshots and reproduction evidence

No screenshot is included: there was no usable Electron renderer or Codex reference surface, and no image should be fabricated. Findings use source line evidence and the real targeted test output instead.

## 16. Prioritized issue register

### ARO-UI-001 — Files tab violates React hook ordering

- **Severity / category:** P1 — runtime correctness / React lifecycle.
- **Route / component:** New or existing session with secondary workspace pane open; `RightSidebarPane` → `FilesystemTab`.
- **Reproduction:** Keep the Files section mounted, render without a workspace, then open or attach a project (or reverse the transition). `FilesystemTab` returns at lines 491–503 before calling `useState` and `useMemo` at lines 506–512; the next render has a different hook count.
- **Expected:** Workspace changes update the file view without crashing the panel.
- **Actual:** Hook count changes between renders; React's Rules-of-Hooks violation can produce “Rendered more hooks than during the previous render.” Targeted ESLint reports errors at lines 506 and 508.
- **Evidence / affected files:** `apps/desktop/src/app/right-sidebar/index.tsx:491-512`.
- **Root cause:** State and memo hooks are placed below a conditional early return.
- **Suggested correction:** Keep all hooks unconditional and branch only in the returned JSX, or split the empty state into a child component. Add one regression case for no-workspace → workspace and one for the reverse within the same mount.
- **Regression risk:** Preserve the empty “Open folder” action, file-filter reset expectations, and tree selection when the workspace changes.
- **Screenshot:** Not available; source and lint evidence.
- **Codex comparison:** Blocked.

### ARO-UI-002 — Default active Files view has no matching tab or tab stop

- **Severity / category:** P2 — keyboard accessibility / state consistency.
- **Route / component:** Any chat with the secondary workspace panel; `RightSidebarPane` and workspace tab store.
- **Reproduction:** Clear `conductor.workspace.panel.section` and `conductor.workspace.panel.openTabs`, then open the panel. Store defaults to section `files` but open tabs `changes` and `terminal`. Both rendered main tabs and Launchpad receive `tabIndex=-1` because none is active. The tab rail itself is a non-focusable `role=group`. The body labels itself with `panelTabId('files')`, which has no corresponding tab element.
- **Expected:** The active section is represented by a focusable, named navigation control, and the body region references an existing label.
- **Actual:** No workspace-tab button is in the tab order; the arrow-key handler is unreachable from keyboard focus, and the region's `aria-labelledby` target is missing.
- **Evidence / affected files:** `right-sidebar/store.ts:64-96`; `right-sidebar/index.tsx:288-357,403-408`.
- **Root cause:** Default selected section and default open-tab list are initialized independently and are inconsistent.
- **Suggested correction:** Normalize the active section into the open-tab set during initialization, then use one documented tab/button-group keyboard model with an always-valid focus target and accessible region label.
- **Regression risk:** Keep persisted closed tabs closed, retain Launchpad semantics, and preserve keyboard behavior after closing the active tab or restoring old storage.
- **Screenshot:** Not available; reproducible from initial store values.
- **Codex comparison:** Blocked.

### ARO-UI-003 — Launchpad search promises results it does not search

- **Severity / category:** P2 — interaction clarity / empty state.
- **Route / component:** Workspace Launchpad; `WorkspaceLaunchpad`.
- **Reproduction:** Open New Tab and type a filename, plugin, subagent, artifact, or task name (for example, `README`).
- **Expected:** Search covers the advertised entities or the field describes its actual scope; no-match results explain that nothing matched.
- **Actual:** The placeholder says “Search tabs, files, plugins, subagents, artifacts, tasks…”, while the filter searches only eight hard-coded tab/action labels and descriptions. The result area maps an empty list to no content and has no empty-result message.
- **Evidence / affected files:** `right-sidebar/launchpad.tsx:41-108,122-129,142-145`.
- **Root cause:** Search copy implies a global entity search, but the implementation is a tab/action filter.
- **Suggested correction:** Either wire real indexed destinations into the query or narrow the placeholder to “Search workspace tools” and add a clear no-results state.
- **Regression risk:** Keep Enter activation deterministic and preserve current action ordering/keyboard behavior.
- **Screenshot:** Not available; source evidence.
- **Codex comparison:** Blocked.

### ARO-UI-004 — Effort presets and range slider use different horizontal scales

- **Severity / category:** P2 — model-control usability / visual consistency.
- **Route / component:** Chat composer model menu; `EffortSliderRow`.
- **Reproduction:** Select a model capped at High (effective index 3), then compare the High quick-pick button with the range thumb at its maximum.
- **Expected:** The same reasoning level occupies the same apparent position in both controls, or the controls communicate that their scales are independent.
- **Actual:** Quick picks always use five equal columns. The range input's max becomes `effectiveMaxIdx`, so High (index 3) maps to the range's far-right endpoint while the High button remains the fourth of five columns. This mismatch repeats for other capped models; it is visible in the HTML/CSS geometry, though not screenshot-verified here.
- **Evidence / affected files:** `shell/aro-model-menu-panel.tsx:245-299`; `aro/host-theme.css:1398-1422,1445-1490`.
- **Root cause:** The discrete row retains five fixed positions while the native range rescales its full travel to the model's supported maximum.
- **Suggested correction:** In Phase 7B, choose one shared position mapping for the quick picks, track/thumb, fill, and maximum label. Keep unsupported levels clearly disabled and retain model-specific clamping.
- **Regression risk:** Validate mouse, keyboard, screen-reader value, thinking-off, unsupported-model, and gateway-limited behavior across max indices 0–4.
- **Screenshot:** Not available; static geometry evidence only.
- **Codex comparison:** Blocked.

### ARO-UI-005 — Model-menu UI tests no longer match current control semantics

- **Severity / category:** P2 — regression protection / test contract.
- **Route / component:** Chat composer model menu; `AroModelMenuPanel` tests.
- **Reproduction:** Run the focused UI command documented above.
- **Expected:** Tests assert the selected model's capability limit and accessible control pattern.
- **Actual:** One test expects `max="4"` for a Claude model whose current capability maximum is High/index 3; another expects a `radio` role where the component now intentionally emits button controls with `aria-pressed`. These two cases fail; 49 other targeted cases pass.
- **Evidence / affected files:** `shell/aro-model-menu-panel.test.tsx:113-120,143-150`; implementation `shell/aro-model-menu-panel.tsx:245-299`; two local Vitest failures.
- **Root cause:** Test assertions were not updated with the current model-specific range and button-group semantics. Confirm the intended contract before revising them.
- **Suggested correction:** Make the test model/capability explicit and assert the correct max; query the controls by button name and assert `aria-pressed`, or restore radio semantics if that is the chosen product contract.
- **Regression risk:** Avoid weakening the test so that unsupported effort levels can be selected or slider clamping goes untested.
- **Screenshot:** Not available; test output is evidence.
- **Codex comparison:** Blocked.

### ARO-UI-006 — Context workspace tab is labeled “Plugins”

- **Severity / category:** P3 — information architecture / naming.
- **Route / component:** Workspace Context tab; `SECTION_CONFIG.context` → `ContextSection`.
- **Reproduction:** Open the tab labeled Plugins.
- **Expected:** The tab label names the content and its accessible name consistently.
- **Actual:** The tab says “Plugins”; its body shows a Context window gauge, MCP Connectors, and Agent Memory.
- **Evidence / affected files:** `right-sidebar/index.tsx:79-91`; `right-sidebar/context-section.tsx:74-167`.
- **Root cause:** The tab label and the rendered panel content describe different concepts.
- **Suggested correction:** Rename the tab and any related search action to Context, or change the body only if a true Plugins view is intended. Confirm translations and persisted tab IDs remain stable.
- **Regression risk:** Keep internal `context` ID and stored user preference compatible if only display labels change.
- **Screenshot:** Not available; source evidence.
- **Codex comparison:** Blocked.

### Severity totals

| P0 | P1 | P2 | P3 |
|---:|---:|---:|---:|
| 0 | 1 | 4 | 1 |

## 17. Duplicate and inconsistent component inventory

No duplicate React component implementation was proven from the limited source sample. Known consistency gaps found in the inspected surfaces:

1. Workspace tab active/focus/region-label state does not share a single initialization invariant (ARO-UI-002).
2. Effort quick-pick and range controls describe one model but use different horizontal scales (ARO-UI-004).
3. Context tab name and panel body content diverge (ARO-UI-006).
4. Model-menu test semantics and current accessible implementation diverge (ARO-UI-005).
5. Aro shared primitives/theme overrides coexist with host UI primitives and contribution styles; full duplication and CSS collision analysis is unverified, so no additional duplication is claimed.

## 18. Missing states and interactions to cover in Phase 7B verification

The source review and existing tests do not establish the following end-to-end outcomes:

- Workspace project attach/detach while Files remains mounted; tab behavior for every old/new persisted-section combination.
- Focus entry, arrow/Home/End navigation, close-tab focus restoration, and a valid accessible name for the body.
- Launchpad no-result, global entity search expectations, search clear, Enter activation, and query focus restoration.
- Rail resizing across 440px/340px, title truncation, close affordances, external IDE visibility, full-screen, flipped side, and panel close/reopen.
- Every panel tab's empty/loading/error/success state and persistence after route and application restart.
- Model choice across bounded and unbounded capabilities; provider changes; failure notification; menu keep-open/close; slider mouse/keyboard; Thinking on/off; and model/gateway support changing while menu is open.
- All settings save, reset, unsaved-change, confirmation, and persisted-theme states.
- Dialog/menu viewport collision, outside click, Escape, stacking, and focus restoration.
- Full responsive runs at the seven requested window sizes.
- Light/dark and alternate density/design profiles; reduced-motion transitions.
- Console, request failures, unhandled rejections, React error overlays, and listener cleanup in Electron.

These are **untested**, not confirmed defects.

## 19. Proposed remediation architecture for Phase 7B

Keep the current separation: the shell owns pane position and visibility; `right-sidebar/store.ts` owns persisted panel selection; each panel tab owns its real adapter; model controls continue to use the model capability resolver and session controller. Remediation should be incremental and preserve backend contracts.

1. Fix `FilesystemTab` hook ordering and add transition coverage for workspace appearing/disappearing in the same mount.
2. Normalize default section and open tabs as a single store invariant, then settle the accessible pattern (tabs with proper tab/tabpanel semantics, or a button group with consistent roving focus). Ensure keyboard users can enter the rail on every storage state.
3. Decide whether Launchpad is a global launcher or a tab/action picker. Make the search implementation, empty state, labels, and Enter behavior match that one contract.
4. Share a single effort-level position mapping between quick picks and range input. Preserve the backend capability/gateway clamp and accessible announcements.
5. Align Context tab labeling with its actual Context/MCP/Memory content.
6. Update model-menu behavior-contract tests for capability-specific maxima and the selected accessible pattern; do not merely loosen expectations.
7. Open Aro through its actual Electron renderer and inspect Codex desktop at the same time. Capture matching screenshots and compare at 1920×1080, 1600×900, 1440×900, 1280×800, 1024×768, 768×1024, and 390×844 only if the app intentionally supports that narrow layout.
8. Complete live testing for panel lifecycle, menus/dialogs, settings, and existing route states before making any broad style or architecture changes.

## 20. Regression risks

- Existing user preference keys contain panel section and tab state. Avoid renaming internal IDs or invalidating persisted selections when fixing the default state.
- Panel hidden-state behavior keeps panes mounted. Hook fixes must preserve terminal/session lifecycle and avoid resetting expensive state unnecessarily.
- The selected session/project supplies workspace data; do not leak a previous project's tree into the newly focused workspace.
- Model support comes from capability data plus provider/model heuristics and route-wire clamping. UI alignment changes must not broaden selectable reasoning values.
- The tree, review pane, terminal, browser preview, and plugin pages depend on existing adapters and pane contributions. Keep these integrations and wire contracts unchanged.
- Theme overrides are scoped by Aro activation and interact with host design tokens; verify dark/light and reduced-motion behavior after any CSS change.
- The nine pre-existing dirty files belong to the user’s in-progress work. Reconcile them intentionally before applying or committing Phase 7B changes.

## 21. Final frontend quality assessment

**Codex parity:** Not assessable; 0 live comparisons completed.<br>
**Current confirmed product issues:** 1 P1, 3 P2 interaction/consistency issues, 1 P3 naming issue.<br>
**Automated test contract issue:** 1 P2 finding with two failing assertions.<br>
**Audit coverage:** route and settings metadata inventoried; 8 named components reviewed in source detail; no full app visual pass.<br>
**Runtime states:** Aro Electron and Codex renderer states not inspectable in this session; 0 manual app interactions; 0 screenshots.<br>
**Overall status:** Incomplete for visual sign-off, actionable for planning. Do not claim the frontend meets Codex quality until the actual reference and Aro renderer can be inspected and the blocked states are exercised.

### Required summary counts

| Metric | Count / status |
|---|---|
| Fixed routes inventoried | 21, plus 1 dynamic session route |
| Routes visually opened | 0 |
| App TSX source files inventoried | 580 |
| Named components reviewed in source detail | 8 |
| Manual interactions on real Aro app | 0 |
| Automated targeted test cases run | 51 (49 pass, 2 fail) |
| Settings categories inventoried | 19 (0 opened live) |
| Codex comparisons completed | 0 (reference blocked) |
| P0 / P1 / P2 / P3 | 0 / 1 / 4 / 1 |
| Main blocked areas | Codex reference, Electron renderer inspection, screenshots, all live viewport and settings flows |

**Phase stop:** The two report files are the only audit deliverables created. No source code, styles, tests, or configuration were edited. No commit was created. Stop here and wait for the Codex reference/access needed to close the Phase 7A benchmark gaps and explicit authorization to begin Phase 7B fixes.
