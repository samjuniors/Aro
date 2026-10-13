# Port DECISIONS (append-only log)

Format: decision, reason, alternatives, reversibility. One entry per decision made during any phase. Append-only — never edit existing entries.

---

## Phase 0 (Discovery)

**D-0001 — Wire baseline source = merge-base tree `1cb25c3e335a`, not upstream HEAD, not the working tree.**
- Reason: user directive ("take the wire baseline from the original Hermes UI (upstream or git history), not the half-ported tree") + the fork's backend is merge-base + fork commits; upstream HEAD (3,125 commits ahead) contains wire the fork's backend does not have, and the working tree contains Aro-only changes.
- Alternatives: upstream HEAD (rejected: would list wire the fork cannot serve); current tree (rejected: would launder half-ported changes into the "original" contract).
- Reversibility: high (document-only; re-extract from another commit if the base moves).

**D-0002 — Fork-added wire surface (aroBridge IPC, `hermes:git:cloneRepository`, `branchSwitch` create param, `aro.jsonl/1` protocol) is recorded in WIRE_BASELINE §G and treated as allowed extensions of the baseline.**
- Reason: these are already in production use on this branch (AroBridgeView, project dialog/git picker); removing them would break working features. The skill's "the port may only call things on the baseline" is honored by keeping §G a closed, explicit list.
- Alternatives: exclude them entirely (rejected: would force removal of working features, violating resume mode); fold into §A–F silently (rejected: would corrupt the "original Hermes" baseline).
- Reversibility: high (move entries between sections as needed).

**D-0003 — Resume mode confirmed; existing in-renderer port architecture adopted (runtime skill Option B de facto).**
- Reason: skill "Mode detection" — the port is underway with prototype UI rebuilt inside the Hermes React/Vite renderer (4-layer graft: additive `--aro-*` tokens, `host-theme.css` attribute restyle, mount-seam component swaps, contributed `/aro-*` routes); `apps/desktop/src/api` + `src/sdk` are byte-identical to merge-base, proving wire discipline. Prototype has near-zero server coupling (4 thin route handlers + fonts — all movable), so neither Option A (static export) nor Option C (Next server in Electron) is warranted.
- Alternatives: Option A static export (rejected: duplicate build pipeline, loses Hermes renderer runtime); Option C (rejected: heaviest, no server-only need).
- Reversibility: medium — final runtime decision is formally Phase 2 work; this records the evidence and continues the existing approach. Any change would need a dedicated migration.

**D-0004 — `pane.reveal` pane names and `layout.apply` preset ids are backend-visible UI names; keep the Python-side enum and renderer-side maps in sync when restructuring the workspace UI.**
- Reason: `tools/focus_pane_tool.py:9` hardcodes `PANES = ("chat","files","terminal","review","sessions")`; renderer resolves via `src/store/pane-focus.ts` `PANE_REVEALERS`. The Aro workspace panel restructure renames UI surfaces; the wire values must not drift or the backend tool breaks (returns tool_error for unknown pane).
- Alternatives: none viable silently. A deliberate rename is possible only as an atomic both-sides change logged here first.
- Reversibility: low once the ported UI ships — treat as a frozen contract.

**D-0005 — `hermes:desktop:zoomLevel` localStorage key preserved (only main↔renderer storage coupling).**
- Reason: Electron main reads/writes it via `executeJavaScript` as the legacy mirror of `zoom-state.json` (main.ts:7071/7116; zoom.ts:9). Renaming breaks zoom recovery on pre-JSON installs.
- Alternatives: drop the mirror (possible later, needs a deprecation pass — not in this port's scope).
- Reversibility: medium.

**D-0006 — Server→client request methods (13) must keep being answered by the ported UI.**
- Reason: `approval`, `sudo`, `secret`, `vault.*`, `clarify`, `terminal.read`, `preview.act/read`, `window.read`, `tour`, `display.install.sudo` are backend-initiated RPCs the renderer answers; unanswered requests get `-32601` declines — backend survives but features (approvals, vault prompts) degrade. The Aro UI must route these to Aro-styled prompts/cards.
- Reversibility: high (UI-side only).

**D-0007 — Prototype dead template dependencies are not ported.**
- Reason: ~40 of ~50 prototype package.json deps (full shadcn/ui set, zustand, framer-motion, prisma + db.ts, next-auth, react-query, dnd-kit, recharts, etc.) have zero imports; they are sandbox scaffolding. The fork's desktop app already has its own equivalents where needed.
- Alternatives: port them (rejected: dead weight, licensing review burden).
- Reversibility: high.

**D-0008 — Prototype L4 route handlers resolved as: `/api/chat` → Hermes gateway (L3; SOUL-flavored SYSTEM_PROMPT text preserved as an agent-config artifact, not a runtime dependency); `/api/workbench/stt` → Hermes `/api/audio/transcribe` (already wired in Task 7) with the browser-engine fallback kept client-side; `/api/workbench/tts` → Hermes `/api/audio/speak` with the ≤1000-char chunk-splitting logic portable to a local adapter if needed; `/api` (hello) → dropped.**
- Reason: skill Local-adapter rules + precedence rule 1 (backend correctness). Exact adapter boundaries get formalized in Phase 3.
- Reversibility: high.

**D-0009 — TasksView (user tasks per project) and Hermes todos (agent plan) are NOT the same feature.**
- Reason: only signal 4 (naming-ish similarity) — prototype tasks are user-managed project checklists persisted locally; Hermes `todo.updated` is the agent's own plan during a turn. Per phase0-discovery §4, low-confidence pairs are not merged.
- Alternatives: merge into one entity (rejected: would delete user data semantics or change agent behavior).
- Reversibility: high (can revisit in Phase 1 FEATURE_MAP with user input if desired).

**D-0010 — `hermes:sync-status`/`getSyncStatus` recorded as dead wire at merge-base (handler exists, preload never wired). Not removed, not ported; marked UNKNOWN whether upstream re-added it.**
- Reason: record-don't-assume (skill rule 6).
- Reversibility: high.

**D-0011 — Prototype storage namespace (`conductor.*`, `aro.*`) and Hermes namespace (`hermes.desktop.*`, `hermes:desktop:*`) are disjoint; both are kept as-is in the port.**
- Reason: zero collisions verified; presentation-layer keys are free to differ from wire names (skill naming layers), and keeping the prototype keys makes the Aro view code portable without rewrites.
- Reversibility: high (a future unified settings store would migrate values, not names).

**D-0012 — Feature runtime status is UNKNOWN until the port runs against a live Python backend.**
- Reason: skill resume mode: "a feature's status comes from running it against the real backend". Sandbox has no Hermes Python venv; Task 7 verified render + unit tests only. INVENTORY §9 marks live behaviors UNKNOWN rather than claiming them.
- Reversibility: n/a (fact recording).

## Phase 1 (Contract)

**D-0013 — Live-backend verification harness established in-sandbox; Phase 1 statuses determined by running the real app, not by reading code.**
- Reason: skill resume mode requires feature status from running against the real backend; Phase 0 had marked this UNKNOWN (no Python toolchain). Solved by: `uv python install 3.14` + `uv venv .venv` at repo root (exactly the interpreter path Electron's source-python ladder looks for) + `uv pip install -e .`; launched `hermes serve --host 127.0.0.1 --port 0` (backend 127.0.0.1:38541, ledger pid 18023); `npm install` at repo root; vite renderer on 127.0.0.1:5174; Electron under `Xvfb :97` with CDP 9222. Electron attach-first found the running serve and connected the renderer WS with the session token.
- Alternatives: continue with UNKNOWN statuses (rejected: user directive + skill rule); tests-js mock lane (rejected: mock is not the real backend).
- Reversibility: high (harness only; no repo code changed; .venv/node_modules untracked).

**D-0014 — Feature status evidence = observed behavior in the live run (2026-10-10); no successful model turn exists (provider credentials absent).**
- Reason: `model.options` reports `model:"z-ai/glm-5.2"` but `providers:[]` and no API key exists in the sandbox. The send path was still fully exercised: composer → trusted-Enter → session `20261010_075711_e591cc` created (`message_count:1, source:"desktop"`) → turn dispatched → backend error streamed back → Aro error card with Retry/Open logs/Send diagnostics. Chat completion remains UNKNOWN (needs provider key or Nous free tier `/login`); the wire path is proven.
- Alternatives: ask user for an API key (not a hard stop — verification achieved without it; credentials are only required for the *positive* turn, which Phase 5 can do on the dev machine).
- Reversibility: high.

**D-0015 — Approval modes: Aro pill exposes `smart`/`manual`/`off` only; `yolo` reachable solely via palette "Toggle yolo". Prototype `readonly`/`plan` modes have no Hermes approval-mode counterpart and are not merged.**
- Reason: `approval-mode-pill.tsx` APPROVAL_MODES (3) vs Hermes `approvals.mode` domain (smart/manual/off/yolo). Live round-trip verified: pill → `config.set {key:"approvals.mode"}` → backend `/api/config` flips smart↔manual → pill updates. Parity gap (yolo missing from pill) logged for Phase 4; prototype-only modes dropped from the pill per precedence rule 3.
- Alternatives: add yolo to the pill now (deferred: Phase 4 UI work, contract phase records only); map readonly/plan to toolsets (rejected: speculative backend change).
- Reversibility: easy (UI-side addition).

**D-0016 — Sidebar Skills/Connectors nav rows are highlight-only stubs (`activeNav` state, no rendered view). The capabilities page is the real, verified surface for both.**
- Reason: live run — clicking the rows only toggles `aria-current`; `AroSidebar.tsx:870` has no view branch for them. `#/capabilities` renders Skills 53 / Tools 25 / Connectors / Plugins from the backend (live ✓). Wiring the rows (routes or re-pointing at capabilities) is a Phase 4 decision, recorded as an open choice.
- Alternatives: none needed now (record, don't build in a contract phase).
- Reversibility: high.

**D-0017 — Low/medium-confidence pairs are NOT merged; each side is listed as its own feature (user directive: merge only high-confidence matches).**
- Pairs kept separate: user Tasks (proto) vs agent todos (D-0009); Rules (proto) vs SOULs/profiles (Hermes); AgentsView adapters (proto) vs subagents (Hermes); CodeSearchView (proto) vs grep tool (Hermes); BrowserView iframe (proto) vs right-rail browser/`preview.*` (Hermes); onboarding doctor sweep (proto) vs `/api/ops/doctor` (Hermes); sandbox pref (proto) vs Connections (Hermes).
- Reason: signals are 3–4 only (purpose/naming), no shared wire or data shape; merging would either delete user-data semantics or change backend behavior (skill hard-stop territory if forced).
- Reversibility: high (a later phase may merge with evidence).

**D-0018 — Wire param shape verified live: `config.set` takes `{key, value}` (my `{path, value}` probe was rejected; the ported UI uses the correct shape — proven by the approval-mode round-trip).**
- Reason: record-don't-assume; corrects nothing in the baseline (WIRE_BASELINE §C already derives from code), but now has runtime proof.
- Reversibility: n/a (fact).

**D-0019 — Voice/dictation/TTS statuses: controls + engine wiring present; live audio round-trips UNKNOWN (headless Xvfb, no mic/speakers).**
- Reason: "Voice dictation" composer button, voice orb ("Aro voice · Idle · click to open") render; `/api/audio/transcribe` + `/api/audio/speak` wiring adopted from Task 7; actual capture/playback cannot be exercised in this sandbox. Recorded as UNKNOWN, not guessed.
- Reversibility: n/a (fact).

**D-0020 — GLOSSARY scope: only terms that cross the adapter boundary or map features; presentation-only names (component/CSS class names) are excluded.**
- Reason: skill naming layers — component names never reach the backend; enumerating them would bloat the contract without adding wire safety.
- Alternatives: full component-name map (rejected: no contract value).
- Reversibility: high.

**D-0021 — Aro pages status: `/aro-agent` bridge = wired (full daemon round-trip: thinking → web_search tool → results → reply, demo engine); `/aro-review` and `/aro-tasks` = partial (pages render with honestly-labeled "demo data"; review wire exists, tasks has a live `todo_list` hook).**
- Reason: live run 2026-10-10. The bridge demo engine is by design (`--engine demo`); the openai engine is the real path.
- Reversibility: n/a (status recording).

**D-0022 — Wire discipline re-verified under load: the whole live session ran through the ported UI with zero wire additions or renames; attach-first connected to the externally-spawned serve instance.**
- Reason: supports Phase 5's parity gate in advance; `src/api/*` + `src/sdk/*` remain untouched.
- Reversibility: n/a (fact).

**D-0023 — Effort mapping recorded: Aro 5-stop slider (Minimal/Low/Medium/High/Ultra) over Hermes `REASONING_EFFORTS` (minimal…ultra), with `xhigh→High` and `max→Ultra` presentation folding and `ultra→max` wire clamp on OpenAI-compatible routes.**
- Reason: `aro-model-menu-panel.tsx` EFFORTS + `reasoning-effort.ts`; live ✓ slider value 4 → pill `data-level="ultra"` with description swap. Prototype's "effort 0–4" is the same 5-stop control.
- Reversibility: high (presentation-only).

## Phase 1 (Contract) — post-review corrections

**D-0024 — SETTINGS_MERGE case-value reconciliation (user review, 2026-10-10): a prototype setting whose control is intentionally not carried forward is Case `hermes-only` (the Hermes counterpart is what the port surfaces; the non-carry is stated in Resolution), not `both`; a surviving locally persisted prototype control is `proto-only`. FEATURE_MAP header corrected to the actual row count: 101 features (wired 60 · partial 5 · local 10 · hermes-only 22 · dropped 4).**
- Rows corrected to `hermes-only`: `reply-backend` (architectural collapse, D-0008; surviving controls = Aro Bridge page engine switch, fork wire §G), `ask-destructive`, `checkpoints`, `network`, `terminal-sandbox`, `terminal-timeout` (proto prefs were write-only), plus `gateway` (proto section was an empty state, `Settings.tsx` `Gateway()`) and `usage` (read-only local display). Corrected to `proto-only`: `voice-orb` (real local pref `conductor.voice.orb`, read by `VoiceAgent.tsx:37`/`Titlebar.tsx:59`; engine = Hermes). Evidence: grep of `prototype/src` — `conductor.pref.{askDestructive,checkpoints,network,merge,sandbox,timeout}` written by `Settings.tsx` only, no reader; `aro.backend` consumed only by prototype `live.ts`. Also fixed: two malformed table rows (unescaped pipes in code spans — FEATURE_MAP `nextjs-server-routes`; GLOSSARY effort-ids row) and a loose §C/§F citation (→ §C–F).
- Reason: Case cells contradicted their own Resolutions ("No settings row in the port" vs Case `both`; "both (separate surfaces)" is not an allowed value); skill contract-templates allows exactly `proto-only`/`hermes-only`/`both`; user rule: no invented features to match the old 102 header — the header was corrected to the recounted rows instead.
- Alternatives: add a `dropped` case value for settings (rejected: skill vocabulary is the three values; non-carry documented in Resolution instead); invent a missing feature row to reach 102 (rejected: fabrication).
- Reversibility: high (documentation only; no code or wire touched).

**D-0025 — Phase 2 (Runtime shell) SKIPPED in resume mode; proceed to Phase 3 (Adapter Layer).**
- Reason: skill resume-mode rule — "Skip Phase 2 if the prototype already launches inside Electron (launch it to verify)." Evidence: (1) runtime choice already made and logged (D-0003: Option B — prototype UI inside the Hermes React/Vite renderer); (2) the ported UI launches and runs inside the Hermes Electron shell with preload + IPC bridge in place — verified live 2026-10-10 (D-0013 harness: `hermes serve` :38541 + vite renderer :5174 + Electron under Xvfb :97 / CDP 9222; D-0014 full chat wire path; D-0022 zero wire additions); (3) re-checked at review time — the harness is still up: Electron window "Aro" serving `#/20261010_075711_e591cc`, backend HTTP 200. INVENTORY §5 server-only usage list: none blocking. No Phase 2 requirement is unmet; nothing to redo.
- Alternatives: rebuild the runtime shell to re-verify (rejected: skill forbids re-doing what already works in resume mode; user directive "do not recreate the runtime shell or build a second renderer").
- Reversibility: high (Phase 3 can start from the existing harness).

## Phase 3 (Adapter Layer) — landed from the Phase 3 report proposals (2026-10-11)

**D-0026 — Adapter-layer scope: `src/adapters/` formalizes the 7 contract `local` areas (tasks, rules, agents, editors, code-search, browser-preview, doctor) plus the storage choke point and registry; the 60 wired areas run through the adopted host layer BY REFERENCE, not through adapters.**
- Reason: the wired rows already run through the adopted host layer (`src/api` + `src/sdk` + stores, byte-identical to merge-base — D-0022); wrapping them would rewrite working code, which resume mode forbids. The two fork surfaces that had hand-rolled or non-persisted local state (TasksBoard user tasks, external-IDE preferred key) were wired through the boundary in Phase 3 (commit `db4f5b78a7`). `adapters/index.ts` documents the wired areas by reference so the registry stays the single seam inventory.
- Alternatives: wrap every feature area (rejected: rewrite of working wire code); adapters for the 60 wired areas only (rejected: no translation need exists — no glossary renames cross that boundary today).
- Reversibility: high (registry swaps one area at a time; any wired area can gain an adapter later if it needs translation, as `editors` did).

**D-0027 — User-task persistence semantics (Phase 3): user tasks persist at `conductor.workspace.v3.tasks` through the `lib/storage` choke point and survive restart; agent todos (`todo.updated`) remain in-session and are NEVER persisted by the port.**
- Reason: preserves the D-0009 separation — TasksBoard user tasks are local-adapter state (restart-safe, BACKEND-TODO(tasks) markers at the seams), while the agent's plan is backend-owned turn state. Board merge order: live todos > your list > demo corpus; status translation (board columns ↔ prototype statuses) lives in the wiring layer.
- Alternatives: persist agent todos too (rejected: would change agent-data semantics / backend behavior — skill hard-stop territory).
- Reversibility: high.

**D-0028 — Editors adapter adopts the existing fork key `hermes.desktop.external-ide.preferred` unchanged (same catalog, same key, same behavior); the key is recorded in WIRE_BASELINE §G.5.**
- Reason: the pre-Phase-3 control already used this `hermes.desktop.*` key (fork commit `93ff2d2910`); moving it to `conductor.*` would orphan stored user values, and the key is renderer-side presentation state that matches Hermes's desktop-namespace convention. Phase 3 kept behavior identical (live round-trip verified 2026-10-10: VS Code click → key set → label reacts → reload survives).
- Alternatives: rename to a `conductor.*` key (rejected: orphans existing values); leave unrecorded (rejected: the wire inventory must reflect the code — §G.5 now records it).
- Reversibility: low for the key name (frozen once users hold values), high for the adapter wrapper.

## Phase 4 (pre-A0 review) — AREA_PLAN approved in principle; contract decisions landed before any area implementation (2026-10-11)

**D-0029 — AREA_PLAN.md approved in principle (user review). Its change-control rules are binding for all areas: (a) A1↔A5 — `src/app/chat/sidebar/projects/**` + `src/store/projects.ts` are A5-owned; `AroSidebar` consumes them via frozen props; any change to the props interface is lead-gated. (b) A3/A9 composer split is per-file — `voice-activity.tsx` is A9-owned, the rest of `composer/**` is A3-owned; prop-level changes coordinate through the lead. (c) A10's registration entries land in A8-owned `src/aro/register.tsx` only via small lead-approved commits implementing both sides. (d) Frozen host files (AREA_PLAN §2 rule 2: `electron/preload.ts`, `src/api/**`, `src/sdk/**`, Python backend dirs, `prototype/**`, `apps/web`, `website/`, `ui-tui/`) are never edited by areas; host restyling goes through A0's `host-theme.css` selectors requested via the lead.**
- Reason: user review directive — resolve ownership boundaries before A0; fleet-plan.md conflict rules; AREA_PLAN §5 shared-file registry.
- Alternatives: none (this records the AREA_PLAN rules as confirmed; deviations need a new decision).
- Reversibility: high (documented; amendable by a later decision).

**D-0030 — Wire inventory confirmed against actual code and Git history (pre-A0). Findings: §G.1–G.4 verified line-exact against the CURRENT tree; `src/api/**` + `src/sdk/**` unchanged vs merge-base (empty diff); every other `hermes.desktop.*` literal in fork-touched files is a merge-base §F.2 key; `aro.*`/`conductor.*` fork keys excluded by design (D-0011). One additional §G recording gap found and closed: `hermes.desktop.voice.orb.{visible,open,position}` (fork commit `93ff2d2910`, `voice-agent-orb.tsx`) — recorded in §G.5 alongside `hermes.desktop.external-ide.preferred` (D-0028).**
- Reason: user review directive ("confirm the wire inventory against actual code and Git history"); skill rule 6 — record, don't assume. Sweep method: all `hermes.*` storage-like literals in the 130 fork-touched files, each checked for merge-base presence via `git grep` at `1cb25c3e335a`.
- Alternatives: none (fact recording).
- Reversibility: high (documentation only).

**D-0031 — nav-stubs closure default (D-0016 / AREA_PLAN §7.1): re-point both sidebar Skills and Connectors rows at `#/capabilities` (the live-verified surface), recorded as the agreed default. A1 finalizes at implementation; dedicated view routes remain the alternative if A6's restyle pass produces evidence for them.**
- Reason: capabilities is live-verified (Skills 53 / Tools 25, D-0014 run); building dedicated routes would duplicate a working surface. User review directed recording the agreed default before area implementation.
- Alternatives: dedicated view routes (deferred until evidence).
- Reversibility: high (UI-side only).

**D-0032 — `rules` placement default (AREA_PLAN §7.2): own contributed route (proposed `src/aro/RulesView.tsx` via the A8 register seam), with an A11 follow-up link from settings. A10 finalizes at implementation with its own entry if it deviates.**
- Reason: the port's settings tree is the Hermes overlay — a contributed settings section would require host-file surgery; an own route matches the existing contributed-route pattern (`/aro-*` pages).
- Alternatives: contributed settings section (rejected as default: host-file edits).
- Reversibility: high.

**D-0033 — approval-yolo pill mechanism default (D-0015 parity gap / AREA_PLAN §7.3): implement in the fork-owned `approval-mode-pill.tsx` (A3) only; the host `approval-mode-menu.tsx` is edited only if the fork file cannot express the fourth mode, and then as a lead-gated host edit. A3 verifies by a live `config.set {key:"approvals.mode"}` round-trip to `yolo` and back.**
- Reason: A3 owns the pill; host edits are the exception path (fleet-plan hygiene; AREA_PLAN §2 rule 2).
- Alternatives: edit the host menu in the same pass (deferred: lead-gated only if the fork-only path fails).
- Reversibility: high.

**D-0034 — Blocked-verification policy (AREA_PLAN §7.4 / §2 rule 8): any check that cannot run in this harness (provider-key turn completions, mic/speaker audio, native dialogs, credential-gated screens) is recorded as BLOCKED with its precondition and is never claimed; a dev-machine Phase 5 pass may re-verify them.**
- Reason: skill rule 6 (never guess) + honest parity gate; keeps FEATURE_MAP statuses movable only by live evidence (D-0012/D-0014).
- Alternatives: defer all blocked checks to Phase 5 (rejected: each area must record what it could and could not see, or the verifier cannot distinguish untested from untestable).
- Reversibility: high.

**D-0035 — A1 nav-stubs closure executed (D-0031 default confirmed) + rename-modal Enter-submit fix.** The sidebar Skills and Connectors rows now navigate to the capabilities page on their own tab (`/capabilities?tab=skills`, `/capabilities?tab=connectors`) via `navigateToWorkspacePage` (covers the re-click workspace-pane reveal), with route-derived active state so `aria-current="page"` is truthful; the Settings row gains the same route-derived active contract; the Projects row keeps its highlight toggle (its destination is the in-sidebar projects tree, not a routed view — not a contracted stub; revisit if a projects route ever lands). Both nav-stubs rows move partial→wired with live harness evidence (2026-10-12). Live verification also surfaced that the rename modal's untyped ghost Cancel button (HTML default `type="submit"` inside the form) hijacked Enter's implicit submission — fixed by `type="button"` on all four modal Cancel buttons (session rename/delete, project rename/delete). Alternatives considered: keeping pure-toggle highlights (rejected: rows stayed dead ends), building dedicated Skills/Connectors views (rejected for A1: capabilities is the live-verified surface; revisit at A6). Reversible: single-file revert of AroSidebar.tsx.

**D-0036 — A2 tool-card presentation: the prototype ToolCard grammar renders INSIDE the live transcript as an A2-owned wrapper over the unchanged host engine.** `thread/aro-tool-card.tsx` supplies the prototype header (20px tone icon tile, mono uppercase label, mono target, running dot / duration / `failed` badge, chevron, hover-reveal dismiss) and mounts the host `ToolFallback` (tool/fallback.tsx, untouched — host file) as the body engine, with its own disclosure header visually retired via scoped Tailwind variants. Open/closed state drives the SAME persisted disclosure store (`toolEntryDisclosureId` + `$toolDisclosureOpen`), so the approval card's jump-to-tool, run grouping, and prefs stay coherent. The host's null guards (dismissed rows; diff-less completed file edits) are replicated in the wrapper from the same exported pure functions. Hermes run-grouping behavior (summary lines, live ticker, collapse) is presentation-density behavior for real 30+-call turns and is KEPT (the prototype's card-per-tool assumption doesn't scale to real transcripts); error-status cards and inline-diff cards default open per the prototype. Reason: precedence rule 3 (prototype UI + Hermes wiring) without rewriting working host code (fleet-plan hygiene; resume-mode adoption). Alternatives: restyle the host file (rejected: A2 does not own `tool/fallback.tsx`); CSS-only card chrome via host-theme (rejected: per-tool tone/label/target need DOM data the host doesn't expose); card-per-tool without run summaries (rejected: worse for real turn density). Reversibility: high (single seam revert in message-parts.tsx).

**D-0037 — Approval-card affordances that depend on data the Hermes approval payload does not carry are NOT faked.** The prototype ApprovalCard's risk-level badge (high/medium/low), `rule:` caption, and 18s auto-deny countdown are demo-data constructs; the real `ApprovalRequest` wire payload carries only `command`, `description`, `choices`, `allowPermanent`, `smartDenied` — no risk field, no deadline. Porting them would be prototype-only state presented as real application data (forbidden). What WAS ported: the action row moved to the Aro button grammar (Deny=danger, Run=success+check, options=outline; confirm-dialog footer matched) with the 4-choice wire semantics (`once`/`session`/`always`/`deny`), the `data-approval-*` Enter-drain keybind hooks, and the confirm gate on `always` unchanged. Reason: honest-state policy (D-0014/D-0034) + skill local-adapter rules. Alternatives: compute a countdown from `approvals.timeout` config (rejected: timeout semantics on the backend are not guaranteed equivalent to a renderer-side deadline — a guess); add risk heuristics client-side (rejected: invention). Reversibility: high (UI-side only); a backend change adding these fields can restore the affordances later.

**D-0038 — Lead-batched host-theme repair: the Phase-3 "Center View" block referenced four custom properties that do not exist** (`--aro-panel-raised`, `--aro-border`, `--aro-text`, `--aro-text-secondary`; tokens.css defines `--aro-raise`/`--aro-line`/`--aro-ink*`). Invalid-at-computed-value-time unset the declarations, so under `data-aro-ui` the fresh-suggestion chips lost their background/border and the FindBar lost its surface. Fixed by deleting the broken duplicate chip rules (the earlier, prototype-accurate `.fresh-suggestion` block at :1223 governs), setting the container margin to the prototype's 12px, and repairing the FindBar rules to the real token names. Landed as a separate lead commit before the A2 area commit. Reason: A0-owned shared file (AREA_PLAN §5); the bug directly degraded A2's `quick-actions` surface; fleet-plan "shared component changes: lead batches them". Alternatives: leave broken (rejected: visible defect in an A2 feature); fix inside the A2 commit (rejected: muddies area attribution/revert). Reversibility: high (document-only risk; CSS isolated).

**D-0039 — approval-yolo closure uses the REAL backend mechanism: the session-scoped `yolo` config key, not a fourth `approvals.mode` value; D-0015's domain claim is corrected.** Backend truth (`hermes_cli/approval_mode.py` `VALID_APPROVAL_MODES`, `tui_gateway/server.py` `_APPROVAL_MODES`, REST schema `web_server_config.py`): `approvals.mode` ∈ {manual, smart, off} exactly — a fourth value is rejected with gateway error 4002. YOLO is a separate switch (`tui_gateway/methods_config_set.py` `_set_yolo`): `config.set {key:"yolo", session_id, value:"1"|"0"}` for the session-scoped TUI-Shift+Tab flag (backed by `tools/approval.py` `_session_yolo`; `session.info yolo` echo; hardline `_floor_block` — catastrophic commands, interpreter self-delete, sudo-stdin, `approvals.deny` rules — runs BEFORE the bypass), `scope:"global"` flips persistent `approvals.mode` off↔manual, and the `yolo` key is now recorded in WIRE_BASELINE §C.1 (it was merge-base wire §C.1 originally failed to list — same gap class as D-0030). Implementation (A3, `approval-mode-pill.tsx`): a YOLO toggle row below the 3 modes (prototype `ui.tsx Toggle` grammar — see D-0040) + a hardline-floor footer; the read is per-surface (`$sessionStates[sid].yolo`, the `session.info` mirror — never the global `$yoloActive`, which reflects the active session and would lie in tiles); the write is `setSessionYolo` for surfaces with a session and `setYoloEnabled` (local arming, applied at session-create by use-session-actions) for fresh drafts, with the arm disabled while another session is active (the armed flag is global). Verified live 2026-10-13: arming round-trip + pill zap indicator + aria; session-scoped write by direct gateway probe on a live runtime (`{"key":"yolo","value":"1","scope":"session"}`); in-app write on a live agent session remains provider-blocked (D-0034 — a UI-created session's agent dies at the first prompt without a provider key, and the write then 4001s with an honest error toast). Alternatives: add `yolo` as a fourth pill mode value (rejected: the backend rejects the write — would present fake state); expose only the global toggle (rejected: session scope is the backend's actual semantics and the pill is session-scoped UI). Reversibility: high (single-file UI revert; statuses movable by the recorded live evidence).

**D-0040 — Radix `Switch` rendered inside `DropdownMenuContent` never receives its click handler in the real renderer; in-menu toggles use the prototype's plain-button toggle instead.** Diagnosed live in the A3 harness (2026-10-13): trusted CDP clicks and synthetic `.click()` on a Radix Switch inside the composer's model menu produced full native event chains (pointerdown→click, none default-prevented, correct hit target) but `onCheckedChange` never fired, while `DropdownMenuItem` onClick handlers in the SAME open menu fired reliably; calling the fiber's `onCheckedChange` directly drove the full state pipeline, isolating the break to Radix's in-menu switch dispatch. jsdom suites never caught it (`fireEvent` bypasses the portal-event path that fails in the real renderer). This silently killed the host model menu's Thinking row since the Phase-3 port (thinking-toggle was "present; not exercised" — now understood). Fix (A3-owned files): both `aro-model-menu-panel.tsx` (Thinking) and `approval-mode-pill.tsx` (YOLO) render the prototype's own `Toggle` grammar — a plain `<button role="switch" aria-checked>` with a sliding-knob span, colors `bg-aro-iris`/`bg-aro-line-strong` — which dispatches reliably and carries the same ARIA switch semantics. Live-verified: both toggles now flip on real clicks (Thinking off→on drives the closed pill chip "Off"/"Med"; YOLO arming round-trip). Reason: precedence rule 2 (the prototype's control IS a plain button) + the smallest honest fix for a real renderer defect. Alternatives: keep Radix Switch and debug its portal-event dispatch (rejected: blocking A3 on an upstream-bug rabbit hole when the prototype's primitive is correct and simpler); use a `DropdownMenuItem` row (rejected for toggles: closes the menu on every flip, unlike the prototype's in-menu toggle). Reversibility: high (self-contained per file). Follow-up for the lead/verifier: any OTHER Radix Switch/interactive control rendered inside a Radix menu/popover content in the port should be audited for the same dead-click defect (A9's voice menus, A11's settings surfaces are candidates); a dev-machine Phase 5 pass should re-verify.

**D-0041 — A4 workspace panel tab extensions: `code-search` and `browser-preview` build-out (local) + section persistence.** The right-rail Workspace Panel (A4) expands from 6 to 8 tabs (`files`, `changes`, `terminal`, `search`, `browser`, `plan`, `context`, `git`) surfacing the existing Phase-3 adapters `adapters.codeSearch` (`search-section.tsx`) and `adapters.browserPreview` (`browser-section.tsx`) with honest local-only labeling, restart-safe persistence, and clear `BACKEND-TODO(code-search)` / `BACKEND-TODO(browser-preview)` markers. The Search tab runs grep scans across workspace files via desktop fs discovery, grouping hits with line numbers and preview navigation. The Browser tab provides an in-app iframe preview with tab strip management, URL bar input, responsive viewports (Desktop, Tablet 768px, Mobile 390px), reload trigger, and external browser launch. Active section selection persists to `conductor.workspace.panel.section` (survives reload). Reason: completes A4's assigned local feature build-outs without replacing working backend functionality or introducing fake backend events (D-0014/D-0017). Alternatives: keep Search and Browser as prototype-only hidden views outside the right panel (rejected: A4 contract specifies building them out as real panel tabs). Reversibility: high (isolated to A4 right-sidebar files).

**D-0042 — A5 project creation, opening, and session association contracts.** `AroProjectDialog.tsx` handles project creation and renaming, preventing duplicate folder attachments and invoking `followEnteredProjectCwd(folder)` upon entering/creating a project so fresh drafts immediately inherit the project root directory as `$currentCwd` without mutating stored session state. Project-session mapping (`project-session-map.ts`) maintains an optimistic localStorage-backed assignment map (`$aroSessionProjectMap`) alongside draft-session attachment (`$aroDraftProjectId`), synchronizing with backend `liveSessionProjectId` matching and `moveSessionToProject` IPC where available. Native folder picker (`selectDesktopPaths`) and clone-from-URL channels (`hermes:git:cloneRepository`) remain BLOCKED headless (Unknown 3) and are tested via unit suites. Reason: enforces CWD synchronization for new sessions created under a project while isolating stored session history; respects headless verification constraints (D-0034). Alternatives: mutate active stored sessions on project entry (rejected: mutates existing session history). Reversibility: high (isolated to A5 files).

**D-0043 — A6 capability & system views integration contract.** Capability views maintain a strict structural separation between workspace-pane views (`CapabilitiesView`, `MessagingView`, `ArtifactsView` mounted under `ChatRoutesSurface` in `surfaces.tsx`) and overlay views (`AgentsView`, `CronView`, `ProfilesView`, `StarmapView` mounted under `wiring.tsx`). Overlay views utilize `useOverlayRouting` to preserve `returnPathRef` so closing any overlay seamlessly returns to the originating chat session, project, and workspace layout without resetting state or creating duplicate registrations. The Aro design system (`data-aro-ui`) styles these views through the token layer and host-theme selectors without requiring surgery on frozen API, SDK, or backend code. All 10 assigned capability features (`skills-hub`, `toolsets`, `connectors-hub`, `plugins`, `memory-view`, `artifacts-view`, `cron-view`, `messaging-view`, `profiles-souls`, `subagents`) connect directly to their authoritative Hermes REST/RPC endpoints and event streams, validated across 24 test suites (181 tests). Reason: preserves the single source of truth and lifecycle contracts across all capability surfaces while respecting Area 6 custodian boundaries (AREA_PLAN §6). Alternatives: rebuild host capability views with custom prototype components (rejected: would duplicate working Hermes host code and API clients). Reversibility: high.

